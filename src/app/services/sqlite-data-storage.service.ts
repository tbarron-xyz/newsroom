import Database from "better-sqlite3";
import {
  Editor,
  Reporter,
  Article,
  NewspaperEdition,
  DailyEdition,
  Event,
  AdEntry,
  User,
  ForumSection,
  ForumThread,
  ForumPost,
  DynamicPersona,
  Artifact,
  PrismDailyEditionPair
} from "../schemas/types";
import { CLASSIC_PERSONAS } from "./ai-prompts";
import { IDataStorageService } from "./data-storage.interface";

export class SQLiteDataStorageService implements IDataStorageService {
  private db: any = null;
  private readonly dbPath = "./db.sqlite";

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
        messageSliceCount INTEGER,
        inputTokenCost REAL,
        outputTokenCost REAL,
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
        enabled INTEGER DEFAULT 0  -- 0=falsy, 1=true
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
        modelName TEXT,
        inputTokenCount INTEGER,
        outputTokenCount INTEGER
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
        outputTokenCount INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_daily_editions_time ON daily_editions(generationTime DESC);

      -- Ads
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        userId TEXT,
        name TEXT,
        bidPrice REAL,
        promptContent TEXT
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
        editionSelectionModelName, messageSliceCount, inputTokenCost, outputTokenCost, baseUrl,
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
      editor.messageSliceCount,
      editor.inputTokenCost,
      editor.outputTokenCost,
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
      INSERT OR REPLACE INTO reporters (id, beats, prompt, enabled)
      VALUES (?, ?, ?, ?)
    `
    ).run(
      reporter.id,
      JSON.stringify(reporter.beats),
      reporter.prompt,
      reporter.enabled ? 1 : 0
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
        modelName, inputTokenCount, outputTokenCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      article.modelName,
      article.inputTokenCount,
      article.outputTokenCount
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

  async getArticle(articleId: string): Promise<Article | null> {
    const db = this.getDb();
    const row = db
      .prepare("SELECT * FROM articles WHERE id = ?")
      .get(articleId) as any;
    return row ? this.mapArticleRow(row) : null;
  }

  private mapArticleRow(row: any): Article {
    return {
      ...row,
      messageIds: JSON.parse(row.messageIds || "[]"),
      messageTexts: JSON.parse(row.messageTexts || "[]"),
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
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
        inputTokenCount, outputTokenCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      dailyEdition.id,
      JSON.stringify(dailyEdition.editions),
      dailyEdition.generationTime,
      dailyEdition.frontPageHeadline,
      dailyEdition.frontPageArticle,
      dailyEdition.newspaperName,
      // dailyEdition.modelFeedbackAboutThePrompt?.positive,
      // dailyEdition.modelFeedbackAboutThePrompt?.negative,
      JSON.stringify(dailyEdition.topics || []),
      dailyEdition.prompt,
      dailyEdition.modelName,
      dailyEdition.inputTokenCount,
      dailyEdition.outputTokenCount
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
    // const modelFeedbackAboutThePrompt =
    //   row.modelFeedbackPositive && row.modelFeedbackNegative
    //     ? {
    //         positive: row.modelFeedbackPositive,
    //         negative: row.modelFeedbackNegative
    //       }
    //     : undefined;
    return {
      id: row.id,
      editions: JSON.parse(row.editions || "[]"),
      generationTime: row.generationTime,
      frontPageHeadline: row.frontPageHeadline,
      frontPageArticle: row.frontPageArticle,
      newspaperName: row.newspaperName,
      topics: topics,
      // modelFeedbackAboutThePrompt,
      prompt: row.prompt,
      modelName: row.modelName,
      inputTokenCount: row.inputTokenCount || undefined,
      outputTokenCount: row.outputTokenCount || undefined
    };
  }

  // Ad operations
  async saveAd(ad: AdEntry): Promise<void> {
    const db = this.getDb();
    db.prepare(
      `
      INSERT OR REPLACE INTO ads (id, userId, name, bidPrice, promptContent)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(ad.id, ad.userId, ad.name, ad.bidPrice, ad.promptContent);
  }

  async getAllAds(): Promise<AdEntry[]> {
    const db = this.getDb();
    const rows = db.prepare("SELECT * FROM ads").all() as any[];
    return rows;
  }

  async getMostRecentAd(): Promise<AdEntry | null> {
    const db = this.getDb();
    const rows = db.prepare("SELECT id FROM ads").all() as { id: string }[];
    const adIds = rows.map((row) => row.id);
    const sortedAdIds = adIds.sort((a, b) => {
      const timestampA = parseInt(a.split("_")[1]);
      const timestampB = parseInt(b.split("_")[1]);
      return timestampB - timestampA; // Most recent first
    });
    if (sortedAdIds.length === 0) return null;
    return await this.getAd(sortedAdIds[0]);
  }

  async getAd(adId: string): Promise<AdEntry | null> {
    const db = this.getDb();
    const row = db.prepare("SELECT * FROM ads WHERE id = ?").get(adId) as any;
    return row || null;
  }

  async updateAd(
    adId: string,
    updates: Partial<Omit<AdEntry, "id">>
  ): Promise<void> {
    const db = this.getDb();
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.userId !== undefined) {
      fields.push("userId = ?");
      values.push(updates.userId);
    }
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.bidPrice !== undefined) {
      fields.push("bidPrice = ?");
      values.push(updates.bidPrice);
    }
    if (updates.promptContent !== undefined) {
      fields.push("promptContent = ?");
      values.push(updates.promptContent);
    }
    if (fields.length === 0) return;
    values.push(adId);
    db.prepare(`UPDATE ads SET ${fields.join(", ")} WHERE id = ?`).run(
      ...values
    );
  }

  async deleteAd(adId: string): Promise<void> {
    const db = this.getDb();
    db.prepare("DELETE FROM ads WHERE id = ?").run(adId);
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
      "INSERT OR REPLACE INTO job_status (name, running) VALUES (?, ?)"
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
      "INSERT OR REPLACE INTO job_status (name, lastRun) VALUES (?, ?)"
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
      "INSERT OR REPLACE INTO job_status (name, lastSuccess) VALUES (?, ?)"
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
      "ads",
      "users",
      "job_status",
      "kpis",
      "logs",
      "forum_sections",
      "forum_threads",
      "forum_posts",
      "forum_counters",
      "dynamic_personas",
      "artifacts"
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
    const db = this.getDb();
    // Get SQLite memory stats (approximation)
    const dbStats = db.prepare("PRAGMA compile_time_limit").get() as any;
    const pageCount = db.prepare("PRAGMA page_count").get() as any;
    const pageSize = db.prepare("PRAGMA page_size").get() as any;

    // Estimate database memory usage
    const estimatedDbMemory = pageCount.page_count * pageSize.page_size;

    // For system memory, provide basic estimates since SQLite doesn't provide this directly
    // This could be enhanced with system-specific calls if needed
    const totalMemory = process.memoryUsage().heapTotal;
    const usedMemory = process.memoryUsage().heapUsed;
    const freeMemory = totalMemory - usedMemory;

    return {
      redis: {
        usedMemory: estimatedDbMemory,
        usedMemoryPeak: estimatedDbMemory // SQLite doesn't track peaks
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

  async savePrismDailyEditionPair(_pair: PrismDailyEditionPair): Promise<void> {
    throw new Error("Not implemented in SQLite");
  }

  async getPrismDailyEditionPairs(_limit?: number): Promise<PrismDailyEditionPair[]> {
    return [];
  }
}
