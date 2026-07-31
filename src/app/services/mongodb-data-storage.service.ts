import { MongoClient, Db, Collection } from "mongodb";
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

export class MongoDBDataStorageService implements IDataStorageService {
  private client: MongoClient;
  private db: Db | null = null;
  private readonly url: string;
  private readonly dbName: string;

  constructor() {
    this.url = process.env.MONGODB_URL || "mongodb://localhost:27017";
    this.dbName = process.env.MONGODB_DB || "newsroom";
    this.client = new MongoClient(this.url, {
      maxPoolSize: 10,
      minPoolSize: 0
    });
    this.client.on("error", (err: Error) => {
      console.error("MongoDB Client Error:", err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      await this.createIndexes();
    } catch (e) {
      console.log(e);
    }
    console.log("Connected to MongoDB");
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log("Disconnected from MongoDB");
  }

  private async createIndexes(): Promise<void> {
    const db = this.getDb();
    await db
      .collection("articles")
      .createIndex({ reporterId: 1, generationTime: -1 });
    await db.collection("articles").createIndex({ generationTime: -1 });
    await db
      .collection("events")
      .createIndex({ reporterId: 1, updatedTime: -1 });
    await db.collection("events").createIndex({ updatedTime: -1 });
    await db
      .collection("newspaper_editions")
      .createIndex({ generationTime: -1 });
    await db.collection("daily_editions").createIndex({ generationTime: -1 });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db
      .collection("forum_threads")
      .createIndex({ forumId: 1, createdAt: -1 });
    await db
      .collection("forum_posts")
      .createIndex({ threadId: 1, createdAt: 1 });
    await db.collection("opinion_articles").createIndex({ generationTime: -1 });
    await db.collection("artifacts").createIndex({ reporterId: 1 });
    await db.collection("artifacts").createIndex({ type: 1, createdAt: -1 });
    await db
      .collection("prism_daily_edition_pairs")
      .createIndex({ generationTime: -1 });
    await db
      .collection("chat_sessions")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db
      .collection("dynamic_personas")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db
      .collection("homepage_chat_messages")
      .createIndex({ timestamp: -1 });
    await db.collection("research").createIndex({ generationTime: -1 });
  }

  private getDb(): Db {
    if (!this.db) throw new Error("Database not connected");
    return this.db;
  }

  private coll(name: string): Collection<any> {
    return this.getDb().collection(name);
  }

  // Editor operations
  async saveEditor(editor: Editor): Promise<void> {
    await this.coll("editors").replaceOne(
      { _id: "editor" },
      { _id: "editor", ...editor },
      { upsert: true }
    );
  }

  async getEditor(): Promise<Editor | null> {
    const doc = await this.coll("editors").findOne({ _id: "editor" });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return {
      ...data,
      baseUrl: data.baseUrl || undefined,
      lastArticleGenerationTime: data.lastArticleGenerationTime || undefined,
      lastEventGenerationTime: data.lastEventGenerationTime || undefined,
      lastEditionGenerationTime: data.lastEditionGenerationTime || undefined
    } as Editor;
  }

  // Reporter operations
  async saveReporter(reporter: Reporter): Promise<void> {
    await this.coll("reporters").replaceOne(
      { _id: reporter.id },
      { _id: reporter.id, ...reporter },
      { upsert: true }
    );
  }

  async getAllReporters(): Promise<Reporter[]> {
    const docs = await this.coll("reporters").find().toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return data as Reporter;
    });
  }

  async getReporter(id: string): Promise<Reporter | null> {
    const doc = await this.coll("reporters").findOne({ _id: id });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return data as Reporter;
  }

  // Article operations
  async saveArticle(article: Article): Promise<void> {
    await this.coll("articles").replaceOne(
      { _id: article.id },
      { _id: article.id, ...article },
      { upsert: true }
    );
  }

  async searchArticles(query: string, limit = 20): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({
        $or: [
          { headline: { $regex: query, $options: "i" } },
          { body: { $regex: query, $options: "i" } }
        ]
      })
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getLatestArticles(limit = 100): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getLatestPublishedArticles(limit = 100): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({ published: { $ne: false } })
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getDraftArticles(limit = 100): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({ published: false })
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getArticlesByReporter(
    reporterId: string,
    limit = 100
  ): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({ reporterId })
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getArticlesInTimeRange(
    reporterId: string,
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({ reporterId, generationTime: { $gte: startTime, $lte: endTime } })
      .sort({ generationTime: -1 })
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getArticlesInTimeRangeGlobal(
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const docs = await this.coll("articles")
      .find({ generationTime: { $gte: startTime, $lte: endTime } })
      .sort({ generationTime: -1 })
      .toArray();
    return docs.map((d) => this.mapArticle(d));
  }

  async getArticle(articleId: string): Promise<Article | null> {
    const doc = await this.coll("articles").findOne({ _id: articleId });
    if (!doc) return null;
    return this.mapArticle(doc);
  }

  async deleteArticle(articleId: string): Promise<boolean> {
    const result = await this.coll("articles").deleteOne({ _id: articleId });
    return result.deletedCount > 0;
  }

  private mapArticle(doc: any): Article {
    const { _id, ...data } = doc;
    return {
      ...data,
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as Article;
  }

  // Event operations
  async saveEvent(event: Event): Promise<void> {
    await this.coll("events").replaceOne(
      { _id: event.id },
      { _id: event.id, ...event },
      { upsert: true }
    );
  }

  async getEventsByReporter(reporterId: string, limit = 100): Promise<Event[]> {
    const docs = await this.coll("events")
      .find({ reporterId })
      .sort({ updatedTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapEvent(d));
  }

  async getLatestUpdatedEvents(limit = 50): Promise<Event[]> {
    const docs = await this.coll("events")
      .find()
      .sort({ updatedTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapEvent(d));
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const doc = await this.coll("events").findOne({ _id: eventId });
    if (!doc) return null;
    return this.mapEvent(doc);
  }

  private mapEvent(doc: any): Event {
    const { _id, ...data } = doc;
    return {
      ...data,
      where: data.where || undefined,
      when: data.when || undefined,
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as Event;
  }

  // Newspaper Edition operations
  async saveNewspaperEdition(edition: NewspaperEdition): Promise<void> {
    await this.coll("newspaper_editions").replaceOne(
      { _id: edition.id },
      { _id: edition.id, ...edition },
      { upsert: true }
    );
  }

  async getNewspaperEditions(limit = 50): Promise<NewspaperEdition[]> {
    const docs = await this.coll("newspaper_editions")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapNewspaperEdition(d));
  }

  async getLatestEditions(limit = 50): Promise<NewspaperEdition[]> {
    return this.getNewspaperEditions(limit);
  }

  async getNewspaperEdition(
    editionId: string
  ): Promise<NewspaperEdition | null> {
    const doc = await this.coll("newspaper_editions").findOne({
      _id: editionId
    });
    if (!doc) return null;
    return this.mapNewspaperEdition(doc);
  }

  private mapNewspaperEdition(doc: any): NewspaperEdition {
    const { _id, ...data } = doc;
    return {
      ...data,
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as NewspaperEdition;
  }

  // Daily Edition operations
  async saveDailyEdition(dailyEdition: DailyEdition): Promise<void> {
    await this.coll("daily_editions").replaceOne(
      { _id: dailyEdition.id },
      { _id: dailyEdition.id, ...dailyEdition },
      { upsert: true }
    );
  }

  async getDailyEditions(limit = 10): Promise<DailyEdition[]> {
    const docs = await this.coll("daily_editions")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => this.mapDailyEdition(d));
  }

  async getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null> {
    const doc = await this.coll("daily_editions").findOne({
      _id: dailyEditionId
    });
    if (!doc) return null;
    return this.mapDailyEdition(doc);
  }

  private mapDailyEdition(doc: any): DailyEdition {
    const { _id, ...data } = doc;
    return {
      ...data,
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as DailyEdition;
  }

  // Ticker operations
  async saveTicker(ticker: Ticker): Promise<void> {
    await this.coll("ticker").replaceOne(
      { _id: ticker.id },
      { _id: ticker.id, ...ticker },
      { upsert: true }
    );
  }

  async getLatestTicker(): Promise<Ticker | null> {
    const doc = await this.coll("ticker")
      .find()
      .sort({ generationTime: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    const { _id, ...data } = doc;
    return {
      ...data,
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as Ticker;
  }

  // Homepage Chat operations
  async saveHomepageChatMessage(message: HomepageChatMessage): Promise<void> {
    await this.coll("homepage_chat_messages").insertOne({
      _id: message.id,
      ...message
    });
  }

  async getHomepageChatMessages(limit = 50): Promise<HomepageChatMessage[]> {
    const docs = await this.coll("homepage_chat_messages")
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return docs.reverse().map((d) => {
      const { _id, ...data } = d;
      return data as HomepageChatMessage;
    });
  }

  // Opinion Article operations
  async saveOpinionArticle(opinion: OpinionArticle): Promise<void> {
    await this.coll("opinion_articles").replaceOne(
      { _id: opinion.id },
      { _id: opinion.id, ...opinion },
      { upsert: true }
    );
  }

  async getOpinionArticle(opinionId: string): Promise<OpinionArticle | null> {
    const doc = await this.coll("opinion_articles").findOne({ _id: opinionId });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return {
      ...data,
      modelName: data.modelName || "",
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined
    } as OpinionArticle;
  }

  async getLatestOpinionArticles(limit = 50): Promise<OpinionArticle[]> {
    const docs = await this.coll("opinion_articles")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return {
        ...data,
        modelName: data.modelName || "",
        inputTokenCount: data.inputTokenCount || undefined,
        outputTokenCount: data.outputTokenCount || undefined
      } as OpinionArticle;
    });
  }

  // Research operations
  async saveResearchEntry(entry: ResearchEntry): Promise<void> {
    await this.coll("research").replaceOne(
      { _id: entry.id },
      { _id: entry.id, ...entry },
      { upsert: true }
    );
  }

  async getResearchEntry(id: string): Promise<ResearchEntry | null> {
    const doc = await this.coll("research").findOne({ _id: id });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return {
      ...data,
      status: data.status || "pending",
      modelName: data.modelName || "",
      inputTokenCount: data.inputTokenCount || undefined,
      outputTokenCount: data.outputTokenCount || undefined,
      llmCalls: data.llmCalls || undefined,
      currentPhase: data.currentPhase || undefined
    } as ResearchEntry;
  }

  async getLatestResearchEntries(limit = 50): Promise<ResearchEntry[]> {
    const docs = await this.coll("research")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return {
        ...data,
        status: data.status || "pending",
        modelName: data.modelName || "",
        inputTokenCount: data.inputTokenCount || undefined,
        outputTokenCount: data.outputTokenCount || undefined,
        llmCalls: data.llmCalls || undefined,
        currentPhase: data.currentPhase || undefined
      } as ResearchEntry;
    });
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
    await this.coll("users").insertOne({ _id: userId, ...newUser });
    return newUser;
  }

  async getUserById(userId: string): Promise<User | null> {
    const doc = await this.coll("users").findOne({ _id: userId });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return this.mapUser(data);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const doc = await this.coll("users").findOne({ email });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return this.mapUser(data);
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    await this.coll("users").updateOne(
      { _id: userId },
      { $set: { lastLoginAt: Date.now() } }
    );
  }

  async getAllUsers(): Promise<User[]> {
    const docs = await this.coll("users").find().toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return this.mapUser(data);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.coll("users").deleteOne({ _id: userId });
  }

  private mapUser(data: any): User {
    return {
      id: data.id,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      createdAt: data.createdAt,
      lastLoginAt: data.lastLoginAt || undefined,
      hasReader: !!data.hasReader,
      hasReporter: !!data.hasReporter,
      hasEditor: !!data.hasEditor
    };
  }

  // Job status operations
  async setJobRunning(jobName: string, running: boolean): Promise<void> {
    await this.coll("job_status").updateOne(
      { _id: jobName },
      { $set: { running } },
      { upsert: true }
    );
  }

  async getJobRunning(jobName: string): Promise<boolean> {
    const doc = await this.coll("job_status").findOne({ _id: jobName });
    return doc ? !!doc.running : false;
  }

  async setJobLastRun(jobName: string, timestamp: number): Promise<void> {
    await this.coll("job_status").updateOne(
      { _id: jobName },
      { $set: { lastRun: timestamp } },
      { upsert: true }
    );
  }

  async getJobLastRun(jobName: string): Promise<number | null> {
    const doc = await this.coll("job_status").findOne({ _id: jobName });
    return doc && doc.lastRun !== undefined ? doc.lastRun : null;
  }

  async setJobLastSuccess(jobName: string, timestamp: number): Promise<void> {
    await this.coll("job_status").updateOne(
      { _id: jobName },
      { $set: { lastSuccess: timestamp } },
      { upsert: true }
    );
  }

  async getJobLastSuccess(jobName: string): Promise<number | null> {
    const doc = await this.coll("job_status").findOne({ _id: jobName });
    return doc && doc.lastSuccess !== undefined ? doc.lastSuccess : null;
  }

  // KPI operations
  async getKpiValue(kpiName: string): Promise<number> {
    const doc = await this.coll("kpis").findOne({ _id: kpiName });
    return doc ? doc.value : 0;
  }

  async setKpiValue(kpiName: string, value: number): Promise<void> {
    await this.coll("kpis").replaceOne(
      { _id: kpiName },
      { _id: kpiName, value },
      { upsert: true }
    );
  }

  async incrementKpiValue(kpiName: string, increment: number): Promise<void> {
    await this.coll("kpis").updateOne(
      { _id: kpiName },
      { $inc: { value: increment } },
      { upsert: true }
    );
  }

  // Log operations
  async addLog(message: string): Promise<void> {
    const formattedMessage = `${new Date().toISOString()} - ${message}`;
    await this.coll("logs").insertOne({
      message: formattedMessage,
      timestamp: Date.now()
    });
  }

  async getAllLogs(): Promise<string[]> {
    const docs = await this.coll("logs")
      .find()
      .sort({ timestamp: -1 })
      .toArray();
    return docs.map((d) => d.message);
  }

  // Forum operations
  async saveForumSections(sections: ForumSection[]): Promise<void> {
    await this.coll("forum_sections").replaceOne(
      { _id: "sections" },
      { _id: "sections", sections },
      { upsert: true }
    );
  }

  async getForumSections(): Promise<ForumSection[] | null> {
    const doc = await this.coll("forum_sections").findOne({ _id: "sections" });
    if (!doc) return null;
    return doc.sections || null;
  }

  async createThread(
    forumId: string,
    title: string,
    author: string,
    firstPostContent: string
  ): Promise<{ threadId: number; postId: number }> {
    const now = Date.now();

    const threadId = await this.nextSequence("thread_id");
    const postId = await this.nextSequence("post_id");

    await this.coll("forum_threads").insertOne({
      _id: threadId,
      forumId,
      title,
      author,
      createdAt: now,
      replyCount: 0,
      lastReplyTime: now
    });

    await this.coll("forum_posts").insertOne({
      _id: postId,
      threadId,
      content: firstPostContent,
      author,
      createdAt: now
    });

    await this.coll("forum_counters").updateOne(
      { _id: forumId },
      {
        $inc: { threadCount: 1, postCount: 1 },
        $setOnInsert: { _id: forumId }
      },
      { upsert: true }
    );

    return { threadId, postId };
  }

  async createPost(
    threadId: number,
    content: string,
    author: string
  ): Promise<{ postId: number }> {
    const now = Date.now();
    const postId = await this.nextSequence("post_id");

    await this.coll("forum_posts").insertOne({
      _id: postId,
      threadId,
      content,
      author,
      createdAt: now
    });

    const thread = await this.coll("forum_threads").findOne({ _id: threadId });
    const forumId = thread?.forumId;

    await this.coll("forum_threads").updateOne(
      { _id: threadId },
      { $set: { lastReplyTime: now }, $inc: { replyCount: 1 } }
    );

    if (forumId) {
      await this.coll("forum_counters").updateOne(
        { _id: forumId },
        { $inc: { postCount: 1 } }
      );
    }

    return { postId };
  }

  async getForumThreads(
    forumId: string,
    offset = 0,
    limit = 20
  ): Promise<ForumThread[]> {
    const docs = await this.coll("forum_threads")
      .find({ forumId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return { id: _id, ...data } as ForumThread;
    });
  }

  async getThread(threadId: number): Promise<ForumThread | null> {
    const doc = await this.coll("forum_threads").findOne({ _id: threadId });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return { id: _id, ...data } as ForumThread;
  }

  async getThreadPosts(
    threadId: number,
    offset = 0,
    limit = 50
  ): Promise<ForumPost[]> {
    const docs = await this.coll("forum_posts")
      .find({ threadId })
      .sort({ createdAt: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return { id: _id, ...data } as ForumPost;
    });
  }

  async getForumCounters(
    forumId: string
  ): Promise<{ threadCount: number; postCount: number }> {
    const doc = await this.coll("forum_counters").findOne({ _id: forumId });
    return {
      threadCount: doc ? doc.threadCount : 0,
      postCount: doc ? doc.postCount : 0
    };
  }

  // Utility methods
  async generateId(prefix: string): Promise<string> {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async clearAllData(): Promise<void> {
    const db = this.getDb();
    const collections = await db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  }

  // Memory info
  async getMemoryInfo(): Promise<{
    redis: { usedMemory: number; usedMemoryPeak: number };
    system: { totalMemory: number; usedMemory: number; freeMemory: number };
  }> {
    let dbStats: any = { dataSize: 0 };
    try {
      dbStats = await this.getDb().stats();
    } catch {
      // stats may fail on some configurations
    }

    const os = await import("os");
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      redis: {
        usedMemory: dbStats.dataSize || 0,
        usedMemoryPeak: dbStats.dataSize || 0
      },
      system: {
        totalMemory,
        usedMemory,
        freeMemory
      }
    };
  }

  // Persona operations
  async getDynamicPersonas(): Promise<DynamicPersona[] | null> {
    const doc = await this.coll("dynamic_personas")
      .find({ expiresAt: { $gt: Date.now() } })
      .sort({ expiresAt: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    return doc.data || null;
  }

  async setDynamicPersonas(
    personas: DynamicPersona[],
    ttlHours = 24
  ): Promise<void> {
    const expiresAt = Date.now() + ttlHours * 3600 * 1000;
    await this.coll("dynamic_personas").replaceOne(
      { _id: "personas" },
      { _id: "personas", data: personas, expiresAt },
      { upsert: true }
    );
  }

  async getClassicPersonas(): Promise<typeof CLASSIC_PERSONAS> {
    return CLASSIC_PERSONAS;
  }

  // Artifact operations
  async saveArtifact(artifact: Artifact): Promise<void> {
    await this.coll("artifacts").replaceOne(
      { _id: artifact.id },
      { _id: artifact.id, ...artifact },
      { upsert: true }
    );
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    const doc = await this.coll("artifacts").findOne({ _id: artifactId });
    if (!doc) return null;
    const { _id, ...data } = doc;
    return data as Artifact;
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    const docs = await this.coll("artifacts")
      .find()
      .sort({ "metadata.generated_at": -1 })
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return data as Artifact;
    });
  }

  async getArtifactsByType(type: string, limit?: number): Promise<Artifact[]> {
    let query = this.coll("artifacts")
      .find({ type })
      .sort({ "metadata.generated_at": -1 });
    if (limit) query = query.limit(limit);
    const docs = await query.toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return data as Artifact;
    });
  }

  async getArtifactsByReporter(reporterId: string): Promise<Artifact[]> {
    const docs = await this.coll("artifacts")
      .find({ "metadata.reporterId": reporterId })
      .sort({ "metadata.generated_at": -1 })
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return data as Artifact;
    });
  }

  async deleteArtifact(artifactId: string): Promise<void> {
    await this.coll("artifacts").deleteOne({ _id: artifactId });
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

  // Prism Daily Edition Pair operations
  async savePrismDailyEditionPair(pair: PrismDailyEditionPair): Promise<void> {
    await this.coll("prism_daily_edition_pairs").replaceOne(
      { _id: pair.id },
      { _id: pair.id, ...pair },
      { upsert: true }
    );
    // Keep only the 10 most recent pairs
    const count = await this.coll("prism_daily_edition_pairs").countDocuments();
    if (count > 10) {
      const toKeep = await this.coll("prism_daily_edition_pairs")
        .find()
        .sort({ generationTime: -1 })
        .limit(10)
        .project({ _id: 1 })
        .toArray();
      const keepIds = toKeep.map((d) => d._id);
      await this.coll("prism_daily_edition_pairs").deleteMany({
        _id: { $nin: keepIds }
      });
    }
  }

  async getPrismDailyEditionPairs(limit = 3): Promise<PrismDailyEditionPair[]> {
    const docs = await this.coll("prism_daily_edition_pairs")
      .find()
      .sort({ generationTime: -1 })
      .limit(limit)
      .toArray();
    return docs.map((d) => {
      const { _id, ...data } = d;
      return data as PrismDailyEditionPair;
    });
  }

  // Chat session operations
  async saveChatSession(
    sessionId: string,
    messages: unknown[],
    ttlSeconds = 1800
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await this.coll("chat_sessions").replaceOne(
      { _id: sessionId },
      { _id: sessionId, data: messages, expiresAt },
      { upsert: true }
    );
  }

  async getChatSession(sessionId: string): Promise<unknown[] | null> {
    const doc = await this.coll("chat_sessions").findOne({
      _id: sessionId,
      expiresAt: { $gt: new Date() }
    });
    if (!doc) return null;
    return doc.data || null;
  }

  // Private helpers
  private async nextSequence(name: string): Promise<number> {
    const result = await this.coll("counters").findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: "after" }
    );
    return result?.seq ?? 1;
  }
}
