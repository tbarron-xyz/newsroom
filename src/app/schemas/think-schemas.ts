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
