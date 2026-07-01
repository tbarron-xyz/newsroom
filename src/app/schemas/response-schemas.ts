import { z } from "zod";

export const dailyEditionSchema = z.object({
  frontPageHeadline: z.string(),
  frontPageArticle: z.string(),
  topics: z.array(
    z.object({
      name: z.string(),
      headline: z.string(),
      newsStoryFirstParagraph: z.string(),
      newsStorySecondParagraph: z.string(),
      oneLineSummary: z.string()
    })
  ),
  modelName: z.string()
});

export const reporterArticleSchema = z.object({
  messageIds: z
    .array(z.number())
    .min(1, "At least one source message is required to write an article")
    .describe(
      "The indexes of the social media messages used to write this article"
    ),
  id: z.string(),
  reporterId: z.string(),
  beat: z.string(),
  headline: z.string(),
  leadParagraph: z.string(),
  body: z.string(),
  keyQuotes: z.array(z.string()),
  sources: z.array(z.string()),
  potentialMessageIds: z
    .array(z.number())
    .describe("The indexes of potentially related social media messages")
});

export const eventGenerationResponseSchema = z.object({
  events: z
    .array(
      z.object({
        title: z.string(),
        facts: z.array(z.string()).max(5),
        where: z
          .string()
          .nullable()
          .optional()
          .describe("Where the event took place, if known"),
        when: z
          .string()
          .nullable()
          .optional()
          .describe("Date and time the event took place, if known"),
        messageIds: z
          .array(z.number())
          .optional()
          .default([])
          .describe(
            "The indexes of the social media messages used to create this event"
          ),
        potentialMessageIds: z
          .array(z.number())
          .optional()
          .default([])
          .describe("The indexes of potentially related social media messages")
      })
    )
    .max(5)
});

export const generatedCommentSchema = z.object({
  topicIndex: z.number().int().min(0),
  comment: z.string().min(10).max(1000)
});

export const DynamicPersonaSchema = z.object({
  display: z.string().min(1),
  description: z.string().min(1),
  system_prompt: z.string().min(1)
});

export const DynamicPersonasSchema = z.array(DynamicPersonaSchema);

export const threadRepliesSchema = z.array(z.string()).length(3);

export const prismPerspectivesSchema = z.object({
  leftLabel: z.string(),
  leftPrompt: z.string(),
  rightLabel: z.string(),
  rightPrompt: z.string(),
  rationale: z.string().nullable()
});

export const tickerSchema = z.object({
  text: z.string()
});

export const opinionArticleSchema = z.object({
  declined: z.boolean(),
  headline: z.string().nullable(),
  content: z.string().nullable(),
  topicIndexes: z.array(z.number()).nullable()
});
