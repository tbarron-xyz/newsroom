import OpenAI from "openai";
import { Stream } from "openai/streaming";
import { IDataStorageService } from "./data-storage.interface";
import { AIModelOption } from "../schemas/types";

export class AIClient {
  private openai: OpenAI;
  private dataStorageService: IDataStorageService;
  private currentBaseUrl: string | undefined;

  constructor(dataStorageService: IDataStorageService) {
    this.dataStorageService = dataStorageService;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  private ensureClientBaseUrl(baseUrl?: string): void {
    if (this.currentBaseUrl === baseUrl) return;
    this.currentBaseUrl = baseUrl;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return;
    this.openai = new OpenAI(
      baseUrl ? { apiKey, baseURL: baseUrl } : { apiKey }
    );
  }

  getClient(): OpenAI {
    return this.openai;
  }

  async getMessageSliceCount(): Promise<number> {
    let messageSliceCount = 200; // Default fallback
    try {
      const editor = await this.dataStorageService.getEditor();
      if (editor) {
        messageSliceCount = editor.messageSliceCount;
      }
    } catch (error) {
      console.warn(
        "Failed to fetch message slice count from Redis, using default:",
        error
      );
    }
    return messageSliceCount;
  }

  async createChatCompletion(
    option: AIModelOption,
    createParams: Omit<
      OpenAI.Chat.Completions.ChatCompletionCreateParams,
      "model" | "stream"
    >,
    modelOverride?: string
  ): Promise<{
    response: OpenAI.Chat.Completions.ChatCompletion;
    modelUsed: string;
  }> {
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("No editor configuration found");
    }

    this.ensureClientBaseUrl(editor.baseUrl);

    const model = modelOverride || editor[option];
    if (!model) {
      throw new Error(`Model not configured for option: ${option}`);
    }

    const response = await this.getClient().chat.completions.create({
      ...createParams,
      model,
      stream: false
    });

    return { response, modelUsed: model };
  }

  async createChatCompletionStream(
    option: AIModelOption,
    createParams: Omit<
      OpenAI.Chat.Completions.ChatCompletionCreateParams,
      "model" | "stream"
    >,
    modelOverride?: string
  ): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const editor = await this.dataStorageService.getEditor();
    if (!editor) {
      throw new Error("No editor configuration found");
    }

    this.ensureClientBaseUrl(editor.baseUrl);

    const model = modelOverride || editor[option];
    if (!model) {
      throw new Error(`Model not configured for option: ${option}`);
    }

    return this.getClient().chat.completions.create({
      ...createParams,
      model,
      stream: true
    });
  }
}
