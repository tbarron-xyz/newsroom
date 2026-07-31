import { statSync } from "fs";
import Database from "better-sqlite3";
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

// NOTE: Schema migrations are out of scope. The app auto-creates tables
// at startup via CREATE TABLE IF NOT EXISTS and assumes all schemas
// are already up to date. Schema changes must be made by editing
// createTables() directly.

export class SQLiteDataStorageService implements IDataStorageService {
  private db: any = null;
  private readonly dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || "./db.sqlite";
  }

  async connect(): Promise<void> {
    this.db = new Database(this.dbPath);
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.createTables();
  }

  private createTables(): void {
    const db = this.getDb();
    db.exec(`
      -- Editor (single row)
      CREATE TABLE IF NOT EXISTS editors (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        bio TEXT,
        prompt TEXT,
        modelName TEXT,
        articleModelName TEXT,
        eventModelName TEXT,
        storySelectionModelName TEXT,
        editionSelectionModelName TEXT,
        chatModelName TEXT,
        researchModelName TEXT,
        messageSliceCount INTEGER,
        baseUrl TEXT,
        articleGenerationPeriodMinutes INTEGER,
        lastArticleGenerationTime INTEGER,
        eventGenerationPeriodMinutes INTEGER,
        lastEventGenerationTime INTEGER,
        editionGenerationPeriodMinutes INTEGER,
        lastEditionGenerationTime INTEGER
      );

      -- Reporters
      CREATE TABLE IF NOT EXISTS reporters (
        id TEXT PRIMARY KEY,
        beats TEXT,  -- JSON stringify
        prompt TEXT,
        enabled INTEGER DEFAULT 0,  -- 0=falsy, 1=true
        displayName TEXT
      );

      -- Articles
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        reporterId TEXT,
        headline TEXT,
        body TEXT,
        generationTime INTEGER,
        prompt TEXT,
        messageIds TEXT,  -- JSON arr nums
        messageTexts TEXT,  -- JSON arr strs
        messageDids TEXT,  -- JSON arr strs
        messageRkeys TEXT,  -- JSON arr strs
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER,
        published INTEGER DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_articles_reporter_time ON articles(reporterId, generationTime DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_time ON articles(generationTime DESC);

      -- Events
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        reporterId TEXT,
        title TEXT,
        createdTime INTEGER,
        updatedTime INTEGER,
        facts TEXT,  -- JSON arr
        \`where\` TEXT,
        \`when\` TEXT,
        messageIds TEXT,  -- JSON arr
        messageTexts TEXT,  -- JSON arr
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_events_reporter_updated ON events(reporterId, updatedTime DESC);
      CREATE INDEX IF NOT EXISTS idx_events_updated ON events(updatedTime DESC);

      -- Newspaper Editions
      CREATE TABLE IF NOT EXISTS newspaper_editions (
        id TEXT PRIMARY KEY,
        stories TEXT,  -- JSON arr ids
        generationTime INTEGER,
        prompt TEXT,
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_newspaper_editions_time ON newspaper_editions(generationTime DESC);

      -- Daily Editions
      CREATE TABLE IF NOT EXISTS daily_editions (
        id TEXT PRIMARY KEY,
        editions TEXT,  -- JSON arr
        generationTime INTEGER,
        frontPageHeadline TEXT,
        frontPageArticle TEXT,
        newspaperName TEXT,
        modelFeedbackPositive TEXT,
        modelFeedbackNegative TEXT,
        topics TEXT,  -- JSON arr<{name,headline,...}>
        prompt TEXT,
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER,
        published INTEGER DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS idx_daily_editions_time ON daily_editions(generationTime DESC);

      -- Ticker
      CREATE TABLE IF NOT EXISTS ticker (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        generationTime INTEGER,
        dailyEditionId TEXT NOT NULL,
        modelName TEXT NOT NULL,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER
      );

      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        passwordHash TEXT,
        role TEXT,
        createdAt INTEGER,
        lastLoginAt INTEGER,
        hasReader INTEGER DEFAULT 0,
        hasReporter INTEGER DEFAULT 0,
        hasEditor INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      -- Job Status
      CREATE TABLE IF NOT EXISTS job_status (
        name TEXT PRIMARY KEY,
        running INTEGER DEFAULT 0,
        lastRun INTEGER,
        lastSuccess INTEGER
      );

      -- KPIs
      CREATE TABLE IF NOT EXISTS kpis (
        name TEXT PRIMARY KEY,
        value REAL DEFAULT 0
      );

      -- Logs
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        timestamp INTEGER DEFAULT (strftime('%s','now') * 1000)
      );

      -- Forum Sections (single row)
      CREATE TABLE IF NOT EXISTS forum_sections (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        sections TEXT  -- JSON ForumSection[]
      );

      -- Forum Threads
      CREATE TABLE IF NOT EXISTS forum_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        forumId INTEGER,
        title TEXT,
        author TEXT,
        createdAt INTEGER,
        replyCount INTEGER DEFAULT 0,
        lastReplyTime INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_forum_threads_forum_created ON forum_threads(forumId, createdAt DESC);

      -- Forum Posts
      CREATE TABLE IF NOT EXISTS forum_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        threadId INTEGER,
        content TEXT,
        author TEXT,
        createdAt INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_created ON forum_posts(threadId, createdAt ASC);

      -- Forum Counters
      CREATE TABLE IF NOT EXISTS forum_counters (
        forumId INTEGER PRIMARY KEY,
        threadCount INTEGER DEFAULT 0,
        postCount INTEGER DEFAULT 0
      );

      -- Dynamic Personas
      CREATE TABLE IF NOT EXISTS dynamic_personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,  -- JSON
        expiresAt INTEGER
      );

      -- Opinion Articles
      CREATE TABLE IF NOT EXISTS opinion_articles (
        id TEXT PRIMARY KEY,
        persona TEXT NOT NULL,
        headline TEXT NOT NULL,
        content TEXT NOT NULL,
        generationTime INTEGER,
        articleIds TEXT,  -- JSON arr
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_opinion_articles_time ON opinion_articles(generationTime DESC);

      -- Research
      CREATE TABLE IF NOT EXISTS research (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        goal TEXT NOT NULL,
        suggestions TEXT,  -- JSON arr
        summaries TEXT,  -- JSON arr
        findingsDocument TEXT,
        generationTime INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        errorMessage TEXT,
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER,
        llmCalls TEXT,  -- JSON arr
        currentPhase TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_research_time ON research(generationTime DESC);
    `);

    db.exec(`

      -- Artifacts
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        reporterId TEXT,
        type TEXT,
        input TEXT,  -- JSON ArtifactInput
        output TEXT,  -- JSON
        status TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_artifacts_reporter ON artifacts(reporterId);
      CREATE INDEX IF NOT EXISTS idx_artifacts_type_created ON artifacts(type, createdAt DESC);

      -- Prism Daily Edition Pairs
      CREATE TABLE IF NOT EXISTS prism_daily_edition_pairs (
        id TEXT PRIMARY KEY,
        data TEXT,  -- JSON serialized PrismDailyEditionPair
        generationTime INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_prism_daily_edition_pairs_time ON prism_daily_edition_pairs(generationTime DESC);

      CREATE TABLE IF NOT EXISTS chat_sessions (
        sessionId TEXT PRIMARY KEY,
        data TEXT,
        expiresAt INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_expires ON chat_sessions(expiresAt);

      CREATE TABLE IF NOT EXISTS homepage_chat_messages (
        id TEXT PRIMARY KEY,
        senderName TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL DEFAULT 'user'
      );
      CREATE INDEX IF NOT EXISTS idx_homepage_chat_messages_time ON homepage_chat_messages(timestamp DESC);
    `);
  }

  async disconnect(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private getDb(): any {
    if (!this.db) throw new Error("Database not connected");
    return this.db;
  }

  // Connection management - already implemented

  // Editor operations
  async saveEditor(editor: Editor): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO editors (
        id, bio, prompt, modelName, articleModelName, eventModelName, storySelectionModelName,
        editionSelectionModelName, chatModelName, researchModelName, messageSliceCount, baseUrl,
        articleGenerationPeriodMinutes, lastArticleGenerationTime, eventGenerationPeriodMinutes,
        lastEventGenerationTime, editionGenerationPeriodMinutes, lastEditionGenerationTime
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      editor.bio,
      editor.prompt,
      editor.modelName,
      editor.articleModelName,
      editor.eventModelName,
      editor.storySelectionModelName,
      editor.editionSelectionModelName,
      editor.chatModelName,
      editor.researchModelName,
      editor.messageSliceCount,
      editor.baseUrl,
      editor.articleGenerationPeriodMinutes,
      editor.lastArticleGenerationTime,
      editor.eventGenerationPeriodMinutes,
      editor.lastEventGenerationTime,
      editor.editionGenerationPeriodMinutes,
      editor.lastEditionGenerationTime
    );
  }

  async getEditor(): Promise<Editor | null> {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM editors WHERE id = 1").get() as any;
    if (!row) return null;
    return {
      ...row,
      baseUrl: row.baseUrl || undefined,
      lastArticleGenerationTime: row.lastArticleGenerationTime || undefined,
      lastEventGenerationTime: row.lastEventGenerationTime || undefined,
      lastEditionGenerationTime: row.lastEditionGenerationTime || undefined
    };
  }

  // Reporter operations
  async saveReporter(reporter: Reporter): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO reporters (id, beats, prompt, enabled, displayName)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(
      reporter.id,
      JSON.stringify(reporter.beats),
      reporter.prompt,
      reporter.enabled ? 1 : 0,
      reporter.displayName ?? null
    );
  }

  async getAllReporters(): Promise<Reporter[]> {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM reporters").all() as any[];
    return rows.map((row) => ({
      ...row,
      beats: JSON.parse(row.beats || "[]"),
      enabled: !!row.enabled
    }));
  }

  async getReporter(id: string): Promise<Reporter | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM reporters WHERE id = ?")
      .get(id) as any;
    if (!row) return null;
    return {
      ...row,
      beats: JSON.parse(row.beats || "[]"),
      enabled: !!row.enabled
    };
  }

  // Article operations
  async saveArticle(article: Article): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO articles (
        id, reporterId, headline, body, generationTime, prompt, messageIds, messageTexts,
        messageDids, messageRkeys, modelName, inputTokenCount, outputTokenCount, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      article.id,
      article.reporterId,
      article.headline,
      article.body,
      article.generationTime,
      article.prompt,
      JSON.stringify(article.messageIds),
      JSON.stringify(article.messageTexts),
      JSON.stringify(article.messageDids),
      JSON.stringify(article.messageRkeys),
      article.modelName,
      article.inputTokenCount,
      article.outputTokenCount,
      article.published !== false ? 1 : 0
    );
  }

  async getLatestArticles(limit?: number): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(limit || 100) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getLatestPublishedArticles(limit?: number): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE published = 1 ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(limit || 100) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getDraftArticles(limit?: number): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE published = 0 ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(limit || 100) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getArticlesByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE reporterId = ? ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(reporterId, limit || 100) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getArticlesInTimeRange(
    reporterId: string,
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE reporterId = ? AND generationTime BETWEEN ? AND ?
      ORDER BY generationTime DESC
    `
      )
      .all(reporterId, startTime, endTime) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getArticlesInTimeRangeGlobal(
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE generationTime BETWEEN ? AND ?
      ORDER BY generationTime DESC
    `
      )
      .all(startTime, endTime) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async searchArticles(query: string, limit?: number): Promise<Article[]> {
    const db = this.getDb();
    const pattern = `%${query}%`;
    const rows = db
      .prepare(
        `
      SELECT * FROM articles WHERE headline LIKE ? OR body LIKE ?
      ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(pattern, pattern, limit || 20) as any[];
    return rows.map((row) => this.mapArticleRow(row));
  }

  async getArticle(articleId: string): Promise<Article | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM articles WHERE id = ?")
      .get(articleId) as any;
    return row ? this.mapArticleRow(row) : null;
  }

  async deleteArticle(articleId: string): Promise<boolean> {
    const db = this.getDb();
    const result = db
      .prepare("DELETE FROM articles WHERE id = ?")
      .run(articleId);
    return result.changes > 0;
  }

  private mapArticleRow(row: any): Article {
    return {
      ...row,
      messageIds: JSON.parse(row.messageIds || "[]"),
      messageTexts: JSON.parse(row.messageTexts || "[]"),
      messageDids: JSON.parse(row.messageDids || "[]"),
      messageRkeys: JSON.parse(row.messageRkeys || "[]"),
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined,
      published: row.published === null ? true : row.published === 1
    };
  }

  // Event operations
  async saveEvent(event: Event): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO events (
        id, reporterId, title, createdTime, updatedTime, facts, \`where\`, \`when\`, messageIds, messageTexts,
        modelName, inputTokenCount, outputTokenCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      event.id,
      event.reporterId,
      event.title,
      event.createdTime,
      event.updatedTime,
      JSON.stringify(event.facts),
      event.where,
      event.when,
      JSON.stringify(event.messageIds || []),
      JSON.stringify(event.messageTexts || []),
      event.modelName,
      event.inputTokenCount,
      event.outputTokenCount
    );
  }

  async getEventsByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Event[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM events WHERE reporterId = ? ORDER BY updatedTime DESC LIMIT ?
    `
      )
      .all(reporterId, limit || 100) as any[];
    return rows.map((row) => this.mapEventRow(row));
  }

  async getLatestUpdatedEvents(limit?: number): Promise<Event[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM events ORDER BY updatedTime DESC LIMIT ?
    `
      )
      .all(limit || 50) as any[];
    return rows.map((row) => this.mapEventRow(row));
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM events WHERE id = ?")
      .get(eventId) as any;
    return row ? this.mapEventRow(row) : null;
  }

  private mapEventRow(row: any): Event {
    return {
      ...row,
      facts: JSON.parse(row.facts || "[]"),
      where: row.where || undefined,
      when: row.when || undefined,
      messageIds: JSON.parse(row.messageIds || "[]"),
      messageTexts: JSON.parse(row.messageTexts || "[]"),
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    };
  }

  // Newspaper Edition operations
  async saveNewspaperEdition(edition: NewspaperEdition): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO newspaper_editions (
        id, stories, generationTime, prompt, modelName, inputTokenCount, outputTokenCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      edition.id,
      JSON.stringify(edition.stories),
      edition.generationTime,
      edition.prompt,
      edition.modelName,
      edition.inputTokenCount,
      edition.outputTokenCount
    );
  }

  async getNewspaperEditions(limit?: number): Promise<NewspaperEdition[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM newspaper_editions ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(limit || 50) as any[];
    return rows.map((row) => this.mapNewspaperEditionRow(row));
  }

  async getLatestEditions(limit?: number): Promise<NewspaperEdition[]> {
    return this.getNewspaperEditions(limit);
  }

  async getNewspaperEdition(
    editionId: string
  ): Promise<NewspaperEdition | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM newspaper_editions WHERE id = ?")
      .get(editionId) as any;
    return row ? this.mapNewspaperEditionRow(row) : null;
  }

  private mapNewspaperEditionRow(row: any): NewspaperEdition {
    return {
      ...row,
      stories: JSON.parse(row.stories || "[]"),
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    };
  }

  // Daily Edition operations
  async saveDailyEdition(dailyEdition: DailyEdition): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO daily_editions (
        id, editions, generationTime, frontPageHeadline, frontPageArticle, newspaperName,
        modelFeedbackPositive, modelFeedbackNegative, topics, prompt, modelName,
        inputTokenCount, outputTokenCount, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      dailyEdition.id,
      JSON.stringify(dailyEdition.editions),
      dailyEdition.generationTime,
      dailyEdition.frontPageHeadline,
      dailyEdition.frontPageArticle,
      dailyEdition.newspaperName,
      null, // modelFeedbackPositive (legacy, unused)
      null, // modelFeedbackNegative (legacy, unused)
      JSON.stringify(dailyEdition.topics || []),
      dailyEdition.prompt,
      dailyEdition.modelName,
      dailyEdition.inputTokenCount,
      dailyEdition.outputTokenCount,
      dailyEdition.published !== false ? 1 : 0
    );
  }

  async getDailyEditions(limit?: number): Promise<DailyEdition[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM daily_editions ORDER BY generationTime DESC LIMIT ?
    `
      )
      .all(limit || 10) as any[];
    return rows.map((row) => this.mapDailyEditionRow(row));
  }

  async getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM daily_editions WHERE id = ?")
      .get(dailyEditionId) as any;
    return row ? this.mapDailyEditionRow(row) : null;
  }

  private mapDailyEditionRow(row: any): DailyEdition {
    const topics = JSON.parse(row.topics || "[]");
    return {
      id: row.id,
      editions: JSON.parse(row.editions || "[]"),
      generationTime: row.generationTime,
      frontPageHeadline: row.frontPageHeadline,
      frontPageArticle: row.frontPageArticle,
      newspaperName: row.newspaperName,
      topics: topics,
      prompt: row.prompt,
      modelName: row.modelName,
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined,
      published: row.published === null ? true : row.published === 1
    };
  }

  // Ticker operations
  async saveTicker(ticker: Ticker): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO ticker (id, text, generationTime, dailyEditionId, modelName, inputTokenCount, outputTokenCount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      ticker.id,
      ticker.text,
      ticker.generationTime,
      ticker.dailyEditionId,
      ticker.modelName,
      ticker.inputTokenCount,
      ticker.outputTokenCount
    );
  }

  async getLatestTicker(): Promise<Ticker | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM ticker ORDER BY generationTime DESC LIMIT 1")
      .get() as any;
    if (!row) return null;
    return {
      id: row.id,
      text: row.text,
      generationTime: row.generationTime,
      dailyEditionId: row.dailyEditionId,
      modelName: row.modelName,
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    };
  }

  // Opinion Article operations
  async saveOpinionArticle(opinion: OpinionArticle): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO opinion_articles (id, persona, headline, content, generationTime, articleIds, modelName, inputTokenCount, outputTokenCount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      opinion.id,
      opinion.persona,
      opinion.headline,
      opinion.content,
      opinion.generationTime,
      JSON.stringify(opinion.articleIds),
      opinion.modelName,
      opinion.inputTokenCount ?? null,
      opinion.outputTokenCount ?? null
    );
  }

  async getOpinionArticle(opinionId: string): Promise<OpinionArticle | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM opinion_articles WHERE id = ?")
      .get(opinionId) as any;

    if (!row) return null;

    return {
      id: row.id,
      persona: row.persona as OpinionPersona,
      headline: row.headline,
      content: row.content,
      generationTime: row.generationTime,
      articleIds: row.articleIds ? JSON.parse(row.articleIds) : [],
      modelName: row.modelName || "",
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    };
  }

  async getLatestOpinionArticles(limit?: number): Promise<OpinionArticle[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        "SELECT * FROM opinion_articles ORDER BY generationTime DESC LIMIT ?"
      )
      .all(limit || 50) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      persona: row.persona as OpinionPersona,
      headline: row.headline,
      content: row.content,
      generationTime: row.generationTime,
      articleIds: row.articleIds ? JSON.parse(row.articleIds) : [],
      modelName: row.modelName || "",
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    }));
  }

  // Research operations
  async saveResearchEntry(entry: ResearchEntry): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO research (id, topic, goal, suggestions, summaries, findingsDocument, generationTime, status, errorMessage, modelName, inputTokenCount, outputTokenCount, llmCalls, currentPhase)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      entry.id,
      entry.topic,
      entry.goal,
      JSON.stringify(entry.suggestions),
      JSON.stringify(entry.summaries),
      entry.findingsDocument,
      entry.generationTime,
      entry.status,
      entry.errorMessage ?? null,
      entry.modelName,
      entry.inputTokenCount ?? null,
      entry.outputTokenCount ?? null,
      entry.llmCalls ? JSON.stringify(entry.llmCalls) : null,
      entry.currentPhase ?? null
    );
  }

  async getResearchEntry(id: string): Promise<ResearchEntry | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM research WHERE id = ?")
      .get(id) as any;

    if (!row) return null;

    return {
      id: row.id,
      topic: row.topic,
      goal: row.goal,
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
      summaries: row.summaries ? JSON.parse(row.summaries) : [],
      findingsDocument: row.findingsDocument || "",
      generationTime: row.generationTime,
      status: row.status,
      errorMessage: row.errorMessage || undefined,
      modelName: row.modelName || "",
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined,
      llmCalls: row.llmCalls ? JSON.parse(row.llmCalls) : undefined,
      currentPhase: row.currentPhase || undefined
    };
  }

  async getLatestResearchEntries(limit?: number): Promise<ResearchEntry[]> {
    const db = this.getDb();
    const rows = db
      .prepare("SELECT * FROM research ORDER BY generationTime DESC LIMIT ?")
      .all(limit || 50) as any[];
    return rows.map((row: any) => ({
      id: row.id,
      topic: row.topic,
      goal: row.goal,
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
      summaries: row.summaries ? JSON.parse(row.summaries) : [],
      findingsDocument: row.findingsDocument || "",
      generationTime: row.generationTime,
      status: row.status,
      errorMessage: row.errorMessage || undefined,
      modelName: row.modelName || "",
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined,
      llmCalls: row.llmCalls ? JSON.parse(row.llmCalls) : undefined,
      currentPhase: row.currentPhase || undefined
    }));
  }

  // User operations
  async createUser(
    user: Omit<User, "id" | "createdAt" | "lastLoginAt">
  ): Promise<User> {
    const db = this.getDb();
    const userId = await this.generateId("user");
    const now = Date.now();
    const newUser: User = {
      ...user,
      id: userId,
      createdAt: now
    };
    db.prepare(
      `
      INSERT INTO users (id, email, passwordHash, role, createdAt, hasReader, hasReporter, hasEditor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      userId,
      newUser.email,
      newUser.passwordHash,
      newUser.role,
      newUser.createdAt,
      newUser.hasReader ? 1 : 0,
      newUser.hasReporter ? 1 : 0,
      newUser.hasEditor ? 1 : 0
    );
    return newUser;
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(userId) as any;
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt || undefined,
      hasReader: !!row.hasReader,
      hasReporter: !!row.hasReporter,
      hasEditor: !!row.hasEditor
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email) as any;
    if (!row) return null;
    return await this.getUserById(row.id);
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const db = this.getDb();
    const now = Date.now();
    db.prepare("UPDATE users SET lastLoginAt = ? WHERE id = ?").run(
      now,
      userId
    );
  }

  async getAllUsers(): Promise<User[]> {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM users").all() as any[];
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      role: row.role,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt || undefined,
      hasReader: !!row.hasReader,
      hasReporter: !!row.hasReporter,
      hasEditor: !!row.hasEditor
    }));
  }

  async deleteUser(userId: string): Promise<void> {
    const db = this.getDb();
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }

  // Job status operations
  async setJobRunning(jobName: string, running: boolean): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "INSERT INTO job_status (name, running) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET running = excluded.running"
    ).run(jobName, running ? 1 : 0);
  }

  async getJobRunning(jobName: string): Promise<boolean> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT running FROM job_status WHERE name = ?")
      .get(jobName) as any;
    return row ? !!row.running : false;
  }

  async setJobLastRun(jobName: string, timestamp: number): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "INSERT INTO job_status (name, lastRun) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET lastRun = excluded.lastRun"
    ).run(jobName, timestamp);
  }

  async getJobLastRun(jobName: string): Promise<number | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT lastRun FROM job_status WHERE name = ?")
      .get(jobName) as any;
    return row && row.lastRun !== undefined ? row.lastRun : null;
  }

  async setJobLastSuccess(jobName: string, timestamp: number): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "INSERT INTO job_status (name, lastSuccess) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET lastSuccess = excluded.lastSuccess"
    ).run(jobName, timestamp);
  }

  async getJobLastSuccess(jobName: string): Promise<number | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT lastSuccess FROM job_status WHERE name = ?")
      .get(jobName) as any;
    return row && row.lastSuccess !== undefined ? row.lastSuccess : null;
  }

  // KPI operations
  async getKpiValue(kpiName: string): Promise<number> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT value FROM kpis WHERE name = ?")
      .get(kpiName) as any;
    return row ? parseFloat(row.value) : 0;
  }

  async setKpiValue(kpiName: string, value: number): Promise<void> {
    const db = this.getDb();
    db.prepare("INSERT OR REPLACE INTO kpis (name, value) VALUES (?, ?)").run(
      kpiName,
      value
    );
  }

  async incrementKpiValue(kpiName: string, increment: number): Promise<void> {
    const current = await this.getKpiValue(kpiName);
    await this.setKpiValue(kpiName, current + increment);
  }

  // Log operations
  async addLog(message: string): Promise<void> {
    const db = this.getDb();
    const formattedMessage = `${new Date().toISOString()} - ${message}`;
    db.prepare("INSERT INTO logs (message, timestamp) VALUES (?, ?)").run(
      formattedMessage,
      Date.now()
    );
    // In SQLite, keep for now, no trim
  }

  async getAllLogs(): Promise<string[]> {
    const db = this.getDb();
    const rows = db
      .prepare("SELECT message FROM logs ORDER BY timestamp DESC")
      .all() as any[];
    return rows.map((row) => row.message);
  }

  // Forum operations
  async saveForumSections(sections: ForumSection[]): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "INSERT OR REPLACE INTO forum_sections (id, sections) VALUES (1, ?)"
    ).run(JSON.stringify(sections));
  }

  async getForumSections(): Promise<ForumSection[] | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT sections FROM forum_sections WHERE id = 1")
      .get() as any;
    if (!row) return null;
    try {
      return JSON.parse(row.sections);
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
    const db = this.getDb();
    const now = Date.now();

    // Insert thread
    const threadResult = db
      .prepare(
        `
      INSERT INTO forum_threads (forumId, title, author, createdAt, replyCount, lastReplyTime)
      VALUES (?, ?, ?, ?, 0, ?)
    `
      )
      .run(forumId, title, author, now, now);

    const threadId = threadResult.lastInsertRowid as number;

    // Insert first post
    const postResult = db
      .prepare(
        `
      INSERT INTO forum_posts (threadId, content, author, createdAt)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(threadId, firstPostContent, author, now);

    const postId = postResult.lastInsertRowid as number;

    // Update counters
    db.prepare(
      `
      INSERT OR REPLACE INTO forum_counters (forumId, threadCount, postCount)
      VALUES (?, COALESCE((SELECT threadCount FROM forum_counters WHERE forumId = ?), 0) + 1,
             COALESCE((SELECT postCount FROM forum_counters WHERE forumId = ?), 0) + 1)
    `
    ).run(forumId, forumId, forumId);

    return { threadId, postId };
  }

  async createPost(
    threadId: number,
    content: string,
    author: string
  ): Promise<{ postId: number }> {
    const db = this.getDb();
    const now = Date.now();

    // Insert post
    const postResult = db
      .prepare(
        `
      INSERT INTO forum_posts (threadId, content, author, createdAt)
      VALUES (?, ?, ?, ?)
    `
      )
      .run(threadId, content, author, now);

    const postId = postResult.lastInsertRowid as number;

    // Get forumId
    const thread = db
      .prepare("SELECT forumId FROM forum_threads WHERE id = ?")
      .get(threadId) as any;
    const forumId = thread.forumId;

    // Update thread
    db.prepare(
      `
      UPDATE forum_threads SET replyCount = replyCount + 1, lastReplyTime = ? WHERE id = ?
    `
    ).run(now, threadId);

    // Update counters
    db.prepare(
      `
      UPDATE forum_counters SET postCount = postCount + 1 WHERE forumId = ?
    `
    ).run(forumId);

    return { postId };
  }

  async getForumThreads(
    forumId: string,
    offset?: number,
    limit?: number
  ): Promise<ForumThread[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM forum_threads WHERE forumId = ?
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(forumId, limit || 20, offset || 0) as any[];

    return rows.map((row) => ({
      id: row.id,
      forumId: row.forumId,
      title: row.title,
      author: row.author,
      createdAt: row.createdAt,
      replyCount: row.replyCount,
      lastReplyTime: row.lastReplyTime
    }));
  }

  async getThread(threadId: number): Promise<ForumThread | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM forum_threads WHERE id = ?")
      .get(threadId) as any;
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      forumId: row.forumId,
      author: row.author,
      createdAt: row.createdAt,
      replyCount: row.replyCount,
      lastReplyTime: row.lastReplyTime
    };
  }

  async getThreadPosts(
    threadId: number,
    offset?: number,
    limit?: number
  ): Promise<ForumPost[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM forum_posts WHERE threadId = ?
      ORDER BY createdAt ASC
      LIMIT ? OFFSET ?
    `
      )
      .all(threadId, limit || 50, offset || 0) as any[];

    return rows.map((row) => ({
      id: row.id,
      threadId: row.threadId,
      content: row.content,
      author: row.author,
      createdAt: row.createdAt
    }));
  }

  async getForumCounters(
    forumId: string
  ): Promise<{ threadCount: number; postCount: number }> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM forum_counters WHERE forumId = ?")
      .get(forumId) as any;
    return {
      threadCount: row ? row.threadCount : 0,
      postCount: row ? row.postCount : 0
    };
  }

  // Utility methods

  async saveHomepageChatMessage(message: HomepageChatMessage): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `INSERT INTO homepage_chat_messages (id, senderName, content, timestamp, type)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      message.id,
      message.senderName,
      message.content,
      message.timestamp,
      message.type
    );
  }

  async getHomepageChatMessages(limit = 50): Promise<HomepageChatMessage[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        "SELECT * FROM homepage_chat_messages ORDER BY timestamp DESC LIMIT ?"
      )
      .all(limit) as any[];
    return rows.reverse().map((row: any) => ({
      id: row.id,
      senderName: row.senderName,
      content: row.content,
      timestamp: row.timestamp,
      type: row.type as "user" | "assistant"
    }));
  }

  async generateId(prefix: string): Promise<string> {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async clearAllData(): Promise<void> {
    const db = this.getDb();
    const tables = [
      "editors",
      "reporters",
      "articles",
      "events",
      "newspaper_editions",
      "daily_editions",
      "users",
      "job_status",
      "kpis",
      "logs",
      "forum_sections",
      "forum_threads",
      "forum_posts",
      "forum_counters",
      "dynamic_personas",
      "artifacts",
      "ticker",
      "opinion_articles",
      "prism_daily_edition_pairs",
      "homepage_chat_messages"
    ];
    for (const table of tables) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    // Reset autoincrements
    db.prepare(`DELETE FROM sqlite_sequence`).run();
  }

  // Memory info
  async getMemoryInfo(): Promise<{
    redis: { usedMemory: number; usedMemoryPeak: number };
    system: { totalMemory: number; usedMemory: number; freeMemory: number };
  }> {
    const dbFileSize =
      this.dbPath === ":memory:" ? 0 : statSync(this.dbPath).size;

    const os = await import("os");
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      redis: {
        usedMemory: dbFileSize,
        usedMemoryPeak: dbFileSize
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
    const db = this.getDb();
    const now = Date.now();
    const row = db
      .prepare(
        `
      SELECT data FROM dynamic_personas WHERE expiresAt > ? ORDER BY expiresAt DESC LIMIT 1
    `
      )
      .get(now) as any;
    if (!row) return null;
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }

  async setDynamicPersonas(
    personas: DynamicPersona[],
    ttlHours = 24
  ): Promise<void> {
    const db = this.getDb();
    const expiresAt = Date.now() + ttlHours * 3600 * 1000;
    db.prepare(
      "INSERT OR REPLACE INTO dynamic_personas (id, data, expiresAt) VALUES (1, ?, ?)"
    ).run(JSON.stringify(personas), expiresAt);
  }

  async getClassicPersonas(): Promise<typeof CLASSIC_PERSONAS> {
    return CLASSIC_PERSONAS;
  }

  // Artifact operations
  async saveArtifact(artifact: Artifact): Promise<void> {
    const db = this.getDb();
    const now = Date.now();
    const createdAt = artifact.metadata.generated_at || now;
    const reporterId = artifact.metadata.reporterId || null;
    db.prepare(
      `
      INSERT OR REPLACE INTO artifacts (id, reporterId, type, input, output, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      artifact.id,
      reporterId,
      artifact.type,
      JSON.stringify(artifact.inputs),
      artifact.output ? JSON.stringify(artifact.output) : null,
      artifact.metadata.status || "generated",
      createdAt,
      now
    );
  }

  async getArtifact(artifactId: string): Promise<Artifact | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM artifacts WHERE id = ?")
      .get(artifactId) as any;
    if (!row) return null;
    return {
      id: row.id,
      type: row.type,
      inputs: JSON.parse(row.input || "[]"),
      prompt_system: "",
      prompt_user_template: "",
      output_schema: "",
      output: row.output ? JSON.parse(row.output) : undefined,
      metadata: {
        generated_at: row.createdAt,
        reporterId: row.reporterId,
        status: row.status as "pending" | "generated" | "failed"
      }
    };
  }

  async getAllArtifacts(): Promise<Artifact[]> {
    const db = this.getDb();
    const rows = db
      .prepare("SELECT * FROM artifacts ORDER BY createdAt DESC")
      .all() as any[];
    return rows.map((row) => this.mapArtifactRow(row));
  }

  async getArtifactsByType(type: string, limit?: number): Promise<Artifact[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        `
      SELECT * FROM artifacts WHERE type = ? ORDER BY createdAt DESC LIMIT ?
    `
      )
      .all(type, limit || -1) as any[];
    return rows.map((row) => this.mapArtifactRow(row));
  }

  async getArtifactsByReporter(reporterId: string): Promise<Artifact[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        "SELECT * FROM artifacts WHERE reporterId = ? ORDER BY createdAt DESC"
      )
      .all(reporterId) as any[];
    return rows.map((row) => this.mapArtifactRow(row));
  }

  async deleteArtifact(artifactId: string): Promise<void> {
    const db = this.getDb();
    db.prepare("DELETE FROM artifacts WHERE id = ?").run(artifactId);
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

  private mapArtifactRow(row: any): Artifact {
    return {
      id: row.id,
      type: row.type,
      inputs: JSON.parse(row.input || "[]"),
      prompt_system: "",
      prompt_user_template: "",
      output_schema: "",
      output: row.output ? JSON.parse(row.output) : undefined,
      metadata: {
        generated_at: row.createdAt,
        reporterId: row.reporterId,
        status: row.status as "pending" | "generated" | "failed"
      }
    };
  }

  async savePrismDailyEditionPair(pair: PrismDailyEditionPair): Promise<void> {
    const db = this.getDb();
    db.prepare(
      "INSERT OR REPLACE INTO prism_daily_edition_pairs (id, data, generationTime) VALUES (?, ?, ?)"
    ).run(pair.id, JSON.stringify(pair), pair.generationTime);
    // Keep only the 10 most recent pairs (matching Redis behavior)
    db.prepare(
      "DELETE FROM prism_daily_edition_pairs WHERE id NOT IN (SELECT id FROM prism_daily_edition_pairs ORDER BY generationTime DESC LIMIT 10)"
    ).run();
  }

  async getPrismDailyEditionPairs(
    limit?: number
  ): Promise<PrismDailyEditionPair[]> {
    const db = this.getDb();
    const rows = db
      .prepare(
        "SELECT data FROM prism_daily_edition_pairs ORDER BY generationTime DESC LIMIT ?"
      )
      .all(limit || 3) as any[];
    return rows.map((row) => JSON.parse(row.data));
  }

  async saveChatSession(
    sessionId: string,
    messages: unknown[],
    ttlSeconds = 1800
  ): Promise<void> {
    const db = this.getDb();
    const expiresAt = Date.now() + ttlSeconds * 1000;
    db.prepare(
      `INSERT OR REPLACE INTO chat_sessions (sessionId, data, expiresAt)
       VALUES (?, ?, ?)`
    ).run(sessionId, JSON.stringify(messages), expiresAt);
  }

  async getChatSession(sessionId: string): Promise<unknown[] | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT data, expiresAt FROM chat_sessions WHERE sessionId = ?")
      .get(sessionId) as { data: string; expiresAt: number } | undefined;
    if (!row) return null;
    if (Date.now() > row.expiresAt) {
      db.prepare("DELETE FROM chat_sessions WHERE sessionId = ?").run(
        sessionId
      );
      return null;
    }
    return JSON.parse(row.data);
  }
}
