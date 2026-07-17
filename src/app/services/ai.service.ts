import {
  Reporter,
  Article,
  Event,
  OpinionArticle,
  OpinionPersona,
  ArticleGenerationMetadata,
  EventGenerationMetadata,
  DynamicPersona,
  AIModelOption,
  DailyEdition
} from "../schemas/types";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import OpenAI from "openai";

type OpenAIResponse = OpenAI.Chat.Completions.ChatCompletion;

import {
  dailyEditionSchema,
  reporterArticleSchema,
  eventGenerationResponseSchema,
  generatedCommentSchema,
  DynamicPersonasSchema,
  threadRepliesSchema,
  prismPerspectivesSchema,
  tickerSchema,
  opinionArticleSchema,
  youtubeTranscriptArticleSchema,
  homepageChatSafetyAndReplySchema,
  homepageChatVisitorMessageSchema
} from "../schemas/response-schemas";
import { IDataStorageService } from "./data-storage.interface";
import { KpiService } from "./kpi.service";
import { fetchLatestMessages, BlueskyMessage } from "./bluesky.service";
import {
  AIPrompts,
  PERSONA_DISPLAY_NAMES,
  PERSONA_SYSTEM_PROMPTS,
  OPINION_PERSONA_SYSTEM_PROMPTS,
  OPINION_PERSONA_DISPLAY_NAMES,
  OPINION_PERSONAS
} from "./ai-prompts";
import { Persona } from "../schemas/types";
import { AIResponseUtils } from "./ai-response-utils";
import { AIClient } from "./ai-client";

interface ForumThread {
  id: number;
  title: string;
  forumId: string;
  author: string;
  createdAt: number;
  replyCount: number;
  lastReplyTime: number;
}

export class AIService {
  private aiClient: AIClient;
  private dataStorageService: IDataStorageService;

  constructor(dataStorageService: IDataStorageService) {
    this.dataStorageService = dataStorageService;
    this.aiClient = new AIClient(dataStorageService);
  }

  public async fetchSocialMediaMessages(
    messageSliceCount: number
  ): Promise<BlueskyMessage[]> {
    return fetchLatestMessages(messageSliceCount);
  }

  private async logAIResponse(
    eventDescription: string,
    response?: OpenAIResponse,
    errorMessage?: string
  ): Promise<void> {
    let strippedResponse: OpenAIResponse | undefined;

    if (response) {
      strippedResponse = this.stripReasoningDetails(response);
    }

    const message = errorMessage
      ? `${eventDescription} failed: ${errorMessage}`
      : `${eventDescription} completed - OpenAI response: ${JSON.stringify(strippedResponse)}`;

    await this.dataStorageService.addLog(message);
  }

  private async logOpenAIError(
    consoleMsg: string,
    eventDesc: string,
    error: any
  ): Promise<void> {
    console.error(`${consoleMsg}:`, (error as any).error ?? error);
    await this.logAIResponse(
      eventDesc,
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  private stripReasoningDetails(response: OpenAIResponse): OpenAIResponse {
    if (!response.choices) {
      return response;
    }

    return {
      ...response,
      choices: response.choices.map((choice) => {
        if (!choice.message) {
          return choice;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { reasoning_details, ...messageWithoutReasoning } =
          choice.message as unknown as Record<string, unknown>;
        return {
          ...choice,
          message:
            messageWithoutReasoning as unknown as OpenAI.Chat.Completions.ChatCompletionMessage
        };
      })
    };
  }

  async generateStructuredArticle(
    reporter: Reporter,
    modelName?: string
  ): Promise<{
    response: {
      id: string;
      reporterId: string;
      beat: string;
      headline: string;
      leadParagraph: string;
      body: string;
      keyQuotes: string[];
      sources: string[];
      wordCount: number;
      generationTime: number;
      reporterNotes: {
        researchQuality: string;
        sourceDiversity: string;
        factualAccuracy: string;
      };
      socialMediaSummary: string;
      messageIds: number[];
      potentialMessageIds: number[];
      modelName: string;
      inputTokenCount?: number;
      outputTokenCount?: number;
    };
    prompt: string;
    messages: BlueskyMessage[];
  }> {
    const generationTime = Date.now();
    const articleId = `article_${generationTime}_${Math.random().toString(36).substring(2, 8)}`;
    const beatsList = reporter.beats.join(", ");

    try {
      // Get configurable message slice count from Redis
      const messageSliceCount = await this.aiClient.getMessageSliceCount();

      // Fetch recent social media messages to inform article generation
      let socialMediaMessages: BlueskyMessage[] = [];
      try {
        socialMediaMessages =
          await this.fetchSocialMediaMessages(messageSliceCount);
      } catch (error) {
        console.warn("Failed to fetch social media messages:", error);
        // Continue with article generation even if social media fetch fails
      }

      // Format social media messages for the prompt
      const socialMediaContext =
        AIResponseUtils.formatSocialMediaContext(socialMediaMessages);

      const config = AIPrompts.generateStructuredArticlePrompts(
        reporter,
        beatsList,
        socialMediaContext
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai article generation with ${AIModelOption.ARTICLE_GENERATION}`
      );
      const completionResult = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            {
              role: "system",
              content: config.systemPrompt
            },
            {
              role: "user",
              content: config.userPrompt
            }
          ],
          response_format: config.responseFormat
        }
      );

      await this.logAIResponse(
        `Article generation for reporter ${reporter.id}`,
        completionResult.response
      );

      const content =
        completionResult.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      // Save the entire AI response to JSON file
      // await AIResponseUtils.saveResponseToFile(
      //   response,
      //   "article",
      //   generationTime
      // );

      const parsedResponse = reporterArticleSchema.parse(
        JSON.parse(content)
      ) as any;

      const metadata = AIResponseUtils.createArticleMetadata(
        articleId,
        reporter.id,
        generationTime,
        modelName || completionResult.modelUsed,
        parsedResponse.body,
        completionResult.response.usage
      );

      return {
        response: { ...parsedResponse, ...metadata },
        prompt: fullPrompt,
        messages: socialMediaMessages
      };
    } catch (error) {
      console.error("Error generating structured article:", error);
      await this.logAIResponse(
        `Article generation for reporter ${reporter.id}`,
        undefined,
        error instanceof Error ? error.message : "Unknown error"
      );
      // Return fallback structured article
      throw error;
    }
  }

  async selectNewsworthyStories(
    articles: Article[],
    editorPrompt: string,
    modelName?: string
  ): Promise<{
    selectedArticles: Article[];
    fullPrompt: string;
    modelName: string;
    inputTokenCount?: number;
    outputTokenCount?: number;
  }> {
    // Fetch editor for model name
    let editor;
    try {
      editor = await this.dataStorageService.getEditor();
    } catch (error) {
      console.warn("Failed to fetch editor for model name:", error);
      editor = { modelName: "gpt-5-nano" };
    }

    if (articles.length === 0)
      return {
        selectedArticles: [],
        fullPrompt: "",
        modelName: modelName || editor!.modelName
      };

    const originalIndices = articles.map((_, i) => i);
    const shuffledIndices = [...originalIndices].sort(
      () => 0.5 - Math.random()
    );
    const shuffledArticles = shuffledIndices.map((i) => articles[i]);

    try {
      const articlesText = AIResponseUtils.formatArticlesText(shuffledArticles);
      const { systemPrompt, userPrompt } =
        AIPrompts.selectNewsworthyStoriesPrompts(articlesText, editorPrompt);
      const fullPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;

      const model = modelName || editor!.modelName;
      console.log(`Calling openai story selection with model ${model}`);
      const completion = await this.aiClient
        .getClient()
        .chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        });
      const completionResult = { response: completion, modelUsed: model };
      const { response: openaiResponse, modelUsed } = completionResult;

      // Track KPI usage
      await KpiService.incrementKpisFromOpenAIResponse(
        openaiResponse,
        this.dataStorageService
      );

      await this.logAIResponse("Story selection", openaiResponse);

      const selectedShuffledIndices =
        openaiResponse.choices[0]?.message?.content
          ?.trim()
          .split(",")
          .map((num: string) => parseInt(num.trim()) - 1)
          .filter(
            (index: number) => index >= 0 && index < shuffledArticles.length
          ) || [];

      if (selectedShuffledIndices.length === 0) {
        const minStories = 3;
        const maxStories = Math.min(5, shuffledArticles.length);
        const numStories =
          Math.floor(Math.random() * (maxStories - minStories + 1)) +
          minStories;
        const fallbackShuffled = [...shuffledArticles].sort(
          () => 0.5 - Math.random()
        );
        return {
          selectedArticles: fallbackShuffled.slice(0, numStories),
          fullPrompt,
          modelName: modelUsed,
          inputTokenCount: openaiResponse.usage?.prompt_tokens,
          outputTokenCount: openaiResponse.usage?.completion_tokens
        };
      }

      const originalSelectedIndices = selectedShuffledIndices.map(
        (shuffledIdx) => shuffledIndices[shuffledIdx]
      );
      const selectedArticles = originalSelectedIndices.map(
        (origIdx) => articles[origIdx]
      );

      return {
        selectedArticles,
        fullPrompt,
        modelName: modelUsed,
        inputTokenCount: openaiResponse.usage?.prompt_tokens,
        outputTokenCount: openaiResponse.usage?.completion_tokens
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error selecting newsworthy stories",
        "Story selection",
        error
      );
      const minStories = 3;
      const maxStories = Math.min(5, shuffledArticles.length);
      const numStories =
        Math.floor(Math.random() * (maxStories - minStories + 1)) + minStories;
      const fallbackShuffled = [...shuffledArticles].sort(
        () => 0.5 - Math.random()
      );
      const fallbackIndices = fallbackShuffled
        .slice(0, numStories)
        .map((article) => shuffledArticles.indexOf(article));
      const originalFallbackIndices = fallbackIndices.map(
        (shuffledIdx) => shuffledIndices[shuffledIdx]
      );
      const selectedArticles = originalFallbackIndices.map(
        (origIdx) => articles[origIdx]
      );
      return {
        selectedArticles,
        fullPrompt: `System: You are an experienced news editor evaluating story newsworthiness. Select the most important and engaging stories based on journalistic criteria.

User: Given the following articles and editorial guidelines: "${editorPrompt}", select the 3-5 most newsworthy stories from the list below.`,
        modelName: modelName || "gpt-4o-mini",
        inputTokenCount: 0,
        outputTokenCount: 0
      };
    }
  }

  async selectNotableEditions(
    editions: Array<{
      id: string;
      articles: Array<{ headline: string; body: string }>;
    }>,
    editorPrompt: string,
    modelName?: string
  ): Promise<{
    content: {
      frontPageHeadline: string;
      frontPageArticle: string;
      topics: Array<{
        name: string;
        headline: string;
        newsStoryFirstParagraph: string;
        newsStorySecondParagraph: string;
        oneLineSummary: string;
      }>;
    };
    fullPrompt: string;
    modelName: string;
    inputTokenCount?: number;
    outputTokenCount?: number;
  }> {
    if (editions.length === 0) {
      throw new Error("No editions available for daily edition generation");
    }

    try {
      const editionsText = AIResponseUtils.formatEditionsText(editions);
      const config = AIPrompts.selectNotableEditionsPrompts(
        editionsText,
        editorPrompt
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai daily edition generation with ${AIModelOption.ARTICLE_GENERATION}`
      );
      console.log("Full prompt:", fullPrompt);
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            {
              role: "system",
              content: config.systemPrompt
            },
            {
              role: "user",
              content: config.userPrompt
            }
          ],
          response_format: config.responseFormat
        },
        modelName
      );

      // Track KPI usage
      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse("Daily edition generation", result.response);

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsedResponse = dailyEditionSchema.parse(
        JSON.parse(content)
      ) as any;

      // Validate the response structure
      if (
        !parsedResponse.frontPageHeadline ||
        !parsedResponse.frontPageArticle ||
        !Array.isArray(parsedResponse.topics)
      ) {
        throw new Error("Invalid response structure from AI service");
      }

      return {
        content: parsedResponse,
        fullPrompt,
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating daily edition",
        "Daily edition generation",
        error
      );
      throw error;
    }
  }

  async generatePrismPerspectives(
    editions: Array<{
      id: string;
      articles: Array<{ headline: string; body: string }>;
    }>
  ): Promise<{
    leftLabel: string;
    leftPrompt: string;
    rightLabel: string;
    rightPrompt: string;
    fullPrompt: string;
    modelName: string;
    inputTokenCount?: number;
    outputTokenCount?: number;
  }> {
    if (editions.length === 0) {
      throw new Error("No editions available for prism perspective generation");
    }

    try {
      const editionsText = AIResponseUtils.formatEditionsText(editions);
      const config = AIPrompts.generatePrismDailyEditorialPrompts(editionsText);
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai prism perspectives generation with ${AIModelOption.ARTICLE_GENERATION}`
      );
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        }
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse(
        "Prism perspectives generation",
        result.response
      );

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsed = prismPerspectivesSchema.parse(JSON.parse(content));

      return {
        leftLabel: parsed.leftLabel,
        leftPrompt: parsed.leftPrompt,
        rightLabel: parsed.rightLabel,
        rightPrompt: parsed.rightPrompt,
        fullPrompt,
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating prism perspectives",
        "Prism perspectives generation",
        error
      );
      throw error;
    }
  }

  async remapDailyEdition(
    dailyEdition: DailyEdition,
    perspectivePrompt: string,
    modelName?: string
  ): Promise<{
    content: DailyEdition;
    fullPrompt: string;
    modelName: string;
    inputTokenCount?: number;
    outputTokenCount?: number;
  }> {
    try {
      const editionText = this.serialiseDailyEdition(dailyEdition);
      const config = AIPrompts.prismRemapPrompts(
        editionText,
        perspectivePrompt
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai prism remap with ${AIModelOption.ARTICLE_GENERATION}`
      );
      console.log("Full prompt:", fullPrompt);
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            {
              role: "system",
              content: config.systemPrompt
            },
            {
              role: "user",
              content: config.userPrompt
            }
          ],
          response_format: config.responseFormat
        },
        modelName
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse("Prism remap", result.response);

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsedContent = dailyEditionSchema.parse(
        JSON.parse(content)
      ) as any;

      if (
        !parsedContent.frontPageHeadline ||
        !parsedContent.frontPageArticle ||
        !Array.isArray(parsedContent.topics)
      ) {
        throw new Error("Invalid response structure from AI service");
      }

      const remapped: DailyEdition = {
        ...dailyEdition,
        frontPageHeadline: parsedContent.frontPageHeadline,
        frontPageArticle: parsedContent.frontPageArticle,
        topics: parsedContent.topics,
        prompt: fullPrompt,
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };

      return {
        content: remapped,
        fullPrompt,
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error remapping daily edition",
        "Prism remap",
        error
      );
      throw error;
    }
  }

  private serialiseDailyEdition(dailyEdition: DailyEdition): string {
    let text = `Front Page Headline: ${dailyEdition.frontPageHeadline}\n\n`;
    text += `Front Page Article:\n${dailyEdition.frontPageArticle}\n\n`;

    if (dailyEdition.topics && dailyEdition.topics.length > 0) {
      text += `Topics:\n`;
      for (const topic of dailyEdition.topics) {
        text += `\n--- ${topic.name} ---\n`;
        text += `Headline: ${topic.headline}\n`;
        text += `First Paragraph: ${topic.newsStoryFirstParagraph}\n`;
        text += `Second Paragraph: ${topic.newsStorySecondParagraph}\n`;
        text += `Summary: ${topic.oneLineSummary}\n`;
      }
    }

    if (dailyEdition.newspaperName) {
      text = `Newspaper: ${dailyEdition.newspaperName}\n\n${text}`;
    }

    return text;
  }

  async generateEvents(
    reporter: Reporter,
    lastEvents: Event[],
    modelName?: string
  ): Promise<{
    events: Array<{
      index?: number | null;
      title: string;
      facts: string[];
      where?: string | null;
      when?: string | null;
      messageIds: number[];
      potentialMessageIds: number[];
      modelName: string;
      inputTokenCount?: number;
      outputTokenCount?: number;
    }>;
    fullPrompt: string;
    messages: BlueskyMessage[];
  }> {
    try {
      // Format last events for context
      const eventsContext = AIResponseUtils.formatEventsContext(lastEvents);

      // Get configurable message slice count
      const messageSliceCount = await this.aiClient.getMessageSliceCount();

      // Fetch recent social media messages
      let socialMediaMessages: BlueskyMessage[] = [];
      try {
        socialMediaMessages =
          await this.fetchSocialMediaMessages(messageSliceCount);
      } catch (error) {
        console.warn(
          "Failed to fetch social media messages for events:",
          error
        );
      }

      // Format social media messages for the prompt
      const socialMediaContext =
        socialMediaMessages.length > 0
          ? socialMediaMessages
              .map((msg, index) => `${index + 1}. "${msg.text}"`)
              .join("\n")
          : "No social media messages available.";

      const beatsList = reporter.beats.join(", ");
      const config = AIPrompts.generateEventsPrompts(
        reporter,
        beatsList,
        eventsContext,
        socialMediaContext
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai event generation with ${AIModelOption.EVENT_GENERATION}`
      );
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.EVENT_GENERATION,
        {
          messages: [
            {
              role: "system",
              content: config.systemPrompt
            },
            {
              role: "user",
              content: config.userPrompt
            }
          ],
          response_format: config.responseFormat
        },
        modelName
      );

      // Track KPI usage
      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse(
        `Event generation for reporter ${reporter.id}`,
        result.response
      );

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service for events");
      }

      const parsedResponse = eventGenerationResponseSchema.parse(
        JSON.parse(content)
      );

      const eventMetadata = AIResponseUtils.createEventMetadata(
        modelName || "",
        result.response.usage
      );

      const eventsWithMetadata = (parsedResponse.events as any[]).map(
        (event) => ({
          ...event,
          ...eventMetadata
        })
      );

      return {
        events: eventsWithMetadata,
        fullPrompt,
        messages: socialMediaMessages
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating events",
        `Event generation for reporter ${reporter.id}`,
        error
      );
      // Return empty events on error
      return {
        events: [],
        fullPrompt: "Error occurred during event generation",
        messages: []
      };
    }
  }

  async generateArticlesFromEvents(
    reporter: Reporter,
    modelName?: string
  ): Promise<{
    response: {
      id: string;
      reporterId: string;
      beat: string;
      headline: string;
      leadParagraph: string;
      body: string;
      keyQuotes: string[];
      sources: string[];
      wordCount: number;
      generationTime: number;
      reporterNotes: {
        researchQuality: string;
        sourceDiversity: string;
        factualAccuracy: string;
      };
      socialMediaSummary: string;
      messageIds: number[];
      potentialMessageIds: number[];
      modelName: string;
    };
    prompt: string;
    messages: BlueskyMessage[];
  } | null> {
    const generationTime = Date.now();
    const articleId = `article_${generationTime}_${Math.random().toString(36).substring(2, 8)}`;
    const beatsList = reporter.beats.join(", ");

    try {
      // Get reporter's 5 latest events
      const latestEvents = await this.dataStorageService.getEventsByReporter(
        reporter.id,
        5
      );

      // Get reporter's 5 latest articles for context
      const latestArticles =
        await this.dataStorageService.getArticlesByReporter(reporter.id, 5);

      // Format events for the prompt
      const eventsContext = AIResponseUtils.formatEventsContext(latestEvents);

      // Format recent article headlines for context
      const articlesContext =
        AIResponseUtils.formatArticlesContext(latestArticles);

      // Get configurable message slice count
      const messageSliceCount = await this.aiClient.getMessageSliceCount();

      // Fetch recent social media messages to inform article generation
      let socialMediaMessages: BlueskyMessage[] = [];
      try {
        socialMediaMessages =
          await this.fetchSocialMediaMessages(messageSliceCount);
      } catch (error) {
        console.warn("Failed to fetch social media messages:", error);
        // Continue with article generation even if social media fetch fails
      }

      // Format social media messages for the prompt
      const socialMediaContext =
        AIResponseUtils.formatSocialMediaContext(socialMediaMessages);

      const config = AIPrompts.generateArticlesFromEventsPrompts(
        reporter,
        beatsList,
        eventsContext,
        articlesContext,
        socialMediaContext
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `Calling openai articles from events generation with ${AIModelOption.ARTICLE_GENERATION}`
      );
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            {
              role: "system",
              content: config.systemPrompt
            },
            {
              role: "user",
              content: config.userPrompt
            }
          ],
          response_format: config.responseFormat
        }
      );

      // Track KPI usage
      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse(
        `Article from events for reporter ${reporter.id}`,
        result.response
      );

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      // Save the entire AI response to JSON file
      // await AIResponseUtils.saveResponseToFile(
      //   response,
      //   "article_from_events",
      //   generationTime
      // );

      const parsedResponse = reporterArticleSchema.parse(
        JSON.parse(content)
      ) as any;

      const metadata = AIResponseUtils.createArticleMetadata(
        articleId,
        reporter.id,
        generationTime,
        result.modelUsed,
        parsedResponse.body,
        result.response.usage
      );

      return {
        response: { ...parsedResponse, ...metadata },
        prompt: fullPrompt,
        messages: socialMediaMessages
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating article from events",
        `Article from events for reporter ${reporter.id}`,
        error
      );
      return null;
    }
  }

  async generateThreadReplyOptions(
    forumId: string,
    personaKey: string,
    modelName?: string
  ): Promise<{
    replies: string[][];
    threadIds: number[];
    threadTitles: string[];
    fullPrompt: string;
    modelName: string;
  }> {
    const personaData = await this.getPersona(personaKey);
    if (!personaData) {
      throw new Error(`Persona ${personaKey} not found`);
    }

    try {
      const threads = await this.dataStorageService.getForumThreads(
        forumId,
        0,
        3
      );

      if (threads.length === 0) {
        return {
          replies: [],
          threadIds: [],
          threadTitles: [],
          fullPrompt: "No threads available",
          modelName: modelName || "gpt-4o-mini"
        };
      }

      const postsResults = await Promise.all(
        threads.map((thread) =>
          this.dataStorageService.getThreadPosts(thread.id, 0, 1000)
        )
      );

      const promptData = postsResults.map((allPosts, index) => {
        const thread = threads[index];
        const postContents = allPosts.map((p) => p.content);
        const first10 = postContents.slice(0, 10);
        const last15 = postContents.slice(-15);
        const selectedPosts = [...first10, ...last15];

        const config = AIPrompts.generateGenericThreadReplyPrompts(
          personaData.system_prompt,
          personaData.display,
          thread.title,
          selectedPosts
        );
        const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

        return {
          thread,
          systemPrompt: config.systemPrompt,
          userPrompt: config.userPrompt,
          fullPrompt,
          responseFormat: config.responseFormat
        };
      });

      let completionModel = null;
      const replies = await Promise.all(
        promptData.map(
          async ({
            thread,
            systemPrompt,
            userPrompt,
            fullPrompt,
            responseFormat
          }) => {
            try {
              console.log(
                `Calling openai thread reply generation for thread ${thread.id} with ${AIModelOption.GENERAL}`
              );

              const completionResult = await this.aiClient.createChatCompletion(
                AIModelOption.GENERAL,
                {
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                  ],
                  response_format: responseFormat
                }
              );
              completionModel = completionResult.modelUsed;

              const content =
                completionResult.response.choices[0]?.message?.content;
              if (!content) {
                throw new Error("No response content from AI service");
              }

              const parsed = JSON.parse(content);

              await this.logAIResponse(
                `Thread reply generation for thread ${thread.id}`,
                completionResult.response
              );

              return parsed;
            } catch (error) {
              await this.logOpenAIError(
                `Error generating reply for thread ${thread.id}`,
                `Thread reply generation for thread ${thread.id}`,
                error
              );
              if (error && typeof error === "object" && "response" in error) {
                const err = error as { response?: { data?: unknown } };
                console.error("Response body:", err.response?.data);
              }
              return ["", "", ""];
            }
          }
        )
      );

      return {
        replies,
        threadIds: threads.map((t) => t.id),
        threadTitles: threads.map((t) => t.title),
        fullPrompt: promptData.map((p) => p.fullPrompt).join("\n\n---\n\n"),
        modelName: completionModel || ""
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating thread reply options",
        "Thread reply generation",
        error
      );
      throw error;
    }
  }

  async generateComment(
    dailyEditionText: string,
    existingComments: Array<{ author: string; content: string }>,
    modelName?: string,
    recentPosts?: string[]
  ): Promise<{
    topicIndex: number;
    persona: string;
    commentText: string;
    fullPrompt: string;
    modelName: string;
  } | null> {
    try {
      let persona: { system_prompt: string; display: string };
      const dynamicPersonas =
        await this.dataStorageService.getDynamicPersonas();
      if (
        dynamicPersonas &&
        dynamicPersonas.length > 0 &&
        Math.random() < 0.7
      ) {
        persona =
          dynamicPersonas[Math.floor(Math.random() * dynamicPersonas.length)];
        console.log(`Using dynamic persona: ${persona.display}`);
      } else {
        const personas: Persona[] = Object.keys(
          PERSONA_DISPLAY_NAMES
        ) as Persona[];
        const randomPersona =
          personas[Math.floor(Math.random() * personas.length)];
        persona = {
          system_prompt: PERSONA_SYSTEM_PROMPTS[randomPersona],
          display: PERSONA_DISPLAY_NAMES[randomPersona]
        };
        console.log(`Using classic persona: ${randomPersona}`);
      }

      const existingCommentsText = existingComments
        .map((c) => `- ${c.author}: ${c.content}`)
        .join("\n");

      const config = AIPrompts.generateCommentPromptsGeneric(
        persona.system_prompt,
        persona.display,
        dailyEditionText,
        existingCommentsText,
        recentPosts
      );

      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      const result = await this.aiClient.createChatCompletion(
        AIModelOption.GENERAL,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          reasoning_effort: "minimal",
          response_format: config.responseFormat
        },
        modelName
      );

      const usedModel = modelName || "gpt-4o-mini";

      const content = result.response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsed = JSON.parse(content);

      return {
        topicIndex: parsed.topicIndex,
        persona: persona.display,
        commentText: parsed.comment,
        fullPrompt,
        modelName: usedModel
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating comment",
        "Comment generation for daily edition",
        error
      );
      return null;
    }
  }

  async getPersona(
    personaKey: string
  ): Promise<{ system_prompt: string; display: string } | null> {
    const classicPersonas = await this.dataStorageService.getClassicPersonas();
    if (classicPersonas[personaKey as Persona]) {
      return {
        system_prompt: PERSONA_SYSTEM_PROMPTS[personaKey as Persona],
        display: classicPersonas[personaKey as Persona].display
      };
    }
    const dynamicPersonas = await this.dataStorageService.getDynamicPersonas();
    const dynamic = dynamicPersonas?.find((p) => p.display === personaKey);
    if (dynamic) {
      return {
        system_prompt: dynamic.system_prompt,
        display: dynamic.display
      };
    }
    return null;
  }

  async generateDynamicPersonas(
    editionText: string
  ): Promise<DynamicPersona[]> {
    console.log("Generating dynamic personas for edition");

    const config = AIPrompts.generateDynamicPersonasPrompts(editionText);

    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        const result = await this.aiClient.createChatCompletion(
          AIModelOption.GENERAL,
          {
            messages: [
              { role: "system", content: config.systemPrompt },
              { role: "user", content: config.userPrompt }
            ],
            reasoning_effort: "minimal",
            response_format: config.responseFormat
          }
        );
        const content = result.response.choices[0]?.message?.content;
        if (!content) throw new Error("No response from AI for personas");

        const parsed = JSON.parse(content);
        const personas = DynamicPersonasSchema.parse(parsed);
        await this.logAIResponse(
          "Dynamic personas generation",
          result.response
        );
        return personas;
      } catch (error) {
        attempts++;
        await this.logOpenAIError(
          `Persona generation attempt ${attempts} failed`,
          "Dynamic personas generation",
          error
        );
        if (attempts >= maxAttempts) {
          console.error("Max retries exceeded; falling back to empty personas");
          return [];
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }
    return [];
  }

  async generateTickerText(
    editionText: string,
    modelName?: string
  ): Promise<{
    text: string;
    fullPrompt: string;
    modelName: string;
    inputTokenCount?: number;
    outputTokenCount?: number;
  }> {
    console.log("Generating ticker text from daily edition");

    try {
      const config = AIPrompts.generateTickerPrompts(editionText);
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        },
        modelName
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse("Ticker text generation", result.response);

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsed = tickerSchema.parse(JSON.parse(content));

      return {
        text: parsed.text,
        fullPrompt,
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating ticker text",
        "Ticker text generation",
        error
      );
      throw error;
    }
  }

  async generateArticleFromTranscript(
    transcriptText: string,
    videoId: string,
    reporterId: string
  ): Promise<{
    article: Article;
    fullPrompt: string;
    modelName: string;
  }> {
    const generationTime = Date.now();
    const articleId = `article_${generationTime}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const config = AIPrompts.generateTranscriptArticlePrompts(
        transcriptText,
        videoId
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      const completionResult = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        }
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        completionResult.response,
        this.dataStorageService
      );

      await this.logAIResponse(
        "YouTube transcript article generation",
        completionResult.response
      );

      const content =
        completionResult.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      const parsed = youtubeTranscriptArticleSchema.parse(JSON.parse(content));

      const article: Article = {
        id: articleId,
        reporterId,
        headline: parsed.headline,
        body: parsed.body,
        generationTime,
        prompt: fullPrompt,
        messageIds: [],
        messageTexts: [],
        messageDids: [],
        messageRkeys: [],
        modelName: completionResult.modelUsed,
        inputTokenCount: completionResult.response.usage?.prompt_tokens,
        outputTokenCount: completionResult.response.usage?.completion_tokens
      };

      return { article, fullPrompt, modelName: completionResult.modelUsed };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating article from transcript",
        "YouTube transcript article generation",
        error
      );
      throw error;
    }
  }

  async generateOpinionArticle(): Promise<{
    opinion: OpinionArticle | null;
    fullPrompt: string;
    modelName: string;
  }> {
    console.log("AIService: Starting opinion article generation...");

    try {
      // 1. Randomly pick one of the 4 opinion personas
      const personaKey: OpinionPersona =
        OPINION_PERSONAS[Math.floor(Math.random() * OPINION_PERSONAS.length)];
      const personaSystemPrompt = OPINION_PERSONA_SYSTEM_PROMPTS[personaKey];
      const personaDisplayName = OPINION_PERSONA_DISPLAY_NAMES[personaKey];

      console.log(`AIService: Selected persona "${personaDisplayName}"`);

      // 2. Fetch latest 25 articles
      const articles = await this.dataStorageService.getLatestArticles(25);
      if (articles.length === 0) {
        console.log("AIService: No articles available for opinion generation");
        return {
          opinion: null,
          fullPrompt: "No articles available",
          modelName: ""
        };
      }

      console.log(
        `AIService: Fetched ${articles.length} articles for opinion context`
      );

      // 3. Format articles with full text
      const articlesText = AIResponseUtils.formatArticlesFullText(articles);

      // 4. Generate prompts
      const config = AIPrompts.generateOpinionArticlePrompts(
        articlesText,
        personaSystemPrompt,
        personaDisplayName
      );
      const fullPrompt = `System: ${config.systemPrompt}\n\nUser: ${config.userPrompt}`;

      console.log(
        `AIService: Calling opinion generation with ${AIModelOption.ARTICLE_GENERATION}`
      );

      // 5. Call AI
      const result = await this.aiClient.createChatCompletion(
        AIModelOption.ARTICLE_GENERATION,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        }
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      await this.logAIResponse("Opinion article generation", result.response);

      const content = result.response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("No response content from AI service");
      }

      // 7. Parse response — declined means "no opinion warranted"
      const parsed = opinionArticleSchema.parse(JSON.parse(content));

      if (parsed.declined) {
        console.log(
          `AIService: ${personaDisplayName} declined to write an opinion piece`
        );
        return {
          opinion: null,
          fullPrompt,
          modelName: result.modelUsed
        };
      }

      // 8. Build OpinionArticle
      const now = Date.now();
      const opinionArticle: OpinionArticle = {
        id: `opinion_${now}_${Math.random().toString(36).substring(2, 8)}`,
        persona: personaKey,
        headline: parsed.headline ?? "",
        content: parsed.content ?? "",
        generationTime: now,
        articleIds: articles.map((a) => a.id),
        modelName: result.modelUsed,
        inputTokenCount: result.response.usage?.prompt_tokens,
        outputTokenCount: result.response.usage?.completion_tokens
      };

      // 9. Save
      await this.dataStorageService.saveOpinionArticle(opinionArticle);

      console.log(
        `AIService: Opinion article "${opinionArticle.headline}" saved (persona: ${personaDisplayName})`
      );

      return {
        opinion: opinionArticle,
        fullPrompt,
        modelName: result.modelUsed
      };
    } catch (error) {
      await this.logOpenAIError(
        "Error generating opinion article",
        "Opinion article generation",
        error
      );
      throw error;
    }
  }

  async checkAndReplyToChatMessage(
    userMessage: string,
    pastMessages?: { role: "user" | "assistant"; content: string }[]
  ): Promise<{ isSafe: boolean; reply: string | null }> {
    try {
      const editions = await this.dataStorageService.getDailyEditions(1);
      const dailyEdition = editions.length > 0 ? editions[0] : undefined;

      const config = AIPrompts.generateHomepageChatSafetyAndReplyPrompts(
        userMessage,
        pastMessages,
        dailyEdition
      );

      const result = await this.aiClient.createChatCompletion(
        AIModelOption.GENERAL,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        }
      );

      const content = result.response.choices[0]?.message?.content;
      if (!content) {
        return { isSafe: true, reply: "..." };
      }

      const parsed = homepageChatSafetyAndReplySchema.parse(
        JSON.parse(content)
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      return parsed;
    } catch (error) {
      console.error("Error in chat safety/reply:", error);
      return { isSafe: true, reply: "..." };
    }
  }

  async generateHomepageChatVisitorMessage(
    pastMessages: { role: "user" | "assistant"; content: string }[]
  ): Promise<{ content: string }> {
    try {
      const editions = await this.dataStorageService.getDailyEditions(1);
      const dailyEdition = editions.length > 0 ? editions[0] : undefined;

      const conversationHistory = pastMessages
        .map(
          (m) => `${m.role === "user" ? "User" : "Assistant"}: "${m.content}"`
        )
        .join("\n");

      const config = AIPrompts.generateHomepageChatVisitorMessagePrompts(
        conversationHistory,
        dailyEdition
      );

      const result = await this.aiClient.createChatCompletion(
        AIModelOption.GENERAL,
        {
          messages: [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: config.userPrompt }
          ],
          response_format: config.responseFormat
        }
      );

      const content = result.response.choices[0]?.message?.content;
      if (!content) {
        return { content: "..." };
      }

      const parsed = homepageChatVisitorMessageSchema.parse(
        JSON.parse(content)
      );

      await KpiService.incrementKpisFromOpenAIResponse(
        result.response,
        this.dataStorageService
      );

      return parsed;
    } catch (error) {
      console.error("Error generating homepage chat visitor message:", error);
      return { content: "..." };
    }
  }
}
