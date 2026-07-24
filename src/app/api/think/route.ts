import { IDataStorageService } from "../../services/data-storage.interface";
import { NextRequest, NextResponse } from "next/server";
import { withDataStorage } from "../../utils/data-storage";
import { AIClient } from "../../services/ai-client";
import { AIModelOption } from "../../schemas/types";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { WikipediaService } from "../../services/wikipedia.service";
import {
  thinkSuggestionsSchema,
  thinkSearchQueriesSchema,
  thinkFinalSuggestionsArraySchema,
  thinkFinalSuggestionsResponseSchema,
  thinkRoundOutputSchema,
  ThinkSuggestion,
  ThinkRoundOutput,
  ThinkFinalSuggestion
} from "../../schemas/think-schemas";

const systemPrompt = "Output only valid JSON. No other text.";
const suggestionsResponseFormat = zodResponseFormat(
  thinkSuggestionsSchema,
  "think_suggestions"
);
const searchQueriesResponseFormat = zodResponseFormat(
  thinkSearchQueriesSchema,
  "think_search_queries"
);

function buildDirectionsPrompt(
  label: string,
  value: string,
  articleText: string,
  extraInstructions?: string
): string {
  return `Original article: ${articleText}

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
}

const round1SearchQueryPrompt = (articleText: string, suggestions: string) =>
  `Article: ${articleText}

Suggested Wikipedia articles:
${suggestions}

Generate 3 general Wikipedia search queries based on the article and the suggested articles above. Use broad, general search terms rather than specific article titles — terms that are likely to return many relevant Wikipedia results. These will be used to search the real Wikipedia API to discover additional relevant articles.

Return valid JSON with exactly 1 field "queries" containing an array of exactly 3 search query strings.`;

function finalSuggestionsPrompt(
  articleText: string,
  roundLabel: string,
  allSuggestions: string,
  searchResultsText: string
): string {
  return `Original article: ${articleText}

${roundLabel} suggestions:
${allSuggestions}

Real Wikipedia search results (from searching the Wikipedia API with general queries based on the suggestions above):
${searchResultsText}

Based on the original article, the ${roundLabel.toLowerCase()} suggestions, and the real Wikipedia search results above, generate 4 to 8 final article suggestions. Each suggestion should be a Wikipedia article title that is genuinely interesting and relevant to the original article. You may:
- Choose articles from the search results
- Choose articles from the suggested articles
- Combine ideas from both
- Suggest something entirely different if the search results suggest a better direction

For each suggestion, provide:
- title: the exact Wikipedia article title
- description: a brief description of this article and why it is relevant
- direction: a thinking direction label (free text — examples: moreGeneral, adjacentSibling, consequence, moreSpecific)

Return valid JSON: an array of objects with fields "title", "description", and "direction". Minimum 4, maximum 8 suggestions.`;
}

async function generateFinalSuggestions(
  aiClient: AIClient,
  articleText: string,
  roundLabel: string,
  allSuggestions: string,
  searchResultsText: string
): Promise<ThinkFinalSuggestion[]> {
  const finalResponseFormat = zodResponseFormat(
    thinkFinalSuggestionsResponseSchema,
    "think_final_suggestions"
  );
  const result = await aiClient.createChatCompletion(AIModelOption.GENERAL, {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: finalSuggestionsPrompt(
          articleText,
          roundLabel,
          allSuggestions,
          searchResultsText
        )
      }
    ],
    response_format: finalResponseFormat,
    reasoning_effort: "minimal"
  });
  const content = result.response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`No final suggestions content for ${roundLabel}`);
  }
  return thinkFinalSuggestionsResponseSchema.parse(JSON.parse(content))
    .suggestions;
}

async function deduplicatedWikipediaSearch(
  wikipediaService: WikipediaService,
  queries: string[],
  limit: number = 5
): Promise<{ title: string; description: string; url: string }[]> {
  const resultsArrays = await Promise.all(
    queries.map((q) => wikipediaService.search(q, limit))
  );
  const seen = new Set<string>();
  const deduplicated: { title: string; description: string; url: string }[] =
    [];
  for (const results of resultsArrays) {
    for (const r of results) {
      if (!seen.has(r.title)) {
        seen.add(r.title);
        deduplicated.push(r);
      }
    }
  }
  return deduplicated;
}

function formatSuggestionsList(suggestions: ThinkSuggestion): string {
  return [
    `- moreGeneral: ${suggestions.moreGeneral}`,
    `- adjacentSibling: ${suggestions.adjacentSibling}`,
    `- consequence: ${suggestions.consequence}`,
    `- moreSpecific: ${suggestions.moreSpecific}`
  ].join("\n");
}

function formatSearchResults(
  results: { title: string; description: string; url: string }[]
): string {
  if (results.length === 0) return "No search results found.";
  return results
    .map(
      (r, i) => `${i + 1}. "${r.title}" — ${r.description}\n   URL: ${r.url}`
    )
    .join("\n");
}

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
      const wikipediaService = new WikipediaService();

      // ---- Round 1 ----

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
          response_format: suggestionsResponseFormat,
          reasoning_effort: "minimal"
        }
      );

      const round1Content =
        round1Result.response.choices[0]?.message?.content?.trim();
      if (!round1Content) {
        throw new Error("No response content from AI for round 1");
      }

      const round1 = thinkSuggestionsSchema.parse(JSON.parse(round1Content));

      // ---- Round 1: Wikipedia search ----

      const searchQueriesResult = await aiClient.createChatCompletion(
        AIModelOption.GENERAL,
        {
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: round1SearchQueryPrompt(
                articleText,
                formatSuggestionsList(round1)
              )
            }
          ],
          response_format: searchQueriesResponseFormat,
          reasoning_effort: "minimal"
        }
      );

      const searchQueriesContent =
        searchQueriesResult.response.choices[0]?.message?.content?.trim();
      if (!searchQueriesContent) {
        throw new Error("No search queries from AI");
      }

      const searchQueries = thinkSearchQueriesSchema.parse(
        JSON.parse(searchQueriesContent)
      ).queries;

      const round1SearchResults = await deduplicatedWikipediaSearch(
        wikipediaService,
        searchQueries,
        5
      );

      // ---- Round 1: Final suggestions ----

      const round1FinalSuggestions = await generateFinalSuggestions(
        aiClient,
        articleText,
        "Round 1",
        formatSuggestionsList(round1),
        formatSearchResults(round1SearchResults)
      );

      // ---- Round 2 ----

      const directions = [
        {
          key: "moreGeneral" as const,
          label: "More General",
          value: round1.moreGeneral
        },
        {
          key: "adjacentSibling" as const,
          label: "Adjacent Sibling",
          value: round1.adjacentSibling
        },
        {
          key: "consequence" as const,
          label: "Consequence",
          value: round1.consequence
        },
        {
          key: "moreSpecific" as const,
          label: "More Specific",
          value: round1.moreSpecific
        }
      ];

      const round2Promises = directions.map(async ({ key, label, value }) => {
        // 2a: Generate suggestions branching from this Round 1 suggestion
        const prompt = buildDirectionsPrompt(label, value, articleText);

        const result = await aiClient.createChatCompletion(
          AIModelOption.GENERAL,
          {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            response_format: suggestionsResponseFormat,
            reasoning_effort: "minimal"
          }
        );

        const content = result.response.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error(`No response content from AI for round 2 (${key})`);
        }

        const suggestions = thinkSuggestionsSchema.parse(JSON.parse(content));

        // 2b: Search Wikipedia using all 4 Round 1 suggestion titles as queries
        const searchResults = await deduplicatedWikipediaSearch(
          wikipediaService,
          [
            round1.moreGeneral,
            round1.adjacentSibling,
            round1.consequence,
            round1.moreSpecific
          ],
          3
        );

        // 2c: Generate final suggestions for this branch
        const finalSuggestions = await generateFinalSuggestions(
          aiClient,
          articleText,
          `${label} branch`,
          formatSuggestionsList(suggestions),
          formatSearchResults(searchResults)
        );

        return {
          key,
          value: {
            ...suggestions,
            finalSuggestions
          } as {
            moreGeneral: string;
            adjacentSibling: string;
            consequence: string;
            moreSpecific: string;
            finalSuggestions: ThinkFinalSuggestion[];
          }
        };
      });

      const round2Results = await Promise.all(round2Promises);

      const round2: Record<
        string,
        {
          moreGeneral: string;
          adjacentSibling: string;
          consequence: string;
          moreSpecific: string;
          finalSuggestions: ThinkFinalSuggestion[];
        }
      > = {};
      for (const { key, value } of round2Results) {
        round2[key] = value;
      }

      // ---- Build response ----

      const round1Output: ThinkRoundOutput = {
        ...round1,
        searchQueries,
        searchResults: round1SearchResults,
        finalSuggestions: round1FinalSuggestions
      };

      return NextResponse.json({ round1: round1Output, round2 });
    } catch (error) {
      console.error("Error in think generation:", error);
      return NextResponse.json(
        { error: "Failed to generate think suggestions" },
        { status: 500 }
      );
    }
  }
);
