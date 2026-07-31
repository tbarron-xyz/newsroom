import { Pool } from "pg";
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
  PrismDailyEditionPair,
  Ticker
} from "../schemas/types";
import { IDataStorageService } from "./data-storage.interface";

// NOTE: Schema migrations are out of scope. The app creates tables
// at startup via CREATE TABLE IF NOT EXISTS and assumes all schemas
// are already up to date. Schema changes must be made by editing
// createTables() directly.

export class PostgreSQLDataStorageService {
  //  implements IDataStorageService
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString:
        process.env.POSTGRES_URL || "postgresql://localhost:5432/newsroom",
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    this.pool.on("error", (err: Error) => {
      console.error("PostgreSQL Pool Error:", err);
    });
  }

  async connect(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      console.log("Connected to PostgreSQL");
      client.release();

      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      console.error("Failed to connect to PostgreSQL:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    console.log("Disconnected from PostgreSQL");
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Create editors table
      await client.query(`
        CREATE TABLE IF NOT EXISTS editors (
          id SERIAL PRIMARY KEY,
          bio TEXT NOT NULL,
          prompt TEXT NOT NULL,
          model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          article_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          event_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          story_selection_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          edition_selection_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          chat_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          research_model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
          message_slice_count INTEGER NOT NULL,
          article_generation_period_minutes INTEGER NOT NULL,
          last_article_generation_time BIGINT,
          event_generation_period_minutes INTEGER NOT NULL,
          last_event_generation_time BIGINT,
          edition_generation_period_minutes INTEGER NOT NULL,
          last_edition_generation_time BIGINT
        )
      `);

      // Create reporters table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reporters (
          id TEXT PRIMARY KEY,
          beats JSONB NOT NULL DEFAULT '[]',
          prompt TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT true,
          display_name TEXT
        )
      `);

      // Create articles table
      await client.query(`
        CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY,
          reporter_id TEXT NOT NULL REFERENCES reporters(id),
          headline TEXT NOT NULL,
          body TEXT NOT NULL,
          generation_time BIGINT NOT NULL,
          prompt TEXT NOT NULL,
          message_ids JSONB NOT NULL DEFAULT '[]',
          message_texts JSONB NOT NULL DEFAULT '[]',
          message_dids JSONB NOT NULL DEFAULT '[]',
          message_rkeys JSONB NOT NULL DEFAULT '[]',
          model_name TEXT DEFAULT 'gpt-5-nano',
          input_token_count INTEGER,
          output_token_count INTEGER,
          published BOOLEAN DEFAULT TRUE
        )
      `);

      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          reporter_id TEXT NOT NULL REFERENCES reporters(id),
          title TEXT NOT NULL,
          created_time BIGINT NOT NULL,
          updated_time BIGINT NOT NULL,
          facts JSONB NOT NULL DEFAULT '[]',
          location TEXT,
          event_time TEXT,
          message_ids JSONB,
          message_texts JSONB,
          model_name TEXT DEFAULT 'gpt-5-nano',
          input_token_count INTEGER,
          output_token_count INTEGER
        )
      `);

      // Create newspaper_editions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS newspaper_editions (
          id TEXT PRIMARY KEY,
          stories JSONB NOT NULL DEFAULT '[]',
          generation_time BIGINT NOT NULL,
          prompt TEXT NOT NULL,
          model_name TEXT DEFAULT 'gpt-5-nano',
          input_token_count INTEGER,
          output_token_count INTEGER
        )
      `);

      // Create daily_editions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_editions (
          id TEXT PRIMARY KEY,
          editions JSONB NOT NULL DEFAULT '[]',
          generation_time BIGINT NOT NULL,
          front_page_headline TEXT NOT NULL,
          front_page_article TEXT NOT NULL,
          newspaper_name TEXT NOT NULL,
          topics JSONB NOT NULL DEFAULT '[]',
          prompt TEXT NOT NULL,
          model_name TEXT DEFAULT 'gpt-5-nano',
          input_token_count INTEGER,
          output_token_count INTEGER,
          published BOOLEAN DEFAULT TRUE
        )
      `);

      // Create ticker table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ticker (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          generation_time BIGINT NOT NULL,
          daily_edition_id TEXT NOT NULL,
          model_name TEXT NOT NULL,
          input_token_count INTEGER,
          output_token_count INTEGER
        )
      `);

      // Create opinion_articles table
      await client.query(`
        CREATE TABLE IF NOT EXISTS opinion_articles (
          id TEXT PRIMARY KEY,
          persona TEXT NOT NULL,
          headline TEXT NOT NULL,
          content TEXT NOT NULL,
          generation_time BIGINT NOT NULL,
          article_ids TEXT NOT NULL,
          model_name TEXT NOT NULL,
          input_token_count INTEGER,
          output_token_count INTEGER
        )
      `);
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_opinion_articles_time ON opinion_articles(generation_time DESC)`
      );

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'reporter', 'user')),
          created_at BIGINT NOT NULL,
          last_login_at BIGINT,
          has_reader BOOLEAN NOT NULL DEFAULT false,
          has_reporter BOOLEAN NOT NULL DEFAULT false,
          has_editor BOOLEAN NOT NULL DEFAULT false
        )
      `);

      // Create kpis table
      await client.query(`
        CREATE TABLE IF NOT EXISTS kpis (
          name TEXT PRIMARY KEY,
          value DECIMAL(20,2) NOT NULL,
          last_updated BIGINT NOT NULL
        )
      `);

      // Create job_status table
      await client.query(`
        CREATE TABLE IF NOT EXISTS job_status (
          name TEXT PRIMARY KEY,
          running BOOLEAN NOT NULL DEFAULT false,
          last_run BIGINT,
          last_success BIGINT
        )
      `);

      // Create indexes
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_articles_reporter_time ON articles(reporter_id, generation_time DESC)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_events_reporter_created ON events(reporter_id, created_time DESC)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_newspaper_editions_time ON newspaper_editions(generation_time DESC)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_daily_editions_time ON daily_editions(generation_time DESC)`
      );
      await client.query(
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Editor operations
  async saveEditor(editor: Editor): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO editors (
          bio, prompt, model_name, article_model_name, event_model_name, story_selection_model_name, edition_selection_model_name,
          chat_model_name, research_model_name, message_slice_count,
          article_generation_period_minutes, last_article_generation_time,
          event_generation_period_minutes, last_event_generation_time,
          edition_generation_period_minutes, last_edition_generation_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          bio = EXCLUDED.bio,
          prompt = EXCLUDED.prompt,
          model_name = EXCLUDED.model_name,
          article_model_name = EXCLUDED.article_model_name,
          event_model_name = EXCLUDED.event_model_name,
          story_selection_model_name = EXCLUDED.story_selection_model_name,
          edition_selection_model_name = EXCLUDED.edition_selection_model_name,
          chat_model_name = EXCLUDED.chat_model_name,
          research_model_name = EXCLUDED.research_model_name,
          message_slice_count = EXCLUDED.message_slice_count,
          article_generation_period_minutes = EXCLUDED.article_generation_period_minutes,
          last_article_generation_time = EXCLUDED.last_article_generation_time,
          event_generation_period_minutes = EXCLUDED.event_generation_period_minutes,
          last_event_generation_time = EXCLUDED.last_event_generation_time,
          edition_generation_period_minutes = EXCLUDED.edition_generation_period_minutes,
          last_edition_generation_time = EXCLUDED.last_edition_generation_time
        WHERE editors.id = 1
      `;

      const values = [
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
        editor.articleGenerationPeriodMinutes,
        editor.lastArticleGenerationTime,
        editor.eventGenerationPeriodMinutes,
        editor.lastEventGenerationTime,
        editor.editionGenerationPeriodMinutes,
        editor.lastEditionGenerationTime
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async getEditor(): Promise<Editor | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("SELECT * FROM editors LIMIT 1");
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        bio: row.bio,
        prompt: row.prompt,
        modelName: row.model_name,
        articleModelName: row.article_model_name,
        eventModelName: row.event_model_name,
        storySelectionModelName: row.story_selection_model_name,
        editionSelectionModelName: row.edition_selection_model_name,
        chatModelName: row.chat_model_name || "gpt-5-nano",
        researchModelName: row.research_model_name || "gpt-5-nano",
        messageSliceCount: row.message_slice_count,
        articleGenerationPeriodMinutes: row.article_generation_period_minutes,
        lastArticleGenerationTime: row.last_article_generation_time,
        eventGenerationPeriodMinutes: row.event_generation_period_minutes,
        lastEventGenerationTime: row.last_event_generation_time,
        editionGenerationPeriodMinutes: row.edition_generation_period_minutes,
        lastEditionGenerationTime: row.last_edition_generation_time
      };
    } finally {
      client.release();
    }
  }

  // Reporter operations
  async saveReporter(reporter: Reporter): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO reporters (id, beats, prompt, enabled, display_name)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          beats = EXCLUDED.beats,
          prompt = EXCLUDED.prompt,
          enabled = EXCLUDED.enabled,
          display_name = EXCLUDED.display_name
      `;

      await client.query(query, [
        reporter.id,
        JSON.stringify(reporter.beats),
        reporter.prompt,
        reporter.enabled,
        reporter.displayName ?? null
      ]);
    } finally {
      client.release();
    }
  }

  async getAllReporters(): Promise<Reporter[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("SELECT * FROM reporters");
      return result.rows.map((row: any) => ({
        id: row.id,
        beats: row.beats,
        prompt: row.prompt,
        enabled: row.enabled,
        displayName: row.display_name ?? undefined
      }));
    } finally {
      client.release();
    }
  }

  async getReporter(id: string): Promise<Reporter | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM reporters WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        beats: row.beats,
        prompt: row.prompt,
        enabled: row.enabled,
        displayName: row.display_name ?? undefined
      };
    } finally {
      client.release();
    }
  }

  // Article operations
  async saveArticle(article: Article): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO articles (id, reporter_id, headline, body, generation_time, prompt, message_ids, message_texts, message_dids, message_rkeys, model_name, input_token_count, output_token_count, published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          reporter_id = EXCLUDED.reporter_id,
          headline = EXCLUDED.headline,
          body = EXCLUDED.body,
          generation_time = EXCLUDED.generation_time,
          prompt = EXCLUDED.prompt,
          message_ids = EXCLUDED.message_ids,
          message_texts = EXCLUDED.message_texts,
          message_dids = EXCLUDED.message_dids,
          message_rkeys = EXCLUDED.message_rkeys,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count,
          published = EXCLUDED.published
      `;

      const values = [
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
        article.published !== false
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async getLatestArticles(_limit?: number): Promise<Article[]> {
    return [];
  }

  async getLatestPublishedArticles(limit = 100): Promise<Article[]> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT * FROM articles
        WHERE published = TRUE
        ORDER BY generation_time DESC
        LIMIT $1
      `;
      const result = await client.query(sql, [limit]);
      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getDraftArticles(limit = 100): Promise<Article[]> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT * FROM articles
        WHERE published = FALSE
        ORDER BY generation_time DESC
        LIMIT $1
      `;
      const result = await client.query(sql, [limit]);
      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async searchArticles(query: string, limit = 20): Promise<Article[]> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT * FROM articles
        WHERE headline ILIKE $1 OR body ILIKE $1
        ORDER BY generation_time DESC
        LIMIT $2
      `;
      const pattern = `%${query}%`;
      const result = await client.query(sql, [pattern, limit]);
      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getAllArticles(_limit?: number): Promise<Article[]> {
    return [];
  }

  async getArticlesByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Article[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM articles
        WHERE reporter_id = $1
        ORDER BY generation_time DESC
        ${limit ? "LIMIT $2" : ""}
      `;

      const values = limit ? [reporterId, limit] : [reporterId];
      const result = await client.query(query, values);

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getArticlesInTimeRange(
    reporterId: string,
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT * FROM articles
        WHERE reporter_id = $1 AND generation_time >= $2 AND generation_time <= $3
        ORDER BY generation_time DESC
      `,
        [reporterId, startTime, endTime]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getArticlesInTimeRangeGlobal(
    startTime: number,
    endTime: number
  ): Promise<Article[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        `
        SELECT * FROM articles
        WHERE generation_time >= $1 AND generation_time <= $2
        ORDER BY generation_time DESC
      `,
        [startTime, endTime]
      );

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getArticle(articleId: string): Promise<Article | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM articles WHERE id = $1",
        [articleId]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        reporterId: row.reporter_id,
        headline: row.headline,
        body: row.body,
        generationTime: row.generation_time,
        prompt: row.prompt,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        messageDids: row.message_dids || [],
        messageRkeys: row.message_rkeys || [],
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      };
    } finally {
      client.release();
    }
  }

  async deleteArticle(articleId: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("DELETE FROM articles WHERE id = $1", [
        articleId
      ]);
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  // Event operations
  async saveEvent(event: Event): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO events (id, reporter_id, title, created_time, updated_time, facts, location, event_time, message_ids, message_texts, model_name, input_token_count, output_token_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          reporter_id = EXCLUDED.reporter_id,
          title = EXCLUDED.title,
          created_time = EXCLUDED.created_time,
          updated_time = EXCLUDED.updated_time,
          facts = EXCLUDED.facts,
          location = EXCLUDED.location,
          event_time = EXCLUDED.event_time,
          message_ids = EXCLUDED.message_ids,
          message_texts = EXCLUDED.message_texts,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count
      `;

      const values = [
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
      ];

      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  async getEventsByReporter(
    reporterId: string,
    limit?: number
  ): Promise<Event[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM events
        WHERE reporter_id = $1
        ORDER BY created_time DESC
        ${limit ? "LIMIT $2" : ""}
      `;

      const values = limit ? [reporterId, limit] : [reporterId];
      const result = await client.query(query, values);

      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        title: row.title,
        createdTime: row.created_time,
        updatedTime: row.updated_time,
        facts: row.facts,
        where: row.location,
        when: row.event_time,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      }));
    } finally {
      client.release();
    }
  }

  async getLatestUpdatedEvents(limit?: number): Promise<Event[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM events
        ORDER BY updated_time DESC
        ${limit ? "LIMIT $1" : ""}
      `;

      const result = await client.query(query, limit ? [limit] : []);
      return result.rows.map((row: any) => ({
        id: row.id,
        reporterId: row.reporter_id,
        title: row.title,
        createdTime: row.created_time,
        updatedTime: row.updated_time,
        facts: row.facts,
        where: row.location,
        when: row.event_time,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      }));
    } finally {
      client.release();
    }
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("SELECT * FROM events WHERE id = $1", [
        eventId
      ]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        reporterId: row.reporter_id,
        title: row.title,
        createdTime: row.created_time,
        updatedTime: row.updated_time,
        facts: row.facts,
        where: row.location,
        when: row.event_time,
        messageIds: row.message_ids,
        messageTexts: row.message_texts,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      };
    } finally {
      client.release();
    }
  }

  // Newspaper Edition operations
  async saveNewspaperEdition(edition: NewspaperEdition): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO newspaper_editions (id, stories, generation_time, prompt, model_name, input_token_count, output_token_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          stories = EXCLUDED.stories,
          generation_time = EXCLUDED.generation_time,
          prompt = EXCLUDED.prompt,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count
      `;

      await client.query(query, [
        edition.id,
        JSON.stringify(edition.stories),
        edition.generationTime,
        edition.prompt,
        edition.modelName,
        edition.inputTokenCount,
        edition.outputTokenCount
      ]);
    } finally {
      client.release();
    }
  }

  async getNewspaperEditions(limit?: number): Promise<NewspaperEdition[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM newspaper_editions
        ORDER BY generation_time DESC
        ${limit ? "LIMIT $1" : ""}
      `;

      const result = await client.query(query, limit ? [limit] : []);
      return result.rows.map((row: any) => ({
        id: row.id,
        stories: row.stories,
        generationTime: row.generation_time,
        prompt: row.prompt,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      }));
    } finally {
      client.release();
    }
  }

  async getLatestEditions(limit?: number): Promise<NewspaperEdition[]> {
    return this.getNewspaperEditions(limit || 50);
  }

  async getNewspaperEdition(
    editionId: string
  ): Promise<NewspaperEdition | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM newspaper_editions WHERE id = $1",
        [editionId]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        stories: row.stories,
        generationTime: row.generation_time,
        prompt: row.prompt,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      };
    } finally {
      client.release();
    }
  }

  // Daily Edition operations
  async saveDailyEdition(dailyEdition: DailyEdition): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO daily_editions (id, editions, generation_time, front_page_headline, front_page_article, newspaper_name, topics, prompt, model_name, input_token_count, output_token_count, published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          editions = EXCLUDED.editions,
          generation_time = EXCLUDED.generation_time,
          front_page_headline = EXCLUDED.front_page_headline,
          front_page_article = EXCLUDED.front_page_article,
          newspaper_name = EXCLUDED.newspaper_name,
          topics = EXCLUDED.topics,
          prompt = EXCLUDED.prompt,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count,
          published = EXCLUDED.published
      `;

      await client.query(query, [
        dailyEdition.id,
        JSON.stringify(dailyEdition.editions),
        dailyEdition.generationTime,
        dailyEdition.frontPageHeadline,
        dailyEdition.frontPageArticle,
        dailyEdition.newspaperName || null,
        JSON.stringify(dailyEdition.topics),
        dailyEdition.prompt,
        dailyEdition.modelName,
        dailyEdition.inputTokenCount,
        dailyEdition.outputTokenCount,
        dailyEdition.published !== false
      ]);
    } finally {
      client.release();
    }
  }

  async getDailyEditions(limit?: number): Promise<DailyEdition[]> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM daily_editions
        ORDER BY generation_time DESC
        ${limit ? "LIMIT $1" : ""}
      `;

      const result = await client.query(query, limit ? [limit] : []);
      return result.rows.map((row: any) => ({
        id: row.id,
        editions: row.editions,
        generationTime: row.generation_time,
        frontPageHeadline: row.front_page_headline,
        frontPageArticle: row.front_page_article,
        newspaperName: row.newspaper_name || undefined,
        topics: row.topics,
        prompt: row.prompt,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      }));
    } finally {
      client.release();
    }
  }

  async getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM daily_editions WHERE id = $1",
        [dailyEditionId]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        editions: row.editions,
        generationTime: row.generation_time,
        frontPageHeadline: row.front_page_headline,
        frontPageArticle: row.front_page_article,
        newspaperName: row.newspaper_name || undefined,
        topics: row.topics,
        prompt: row.prompt,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count,
        published: row.published === null ? true : row.published
      };
    } finally {
      client.release();
    }
  }

  // Ticker operations
  async saveTicker(ticker: Ticker): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO ticker (id, text, generation_time, daily_edition_id, model_name, input_token_count, output_token_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          generation_time = EXCLUDED.generation_time,
          daily_edition_id = EXCLUDED.daily_edition_id,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count
      `;
      await client.query(query, [
        ticker.id,
        ticker.text,
        ticker.generationTime,
        ticker.dailyEditionId,
        ticker.modelName,
        ticker.inputTokenCount,
        ticker.outputTokenCount
      ]);
    } finally {
      client.release();
    }
  }

  async getLatestTicker(): Promise<Ticker | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM ticker ORDER BY generation_time DESC LIMIT 1"
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        text: row.text,
        generationTime: row.generation_time,
        dailyEditionId: row.daily_edition_id,
        modelName: row.model_name,
        inputTokenCount: row.input_token_count,
        outputTokenCount: row.output_token_count
      };
    } finally {
      client.release();
    }
  }

  // Opinion Article operations
  async saveOpinionArticle(opinion: OpinionArticle): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO opinion_articles (id, persona, headline, content, generation_time, article_ids, model_name, input_token_count, output_token_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          persona = EXCLUDED.persona,
          headline = EXCLUDED.headline,
          content = EXCLUDED.content,
          generation_time = EXCLUDED.generation_time,
          article_ids = EXCLUDED.article_ids,
          model_name = EXCLUDED.model_name,
          input_token_count = EXCLUDED.input_token_count,
          output_token_count = EXCLUDED.output_token_count
      `;
      await client.query(query, [
        opinion.id,
        opinion.persona,
        opinion.headline,
        opinion.content,
        opinion.generationTime,
        JSON.stringify(opinion.articleIds),
        opinion.modelName,
        opinion.inputTokenCount ?? null,
        opinion.outputTokenCount ?? null
      ]);
    } finally {
      client.release();
    }
  }

  async getOpinionArticle(opinionId: string): Promise<OpinionArticle | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM opinion_articles WHERE id = $1",
        [opinionId]
      );
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        persona: row.persona as OpinionPersona,
        headline: row.headline,
        content: row.content,
        generationTime: row.generation_time,
        articleIds: row.article_ids ? JSON.parse(row.article_ids) : [],
        modelName: row.model_name || "",
        inputTokenCount: row.input_token_count || undefined,
        outputTokenCount: row.output_token_count || undefined
      };
    } finally {
      client.release();
    }
  }

  async getLatestOpinionArticles(limit?: number): Promise<OpinionArticle[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        "SELECT * FROM opinion_articles ORDER BY generation_time DESC LIMIT $1",
        [limit || 50]
      );
      return result.rows.map((row: any) => ({
        id: row.id,
        persona: row.persona as OpinionPersona,
        headline: row.headline,
        content: row.content,
        generationTime: row.generation_time,
        articleIds: row.article_ids ? JSON.parse(row.article_ids) : [],
        modelName: row.model_name || "",
        inputTokenCount: row.input_token_count || undefined,
        outputTokenCount: row.output_token_count || undefined
      }));
    } finally {
      client.release();
    }
  }

  // User operations
  async createUser(
    user: Omit<User, "id" | "createdAt" | "lastLoginAt">
  ): Promise<User> {
    const client = await this.pool.connect();

    try {
      const userId = await this.generateId("user");
      const now = Date.now();

      const query = `
        INSERT INTO users (id, email, password_hash, role, created_at, has_reader, has_reporter, has_editor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await client.query(query, [
        userId,
        user.email,
        user.passwordHash,
        user.role,
        now,
        user.hasReader,
        user.hasReporter,
        user.hasEditor
      ]);

      return {
        id: userId,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        createdAt: now,
        hasReader: user.hasReader,
        hasReporter: user.hasReporter,
        hasEditor: user.hasEditor
      };
    } finally {
      client.release();
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("SELECT * FROM users WHERE id = $1", [
        userId
      ]);
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        hasReader: row.has_reader,
        hasReporter: row.has_reporter,
        hasEditor: row.has_editor
      };
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        hasReader: row.has_reader,
        hasReporter: row.has_reporter,
        hasEditor: row.has_editor
      };
    } finally {
      client.release();
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("UPDATE users SET last_login_at = $1 WHERE id = $2", [
        Date.now(),
        userId
      ]);
    } finally {
      client.release();
    }
  }

  async getAllUsers(): Promise<User[]> {
    const client = await this.pool.connect();

    try {
      const result = await client.query("SELECT * FROM users");
      return result.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role,
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
        hasReader: row.has_reader,
        hasReporter: row.has_reporter,
        hasEditor: row.has_editor
      }));
    } finally {
      client.release();
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
    } finally {
      client.release();
    }
  }

  // Job status operations
  async setJobRunning(jobName: string, running: boolean): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO job_status (name, running, last_run)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET
          running = EXCLUDED.running,
          last_run = CASE WHEN EXCLUDED.running THEN EXCLUDED.last_run ELSE job_status.last_run END
      `;

      await client.query(query, [
        jobName,
        running,
        running ? Date.now() : null
      ]);
    } finally {
      client.release();
    }
  }

  async getJobRunning(jobName: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT running FROM job_status WHERE name = $1",
        [jobName]
      );
      return result.rows.length > 0 ? result.rows[0].running : false;
    } finally {
      client.release();
    }
  }

  async setJobLastRun(jobName: string, timestamp: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO job_status (name, last_run)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET last_run = EXCLUDED.last_run
      `;

      await client.query(query, [jobName, timestamp]);
    } finally {
      client.release();
    }
  }

  async getJobLastRun(jobName: string): Promise<number | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT last_run FROM job_status WHERE name = $1",
        [jobName]
      );
      return result.rows.length > 0 ? result.rows[0].last_run : null;
    } finally {
      client.release();
    }
  }

  async setJobLastSuccess(jobName: string, timestamp: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO job_status (name, last_success)
        VALUES ($1, $2)
        ON CONFLICT (name) DO UPDATE SET last_success = EXCLUDED.last_success
      `;

      await client.query(query, [jobName, timestamp]);
    } finally {
      client.release();
    }
  }

  async getJobLastSuccess(jobName: string): Promise<number | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT last_success FROM job_status WHERE name = $1",
        [jobName]
      );
      return result.rows.length > 0 ? result.rows[0].last_success : null;
    } finally {
      client.release();
    }
  }

  // KPI operations
  async getKpiValue(kpiName: string): Promise<number> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        "SELECT value FROM kpis WHERE name = $1",
        [kpiName]
      );
      return result.rows.length > 0 ? parseFloat(result.rows[0].value) : 0;
    } finally {
      client.release();
    }
  }

  async setKpiValue(kpiName: string, value: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const query = `
        INSERT INTO kpis (name, value, last_updated)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET
          value = EXCLUDED.value,
          last_updated = EXCLUDED.last_updated
      `;

      await client.query(query, [kpiName, value, Date.now()]);
    } finally {
      client.release();
    }
  }

  async incrementKpiValue(kpiName: string, increment: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      const currentValue = await this.getKpiValue(kpiName);
      const newValue = currentValue + increment;
      await this.setKpiValue(kpiName, newValue);
    } finally {
      client.release();
    }
  }

  // Utility methods

  async generateId(prefix: string): Promise<string> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  async clearAllData(): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Delete in order to respect foreign key constraints
      await client.query("DELETE FROM job_status");
      await client.query("DELETE FROM kpis");
      await client.query("DELETE FROM users");
      await client.query("DELETE FROM daily_editions");
      await client.query("DELETE FROM newspaper_editions");
      await client.query("DELETE FROM events");
      await client.query("DELETE FROM articles");
      await client.query("DELETE FROM reporters");
      await client.query("DELETE FROM editors");

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Log operations (not persisted in PostgreSQL, just stub)
  async addLog(_message: string): Promise<void> {
    // No-op for PostgreSQL
  }

  async getAllLogs(): Promise<string[]> {
    return [];
  }

  async saveForumSections(_sections: ForumSection[]): Promise<void> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getForumSections(): Promise<ForumSection[] | null> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async createThread(
    _forumId: string,
    _title: string,
    _author: string,
    _firstPostContent: string
  ): Promise<{ threadId: number; postId: number }> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async createPost(
    _threadId: number,
    _content: string,
    _author: string
  ): Promise<{ postId: number }> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getForumThreads(
    _forumId: string,
    _offset?: number,
    _limit?: number
  ): Promise<ForumThread[]> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getThread(_threadId: number): Promise<ForumThread | null> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getThreadPosts(
    _threadId: number,
    _offset?: number,
    _limit?: number
  ): Promise<ForumPost[]> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getForumCounters(_forumId: string): Promise<{
    threadCount: number;
    postCount: number;
  }> {
    throw new Error("Forum not supported in PostgreSQL mode");
  }

  async getMemoryInfo(): Promise<{
    redis: { usedMemory: number; usedMemoryPeak: number };
    system: { totalMemory: number; usedMemory: number; freeMemory: number };
  }> {
    const os = await import("os");
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      redis: {
        usedMemory: 0,
        usedMemoryPeak: 0
      },
      system: {
        totalMemory,
        usedMemory,
        freeMemory
      }
    };
  }
}
