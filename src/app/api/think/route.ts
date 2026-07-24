import { IDataStorageService } from "../../services/data-storage.interface";
import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AIClient } from "../../services/ai-client";
import { AIModelOption } from "../../schemas/types";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { thinkSuggestionsSchema } from "../../schemas/think-schemas";

export const POST = withDataStorage(
  async (request: NextRequest, dataStorage: IDataStorageService) => {
    try {
      const { headline, body } = await request.json();
      if (!headline || !body) {
        return NextResponse.json(
          { error: "headline and body are required" },
          { status: 400 }
        );
      }

      const articleText = `Headline: ${headline}\nBody: ${body}`;
      const aiClient = new AIClient(dataStorage);
      const responseFormat = zodResponseFormat(
        thinkSuggestionsSchema,
        "think_suggestions"
      );

      const systemPrompt = "Output only valid JSON. No other text.";
      const round1UserPrompt = `Article: ${articleText}

Suggest 4 Wikipedia article titles using the following directions:

↑ Up — Generalize
Move to a broader concept. Examples: Apollo 11 → Apollo program, TCP → Internet protocol suite, Espresso → Coffee. "What bigger idea does this belong to?"

↓ Down — Specialize
Move into an important detail. Examples: Apollo program → Saturn V, Coffee → Arabica coffee, Roman Empire → Augustus. "Tell me more about one important part."

← Left — Adjacent
A neighboring concept. Examples: Linux → BSD, Coffee → Tea, Impressionism → Post-Impressionism. "What else lives nearby?"

→ Right — Consequence
What followed? Examples: Printing press → Reformation, Steam engine → Industrial Revolution, CRISPR → Gene editing. "What changed because of this?"

Return valid JSON with exactly these 4 string fields: moreGeneral, adjacentSibling, consequence, moreSpecific.`;

      const round1Result = await aiClient.createChatCompletion(
        AIModelOption.GENERAL,
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: round1UserPrompt }
          ],
          response_format: responseFormat,
          reasoning_effort: "minimal"
        }
      );

      const round1Content =
        round1Result.response.choices[0]?.message?.content?.trim();
      if (!round1Content) {
        throw new Error("No response content from AI for round 1");
      }

      const round1 = thinkSuggestionsSchema.parse(JSON.parse(round1Content));

      const directions = [
        {
          key: "moreGeneral",
          label: "More General",
          value: round1.moreGeneral
        },
        {
          key: "adjacentSibling",
          label: "Adjacent Sibling",
          value: round1.adjacentSibling
        },
        { key: "consequence", label: "Consequence", value: round1.consequence },
        {
          key: "moreSpecific",
          label: "More Specific",
          value: round1.moreSpecific
        }
      ] as const;

      const round2Promises = directions.map(({ key, label, value }) => {
        const prompt = `Original article: ${articleText}

Round 1 "${label}" suggestion: "${value}"

Building on this specific Round 1 suggestion, generate 4 new Wikipedia article titles using the following directions:

↑ Up — Generalize
Move to a broader concept. Examples: Apollo 11 → Apollo program, TCP → Internet protocol suite, Espresso → Coffee. "What bigger idea does this belong to?"

↓ Down — Specialize
Move into an important detail. Examples: Apollo program → Saturn V, Coffee → Arabica coffee, Roman Empire → Augustus. "Tell me more about one important part."

← Left — Adjacent
A neighboring concept. Examples: Linux → BSD, Coffee → Tea, Impressionism → Post-Impressionism. "What else lives nearby?"

→ Right — Consequence
What followed? Examples: Printing press → Reformation, Steam engine → Industrial Revolution, CRISPR → Gene editing. "What changed because of this?"

IMPORTANT: All 4 suggestions must be distinct from the Round 1 suggestion "${value}" and must not repeat any Round 1 suggestions. Generate completely new directions from this specific concept.

Return valid JSON with exactly these 4 string fields: moreGeneral, adjacentSibling, consequence, moreSpecific.`;

        return aiClient.createChatCompletion(AIModelOption.GENERAL, {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          response_format: responseFormat,
          reasoning_effort: "minimal"
        });
      });

      const round2Results = await Promise.all(round2Promises);

      const round2: Record<string, z.infer<typeof thinkSuggestionsSchema>> = {};
      for (let i = 0; i < directions.length; i++) {
        const key = directions[i].key;
        const content =
          round2Results[i].response.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error(`No response content from AI for round 2 (${key})`);
        }
        round2[key] = thinkSuggestionsSchema.parse(JSON.parse(content));
      }

      return NextResponse.json({ round1, round2 });
    } catch (error) {
      console.error("Error in think generation:", error);
      return NextResponse.json(
        { error: "Failed to generate think suggestions" },
        { status: 500 }
      );
    }
  }
);
