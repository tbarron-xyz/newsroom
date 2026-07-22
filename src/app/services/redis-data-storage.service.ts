import { createClient, RedisClientType } from "redis";
import {
  Editor,
  Reporter,
  Article,
  OpinionArticle,
  OpinionPersona,
  NewspaperEdition,
  DailyEdition,
  Event,
  User,
  REDIS_KEYS,
  ForumSection,
  ForumThread,
  ForumPost,
  DynamicPersona,
  Artifact,
  PrismDailyEditionPair,
  Ticker,
  HomepageChatMessage,
  ResearchEntry
} from "../schemas/types";
import { CLASSIC_PERSONAS } from "./ai-prompts";
import { IDataStorageService } from "./data-storage.interface";
import { DynamicPersonasSchema } from "../schemas/response-schemas";

export class RedisDataStorageService implements IDataStorageService {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379"
      // Add username/password if needed
      // username: 'default',
      // password: 'yourpassword'
    });

    this.client.on("error", (err: Error) => {
      console.error("Redis Client Error:", err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (e) {
      console.log(e);
    }
    console.log("Connected to Redis");
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    console.log("Disconnected from Redis");
  }

  // Editor operations
  async saveEditor(editor: Editor): Promise<void> {
    const multi = this.client.multi();
    console.log("Redis Write: SET", REDIS_KEYS.EDITOR_BIO, editor.bio);
    multi.set(REDIS_KEYS.EDITOR_BIO, editor.bio);
    console.log("Redis Write: SET", REDIS_KEYS.EDITOR_PROMPT, editor.prompt);
    multi.set(REDIS_KEYS.EDITOR_PROMPT, editor.prompt);
    console.log("Redis Write: SET", REDIS_KEYS.MODEL_NAME, editor.modelName);
    multi.set(REDIS_KEYS.MODEL_NAME, editor.modelName);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_ARTICLE_MODEL_NAME,
      editor.articleModelName
    );
    multi.set(REDIS_KEYS.EDITOR_ARTICLE_MODEL_NAME, editor.articleModelName);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_EVENT_MODEL_NAME,
      editor.eventModelName
    );
    multi.set(REDIS_KEYS.EDITOR_EVENT_MODEL_NAME, editor.eventModelName);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_STORY_SELECTION_MODEL_NAME,
      editor.storySelectionModelName
    );
    multi.set(
      REDIS_KEYS.EDITOR_STORY_SELECTION_MODEL_NAME,
      editor.storySelectionModelName
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_EDITION_SELECTION_MODEL_NAME,
      editor.editionSelectionModelName
    );
    multi.set(
      REDIS_KEYS.EDITOR_EDITION_SELECTION_MODEL_NAME,
      editor.editionSelectionModelName
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_CHAT_MODEL_NAME,
      editor.chatModelName
    );
    multi.set(REDIS_KEYS.EDITOR_CHAT_MODEL_NAME, editor.chatModelName);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_RESEARCH_MODEL_NAME,
      editor.researchModelName
    );
    multi.set(REDIS_KEYS.EDITOR_RESEARCH_MODEL_NAME, editor.researchModelName);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITOR_MESSAGE_SLICE_COUNT,
      editor.messageSliceCount.toString()
    );
    multi.set(
      REDIS_KEYS.EDITOR_MESSAGE_SLICE_COUNT,
      editor.messageSliceCount.toString()
    );
    if (editor.baseUrl !== undefined) {
      console.log("Redis Write: SET", REDIS_KEYS.BASE_URL, editor.baseUrl);
      multi.set(REDIS_KEYS.BASE_URL, editor.baseUrl);
    }
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_GENERATION_PERIOD_MINUTES,
      editor.articleGenerationPeriodMinutes.toString()
    );
    multi.set(
      REDIS_KEYS.ARTICLE_GENERATION_PERIOD_MINUTES,
      editor.articleGenerationPeriodMinutes.toString()
    );
    if (editor.lastArticleGenerationTime !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.LAST_ARTICLE_GENERATION_TIME,
        editor.lastArticleGenerationTime.toString()
      );
      multi.set(
        REDIS_KEYS.LAST_ARTICLE_GENERATION_TIME,
        editor.lastArticleGenerationTime.toString()
      );
    }
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_GENERATION_PERIOD_MINUTES,
      editor.eventGenerationPeriodMinutes.toString()
    );
    multi.set(
      REDIS_KEYS.EVENT_GENERATION_PERIOD_MINUTES,
      editor.eventGenerationPeriodMinutes.toString()
    );
    if (editor.lastEventGenerationTime !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.LAST_EVENT_GENERATION_TIME,
        editor.lastEventGenerationTime.toString()
      );
      multi.set(
        REDIS_KEYS.LAST_EVENT_GENERATION_TIME,
        editor.lastEventGenerationTime.toString()
      );
    }
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITION_GENERATION_PERIOD_MINUTES,
      editor.editionGenerationPeriodMinutes.toString()
    );
    multi.set(
      REDIS_KEYS.EDITION_GENERATION_PERIOD_MINUTES,
      editor.editionGenerationPeriodMinutes.toString()
    );
    if (editor.lastEditionGenerationTime !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.LAST_EDITION_GENERATION_TIME,
        editor.lastEditionGenerationTime.toString()
      );
      multi.set(
        REDIS_KEYS.LAST_EDITION_GENERATION_TIME,
        editor.lastEditionGenerationTime.toString()
      );
    }
    await multi.exec();
  }

  async getEditor(): Promise<Editor | null> {
    const [
      bio,
      prompt,
      modelName,
      articleModelName,
      eventModelName,
      storySelectionModelName,
      editionSelectionModelName,
      chatModelName,
      researchModelName,
      messageSliceCountStr,
      baseUrl,
      articleGenerationPeriodMinutesStr,
      lastArticleGenerationTimeStr,
      eventGenerationPeriodMinutesStr,
      lastEventGenerationTimeStr,
      editionGenerationPeriodMinutesStr,
      lastEditionGenerationTimeStr
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.EDITOR_BIO),
      this.client.get(REDIS_KEYS.EDITOR_PROMPT),
      this.client.get(REDIS_KEYS.MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_ARTICLE_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_EVENT_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_STORY_SELECTION_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_EDITION_SELECTION_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_CHAT_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_RESEARCH_MODEL_NAME),
      this.client.get(REDIS_KEYS.EDITOR_MESSAGE_SLICE_COUNT),
      this.client.get(REDIS_KEYS.BASE_URL),
      this.client.get(REDIS_KEYS.ARTICLE_GENERATION_PERIOD_MINUTES),
      this.client.get(REDIS_KEYS.LAST_ARTICLE_GENERATION_TIME),
      this.client.get(REDIS_KEYS.EVENT_GENERATION_PERIOD_MINUTES),
      this.client.get(REDIS_KEYS.LAST_EVENT_GENERATION_TIME),
      this.client.get(REDIS_KEYS.EDITION_GENERATION_PERIOD_MINUTES),
      this.client.get(REDIS_KEYS.LAST_EDITION_GENERATION_TIME)
    ]);

    if (!bio || !prompt) return null;

    return {
      bio,
      prompt,
      modelName: modelName || "gpt-5-nano", // Default fallback
      articleModelName: articleModelName || "gpt-5-nano", // Default fallback
      eventModelName: eventModelName || "gpt-5-nano", // Default fallback
      storySelectionModelName: storySelectionModelName || "gpt-5-nano", // Default fallback
      editionSelectionModelName: editionSelectionModelName || "gpt-5-nano", // Default fallback
      chatModelName: chatModelName || "gpt-5-nano", // Default fallback
      researchModelName: researchModelName || "gpt-5-nano", // Default fallback
      messageSliceCount: messageSliceCountStr
        ? parseInt(messageSliceCountStr)
        : 200, // Default fallback
      baseUrl: baseUrl || undefined, // Optional field
      articleGenerationPeriodMinutes: articleGenerationPeriodMinutesStr
        ? parseInt(articleGenerationPeriodMinutesStr)
        : 15, // Default fallback
      lastArticleGenerationTime: lastArticleGenerationTimeStr
        ? parseInt(lastArticleGenerationTimeStr)
        : undefined, // Optional field
      eventGenerationPeriodMinutes: eventGenerationPeriodMinutesStr
        ? parseInt(eventGenerationPeriodMinutesStr)
        : 30, // Default fallback
      lastEventGenerationTime: lastEventGenerationTimeStr
        ? parseInt(lastEventGenerationTimeStr)
        : undefined, // Optional field
      editionGenerationPeriodMinutes: editionGenerationPeriodMinutesStr
        ? parseInt(editionGenerationPeriodMinutesStr)
        : 180, // Default to 3 hours
      lastEditionGenerationTime: lastEditionGenerationTimeStr
        ? parseInt(lastEditionGenerationTimeStr)
        : undefined // Optional field
    };
  }

  // Reporter operations
  async saveReporter(reporter: Reporter): Promise<void> {
    const multi = this.client.multi();
    console.log("Redis Write: SADD", REDIS_KEYS.REPORTERS, reporter.id);
    multi.sAdd(REDIS_KEYS.REPORTERS, reporter.id);
    console.log("Redis Write: DEL", REDIS_KEYS.REPORTER_BEATS(reporter.id));
    multi.del(REDIS_KEYS.REPORTER_BEATS(reporter.id));
    reporter.beats.forEach((beat) => {
      console.log(
        "Redis Write: SADD",
        REDIS_KEYS.REPORTER_BEATS(reporter.id),
        beat
      );
      multi.sAdd(REDIS_KEYS.REPORTER_BEATS(reporter.id), beat);
    });
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.REPORTER_PROMPT(reporter.id),
      reporter.prompt
    );
    multi.set(REDIS_KEYS.REPORTER_PROMPT(reporter.id), reporter.prompt);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.REPORTER_ENABLED(reporter.id),
      reporter.enabled.toString()
    );
    multi.set(
      REDIS_KEYS.REPORTER_ENABLED(reporter.id),
      reporter.enabled.toString()
    );
    await multi.exec();
  }

  /**
   * O(r) where r = number of reporters. Uses pipeline to batch all GET commands.
   */
  async getAllReporters(): Promise<Reporter[]> {
    const reporterIds = await this.client.sMembers(REDIS_KEYS.REPORTERS);
    if (reporterIds.length === 0) return [];

    const multi = this.client.multi();

    for (const id of reporterIds) {
      multi.sMembers(REDIS_KEYS.REPORTER_BEATS(id));
      multi.get(REDIS_KEYS.REPORTER_PROMPT(id));
      multi.get(REDIS_KEYS.REPORTER_ENABLED(id));
    }

    const results = await multi.exec();
    if (!results) return [];

    const reporters: Reporter[] = [];
    for (let i = 0; i < reporterIds.length; i++) {
      const baseIdx = i * 3;
      const beats = results[baseIdx] as unknown as string[] | null;
      const prompt = results[baseIdx + 1] as unknown as string | null;
      const enabledStr = results[baseIdx + 2] as unknown as string | null;

      if (prompt) {
        reporters.push({
          id: reporterIds[i],
          beats: beats || [],
          prompt,
          enabled: enabledStr === null ? true : enabledStr === "true"
        });
      }
    }

    return reporters;
  }

  /**
   * O(1) - parallel GET for beats, prompt, enabled.
   */
  async getReporter(id: string): Promise<Reporter | null> {
    const [beats, prompt, enabledStr] = await Promise.all([
      this.client.sMembers(REDIS_KEYS.REPORTER_BEATS(id)),
      this.client.get(REDIS_KEYS.REPORTER_PROMPT(id)),
      this.client.get(REDIS_KEYS.REPORTER_ENABLED(id))
    ]);

    if (!prompt) return null;

    // Default to true for backward compatibility with existing reporters
    const enabled = enabledStr === null ? true : enabledStr === "true";

    return {
      id,
      beats,
      prompt,
      enabled
    };
  }

  // Article operations
  async saveArticle(article: Article): Promise<void> {
    const articleId = article.id;
    const multi = this.client.multi();

    // Add to reporter's article sorted set
    console.log(
      "Redis Write: ZADD",
      REDIS_KEYS.ARTICLES_BY_REPORTER(article.reporterId),
      {
        score: article.generationTime,
        value: articleId
      }
    );
    multi.zAdd(REDIS_KEYS.ARTICLES_BY_REPORTER(article.reporterId), {
      score: article.generationTime,
      value: articleId
    });

    // Add to global latest articles sorted set
    console.log("Redis Write: ZADD", REDIS_KEYS.ARTICLES_LATEST, {
      score: article.generationTime,
      value: articleId
    });
    multi.zAdd(REDIS_KEYS.ARTICLES_LATEST, {
      score: article.generationTime,
      value: articleId
    });

    // Prune old entries if exceeding max length
    console.log(
      "Redis Write: ZREMRANGEBYRANK",
      REDIS_KEYS.ARTICLES_LATEST,
      0,
      -(REDIS_KEYS.ARTICLES_LATEST_MAX_LENGTH + 1)
    );
    multi.zRemRangeByRank(
      REDIS_KEYS.ARTICLES_LATEST,
      0,
      -(REDIS_KEYS.ARTICLES_LATEST_MAX_LENGTH + 1)
    );

    // Store article data
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_HEADLINE(articleId),
      article.headline
    );
    multi.set(REDIS_KEYS.ARTICLE_HEADLINE(articleId), article.headline);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_BODY(articleId),
      article.body
    );
    multi.set(REDIS_KEYS.ARTICLE_BODY(articleId), article.body);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_TIME(articleId),
      article.generationTime.toString()
    );
    multi.set(
      REDIS_KEYS.ARTICLE_TIME(articleId),
      article.generationTime.toString()
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_PROMPT(articleId),
      article.prompt
    );
    multi.set(REDIS_KEYS.ARTICLE_PROMPT(articleId), article.prompt);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_MESSAGE_IDS(articleId),
      JSON.stringify(article.messageIds)
    );
    multi.set(
      REDIS_KEYS.ARTICLE_MESSAGE_IDS(articleId),
      JSON.stringify(article.messageIds)
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_MESSAGE_TEXTS(articleId),
      JSON.stringify(article.messageTexts)
    );
    multi.set(
      REDIS_KEYS.ARTICLE_MESSAGE_TEXTS(articleId),
      JSON.stringify(article.messageTexts)
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_MESSAGE_DIDS(articleId),
      JSON.stringify(article.messageDids)
    );
    multi.set(
      REDIS_KEYS.ARTICLE_MESSAGE_DIDS(articleId),
      JSON.stringify(article.messageDids)
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_MESSAGE_RKEYS(articleId),
      JSON.stringify(article.messageRkeys)
    );
    multi.set(
      REDIS_KEYS.ARTICLE_MESSAGE_RKEYS(articleId),
      JSON.stringify(article.messageRkeys)
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_MODEL_NAME(articleId),
      article.modelName
    );
    multi.set(REDIS_KEYS.ARTICLE_MODEL_NAME(articleId), article.modelName);
    if (article.inputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.ARTICLE_INPUT_TOKEN_COUNT(articleId),
        article.inputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.ARTICLE_INPUT_TOKEN_COUNT(articleId),
        article.inputTokenCount.toString()
      );
    }
    if (article.outputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.ARTICLE_OUTPUT_TOKEN_COUNT(articleId),
        article.outputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.ARTICLE_OUTPUT_TOKEN_COUNT(articleId),
        article.outputTokenCount.toString()
      );
    }

    console.log(
      "Redis Write: SET",
      REDIS_KEYS.ARTICLE_REPORTER(articleId),
      article.reporterId
    );
    multi.set(REDIS_KEYS.ARTICLE_REPORTER(articleId), article.reporterId);

    await multi.exec();

    // Trim per-reporter articles zset to 200 most recent
    const MAX_ARTICLES_PER_REPORTER = 200;
    const reporterArticlesKey = REDIS_KEYS.ARTICLES_BY_REPORTER(
      article.reporterId
    );
    const card = await this.client.zCard(reporterArticlesKey);
    if (card > MAX_ARTICLES_PER_REPORTER) {
      const numToRemove = card - MAX_ARTICLES_PER_REPORTER;
      const oldIds = await this.client.zRange(
        reporterArticlesKey,
        0,
        numToRemove - 1
      );
      await this.client.zRemRangeByRank(
        reporterArticlesKey,
        0,
        -(MAX_ARTICLES_PER_REPORTER + 1)
      );
      for (const id of oldIds) {
        await this.deleteArticleKeys(id);
      }
    }
  }

  private async deleteArticleKeys(articleId: string): Promise<void> {
    const keys = [
      REDIS_KEYS.ARTICLE_HEADLINE(articleId),
      REDIS_KEYS.ARTICLE_BODY(articleId),
      REDIS_KEYS.ARTICLE_TIME(articleId),
      REDIS_KEYS.ARTICLE_PROMPT(articleId),
      REDIS_KEYS.ARTICLE_MESSAGE_IDS(articleId),
      REDIS_KEYS.ARTICLE_MESSAGE_TEXTS(articleId),
      REDIS_KEYS.ARTICLE_MESSAGE_DIDS(articleId),
      REDIS_KEYS.ARTICLE_MESSAGE_RKEYS(articleId),
      REDIS_KEYS.ARTICLE_MODEL_NAME(articleId),
      REDIS_KEYS.ARTICLE_INPUT_TOKEN_COUNT(articleId),
      REDIS_KEYS.ARTICLE_OUTPUT_TOKEN_COUNT(articleId),
      REDIS_KEYS.ARTICLE_REPORTER(articleId)
    ];
    console.log(`Deleting ${keys.length} keys for article: ${articleId}`);
    if (keys.length) await this.client.del(keys);
  }

  /**
   * O(m) where m = number of articles returned (limited to 100). Sequential loop.
   */
  async getLatestArticles(limit?: number): Promise<Article[]> {
    const count = limit || 100;
    const articleIds = await this.client.ZRANGE(
      REDIS_KEYS.ARTICLES_LATEST,
      0,
      count - 1,
      { REV: true }
    );

    const articles: Article[] = [];
    for (const articleId of articleIds) {
      const article = await this.getArticle(articleId);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  }

  /**
   * O(n) where n = number of articles in the latest set.
   */
  async searchArticles(query: string, limit?: number): Promise<Article[]> {
    const count = limit || 20;
    const articleIds = await this.client.ZRANGE(
      REDIS_KEYS.ARTICLES_LATEST,
      0,
      -1,
      { REV: true }
    );

    const matching: Article[] = [];
    const lowerQuery = query.toLowerCase();
    for (const articleId of articleIds) {
      if (matching.length >= count) break;
      const article = await this.getArticle(articleId);
      if (
        article &&
        (article.headline.toLowerCase().includes(lowerQuery) ||
          article.body.toLowerCase().includes(lowerQuery))
      ) {
        matching.push(article);
      }
    }

    return matching;
  }

  /**
   * O(m) where m = number of articles for this reporter.
   */
  async getArticlesByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Article[]> {
    const count = limit || -1;
    const articleIds = await this.client.ZRANGE(
      REDIS_KEYS.ARTICLES_BY_REPORTER(reporterId),
      0,
      count == -1 ? count : count - 1,
      { REV: true }
    );

    const articles: Article[] = [];
    for (const articleId of articleIds) {
      const article = await this.getArticle(articleId);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  }

  /**
   * O(m) where m = number of articles in the time range for this reporter.
   */
  async getArticlesInTimeRange(
    reporterId: string,
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const articleIds = await this.client.zRangeByScore(
      REDIS_KEYS.ARTICLES_BY_REPORTER(reporterId),
      startTime,
      endTime
    );

    const articles: Article[] = [];
    for (const articleId of articleIds) {
      const article = await this.getArticle(articleId);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  }

  /**
   * O(m) where m = number of articles in the global time range.
   * Uses ARTICLES_LATEST sorted set for efficient time-based retrieval.
   */
  async getArticlesInTimeRangeGlobal(
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const articleIds = await this.client.zRangeByScore(
      REDIS_KEYS.ARTICLES_LATEST,
      startTime,
      endTime
    );

    if (articleIds.length === 0) return [];

    const articles = await Promise.all(
      articleIds.map((id) => this.getArticle(id))
    );

    return articles.filter((a): a is Article => a !== null);
  }

  /**
   * O(r) where r = number of reporters. Uses mapping key when available (O(1)).
   */
  async getArticle(articleId: string): Promise<Article | null> {
    const [
      headline,
      body,
      timeStr,
      prompt,
      messageIdsJson,
      messageTextsJson,
      messageDidsJson,
      messageRkeysJson,
      modelName,
      inputTokenCountStr,
      outputTokenCountStr
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.ARTICLE_HEADLINE(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_BODY(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_TIME(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_PROMPT(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_MESSAGE_IDS(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_MESSAGE_TEXTS(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_MESSAGE_DIDS(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_MESSAGE_RKEYS(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_MODEL_NAME(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_INPUT_TOKEN_COUNT(articleId)),
      this.client.get(REDIS_KEYS.ARTICLE_OUTPUT_TOKEN_COUNT(articleId))
    ]);

    if (!headline || !body || !timeStr) return null;

    // Get reporter ID from mapping key (O(1)), fallback to legacy search if missing
    let reporterId = await this.client.get(
      REDIS_KEYS.ARTICLE_REPORTER(articleId)
    );
    if (!reporterId) {
      reporterId = await this.findReporterForArticle(articleId);
    }
    if (!reporterId) return null;

    // Parse messageIds and messageTexts JSON
    let messageIds: number[] = [];
    let messageTexts: string[] = [];
    let messageDids: string[] = [];
    let messageRkeys: string[] = [];

    if (messageIdsJson) {
      try {
        messageIds = JSON.parse(messageIdsJson);
      } catch (error) {
        console.error("Error parsing messageIds JSON:", error);
        messageIds = [];
      }
    }

    if (messageTextsJson) {
      try {
        messageTexts = JSON.parse(messageTextsJson);
      } catch (error) {
        console.error("Error parsing messageTexts JSON:", error);
        messageTexts = [];
      }
    }

    if (messageDidsJson) {
      try {
        messageDids = JSON.parse(messageDidsJson);
      } catch (error) {
        console.error("Error parsing messageDids JSON:", error);
        messageDids = [];
      }
    }

    if (messageRkeysJson) {
      try {
        messageRkeys = JSON.parse(messageRkeysJson);
      } catch (error) {
        console.error("Error parsing messageRkeys JSON:", error);
        messageRkeys = [];
      }
    }

    return {
      id: articleId,
      reporterId,
      headline,
      body,
      generationTime: parseInt(timeStr),
      prompt:
        prompt ||
        "Prompt not available (generated before prompt storage was implemented)",
      messageIds,
      messageTexts,
      messageDids,
      messageRkeys,
      modelName: modelName || "gpt-5-nano", // Default for backward compatibility
      inputTokenCount: inputTokenCountStr
        ? parseInt(inputTokenCountStr)
        : undefined,
      outputTokenCount: outputTokenCountStr
        ? parseInt(outputTokenCountStr)
        : undefined
    };
  }

  /**
   * O(r) where r = number of reporters. Scans ALL reporter sorted sets to find ownership.
   */
  private async findReporterForArticle(
    articleId: string
  ): Promise<string | null> {
    const reporterIds = await this.client.sMembers(REDIS_KEYS.REPORTERS);

    for (const reporterId of reporterIds) {
      const exists = await this.client.zScore(
        REDIS_KEYS.ARTICLES_BY_REPORTER(reporterId),
        articleId
      );
      if (exists !== null) {
        return reporterId;
      }
    }

    return null;
  }

  async deleteArticle(articleId: string): Promise<boolean> {
    const article = await this.getArticle(articleId);
    if (!article) return false;

    await this.deleteArticleKeys(articleId);

    await this.client.zRem(REDIS_KEYS.ARTICLES_LATEST, articleId);
    await this.client.zRem(
      REDIS_KEYS.ARTICLES_BY_REPORTER(article.reporterId),
      articleId
    );

    return true;
  }

  // Event operations
  async saveEvent(event: Event): Promise<void> {
    const eventId = event.id;
    const multi = this.client.multi();

    // Add to reporter's event sorted set
    console.log(
      "Redis Write: ZADD",
      REDIS_KEYS.EVENTS_BY_REPORTER(event.reporterId),
      {
        score: event.createdTime,
        value: eventId
      }
    );
    multi.zAdd(REDIS_KEYS.EVENTS_BY_REPORTER(event.reporterId), {
      score: event.createdTime,
      value: eventId
    });

    // Add to global sorted set for fast retrieval of latest events
    multi.zAdd(REDIS_KEYS.EVENTS_LATEST, {
      score: event.updatedTime,
      value: eventId
    });

    // Trim to keep only the latest MAX_EVENTS entries
    const MAX_EVENTS = 50;
    multi.zRemRangeByRank(REDIS_KEYS.EVENTS_LATEST, 0, -(MAX_EVENTS + 1));

    // Store event data
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_TITLE(eventId),
      event.title
    );
    multi.set(REDIS_KEYS.EVENT_TITLE(eventId), event.title);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_CREATED_TIME(eventId),
      event.createdTime.toString()
    );
    multi.set(
      REDIS_KEYS.EVENT_CREATED_TIME(eventId),
      event.createdTime.toString()
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_UPDATED_TIME(eventId),
      event.updatedTime.toString()
    );
    multi.set(
      REDIS_KEYS.EVENT_UPDATED_TIME(eventId),
      event.updatedTime.toString()
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_FACTS(eventId),
      JSON.stringify(event.facts)
    );
    multi.set(REDIS_KEYS.EVENT_FACTS(eventId), JSON.stringify(event.facts));
    if (event.where) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EVENT_WHERE(eventId),
        event.where
      );
      multi.set(REDIS_KEYS.EVENT_WHERE(eventId), event.where);
    }
    if (event.when) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EVENT_WHEN(eventId),
        event.when
      );
      multi.set(REDIS_KEYS.EVENT_WHEN(eventId), event.when);
    }
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_MESSAGE_IDS(eventId),
      JSON.stringify(event.messageIds || [])
    );
    multi.set(
      REDIS_KEYS.EVENT_MESSAGE_IDS(eventId),
      JSON.stringify(event.messageIds || [])
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_MESSAGE_TEXTS(eventId),
      JSON.stringify(event.messageTexts || [])
    );
    multi.set(
      REDIS_KEYS.EVENT_MESSAGE_TEXTS(eventId),
      JSON.stringify(event.messageTexts || [])
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_MODEL_NAME(eventId),
      event.modelName
    );
    multi.set(REDIS_KEYS.EVENT_MODEL_NAME(eventId), event.modelName);
    if (event.inputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EVENT_INPUT_TOKEN_COUNT(eventId),
        event.inputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.EVENT_INPUT_TOKEN_COUNT(eventId),
        event.inputTokenCount.toString()
      );
    }
    if (event.outputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EVENT_OUTPUT_TOKEN_COUNT(eventId),
        event.outputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.EVENT_OUTPUT_TOKEN_COUNT(eventId),
        event.outputTokenCount.toString()
      );
    }

    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EVENT_REPORTER(eventId),
      event.reporterId
    );
    multi.set(REDIS_KEYS.EVENT_REPORTER(eventId), event.reporterId);

    await multi.exec();

    // Trim per-reporter events zset to 400 most recent
    const MAX_EVENTS_PER_REPORTER = 400;
    const reporterEventsKey = REDIS_KEYS.EVENTS_BY_REPORTER(event.reporterId);
    const card = await this.client.zCard(reporterEventsKey);
    if (card > MAX_EVENTS_PER_REPORTER) {
      const numToRemove = card - MAX_EVENTS_PER_REPORTER;
      const oldIds = await this.client.zRange(
        reporterEventsKey,
        0,
        numToRemove - 1
      );
      await this.client.zRemRangeByRank(
        reporterEventsKey,
        0,
        -(MAX_EVENTS_PER_REPORTER + 1)
      );
      for (const id of oldIds) {
        await this.deleteEventKeys(id);
      }
    }
  }

  private async deleteEventKeys(eventId: string): Promise<void> {
    const keys = [
      REDIS_KEYS.EVENT_TITLE(eventId),
      REDIS_KEYS.EVENT_CREATED_TIME(eventId),
      REDIS_KEYS.EVENT_UPDATED_TIME(eventId),
      REDIS_KEYS.EVENT_FACTS(eventId),
      REDIS_KEYS.EVENT_WHERE(eventId),
      REDIS_KEYS.EVENT_WHEN(eventId),
      REDIS_KEYS.EVENT_MESSAGE_IDS(eventId),
      REDIS_KEYS.EVENT_MESSAGE_TEXTS(eventId),
      REDIS_KEYS.EVENT_MODEL_NAME(eventId),
      REDIS_KEYS.EVENT_INPUT_TOKEN_COUNT(eventId),
      REDIS_KEYS.EVENT_OUTPUT_TOKEN_COUNT(eventId),
      REDIS_KEYS.EVENT_REPORTER(eventId)
    ];
    console.log(`Deleting ${keys.length} keys for event: ${eventId}`);
    if (keys.length) await this.client.del(keys);
  }

  /**
   * O(m) where m = number of events for this reporter.
   */
  async getEventsByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Event[]> {
    const count = limit || -1;
    const eventIds = await this.client.ZRANGE(
      REDIS_KEYS.EVENTS_BY_REPORTER(reporterId),
      0,
      count == -1 ? count : count - 1,
      { REV: true }
    );

    const events: Event[] = [];
    for (const eventId of eventIds) {
      const event = await this.getEvent(eventId);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * O(m) where m = number of events returned (limited to 100). Uses Promise.all for parallel fetch.
   */
  async getLatestUpdatedEvents(limit?: number): Promise<Event[]> {
    const eventIds = await this.client.ZRANGE(
      REDIS_KEYS.EVENTS_LATEST,
      0,
      (limit || 100) - 1,
      { REV: true }
    );

    if (eventIds.length === 0) return [];

    const events = await Promise.all(eventIds.map((id) => this.getEvent(id)));

    return events.filter((e): e is Event => e !== null);
  }

  /**
   * O(r) where r = number of reporters. Calls findReporterForEvent internally.
   */
  async getEvent(eventId: string): Promise<Event | null> {
    const [
      title,
      createdTimeStr,
      updatedTimeStr,
      factsJson,
      where,
      when,
      messageIdsJson,
      messageTextsJson,
      modelName,
      inputTokenCountStr,
      outputTokenCountStr
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.EVENT_TITLE(eventId)),
      this.client.get(REDIS_KEYS.EVENT_CREATED_TIME(eventId)),
      this.client.get(REDIS_KEYS.EVENT_UPDATED_TIME(eventId)),
      this.client.get(REDIS_KEYS.EVENT_FACTS(eventId)),
      this.client.get(REDIS_KEYS.EVENT_WHERE(eventId)),
      this.client.get(REDIS_KEYS.EVENT_WHEN(eventId)),
      this.client.get(REDIS_KEYS.EVENT_MESSAGE_IDS(eventId)),
      this.client.get(REDIS_KEYS.EVENT_MESSAGE_TEXTS(eventId)),
      this.client.get(REDIS_KEYS.EVENT_MODEL_NAME(eventId)),
      this.client.get(REDIS_KEYS.EVENT_INPUT_TOKEN_COUNT(eventId)),
      this.client.get(REDIS_KEYS.EVENT_OUTPUT_TOKEN_COUNT(eventId))
    ]);

    if (!title || !createdTimeStr || !updatedTimeStr || !factsJson) return null;

    // Get reporter ID from mapping key (O(1)), fallback to legacy search if missing
    let reporterId = await this.client.get(REDIS_KEYS.EVENT_REPORTER(eventId));
    if (!reporterId) {
      reporterId = await this.findReporterForEvent(eventId);
    }
    if (!reporterId) return null;

    // Parse facts JSON
    let facts: string[] = [];
    if (factsJson) {
      try {
        facts = JSON.parse(factsJson);
      } catch (error) {
        console.error("Error parsing event facts JSON:", error);
        facts = [];
      }
    }

    // Parse message IDs JSON
    let messageIds: number[] = [];
    if (messageIdsJson) {
      try {
        messageIds = JSON.parse(messageIdsJson);
      } catch (error) {
        console.error("Error parsing event messageIds JSON:", error);
        messageIds = [];
      }
    }

    // Parse message texts JSON
    let messageTexts: string[] = [];
    if (messageTextsJson) {
      try {
        messageTexts = JSON.parse(messageTextsJson);
      } catch (error) {
        console.error("Error parsing event messageTexts JSON:", error);
        messageTexts = [];
      }
    }

    return {
      id: eventId,
      reporterId,
      title,
      createdTime: parseInt(createdTimeStr),
      updatedTime: parseInt(updatedTimeStr),
      facts,
      where: where || undefined,
      when: when || undefined,
      messageIds,
      messageTexts,
      modelName: modelName || "gpt-5-nano", // Default for backward compatibility
      inputTokenCount: inputTokenCountStr
        ? parseInt(inputTokenCountStr)
        : undefined,
      outputTokenCount: outputTokenCountStr
        ? parseInt(outputTokenCountStr)
        : undefined
    };
  }

  /**
   * O(r) where r = number of reporters. Scans ALL reporter sorted sets to find ownership.
   */
  private async findReporterForEvent(eventId: string): Promise<string | null> {
    const reporterIds = await this.client.sMembers(REDIS_KEYS.REPORTERS);

    for (const reporterId of reporterIds) {
      const exists = await this.client.zScore(
        REDIS_KEYS.EVENTS_BY_REPORTER(reporterId),
        eventId
      );
      if (exists !== null) {
        return reporterId;
      }
    }

    return null;
  }

  // Newspaper Edition operations
  async saveNewspaperEdition(edition: NewspaperEdition): Promise<void> {
    const editionId = edition.id;
    const multi = this.client.multi();

    // Add to editions sorted set
    console.log("Redis Write: ZADD", REDIS_KEYS.EDITIONS, {
      score: edition.generationTime,
      value: editionId
    });
    multi.zAdd(REDIS_KEYS.EDITIONS, {
      score: edition.generationTime,
      value: editionId
    });

    // Add to latest editions sorted set (limited to 50)
    console.log("Redis Write: ZADD", REDIS_KEYS.EDITIONS_LATEST, {
      score: edition.generationTime,
      value: editionId
    });
    multi.zAdd(REDIS_KEYS.EDITIONS_LATEST, {
      score: edition.generationTime,
      value: editionId
    });

    // Prune old entries if exceeding max length
    console.log(
      "Redis Write: ZREMRANGEBYRANK",
      REDIS_KEYS.EDITIONS_LATEST,
      0,
      -(REDIS_KEYS.EDITIONS_LATEST_MAX_LENGTH + 1)
    );
    multi.zRemRangeByRank(
      REDIS_KEYS.EDITIONS_LATEST,
      0,
      -(REDIS_KEYS.EDITIONS_LATEST_MAX_LENGTH + 1)
    );

    // Store edition data
    console.log("Redis Write: DEL", REDIS_KEYS.EDITION_STORIES(editionId));
    multi.del(REDIS_KEYS.EDITION_STORIES(editionId));
    edition.stories.forEach((storyId) => {
      console.log(
        "Redis Write: SADD",
        REDIS_KEYS.EDITION_STORIES(editionId),
        storyId
      );
      multi.sAdd(REDIS_KEYS.EDITION_STORIES(editionId), storyId);
    });
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITION_TIME(editionId),
      edition.generationTime.toString()
    );
    multi.set(
      REDIS_KEYS.EDITION_TIME(editionId),
      edition.generationTime.toString()
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITION_PROMPT(editionId),
      edition.prompt
    );
    multi.set(REDIS_KEYS.EDITION_PROMPT(editionId), edition.prompt);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.EDITION_MODEL_NAME(editionId),
      edition.modelName
    );
    multi.set(REDIS_KEYS.EDITION_MODEL_NAME(editionId), edition.modelName);
    if (edition.inputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EDITION_INPUT_TOKEN_COUNT(editionId),
        edition.inputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.EDITION_INPUT_TOKEN_COUNT(editionId),
        edition.inputTokenCount.toString()
      );
    }
    if (edition.outputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        REDIS_KEYS.EDITION_OUTPUT_TOKEN_COUNT(editionId),
        edition.outputTokenCount.toString()
      );
      multi.set(
        REDIS_KEYS.EDITION_OUTPUT_TOKEN_COUNT(editionId),
        edition.outputTokenCount.toString()
      );
    }

    await multi.exec();
  }

  /**
   * O(m) where m = number of editions. Sequential loop.
   */
  async getNewspaperEditions(limit?: number): Promise<NewspaperEdition[]> {
    const count = limit || -1;
    const editionIds = await this.client.ZRANGE(
      REDIS_KEYS.EDITIONS,
      0,
      count == -1 ? count : count - 1,
      { REV: true }
    );

    const editions: NewspaperEdition[] = [];
    for (const editionId of editionIds) {
      const edition = await this.getNewspaperEdition(editionId);
      if (edition) {
        editions.push(edition);
      }
    }

    return editions;
  }

  /**
   * O(m) where m = number of editions returned (limited to 50). Uses Promise.all for parallel fetch.
   */
  async getLatestEditions(limit?: number): Promise<NewspaperEdition[]> {
    const count = limit || 50;
    const editionIds = await this.client.ZRANGE(
      REDIS_KEYS.EDITIONS_LATEST,
      0,
      count - 1,
      { REV: true }
    );

    const editions = await Promise.all(
      editionIds.map((editionId) => this.getNewspaperEdition(editionId))
    );

    return editions.filter((e): e is NewspaperEdition => e !== null);
  }

  /**
   * O(s) where s = number of stories in the edition (SMEMBERS call).
   */
  async getNewspaperEdition(
    editionId: string
  ): Promise<NewspaperEdition | null> {
    const [
      stories,
      timeStr,
      prompt,
      modelName,
      inputTokenCountStr,
      outputTokenCountStr
    ] = await Promise.all([
      this.client.sMembers(REDIS_KEYS.EDITION_STORIES(editionId)),
      this.client.get(REDIS_KEYS.EDITION_TIME(editionId)),
      this.client.get(REDIS_KEYS.EDITION_PROMPT(editionId)),
      this.client.get(REDIS_KEYS.EDITION_MODEL_NAME(editionId)),
      this.client.get(REDIS_KEYS.EDITION_INPUT_TOKEN_COUNT(editionId)),
      this.client.get(REDIS_KEYS.EDITION_OUTPUT_TOKEN_COUNT(editionId))
    ]);

    if (!timeStr) return null;

    return {
      id: editionId,
      stories: stories || [],
      generationTime: parseInt(timeStr),
      prompt:
        prompt ||
        "Prompt not available (generated before prompt storage was implemented)",
      modelName: modelName || "gpt-5-nano", // Default for backward compatibility
      inputTokenCount: inputTokenCountStr
        ? parseInt(inputTokenCountStr)
        : undefined,
      outputTokenCount: outputTokenCountStr
        ? parseInt(outputTokenCountStr)
        : undefined
    };
  }

  // Daily Edition operations
  async saveDailyEdition(dailyEdition: DailyEdition): Promise<void> {
    const dailyEditionId = dailyEdition.id;
    const multi = this.client.multi();

    // Add to daily editions sorted set
    console.log("Redis Write: ZADD", REDIS_KEYS.DAILY_EDITIONS, {
      score: dailyEdition.generationTime,
      value: dailyEditionId
    });
    multi.zAdd(REDIS_KEYS.DAILY_EDITIONS, {
      score: dailyEdition.generationTime,
      value: dailyEditionId
    });

    // Store daily edition data
    console.log(
      "Redis Write: DEL",
      REDIS_KEYS.DAILY_EDITION_EDITIONS(dailyEditionId)
    );
    multi.del(REDIS_KEYS.DAILY_EDITION_EDITIONS(dailyEditionId));
    dailyEdition.editions.forEach((editionId) => {
      console.log(
        "Redis Write: SADD",
        REDIS_KEYS.DAILY_EDITION_EDITIONS(dailyEditionId),
        editionId
      );
      multi.sAdd(REDIS_KEYS.DAILY_EDITION_EDITIONS(dailyEditionId), editionId);
    });
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.DAILY_EDITION_TIME(dailyEditionId),
      dailyEdition.generationTime.toString()
    );
    multi.set(
      REDIS_KEYS.DAILY_EDITION_TIME(dailyEditionId),
      dailyEdition.generationTime.toString()
    );

    // Store new detailed content fields
    console.log(
      "Redis Write: SET",
      `daily_edition:${dailyEditionId}:front_page_headline`,
      dailyEdition.frontPageHeadline
    );
    multi.set(
      `daily_edition:${dailyEditionId}:front_page_headline`,
      dailyEdition.frontPageHeadline
    );
    console.log(
      "Redis Write: SET",
      `daily_edition:${dailyEditionId}:front_page_article`,
      dailyEdition.frontPageArticle
    );
    multi.set(
      `daily_edition:${dailyEditionId}:front_page_article`,
      dailyEdition.frontPageArticle
    );
    if (dailyEdition.newspaperName) {
      console.log(
        "Redis Write: SET",
        `daily_edition:${dailyEditionId}:newspaper_name`,
        dailyEdition.newspaperName
      );
      multi.set(
        `daily_edition:${dailyEditionId}:newspaper_name`,
        dailyEdition.newspaperName
      );
    }

    // Store model feedback
    // if (dailyEdition.modelFeedbackAboutThePrompt) {
    //   console.log(
    //     "Redis Write: SET",
    //     `daily_edition:${dailyEditionId}:model_feedback_positive`,
    //     dailyEdition.modelFeedbackAboutThePrompt.positive
    //   );
    //   multi.set(
    //     `daily_edition:${dailyEditionId}:model_feedback_positive`,
    //     dailyEdition.modelFeedbackAboutThePrompt.positive
    //   );
    //   console.log(
    //     "Redis Write: SET",
    //     `daily_edition:${dailyEditionId}:model_feedback_negative`,
    //     dailyEdition.modelFeedbackAboutThePrompt.negative
    //   );
    //   multi.set(
    //     `daily_edition:${dailyEditionId}:model_feedback_negative`,
    //     dailyEdition.modelFeedbackAboutThePrompt.negative
    //   );
    // }

    // Store topics as JSON
    console.log(
      "Redis Write: SET",
      `daily_edition:${dailyEditionId}:topics`,
      JSON.stringify(dailyEdition.topics)
    );
    multi.set(
      `daily_edition:${dailyEditionId}:topics`,
      JSON.stringify(dailyEdition.topics)
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.DAILY_EDITION_PROMPT(dailyEditionId),
      dailyEdition.prompt
    );
    multi.set(
      REDIS_KEYS.DAILY_EDITION_PROMPT(dailyEditionId),
      dailyEdition.prompt
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.DAILY_EDITION_MODEL_NAME(dailyEditionId),
      dailyEdition.modelName
    );
    multi.set(
      REDIS_KEYS.DAILY_EDITION_MODEL_NAME(dailyEditionId),
      dailyEdition.modelName
    );
    if (dailyEdition.inputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        `daily_edition:${dailyEditionId}:input_token_count`,
        dailyEdition.inputTokenCount.toString()
      );
      multi.set(
        `daily_edition:${dailyEditionId}:input_token_count`,
        dailyEdition.inputTokenCount.toString()
      );
    }
    if (dailyEdition.outputTokenCount !== undefined) {
      console.log(
        "Redis Write: SET",
        `daily_edition:${dailyEditionId}:output_token_count`,
        dailyEdition.outputTokenCount.toString()
      );
      multi.set(
        `daily_edition:${dailyEditionId}:output_token_count`,
        dailyEdition.outputTokenCount.toString()
      );
    }

    await multi.exec();
  }

  /**
   * O(m) where m = number of daily editions. Sequential loop.
   */
  async getDailyEditions(limit?: number): Promise<DailyEdition[]> {
    const count = limit || -1;
    const dailyEditionIds = await this.client.ZRANGE(
      REDIS_KEYS.DAILY_EDITIONS,
      0,
      count == -1 ? count : count - 1,
      { REV: true }
    );
    // Reverse to get most recent first
    // dailyEditionIds.reverse();

    const dailyEditions: DailyEdition[] = [];
    for (const dailyEditionId of dailyEditionIds) {
      const dailyEdition = await this.getDailyEdition(dailyEditionId);
      if (dailyEdition) {
        dailyEditions.push(dailyEdition);
      }
    }

    return dailyEditions;
  }

  /**
   * O(e) where e = number of editions referenced in this daily edition.
   */
  async getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null> {
    const [
      editions,
      timeStr,
      frontPageHeadline,
      frontPageArticle,
      newspaperName,
      modelFeedbackPositive,
      modelFeedbackNegative,
      topicsJson,
      prompt,
      modelName,
      inputTokenCountStr,
      outputTokenCountStr
    ] = await Promise.all([
      this.client.sMembers(REDIS_KEYS.DAILY_EDITION_EDITIONS(dailyEditionId)),
      this.client.get(REDIS_KEYS.DAILY_EDITION_TIME(dailyEditionId)),
      this.client.get(`daily_edition:${dailyEditionId}:front_page_headline`),
      this.client.get(`daily_edition:${dailyEditionId}:front_page_article`),
      this.client.get(`daily_edition:${dailyEditionId}:newspaper_name`),
      this.client.get(
        `daily_edition:${dailyEditionId}:model_feedback_positive`
      ),
      this.client.get(
        `daily_edition:${dailyEditionId}:model_feedback_negative`
      ),
      this.client.get(`daily_edition:${dailyEditionId}:topics`),
      this.client.get(REDIS_KEYS.DAILY_EDITION_PROMPT(dailyEditionId)),
      this.client.get(REDIS_KEYS.DAILY_EDITION_MODEL_NAME(dailyEditionId)),
      this.client.get(`daily_edition:${dailyEditionId}:input_token_count`),
      this.client.get(`daily_edition:${dailyEditionId}:output_token_count`)
    ]);

    if (!timeStr) return null;

    // Parse topics JSON
    let topics: DailyEdition["topics"] = [];
    if (topicsJson) {
      try {
        topics = JSON.parse(topicsJson);
      } catch (error) {
        console.error("Error parsing topics JSON:", error);
        topics = [];
      }
    }

    return {
      id: dailyEditionId,
      editions,
      generationTime: parseInt(timeStr),
      frontPageHeadline: frontPageHeadline || "",
      frontPageArticle: frontPageArticle || "",
      newspaperName: newspaperName || undefined,
      // modelFeedbackAboutThePrompt:
      //   modelFeedbackPositive || modelFeedbackNegative
      //     ? {
      //         positive: modelFeedbackPositive || "",
      //         negative: modelFeedbackNegative || ""
      //       }
      //     : undefined,
      topics,
      prompt:
        prompt ||
        "Prompt not available (generated before prompt storage was implemented)",
      modelName: modelName || "gpt-5-nano", // Default for backward compatibility
      inputTokenCount: inputTokenCountStr
        ? parseInt(inputTokenCountStr)
        : undefined,
      outputTokenCount: outputTokenCountStr
        ? parseInt(outputTokenCountStr)
        : undefined
    };
  }

  // Ticker operations
  async saveTicker(ticker: Ticker): Promise<void> {
    const {
      id,
      text,
      generationTime,
      dailyEditionId,
      modelName,
      inputTokenCount,
      outputTokenCount
    } = ticker;
    await this.client.hSet(REDIS_KEYS.TICKER_LATEST, {
      id,
      text,
      generationTime: String(generationTime),
      dailyEditionId,
      modelName,
      ...(inputTokenCount !== undefined && {
        inputTokenCount: String(inputTokenCount)
      }),
      ...(outputTokenCount !== undefined && {
        outputTokenCount: String(outputTokenCount)
      })
    });
  }

  async getLatestTicker(): Promise<Ticker | null> {
    const data = await this.client.hGetAll(REDIS_KEYS.TICKER_LATEST);
    if (!data || !data.text) return null;
    return {
      id: data.id,
      text: data.text,
      generationTime: parseInt(data.generationTime || "0"),
      dailyEditionId: data.dailyEditionId || "",
      modelName: data.modelName || "",
      inputTokenCount: data.inputTokenCount
        ? parseInt(data.inputTokenCount)
        : undefined,
      outputTokenCount: data.outputTokenCount
        ? parseInt(data.outputTokenCount)
        : undefined
    };
  }

  // Opinion Article operations
  async getOpinionArticle(opinionId: string): Promise<OpinionArticle | null> {
    const [
      persona,
      headline,
      content,
      time,
      articleIdsStr,
      modelName,
      inputTokenCount,
      outputTokenCount
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.OPINION_PERSONA(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_HEADLINE(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_CONTENT(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_TIME(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_ARTICLE_IDS(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_MODEL_NAME(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_INPUT_TOKEN_COUNT(opinionId)),
      this.client.get(REDIS_KEYS.OPINION_OUTPUT_TOKEN_COUNT(opinionId))
    ]);

    if (!headline || !content) return null;

    return {
      id: opinionId,
      persona: persona as OpinionPersona,
      headline,
      content,
      generationTime: parseInt(time || "0"),
      articleIds: articleIdsStr ? JSON.parse(articleIdsStr) : [],
      modelName: modelName || "",
      inputTokenCount: inputTokenCount ? parseInt(inputTokenCount) : undefined,
      outputTokenCount: outputTokenCount
        ? parseInt(outputTokenCount)
        : undefined
    };
  }

  async saveOpinionArticle(opinion: OpinionArticle): Promise<void> {
    const {
      id,
      persona,
      headline,
      content,
      generationTime,
      articleIds,
      modelName,
      inputTokenCount,
      outputTokenCount
    } = opinion;
    const multi = this.client.multi();

    multi.zAdd(REDIS_KEYS.OPINIONS_LATEST, {
      score: generationTime,
      value: id
    });

    multi.zRemRangeByRank(
      REDIS_KEYS.OPINIONS_LATEST,
      0,
      -(REDIS_KEYS.OPINIONS_LATEST_MAX_LENGTH + 1)
    );

    multi.set(REDIS_KEYS.OPINION_PERSONA(id), persona);
    multi.set(REDIS_KEYS.OPINION_HEADLINE(id), headline);
    multi.set(REDIS_KEYS.OPINION_CONTENT(id), content);
    multi.set(REDIS_KEYS.OPINION_TIME(id), generationTime.toString());
    multi.set(REDIS_KEYS.OPINION_ARTICLE_IDS(id), JSON.stringify(articleIds));
    multi.set(REDIS_KEYS.OPINION_MODEL_NAME(id), modelName);
    if (inputTokenCount !== undefined) {
      multi.set(
        REDIS_KEYS.OPINION_INPUT_TOKEN_COUNT(id),
        inputTokenCount.toString()
      );
    }
    if (outputTokenCount !== undefined) {
      multi.set(
        REDIS_KEYS.OPINION_OUTPUT_TOKEN_COUNT(id),
        outputTokenCount.toString()
      );
    }

    await multi.exec();
  }

  async getLatestOpinionArticles(limit?: number): Promise<OpinionArticle[]> {
    const count = limit || 50;
    const opinionIds = await this.client.zRange(
      REDIS_KEYS.OPINIONS_LATEST,
      0,
      count - 1,
      { REV: true }
    );

    const opinions: OpinionArticle[] = [];
    for (const id of opinionIds) {
      const [
        persona,
        headline,
        content,
        time,
        articleIdsStr,
        modelName,
        inputTokenCount,
        outputTokenCount
      ] = await Promise.all([
        this.client.get(REDIS_KEYS.OPINION_PERSONA(id)),
        this.client.get(REDIS_KEYS.OPINION_HEADLINE(id)),
        this.client.get(REDIS_KEYS.OPINION_CONTENT(id)),
        this.client.get(REDIS_KEYS.OPINION_TIME(id)),
        this.client.get(REDIS_KEYS.OPINION_ARTICLE_IDS(id)),
        this.client.get(REDIS_KEYS.OPINION_MODEL_NAME(id)),
        this.client.get(REDIS_KEYS.OPINION_INPUT_TOKEN_COUNT(id)),
        this.client.get(REDIS_KEYS.OPINION_OUTPUT_TOKEN_COUNT(id))
      ]);

      if (!headline || !content) continue;

      opinions.push({
        id,
        persona: persona as OpinionPersona,
        headline,
        content,
        generationTime: parseInt(time || "0"),
        articleIds: articleIdsStr ? JSON.parse(articleIdsStr) : [],
        modelName: modelName || "",
        inputTokenCount: inputTokenCount
          ? parseInt(inputTokenCount)
          : undefined,
        outputTokenCount: outputTokenCount
          ? parseInt(outputTokenCount)
          : undefined
      });
    }

    return opinions;
  }

  // Research operations
  async saveResearchEntry(entry: ResearchEntry): Promise<void> {
    const {
      id,
      topic,
      goal,
      suggestions,
      summaries,
      findingsDocument,
      generationTime,
      status,
      errorMessage,
      modelName,
      inputTokenCount,
      outputTokenCount,
      llmCalls,
      currentPhase
    } = entry;
    const multi = this.client.multi();

    multi.zAdd(REDIS_KEYS.RESEARCH_LATEST, {
      score: generationTime,
      value: id
    });

    multi.zRemRangeByRank(
      REDIS_KEYS.RESEARCH_LATEST,
      0,
      -(REDIS_KEYS.RESEARCH_LATEST_MAX_LENGTH + 1)
    );

    multi.set(REDIS_KEYS.RESEARCH_TOPIC(id), topic);
    multi.set(REDIS_KEYS.RESEARCH_GOAL(id), goal);
    multi.set(REDIS_KEYS.RESEARCH_SUGGESTIONS(id), JSON.stringify(suggestions));
    multi.set(REDIS_KEYS.RESEARCH_SUMMARIES(id), JSON.stringify(summaries));
    multi.set(REDIS_KEYS.RESEARCH_FINDINGS(id), findingsDocument);
    multi.set(REDIS_KEYS.RESEARCH_TIME(id), generationTime.toString());
    multi.set(REDIS_KEYS.RESEARCH_STATUS(id), status);
    if (errorMessage) multi.set(REDIS_KEYS.RESEARCH_ERROR(id), errorMessage);
    multi.set(REDIS_KEYS.RESEARCH_MODEL_NAME(id), modelName);
    if (inputTokenCount !== undefined)
      multi.set(
        REDIS_KEYS.RESEARCH_INPUT_TOKENS(id),
        inputTokenCount.toString()
      );
    if (outputTokenCount !== undefined)
      multi.set(
        REDIS_KEYS.RESEARCH_OUTPUT_TOKENS(id),
        outputTokenCount.toString()
      );
    if (llmCalls)
      multi.set(REDIS_KEYS.RESEARCH_LLM_CALLS(id), JSON.stringify(llmCalls));
    if (currentPhase)
      multi.set(REDIS_KEYS.RESEARCH_CURRENT_PHASE(id), currentPhase);

    await multi.exec();
  }

  async getResearchEntry(id: string): Promise<ResearchEntry | null> {
    const [
      topic,
      goal,
      suggestionsStr,
      summariesStr,
      findingsDocument,
      timeStr,
      status,
      errorMessage,
      modelName,
      inputTokensStr,
      outputTokensStr,
      llmCallsStr,
      currentPhase
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.RESEARCH_TOPIC(id)),
      this.client.get(REDIS_KEYS.RESEARCH_GOAL(id)),
      this.client.get(REDIS_KEYS.RESEARCH_SUGGESTIONS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_SUMMARIES(id)),
      this.client.get(REDIS_KEYS.RESEARCH_FINDINGS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_TIME(id)),
      this.client.get(REDIS_KEYS.RESEARCH_STATUS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_ERROR(id)),
      this.client.get(REDIS_KEYS.RESEARCH_MODEL_NAME(id)),
      this.client.get(REDIS_KEYS.RESEARCH_INPUT_TOKENS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_OUTPUT_TOKENS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_LLM_CALLS(id)),
      this.client.get(REDIS_KEYS.RESEARCH_CURRENT_PHASE(id))
    ]);

    if (!topic || !goal) return null;

    return {
      id,
      topic,
      goal,
      suggestions: suggestionsStr ? JSON.parse(suggestionsStr) : [],
      summaries: summariesStr ? JSON.parse(summariesStr) : [],
      findingsDocument: findingsDocument || "",
      generationTime: parseInt(timeStr || "0"),
      status: (status as "pending" | "completed" | "failed") || "pending",
      errorMessage: errorMessage || undefined,
      modelName: modelName || "",
      inputTokenCount: inputTokensStr ? parseInt(inputTokensStr) : undefined,
      outputTokenCount: outputTokensStr ? parseInt(outputTokensStr) : undefined,
      llmCalls: llmCallsStr ? JSON.parse(llmCallsStr) : undefined,
      currentPhase: currentPhase || undefined
    };
  }

  async getLatestResearchEntries(limit?: number): Promise<ResearchEntry[]> {
    const count = limit || 50;
    const ids = await this.client.zRange(
      REDIS_KEYS.RESEARCH_LATEST,
      0,
      count - 1,
      { REV: true }
    );

    const entries: ResearchEntry[] = [];
    for (const id of ids) {
      const entry = await this.getResearchEntry(id);
      if (entry) entries.push(entry);
    }
    return entries;
  }

  // User operations
  async createUser(
    user: Omit<User, "id" | "createdAt" | "lastLoginAt">
  ): Promise<User> {
    const userId = await this.generateId("user");
    const now = Date.now();
    const newUser: User = {
      ...user,
      id: userId,
      createdAt: now
    };

    const multi = this.client.multi();

    // Add to users set
    console.log("Redis Write: SADD", REDIS_KEYS.USERS, userId);
    multi.sAdd(REDIS_KEYS.USERS, userId);

    // Store user data
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_EMAIL(userId),
      newUser.email
    );
    multi.set(REDIS_KEYS.USER_EMAIL(userId), newUser.email);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_PASSWORD_HASH(userId),
      newUser.passwordHash
    );
    multi.set(REDIS_KEYS.USER_PASSWORD_HASH(userId), newUser.passwordHash);
    console.log("Redis Write: SET", REDIS_KEYS.USER_ROLE(userId), newUser.role);
    multi.set(REDIS_KEYS.USER_ROLE(userId), newUser.role);
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_CREATED_AT(userId),
      newUser.createdAt.toString()
    );
    multi.set(REDIS_KEYS.USER_CREATED_AT(userId), newUser.createdAt.toString());
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_HAS_READER(userId),
      newUser.hasReader.toString()
    );
    multi.set(REDIS_KEYS.USER_HAS_READER(userId), newUser.hasReader.toString());
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_HAS_REPORTER(userId),
      newUser.hasReporter.toString()
    );
    multi.set(
      REDIS_KEYS.USER_HAS_REPORTER(userId),
      newUser.hasReporter.toString()
    );
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_HAS_EDITOR(userId),
      newUser.hasEditor.toString()
    );
    multi.set(REDIS_KEYS.USER_HAS_EDITOR(userId), newUser.hasEditor.toString());

    // Create email to user ID mapping
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_BY_EMAIL(newUser.email),
      userId
    );
    multi.set(REDIS_KEYS.USER_BY_EMAIL(newUser.email), userId);

    await multi.exec();

    return newUser;
  }

  async getUserById(userId: string): Promise<User | null> {
    const [
      email,
      passwordHash,
      role,
      createdAtStr,
      lastLoginAtStr,
      hasReaderStr,
      hasReporterStr,
      hasEditorStr
    ] = await Promise.all([
      this.client.get(REDIS_KEYS.USER_EMAIL(userId)),
      this.client.get(REDIS_KEYS.USER_PASSWORD_HASH(userId)),
      this.client.get(REDIS_KEYS.USER_ROLE(userId)),
      this.client.get(REDIS_KEYS.USER_CREATED_AT(userId)),
      this.client.get(REDIS_KEYS.USER_LAST_LOGIN_AT(userId)),
      this.client.get(REDIS_KEYS.USER_HAS_READER(userId)),
      this.client.get(REDIS_KEYS.USER_HAS_REPORTER(userId)),
      this.client.get(REDIS_KEYS.USER_HAS_EDITOR(userId))
    ]);

    if (!email || !passwordHash || !role || !createdAtStr) return null;

    return {
      id: userId,
      email,
      passwordHash,
      role: role as User["role"],
      createdAt: parseInt(createdAtStr),
      lastLoginAt: lastLoginAtStr ? parseInt(lastLoginAtStr) : undefined,
      hasReader: hasReaderStr === "true",
      hasReporter: hasReporterStr === "true",
      hasEditor: hasEditorStr === "true"
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const userId = await this.client.get(REDIS_KEYS.USER_BY_EMAIL(email));
    if (!userId) return null;

    return await this.getUserById(userId);
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const now = Date.now();
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.USER_LAST_LOGIN_AT(userId),
      now.toString()
    );
    await this.client.set(
      REDIS_KEYS.USER_LAST_LOGIN_AT(userId),
      now.toString()
    );
  }

  /**
   * O(u) where u = number of users. Uses pipeline to batch all GET commands.
   */
  async getAllUsers(): Promise<User[]> {
    const userIds = await this.client.sMembers(REDIS_KEYS.USERS);
    if (userIds.length === 0) return [];

    const multi = this.client.multi();

    for (const userId of userIds) {
      multi.get(REDIS_KEYS.USER_EMAIL(userId));
      multi.get(REDIS_KEYS.USER_PASSWORD_HASH(userId));
      multi.get(REDIS_KEYS.USER_ROLE(userId));
      multi.get(REDIS_KEYS.USER_CREATED_AT(userId));
      multi.get(REDIS_KEYS.USER_LAST_LOGIN_AT(userId));
      multi.get(REDIS_KEYS.USER_HAS_READER(userId));
      multi.get(REDIS_KEYS.USER_HAS_REPORTER(userId));
      multi.get(REDIS_KEYS.USER_HAS_EDITOR(userId));
    }

    const results = await multi.exec();
    if (!results) return [];

    const users: User[] = [];
    for (let i = 0; i < userIds.length; i++) {
      const baseIdx = i * 8;
      const email = results[baseIdx] as unknown as string | null;
      const passwordHash = results[baseIdx + 1] as unknown as string | null;
      const role = results[baseIdx + 2] as unknown as string | null;
      const createdAtStr = results[baseIdx + 3] as unknown as string | null;
      const lastLoginAtStr = results[baseIdx + 4] as unknown as string | null;
      const hasReaderStr = results[baseIdx + 5] as unknown as string | null;
      const hasReporterStr = results[baseIdx + 6] as unknown as string | null;
      const hasEditorStr = results[baseIdx + 7] as unknown as string | null;

      if (email && passwordHash && role && createdAtStr) {
        users.push({
          id: userIds[i],
          email,
          passwordHash,
          role: role as User["role"],
          createdAt: parseInt(createdAtStr),
          lastLoginAt: lastLoginAtStr ? parseInt(lastLoginAtStr) : undefined,
          hasReader: hasReaderStr === "true",
          hasReporter: hasReporterStr === "true",
          hasEditor: hasEditorStr === "true"
        });
      }
    }

    return users;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const multi = this.client.multi();

    // Remove from users set
    console.log("Redis Write: SREM", REDIS_KEYS.USERS, userId);
    multi.sRem(REDIS_KEYS.USERS, userId);

    // Delete user data
    console.log("Redis Write: DEL", REDIS_KEYS.USER_EMAIL(userId));
    multi.del(REDIS_KEYS.USER_EMAIL(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_PASSWORD_HASH(userId));
    multi.del(REDIS_KEYS.USER_PASSWORD_HASH(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_ROLE(userId));
    multi.del(REDIS_KEYS.USER_ROLE(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_CREATED_AT(userId));
    multi.del(REDIS_KEYS.USER_CREATED_AT(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_LAST_LOGIN_AT(userId));
    multi.del(REDIS_KEYS.USER_LAST_LOGIN_AT(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_HAS_READER(userId));
    multi.del(REDIS_KEYS.USER_HAS_READER(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_HAS_REPORTER(userId));
    multi.del(REDIS_KEYS.USER_HAS_REPORTER(userId));
    console.log("Redis Write: DEL", REDIS_KEYS.USER_HAS_EDITOR(userId));
    multi.del(REDIS_KEYS.USER_HAS_EDITOR(userId));

    // Delete email mapping
    console.log("Redis Write: DEL", REDIS_KEYS.USER_BY_EMAIL(user.email));
    multi.del(REDIS_KEYS.USER_BY_EMAIL(user.email));

    await multi.exec();
  }

  // Utility methods

  async generateId(prefix: string): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Job status operations
  async setJobRunning(jobName: string, running: boolean): Promise<void> {
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.JOB_RUNNING(jobName),
      running.toString()
    );
    await this.client.set(REDIS_KEYS.JOB_RUNNING(jobName), running.toString());
  }

  async getJobRunning(jobName: string): Promise<boolean> {
    const value = await this.client.get(REDIS_KEYS.JOB_RUNNING(jobName));
    return value === "true";
  }

  async setJobLastRun(jobName: string, timestamp: number): Promise<void> {
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.JOB_LAST_RUN(jobName),
      timestamp.toString()
    );
    await this.client.set(
      REDIS_KEYS.JOB_LAST_RUN(jobName),
      timestamp.toString()
    );
  }

  async getJobLastRun(jobName: string): Promise<number | null> {
    const value = await this.client.get(REDIS_KEYS.JOB_LAST_RUN(jobName));
    return value ? parseInt(value) : null;
  }

  async setJobLastSuccess(jobName: string, timestamp: number): Promise<void> {
    console.log(
      "Redis Write: SET",
      REDIS_KEYS.JOB_LAST_SUCCESS(jobName),
      timestamp.toString()
    );
    await this.client.set(
      REDIS_KEYS.JOB_LAST_SUCCESS(jobName),
      timestamp.toString()
    );
  }

  async getJobLastSuccess(jobName: string): Promise<number | null> {
    const value = await this.client.get(REDIS_KEYS.JOB_LAST_SUCCESS(jobName));
    return value ? parseInt(value) : null;
  }

  // KPI operations
  async getKpiValue(kpiName: string): Promise<number> {
    const valueStr = await this.client.get(REDIS_KEYS.KPI_VALUE(kpiName));
    return valueStr ? parseFloat(valueStr) : 0;
  }

  async setKpiValue(kpiName: string, value: number): Promise<void> {
    const multi = this.client.multi();

    console.log(
      "Redis Write: SET",
      REDIS_KEYS.KPI_VALUE(kpiName),
      value.toString()
    );
    multi.set(REDIS_KEYS.KPI_VALUE(kpiName), value.toString());

    console.log(
      "Redis Write: SET",
      REDIS_KEYS.KPI_LAST_UPDATED(kpiName),
      Date.now().toString()
    );
    multi.set(REDIS_KEYS.KPI_LAST_UPDATED(kpiName), Date.now().toString());

    await multi.exec();
  }

  async incrementKpiValue(kpiName: string, increment: number): Promise<void> {
    const currentValue = await this.getKpiValue(kpiName);
    const newValue = currentValue + increment;
    await this.setKpiValue(kpiName, newValue);
  }

  // Log operations
  private readonly APP_LOGS_KEY = "app:logs";
  private readonly MAX_LOG_ENTRIES = 500;

  async addLog(message: string): Promise<void> {
    const timestamp = Date.now();
    const formattedMessage = `${new Date(timestamp).toISOString()} - ${message}`;

    await this.client.zAdd(this.APP_LOGS_KEY, {
      score: timestamp,
      value: formattedMessage
    });

    const count = await this.client.zCard(this.APP_LOGS_KEY);
    if (count > this.MAX_LOG_ENTRIES) {
      const toRemove = count - this.MAX_LOG_ENTRIES;
      await this.client.zRemRangeByRank(this.APP_LOGS_KEY, 0, toRemove - 1);
    }
  }

  async getAllLogs(): Promise<string[]> {
    const logs = await this.client.zRange(this.APP_LOGS_KEY, 0, -1, {
      REV: true
    });
    return logs;
  }

  async clearAllData(): Promise<void> {
    await this.client.flushAll();
  }

  async saveForumSections(sections: ForumSection[]): Promise<void> {
    const multi = this.client.multi();
    multi.set(REDIS_KEYS.FORUM_SECTIONS, JSON.stringify(sections));
    await multi.exec();
  }

  async getForumSections(): Promise<ForumSection[] | null> {
    const data = await this.client.get(REDIS_KEYS.FORUM_SECTIONS);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async createThread(
    forumId: string,
    title: string,
    author: string,
    firstPostContent: string
  ): Promise<{ threadId: number; postId: number }> {
    const threadId = await this.client.incr(REDIS_KEYS.FORUM_NEXT_THREAD_ID);
    const postId = await this.client.incr(REDIS_KEYS.FORUM_NEXT_POST_ID);
    const now = Date.now();

    const multi = this.client.multi();

    multi.zAdd(REDIS_KEYS.FORUM_THREADS(forumId), {
      score: now,
      value: threadId.toString()
    });

    multi.hSet(REDIS_KEYS.FORUM_THREAD(threadId), {
      title,
      forumId,
      author,
      createdAt: now.toString(),
      replyCount: "0",
      lastReplyTime: now.toString()
    });

    multi.zAdd(REDIS_KEYS.FORUM_POSTS(threadId), {
      score: now,
      value: postId.toString()
    });

    multi.set(
      REDIS_KEYS.FORUM_POST(threadId, postId),
      JSON.stringify({
        id: postId,
        content: firstPostContent,
        author,
        createdAt: now
      })
    );

    multi.hIncrBy(REDIS_KEYS.FORUM_COUNTER(forumId), "threadCount", 1);
    multi.hIncrBy(REDIS_KEYS.FORUM_COUNTER(forumId), "postCount", 1);

    await multi.exec();
    return { threadId, postId };
  }

  async createPost(
    threadId: number,
    content: string,
    author: string
  ): Promise<{ postId: number }> {
    const postId = await this.client.incr(REDIS_KEYS.FORUM_NEXT_POST_ID);
    const now = Date.now();

    const threadData = await this.client.hGetAll(
      REDIS_KEYS.FORUM_THREAD(threadId)
    );
    const forumId = threadData.forumId;

    const multi = this.client.multi();

    multi.zAdd(REDIS_KEYS.FORUM_POSTS(threadId), {
      score: now,
      value: postId.toString()
    });

    multi.set(
      REDIS_KEYS.FORUM_POST(threadId, postId),
      JSON.stringify({
        id: postId,
        content,
        author,
        createdAt: now
      })
    );

    multi.hIncrBy(REDIS_KEYS.FORUM_THREAD(threadId), "replyCount", 1);
    multi.hSet(
      REDIS_KEYS.FORUM_THREAD(threadId),
      "lastReplyTime",
      now.toString()
    );
    multi.hIncrBy(REDIS_KEYS.FORUM_COUNTER(forumId), "postCount", 1);
    multi.zAdd(REDIS_KEYS.FORUM_THREADS(forumId), {
      score: now,
      value: threadId.toString()
    });

    await multi.exec();
    return { postId };
  }

  async getForumThreads(
    forumId: string,
    offset = 0,
    limit = 20
  ): Promise<ForumThread[]> {
    const threadIds = await this.client.zRange(
      REDIS_KEYS.FORUM_THREADS(forumId),
      offset,
      offset + limit - 1,
      { REV: true }
    );

    if (threadIds.length === 0) return [];

    const multi = this.client.multi();
    for (const threadId of threadIds) {
      multi.hGetAll(REDIS_KEYS.FORUM_THREAD(parseInt(threadId)));
    }
    const results = await multi.exec();

    return threadIds
      .map((threadId, i) => {
        const data = results?.[i] as unknown as Record<string, string> | null;
        if (!data) return null;
        return {
          id: parseInt(threadId),
          title: data.title || "",
          forumId: data.forumId || "",
          author: data.author || "",
          createdAt: parseInt(data.createdAt || "0"),
          replyCount: parseInt(data.replyCount || "0"),
          lastReplyTime: parseInt(data.lastReplyTime || "0")
        };
      })
      .filter(Boolean) as ForumThread[];
  }

  async getThread(threadId: number): Promise<ForumThread | null> {
    const data = await this.client.hGetAll(REDIS_KEYS.FORUM_THREAD(threadId));
    if (!data || !data.title) return null;
    return {
      id: threadId,
      title: data.title,
      forumId: data.forumId,
      author: data.author,
      createdAt: parseInt(data.createdAt),
      replyCount: parseInt(data.replyCount),
      lastReplyTime: parseInt(data.lastReplyTime)
    };
  }

  async getThreadPosts(
    threadId: number,
    offset = 0,
    limit = 50
  ): Promise<ForumPost[]> {
    const postIds = await this.client.zRange(
      REDIS_KEYS.FORUM_POSTS(threadId),
      offset,
      offset + limit - 1
    );

    if (postIds.length === 0) return [];

    const multi = this.client.multi();
    for (const postId of postIds) {
      multi.get(REDIS_KEYS.FORUM_POST(threadId, parseInt(postId)));
    }
    const results = await multi.exec();

    return postIds
      .map((postId, i) => {
        const data = results?.[i] as unknown as string | null;
        if (!data) return null;
        try {
          return JSON.parse(data);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ForumPost[];
  }

  async getForumCounters(forumId: string): Promise<{
    threadCount: number;
    postCount: number;
  }> {
    const data = await this.client.hGetAll(REDIS_KEYS.FORUM_COUNTER(forumId));
    return {
      threadCount: parseInt(data.threadCount || "0"),
      postCount: parseInt(data.postCount || "0")
    };
  }

  async getMemoryInfo(): Promise<{
    redis: { usedMemory: number; usedMemoryPeak: number };
    system: { totalMemory: number; usedMemory: number; freeMemory: number };
  }> {
    const redisInfo = await this.client.info("memory");
    const usedMemoryMatch = redisInfo.match(/used_memory:(\d+)/);
    const usedMemoryPeakMatch = redisInfo.match(/used_memory_peak:(\d+)/);

    const os = await import("os");
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      redis: {
        usedMemory: usedMemoryMatch ? parseInt(usedMemoryMatch[1]) : 0,
        usedMemoryPeak: usedMemoryPeakMatch
          ? parseInt(usedMemoryPeakMatch[1])
          : 0
      },
      system: {
        totalMemory,
        usedMemory,
        freeMemory
      }
    };
  }

  async getDynamicPersonas(): Promise<DynamicPersona[] | null> {
    const data = await this.client.get(REDIS_KEYS.PERSONAS_DYNAMIC_LATEST);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      return DynamicPersonasSchema.parse(parsed);
    } catch (error) {
      console.error("Invalid stored dynamic personas; clearing cache:", error);
      await this.client.del(REDIS_KEYS.PERSONAS_DYNAMIC_LATEST);
      return null;
    }
  }

  async setDynamicPersonas(
    personas: DynamicPersona[],
    ttlHours = 24
  ): Promise<void> {
    await this.client.setEx(
      REDIS_KEYS.PERSONAS_DYNAMIC_LATEST,
      ttlHours * 3600,
      JSON.stringify(personas)
    );
  }

  async getClassicPersonas(): Promise<typeof CLASSIC_PERSONAS> {
    return CLASSIC_PERSONAS;
  }

  // Artifact operations
  async saveArtifact(artifact: Artifact): Promise<void> {
    const artifactId = artifact.id;
    const multi = this.client.multi();
    multi.set(REDIS_KEYS.ARTIFACT_TYPE(artifactId), artifact.type);
    multi.set(
      REDIS_KEYS.ARTIFACT_INPUTS(artifactId),
      JSON.stringify(artifact.inputs)
    );
    multi.set(
      REDIS_KEYS.ARTIFACT_PROMPT_SYSTEM(artifactId),
      artifact.prompt_system
    );
    multi.set(
      REDIS_KEYS.ARTIFACT_PROMPT_USER_TEMPLATE(artifactId),
      artifact.prompt_user_template
    );
    if (artifact.output)
      multi.set(
        REDIS_KEYS.ARTIFACT_OUTPUT(artifactId),
        JSON.stringify(artifact.output)
      );
    multi.set(
      REDIS_KEYS.ARTIFACT_METADATA(artifactId),
      JSON.stringify(artifact.metadata)
    );
    // Add to latest ZSET
    multi.zAdd(REDIS_KEYS.ARTIFACTS_LATEST, {
      score: artifact.metadata.generated_at || Date.now(),
      value: artifactId
    });
    // Add to type ZSET
    multi.zAdd(REDIS_KEYS.ARTIFACTS_BY_TYPE(artifact.type), {
      score: artifact.metadata.generated_at || Date.now(),
      value: artifactId
    });
    await multi.exec();
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    const results = await this.client.mGet([
      REDIS_KEYS.ARTIFACT_TYPE(artifactId),
      REDIS_KEYS.ARTIFACT_INPUTS(artifactId),
      REDIS_KEYS.ARTIFACT_PROMPT_SYSTEM(artifactId),
      REDIS_KEYS.ARTIFACT_PROMPT_USER_TEMPLATE(artifactId),
      REDIS_KEYS.ARTIFACT_OUTPUT(artifactId),
      REDIS_KEYS.ARTIFACT_METADATA(artifactId)
    ]);
    if (!results[0]) return null;
    return {
      id: artifactId,
      type: results[0] as string,
      inputs: JSON.parse(results[1] || "[]"),
      prompt_system: results[2] || "",
      prompt_user_template: results[3] || "",
      output: results[4] ? JSON.parse(results[4]) : undefined,
      metadata: JSON.parse(results[5] || "{}")
    } as Artifact;
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    const latest = await this.client.zRange(
      REDIS_KEYS.ARTIFACTS_LATEST,
      0,
      -1,
      { REV: true }
    );
    const artifacts: Artifact[] = [];
    for (const id of latest) {
      const artifact = await this.getArtifact(id);
      if (artifact) artifacts.push(artifact);
    }
    return artifacts;
  }

  async getArtifactsByType(type: string, limit?: number): Promise<Artifact[]> {
    const ids = await this.client.zRange(
      REDIS_KEYS.ARTIFACTS_BY_TYPE(type),
      0,
      limit ? limit - 1 : -1,
      { REV: true }
    );
    const artifacts: Artifact[] = [];
    for (const id of ids) {
      const artifact = await this.getArtifact(id);
      if (artifact) artifacts.push(artifact);
    }
    return artifacts;
  }

  async getArtifactsByReporter(reporterId: string): Promise<Artifact[]> {
    const all = await this.getAllArtifacts();
    return all.filter((a) => a.metadata.reporterId === reporterId);
  }

  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) return;
    const multi = this.client.multi();
    multi.del([
      REDIS_KEYS.ARTIFACT_TYPE(artifactId),
      REDIS_KEYS.ARTIFACT_INPUTS(artifactId),
      REDIS_KEYS.ARTIFACT_PROMPT_SYSTEM(artifactId),
      REDIS_KEYS.ARTIFACT_PROMPT_USER_TEMPLATE(artifactId),
      REDIS_KEYS.ARTIFACT_OUTPUT(artifactId),
      REDIS_KEYS.ARTIFACT_METADATA(artifactId)
    ]);
    multi.zRem(REDIS_KEYS.ARTIFACTS_LATEST, artifactId);
    multi.zRem(REDIS_KEYS.ARTIFACTS_BY_TYPE(artifact.type), artifactId);
    await multi.exec();
  }

  async updateArtifact(
    artifactId: string,
    updates: Partial<Artifact>
  ): Promise<void> {
    const current = await this.getArtifact(artifactId);
    if (!current) throw new Error("Artifact not found");
    const updated = { ...current, ...updates };
    await this.saveArtifact(updated);
  }

  async savePrismDailyEditionPair(pair: PrismDailyEditionPair): Promise<void> {
    console.log(
      "Redis Write: ZADD prism_daily_editions",
      pair.id,
      pair.generationTime
    );
    const multi = this.client.multi();
    multi.zAdd("prism_daily_editions", {
      score: pair.generationTime,
      value: pair.id
    });
    multi.set(`prism_daily_edition:${pair.id}:data`, JSON.stringify(pair));
    multi.zRemRangeByRank("prism_daily_editions", 0, -11);
    await multi.exec();
  }

  async getPrismDailyEditionPairs(
    limit?: number
  ): Promise<PrismDailyEditionPair[]> {
    const count = limit || 3;
    const ids = await this.client.zRange("prism_daily_editions", 0, count - 1, {
      REV: true
    });
    const pairs: PrismDailyEditionPair[] = [];
    for (const id of ids) {
      const json = await this.client.get(`prism_daily_edition:${id}:data`);
      if (json) {
        try {
          pairs.push(JSON.parse(json));
        } catch (error) {
          console.error(`Error parsing prism pair ${id}:`, error);
        }
      }
    }
    return pairs;
  }

  async saveHomepageChatMessage(message: HomepageChatMessage): Promise<void> {
    const { id, senderName, content, timestamp, type } = message;
    const multi = this.client.multi();

    multi.zAdd(REDIS_KEYS.HOMEPAGE_CHAT_MESSAGES, {
      score: timestamp,
      value: id
    });

    multi.zRemRangeByRank(
      REDIS_KEYS.HOMEPAGE_CHAT_MESSAGES,
      0,
      -(REDIS_KEYS.HOMEPAGE_CHAT_MAX_LENGTH + 1)
    );

    multi.set(REDIS_KEYS.HOMEPAGE_CHAT_SENDER_NAME(id), senderName);
    multi.set(REDIS_KEYS.HOMEPAGE_CHAT_CONTENT(id), content);
    multi.set(REDIS_KEYS.HOMEPAGE_CHAT_TIMESTAMP(id), timestamp.toString());
    multi.set(REDIS_KEYS.HOMEPAGE_CHAT_TYPE(id), type);

    await multi.exec();
  }

  async getHomepageChatMessages(limit = 50): Promise<HomepageChatMessage[]> {
    const messageIds = await this.client.zRange(
      REDIS_KEYS.HOMEPAGE_CHAT_MESSAGES,
      -limit,
      -1
    );

    const messages: HomepageChatMessage[] = [];
    for (const id of messageIds) {
      const [senderName, content, timestampStr, type] = await Promise.all([
        this.client.get(REDIS_KEYS.HOMEPAGE_CHAT_SENDER_NAME(id)),
        this.client.get(REDIS_KEYS.HOMEPAGE_CHAT_CONTENT(id)),
        this.client.get(REDIS_KEYS.HOMEPAGE_CHAT_TIMESTAMP(id)),
        this.client.get(REDIS_KEYS.HOMEPAGE_CHAT_TYPE(id))
      ]);

      if (!senderName || !content) continue;

      messages.push({
        id,
        senderName,
        content,
        timestamp: parseInt(timestampStr || "0"),
        type: (type as "user" | "assistant") || "user"
      });
    }

    return messages;
  }

  async saveChatSession(
    sessionId: string,
    messages: unknown[],
    ttlSeconds = 1800
  ): Promise<void> {
    const key = REDIS_KEYS.CHAT_SESSION(sessionId);
    console.log("Redis Write: SETEX", key);
    await this.client.setEx(key, ttlSeconds, JSON.stringify(messages));
  }

  async getChatSession(sessionId: string): Promise<unknown[] | null> {
    const key = REDIS_KEYS.CHAT_SESSION(sessionId);
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) : null;
  }
}
