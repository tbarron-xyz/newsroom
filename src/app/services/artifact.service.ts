import { Artifact, ArtifactInput, AIModelOption } from "../schemas/types";
import { IDataStorageService } from "./data-storage.interface";
import { AIService } from "./ai.service";
import { AIClient } from "./ai-client";
import { fetchLatestMessages } from "./bluesky.service";
import handlebars from "handlebars";
import { z } from "zod";

const builtinSchemas: Record<string, string> = {
  event:
    "z.object({title:z.string(),facts:z.array(z.string()),where:z.string().optional(),when:z.string().optional()})",
  article: "z.object({headline:z.string(),lead:z.string(),body:z.string()})",
  edition: "z.object({stories:z.array(z.string())})",
  daily_edition:
    "z.object({front_page_headline:z.string(),front_page_article:z.string(),topics:z.array(z.object({headline:z.string(),summary:z.string(),articles:z.array(z.string())}))})"
};

function getSchemaForType(schemaString: string): z.ZodSchema {
  return new Function("z", "return " + schemaString)() as z.ZodSchema;
}

export class ArtifactService {
  private aiClient: AIClient;
  constructor(
    private dataStorageService: IDataStorageService,
    private aiService: AIService
  ) {
    this.aiClient = new AIClient(dataStorageService);
  }

  async generate(artifactId: string): Promise<{ output: any; metadata: any }> {
    console.log(`Artifact ${artifactId}: Starting generation...`);
    const artifact = await this.dataStorageService.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const inputData = await this.resolveInputs(artifact.inputs);
    const renderedPrompt = this.templateRender(
      artifact.prompt_user_template,
      inputData
    );
    const editor = await this.dataStorageService.getEditor();
    if (!editor) throw new Error("Editor not found");

    const modelName = artifact.metadata?.model_name || editor.articleModelName;

    // Get AI response with JSON mode
    const { response, modelUsed } = await this.aiClient.createChatCompletion(
      "articleModelName" as AIModelOption,
      {
        messages: [
          { role: "system", content: artifact.prompt_system },
          { role: "user", content: renderedPrompt }
        ],
        response_format: { type: "json_object" }
      },
      modelName
    );

    // Parse response
    const output = JSON.parse(response.choices[0].message.content || "{}");

    // Validate with Zod schema
    const schema = getSchemaForType(artifact.output_schema);
    const validatedOutput = schema.parse(output);

    const metadata = {
      model_name: modelUsed,
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      generated_at: Date.now(),
      status: "generated" as const
    };

    // Update artifact with output and metadata
    await this.dataStorageService.updateArtifact(artifactId, {
      output: response,
      metadata: { ...artifact.metadata, ...metadata }
    });

    console.log(`Artifact ${artifactId}: Generation completed`);
    return { output: validatedOutput, metadata };
  }

  private async resolveInputs(
    inputs: ArtifactInput[]
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};

    for (const input of inputs) {
      if (input.source === "artifacts") {
        // For artifacts: query latest by type/filters
        let artifacts = await this.dataStorageService.getArtifactsByType(
          input.type!,
          input.filter?.limit || 10
        );
        if (input.filter?.reporterId) {
          artifacts = artifacts.filter(
            (a) => a.metadata.reporterId === input.filter!.reporterId
          );
        }
        if (input.filter?.since) {
          const sinceMs = this.parseSince(input.filter.since);
          const now = Date.now();
          artifacts = artifacts.filter(
            (a) =>
              a.metadata.generated_at &&
              now - a.metadata.generated_at <= sinceMs
          );
        }
        resolved[input.name] = artifacts;
      } else if (input.source === "external") {
        // External: Bluesky
        const messages = await fetchLatestMessages(input.filter?.limit || 20);
        resolved[input.name] = messages.map((m) => m.text);
      }
    }

    return resolved;
  }

  private templateRender(template: string, data: Record<string, any>): string {
    const compiled = handlebars.compile(template);
    return compiled(data);
  }

  private parseSince(since: string): number {
    const match = since.match(/^(\d+)([dhm])$/);
    if (!match) return 60 * 60 * 1000; // default 1h
    const [, num, unit] = match;
    const multipliers = {
      d: 24 * 60 * 60 * 1000,
      h: 60 * 60 * 1000,
      m: 60 * 1000
    };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }
}
