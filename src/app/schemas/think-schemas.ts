import { z } from "zod";

export const thinkSuggestionsSchema = z.object({
  moreGeneral: z
    .string()
    .describe(
      "Wikipedia article title: broader concept this belongs to (zoom out)"
    ),
  adjacentSibling: z
    .string()
    .describe("Wikipedia article title: neighboring/sibling concept"),
  consequence: z
    .string()
    .describe(
      "Wikipedia article title: what followed / what changed because of this"
    ),
  moreSpecific: z
    .string()
    .describe(
      "Wikipedia article title: deeper detail / important sub-topic (zoom in)"
    )
});

export type ThinkSuggestion = z.infer<typeof thinkSuggestionsSchema>;

export const round2ResponseSchema = z.object({
  moreGeneral: thinkSuggestionsSchema,
  adjacentSibling: thinkSuggestionsSchema,
  consequence: thinkSuggestionsSchema,
  moreSpecific: thinkSuggestionsSchema
});

export type Round2Response = z.infer<typeof round2ResponseSchema>;

export const thinkSearchQueriesSchema = z.object({
  queries: z.array(z.string()).length(3)
});

export type ThinkSearchQueries = z.infer<typeof thinkSearchQueriesSchema>;

export const thinkSearchResultSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string()
});

export type ThinkSearchResult = z.infer<typeof thinkSearchResultSchema>;

export const thinkFinalSuggestionSchema = z.object({
  title: z.string().describe("Wikipedia article title"),
  description: z
    .string()
    .describe("Brief description of this article and why it is relevant"),
  direction: z
    .string()
    .describe(
      "Thinking direction. Examples: moreGeneral, adjacentSibling, consequence, moreSpecific"
    )
});

export type ThinkFinalSuggestion = z.infer<typeof thinkFinalSuggestionSchema>;

export const thinkFinalSuggestionsArraySchema = z
  .array(thinkFinalSuggestionSchema)
  .min(4)
  .max(8);

export const thinkFinalSuggestionsResponseSchema = z.object({
  suggestions: z.array(thinkFinalSuggestionSchema).min(4).max(8)
});

export const thinkRoundOutputSchema = z.object({
  moreGeneral: z.string(),
  adjacentSibling: z.string(),
  consequence: z.string(),
  moreSpecific: z.string(),
  searchQueries: z.array(z.string()).optional(),
  searchResults: z.array(thinkSearchResultSchema).optional(),
  finalSuggestions: thinkFinalSuggestionsArraySchema
});

export type ThinkRoundOutput = z.infer<typeof thinkRoundOutputSchema>;

export const thinkRound2OutputSchema = z.object({
  moreGeneral: thinkRoundOutputSchema.omit({
    searchQueries: true,
    searchResults: true
  }),
  adjacentSibling: thinkRoundOutputSchema.omit({
    searchQueries: true,
    searchResults: true
  }),
  consequence: thinkRoundOutputSchema.omit({
    searchQueries: true,
    searchResults: true
  }),
  moreSpecific: thinkRoundOutputSchema.omit({
    searchQueries: true,
    searchResults: true
  })
});

export type ThinkRound2Output = z.infer<typeof thinkRound2OutputSchema>;
