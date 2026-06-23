/*
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import {
  Editor,
  Reporter,
  Article,
  NewspaperEdition,
  DailyEdition,
  Event,
  AdEntry,
  User
} from '../models/types';
import { IDataStorageService } from './data-storage.interface';

interface MongoEditor {
  _id: ObjectId;
  bio: string;
  prompt: string;
  modelName: string; // Legacy field for backward compatibility
  articleModelName: string;
  eventModelName: string;
  storySelectionModelName: string;
  editionSelectionModelName: string;
  messageSliceCount: number;
  inputTokenCost: number;
  outputTokenCost: number;
  articleGenerationPeriodMinutes: number;
  lastArticleGenerationTime?: number;
  eventGenerationPeriodMinutes: number;
  lastEventGenerationTime?: number;
  editionGenerationPeriodMinutes: number;
  lastEditionGenerationTime?: number;
}

interface MongoReporter {
  _id: string;
  beats: string[];
  prompt: string;
  enabled: boolean;
}

interface MongoArticle {
  _id: string;
  reporterId: string;
  headline: string;
  body: string;
  generationTime: number;
  prompt: string;
  messageIds: number[];
  messageTexts: string[];
  modelName: string;
}

interface MongoEvent {
  _id: string;
  reporterId: string;
  title: string;
  createdTime: number;
  updatedTime: number;
  facts: string[];
  where?: string;
  when?: string;
  messageIds?: number[];
  messageTexts?: string[];
  modelName: string;
}

interface MongoNewspaperEdition {
  _id: string;
  stories: string[];
  generationTime: number;
  prompt: string;
  modelName: string;
}

interface MongoDailyEdition {
  _id: string;
  editions: string[];
  generationTime: number;
  frontPageHeadline: string;
  frontPageArticle: string;
  topics: Array<{
    name: string;
    headline: string;
    newsStoryFirstParagraph: string;
    newsStorySecondParagraph: string;
    oneLineSummary: string;
  }>;
  // modelFeedbackAboutThePrompt: {
  //   positive: string;
  //   negative: string;
  // };
  newspaperName: string;
  prompt: string;
  modelName: string;
}

interface MongoAd {
  _id: string;
  userId: string;
  name: string;
  bidPrice: number;
  promptContent: string;
}

interface MongoUser {
  _id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'editor' | 'reporter' | 'user';
  createdAt: number;
  lastLoginAt?: number;
  hasReader: boolean;
  hasReporter: boolean;
  hasEditor: boolean;
}

interface MongoKpi {
  _id: string;
  value: number;
  lastUpdated: number;
}

interface MongoJobStatus {
  _id: string;
  running: boolean;
  lastRun?: number;
  lastSuccess?: number;
}

export class MongoDBDataStorageService implements IDataStorageService {
  private client: MongoClient;
  private db: Db | null = null;
  private readonly dbName = 'newsroom';

  // Collections
  private editorsCollection: Collection<MongoEditor> | null = null;
  private reportersCollection: Collection<MongoReporter> | null = null;
  private articlesCollection: Collection<MongoArticle> | null = null;
  private eventsCollection: Collection<MongoEvent> | null = null;
  private newspaperEditionsCollection: Collection<MongoNewspaperEdition> | null = null;
  private dailyEditionsCollection: Collection<MongoDailyEdition> | null = null;
  private adsCollection: Collection<MongoAd> | null = null;
  private usersCollection: Collection<MongoUser> | null = null;
  private kpisCollection: Collection<MongoKpi> | null = null;
  private jobStatusCollection: Collection<MongoJobStatus> | null = null;

  constructor() {
    this.client = new MongoClient('mongodb://localhost:27017', {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    this.client.on('error', (err: Error) => {
      console.error('MongoDB Client Error:', err);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log('Connected to MongoDB');

      // Initialize collections
      this.editorsCollection = this.db.collection<MongoEditor>('editors');
      this.reportersCollection = this.db.collection<MongoReporter>('reporters');
      this.articlesCollection = this.db.collection<MongoArticle>('articles');
      this.eventsCollection = this.db.collection<MongoEvent>('events');
      this.newspaperEditionsCollection = this.db.collection<MongoNewspaperEdition>('newspaper_editions');
      this.dailyEditionsCollection = this.db.collection<MongoDailyEdition>('daily_editions');
      this.adsCollection = this.db.collection<MongoAd>('ads');
      this.usersCollection = this.db.collection<MongoUser>('users');
      this.kpisCollection = this.db.collection<MongoKpi>('kpis');
      this.jobStatusCollection = this.db.collection<MongoJobStatus>('job_status');

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    this.db = null;
    console.log('Disconnected from MongoDB');
  }

  private async createIndexes(): Promise<void> {
    if (!this.articlesCollection || !this.eventsCollection || !this.newspaperEditionsCollection ||
        !this.dailyEditionsCollection || !this.usersCollection || !this.adsCollection) {
      throw new Error('Collections not initialized');
    }

    // Articles indexes
    await this.articlesCollection.createIndex({ reporterId: 1, generationTime: -1 });

    // Events indexes
    await this.eventsCollection.createIndex({ reporterId: 1, createdTime: -1 });

    // Newspaper editions index
    await this.newspaperEditionsCollection.createIndex({ generationTime: -1 });

    // Daily editions index
    await this.dailyEditionsCollection.createIndex({ generationTime: -1 });

    // Users indexes
    await this.usersCollection.createIndex({ email: 1 }, { unique: true });

    // Ads index
    await this.adsCollection.createIndex({ userId: 1 });
  }

  // Editor operations
  async saveEditor(editor: Editor): Promise<void> {
    if (!this.editorsCollection) throw new Error('Database not connected');

    const mongoEditor: MongoEditor = {
      _id: new ObjectId(),
      ...editor
    };

    await this.editorsCollection.replaceOne({}, mongoEditor, { upsert: true });
  }

  async getEditor(): Promise<Editor | null> {
    if (!this.editorsCollection) throw new Error('Database not connected');

    const mongoEditor = await this.editorsCollection.findOne({});
    if (!mongoEditor) return null;

    const { _id, ...editor } = mongoEditor;
    return editor;
  }

  // Reporter operations
  async saveReporter(reporter: Reporter): Promise<void> {
    if (!this.reportersCollection) throw new Error('Database not connected');

    const mongoReporter: MongoReporter = {
      _id: reporter.id,
      beats: reporter.beats,
      prompt: reporter.prompt,
      enabled: reporter.enabled
    };

    await this.reportersCollection.replaceOne({ _id: reporter.id }, mongoReporter, { upsert: true });
  }

  async getAllReporters(): Promise<Reporter[]> {
    if (!this.reportersCollection) throw new Error('Database not connected');

    const mongoReporters = await this.reportersCollection.find({}).toArray();
    return mongoReporters.map((mongo: MongoReporter) => ({
      id: mongo._id,
      beats: mongo.beats,
      prompt: mongo.prompt,
      enabled: mongo.enabled
    }));
  }

  async getReporter(id: string): Promise<Reporter | null> {
    if (!this.reportersCollection) throw new Error('Database not connected');

    const mongoReporter = await this.reportersCollection.findOne({ _id: id });
    if (!mongoReporter) return null;

    return {
      id: mongoReporter._id,
      beats: mongoReporter.beats,
      prompt: mongoReporter.prompt,
      enabled: mongoReporter.enabled
    };
  }

  // Article operations
  async saveArticle(article: Article): Promise<void> {
    if (!this.articlesCollection) throw new Error('Database not connected');

    const mongoArticle: MongoArticle = {
      _id: article.id,
      reporterId: article.reporterId,
      headline: article.headline,
      body: article.body,
      generationTime: article.generationTime,
      prompt: article.prompt,
      messageIds: article.messageIds,
      messageTexts: article.messageTexts,
      modelName: article.modelName
    };

    await this.articlesCollection.replaceOne({ _id: article.id }, mongoArticle, { upsert: true });
  }

  async getLatestArticles(_limit?: number): Promise<Article[]> {
    return [];
  }

  async getArticlesByReporter(reporterId: string, limit?: number): Promise<Article[]> {
    if (!this.articlesCollection) throw new Error('Database not connected');

    const query = { reporterId };
    const options = {
      sort: { generationTime: -1 } as any,
      limit: limit || 0
    };

    const mongoArticles = await this.articlesCollection.find(query, options).toArray();
    return mongoArticles.map((mongo: MongoArticle) => ({
      id: mongo._id,
      reporterId: mongo.reporterId,
      headline: mongo.headline,
      body: mongo.body,
      generationTime: mongo.generationTime,
      prompt: mongo.prompt,
      messageIds: mongo.messageIds,
      messageTexts: mongo.messageTexts,
      modelName: mongo.modelName
    }));
  }

  async getArticlesInTimeRange(reporterId: string, startTime: number, endTime: number): Promise<Article[]> {
    if (!this.articlesCollection) throw new Error('Database not connected');

    const query = {
      reporterId,
      generationTime: { $gte: startTime, $lte: endTime }
    };

    const mongoArticles = await this.articlesCollection.find(query).sort({ generationTime: -1 }).toArray();
    return mongoArticles.map((mongo: MongoArticle) => ({
      id: mongo._id,
      reporterId: mongo.reporterId,
      headline: mongo.headline,
      body: mongo.body,
      generationTime: mongo.generationTime,
      prompt: mongo.prompt,
      messageIds: mongo.messageIds,
      messageTexts: mongo.messageTexts,
      modelName: mongo.modelName
    }));
  }

  async getArticlesInTimeRangeGlobal(startTime: number, endTime: number): Promise<Article[]> {
    if (!this.articlesCollection) throw new Error('Database not connected');

    const query = {
      generationTime: { $gte: startTime, $lte: endTime }
    };

    const mongoArticles = await this.articlesCollection.find(query).sort({ generationTime: -1 }).toArray();
    return mongoArticles.map((mongo: MongoArticle) => ({
      id: mongo._id,
      reporterId: mongo.reporterId,
      headline: mongo.headline,
      body: mongo.body,
      generationTime: mongo.generationTime,
      prompt: mongo.prompt,
      messageIds: mongo.messageIds,
      messageTexts: mongo.messageTexts,
      modelName: mongo.modelName
    }));
  }

  async getArticle(articleId: string): Promise<Article | null> {
    if (!this.articlesCollection) throw new Error('Database not connected');

    const mongoArticle = await this.articlesCollection.findOne({ _id: articleId });
    if (!mongoArticle) return null;

    return {
      id: mongoArticle._id,
      reporterId: mongoArticle.reporterId,
      headline: mongoArticle.headline,
      body: mongoArticle.body,
      generationTime: mongoArticle.generationTime,
      prompt: mongoArticle.prompt,
      messageIds: mongoArticle.messageIds,
      messageTexts: mongoArticle.messageTexts,
      modelName: mongoArticle.modelName
    };
  }

  // Event operations
  async saveEvent(event: Event): Promise<void> {
    if (!this.eventsCollection) throw new Error('Database not connected');

    const mongoEvent: MongoEvent = {
      _id: event.id,
      reporterId: event.reporterId,
      title: event.title,
      createdTime: event.createdTime,
      updatedTime: event.updatedTime,
      facts: event.facts,
      where: event.where,
      when: event.when,
      messageIds: event.messageIds,
      messageTexts: event.messageTexts,
      modelName: event.modelName
    };

    await this.eventsCollection.replaceOne({ _id: event.id }, mongoEvent, { upsert: true });
  }

  async getEventsByReporter(reporterId: string, limit?: number): Promise<Event[]> {
    if (!this.eventsCollection) throw new Error('Database not connected');

    const query = { reporterId };
    const options = {
      sort: { createdTime: -1 } as any,
      limit: limit || 0
    };

    const mongoEvents = await this.eventsCollection.find(query, options).toArray();
    return mongoEvents.map((mongo: MongoEvent) => ({
      id: mongo._id,
      reporterId: mongo.reporterId,
      title: mongo.title,
      createdTime: mongo.createdTime,
      updatedTime: mongo.updatedTime,
      facts: mongo.facts,
      where: mongo.where,
      when: mongo.when,
      messageIds: mongo.messageIds,
      messageTexts: mongo.messageTexts,
      modelName: mongo.modelName
    }));
  }

  async getLatestUpdatedEvents(limit?: number): Promise<Event[]> {
    if (!this.eventsCollection) throw new Error('Database not connected');

    const options = {
      sort: { updatedTime: -1 } as any,
      limit: limit || 0
    };

    const mongoEvents = await this.eventsCollection.find({}, options).toArray();
    return mongoEvents.map((mongo: MongoEvent) => ({
      id: mongo._id,
      reporterId: mongo.reporterId,
      title: mongo.title,
      createdTime: mongo.createdTime,
      updatedTime: mongo.updatedTime,
      facts: mongo.facts,
      where: mongo.where,
      when: mongo.when,
      messageIds: mongo.messageIds,
      messageTexts: mongo.messageTexts,
      modelName: mongo.modelName
    }));
  }

  async getEvent(eventId: string): Promise<Event | null> {
    if (!this.eventsCollection) throw new Error('Database not connected');

    const mongoEvent = await this.eventsCollection.findOne({ _id: eventId });
    if (!mongoEvent) return null;

    return {
      id: mongoEvent._id,
      reporterId: mongoEvent.reporterId,
      title: mongoEvent.title,
      createdTime: mongoEvent.createdTime,
      updatedTime: mongoEvent.updatedTime,
      facts: mongoEvent.facts,
      where: mongoEvent.where,
      when: mongoEvent.when,
      messageIds: mongoEvent.messageIds,
      messageTexts: mongoEvent.messageTexts,
      modelName: mongoEvent.modelName
    };
  }

  // Newspaper Edition operations
  async saveNewspaperEdition(edition: NewspaperEdition): Promise<void> {
    if (!this.newspaperEditionsCollection) throw new Error('Database not connected');

    const mongoEdition: MongoNewspaperEdition = {
      _id: edition.id,
      stories: edition.stories,
      generationTime: edition.generationTime,
      prompt: edition.prompt,
      modelName: edition.modelName
    };

    await this.newspaperEditionsCollection.replaceOne({ _id: edition.id }, mongoEdition, { upsert: true });
  }

  async getNewspaperEditions(limit?: number): Promise<NewspaperEdition[]> {
    if (!this.newspaperEditionsCollection) throw new Error('Database not connected');

    const options = {
      sort: { generationTime: -1 } as any,
      limit: limit || 0
    };

    const mongoEditions = await this.newspaperEditionsCollection.find({}, options).toArray();
    return mongoEditions.map((mongo: MongoNewspaperEdition) => ({
      id: mongo._id,
      stories: mongo.stories,
      generationTime: mongo.generationTime,
      prompt: mongo.prompt,
      modelName: mongo.modelName
    }));
  }

  async getLatestEditions(limit?: number): Promise<NewspaperEdition[]> {
    return this.getNewspaperEditions(limit || 50);
  }

  async getNewspaperEdition(editionId: string): Promise<NewspaperEdition | null> {
    if (!this.newspaperEditionsCollection) throw new Error('Database not connected');

    const mongoEdition = await this.newspaperEditionsCollection.findOne({ _id: editionId });
    if (!mongoEdition) return null;

    return {
      id: mongoEdition._id,
      stories: mongoEdition.stories,
      generationTime: mongoEdition.generationTime,
      prompt: mongoEdition.prompt,
      modelName: mongoEdition.modelName
    };
  }

  // Daily Edition operations
  async saveDailyEdition(dailyEdition: DailyEdition): Promise<void> {
    if (!this.dailyEditionsCollection) throw new Error('Database not connected');

    const mongoDailyEdition: MongoDailyEdition = {
      _id: dailyEdition.id,
      editions: dailyEdition.editions,
      generationTime: dailyEdition.generationTime,
      frontPageHeadline: dailyEdition.frontPageHeadline,
      frontPageArticle: dailyEdition.frontPageArticle,
      topics: dailyEdition.topics,
      // modelFeedbackAboutThePrompt: dailyEdition.modelFeedbackAboutThePrompt,
      newspaperName: dailyEdition.newspaperName,
      prompt: dailyEdition.prompt,
      modelName: dailyEdition.modelName
    };

    await this.dailyEditionsCollection.replaceOne({ _id: dailyEdition.id }, mongoDailyEdition, { upsert: true });
  }

  async getDailyEditions(limit?: number): Promise<DailyEdition[]> {
    if (!this.dailyEditionsCollection) throw new Error('Database not connected');

    const options = {
      sort: { generationTime: -1 } as any,
      limit: limit || 0
    };

    const mongoDailyEditions = await this.dailyEditionsCollection.find({}, options).toArray();
    return mongoDailyEditions.map((mongo: MongoDailyEdition) => ({
      id: mongo._id,
      editions: mongo.editions,
      generationTime: mongo.generationTime,
      frontPageHeadline: mongo.frontPageHeadline,
      frontPageArticle: mongo.frontPageArticle,
      topics: mongo.topics,
      // modelFeedbackAboutThePrompt: mongo.modelFeedbackAboutThePrompt,
      newspaperName: mongo.newspaperName,
      prompt: mongo.prompt,
      modelName: mongo.modelName
    }));
  }

  async getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null> {
    if (!this.dailyEditionsCollection) throw new Error('Database not connected');

    const mongoDailyEdition = await this.dailyEditionsCollection.findOne({ _id: dailyEditionId });
    if (!mongoDailyEdition) return null;

    return {
      id: mongoDailyEdition._id,
      editions: mongoDailyEdition.editions,
      generationTime: mongoDailyEdition.generationTime,
      frontPageHeadline: mongoDailyEdition.frontPageHeadline,
      frontPageArticle: mongoDailyEdition.frontPageArticle,
      topics: mongoDailyEdition.topics,
      // modelFeedbackAboutThePrompt: mongoDailyEdition.modelFeedbackAboutThePrompt,
      newspaperName: mongoDailyEdition.newspaperName,
      prompt: mongoDailyEdition.prompt,
      modelName: mongoDailyEdition.modelName
    };
  }

  // Ad operations
  async saveAd(ad: AdEntry): Promise<void> {
    if (!this.adsCollection) throw new Error('Database not connected');

    const mongoAd: MongoAd = {
      _id: ad.id,
      userId: ad.userId,
      name: ad.name,
      bidPrice: ad.bidPrice,
      promptContent: ad.promptContent
    };

    await this.adsCollection.replaceOne({ _id: ad.id }, mongoAd, { upsert: true });
  }

  async getAllAds(): Promise<AdEntry[]> {
    if (!this.adsCollection) throw new Error('Database not connected');

    const mongoAds = await this.adsCollection.find({}).toArray();
    return mongoAds.map((mongo: MongoAd) => ({
      id: mongo._id,
      userId: mongo.userId,
      name: mongo.name,
      bidPrice: mongo.bidPrice,
      promptContent: mongo.promptContent
    }));
  }

  async getMostRecentAd(): Promise<AdEntry | null> {
    if (!this.adsCollection) throw new Error('Database not connected');

    // Since we don't have a timestamp field, we'll just get the first one
    // In a real implementation, you might want to add a createdAt field
    const mongoAd = await this.adsCollection.findOne({});
    if (!mongoAd) return null;

    return {
      id: mongoAd._id,
      userId: mongoAd.userId,
      name: mongoAd.name,
      bidPrice: mongoAd.bidPrice,
      promptContent: mongoAd.promptContent
    };
  }

  async getAd(adId: string): Promise<AdEntry | null> {
    if (!this.adsCollection) throw new Error('Database not connected');

    const mongoAd = await this.adsCollection.findOne({ _id: adId });
    if (!mongoAd) return null;

    return {
      id: mongoAd._id,
      userId: mongoAd.userId,
      name: mongoAd.name,
      bidPrice: mongoAd.bidPrice,
      promptContent: mongoAd.promptContent
    };
  }

  async updateAd(adId: string, updates: Partial<Omit<AdEntry, 'id'>>): Promise<void> {
    if (!this.adsCollection) throw new Error('Database not connected');

    await this.adsCollection.updateOne({ _id: adId }, { $set: updates });
  }

  async deleteAd(adId: string): Promise<void> {
    if (!this.adsCollection) throw new Error('Database not connected');

    await this.adsCollection.deleteOne({ _id: adId });
  }

  // User operations
  async createUser(user: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>): Promise<User> {
    if (!this.usersCollection) throw new Error('Database not connected');

    const userId = await this.generateId('user');
    const now = Date.now();

    const mongoUser: MongoUser = {
      _id: userId,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: now,
      hasReader: user.hasReader,
      hasReporter: user.hasReporter,
      hasEditor: user.hasEditor
    };

    await this.usersCollection.insertOne(mongoUser);

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
  }

  async getUserById(userId: string): Promise<User | null> {
    if (!this.usersCollection) throw new Error('Database not connected');

    const mongoUser = await this.usersCollection.findOne({ _id: userId });
    if (!mongoUser) return null;

    return {
      id: mongoUser._id,
      email: mongoUser.email,
      passwordHash: mongoUser.passwordHash,
      role: mongoUser.role,
      createdAt: mongoUser.createdAt,
      lastLoginAt: mongoUser.lastLoginAt,
      hasReader: mongoUser.hasReader,
      hasReporter: mongoUser.hasReporter,
      hasEditor: mongoUser.hasEditor
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.usersCollection) throw new Error('Database not connected');

    const mongoUser = await this.usersCollection.findOne({ email });
    if (!mongoUser) return null;

    return {
      id: mongoUser._id,
      email: mongoUser.email,
      passwordHash: mongoUser.passwordHash,
      role: mongoUser.role,
      createdAt: mongoUser.createdAt,
      lastLoginAt: mongoUser.lastLoginAt,
      hasReader: mongoUser.hasReader,
      hasReporter: mongoUser.hasReporter,
      hasEditor: mongoUser.hasEditor
    };
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    if (!this.usersCollection) throw new Error('Database not connected');

    await this.usersCollection.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: Date.now() } }
    );
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.usersCollection) throw new Error('Database not connected');

    const mongoUsers = await this.usersCollection.find({}).toArray();
    return mongoUsers.map((mongo: MongoUser) => ({
      id: mongo._id,
      email: mongo.email,
      passwordHash: mongo.passwordHash,
      role: mongo.role,
      createdAt: mongo.createdAt,
      lastLoginAt: mongo.lastLoginAt,
      hasReader: mongo.hasReader,
      hasReporter: mongo.hasReporter,
      hasEditor: mongo.hasEditor
    }));
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.usersCollection) throw new Error('Database not connected');

    await this.usersCollection.deleteOne({ _id: userId });
  }

  // Job status operations
  async setJobRunning(jobName: string, running: boolean): Promise<void> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    const update: Partial<MongoJobStatus> = { running };
    if (running) {
      update.lastRun = Date.now();
    }

    await this.jobStatusCollection.replaceOne({ _id: jobName }, update as MongoJobStatus, { upsert: true });
  }

  async getJobRunning(jobName: string): Promise<boolean> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    const jobStatus = await this.jobStatusCollection.findOne({ _id: jobName });
    return jobStatus?.running || false;
  }

  async setJobLastRun(jobName: string, timestamp: number): Promise<void> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    await this.jobStatusCollection.updateOne(
      { _id: jobName },
      { $set: { lastRun: timestamp } },
      { upsert: true }
    );
  }

  async getJobLastRun(jobName: string): Promise<number | null> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    const jobStatus = await this.jobStatusCollection.findOne({ _id: jobName });
    return jobStatus?.lastRun || null;
  }

  async setJobLastSuccess(jobName: string, timestamp: number): Promise<void> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    await this.jobStatusCollection.updateOne(
      { _id: jobName },
      { $set: { lastSuccess: timestamp } },
      { upsert: true }
    );
  }

  async getJobLastSuccess(jobName: string): Promise<number | null> {
    if (!this.jobStatusCollection) throw new Error('Database not connected');

    const jobStatus = await this.jobStatusCollection.findOne({ _id: jobName });
    return jobStatus?.lastSuccess || null;
  }

  // KPI operations
  async getKpiValue(kpiName: string): Promise<number> {
    if (!this.kpisCollection) throw new Error('Database not connected');

    const kpi = await this.kpisCollection.findOne({ _id: kpiName });
    return kpi?.value || 0;
  }

  async setKpiValue(kpiName: string, value: number): Promise<void> {
    if (!this.kpisCollection) throw new Error('Database not connected');

    await this.kpisCollection.replaceOne(
      { _id: kpiName },
      { value, lastUpdated: Date.now() },
      { upsert: true }
    );
  }

  async incrementKpiValue(kpiName: string, increment: number): Promise<void> {
    if (!this.kpisCollection) throw new Error('Database not connected');

    await this.kpisCollection.updateOne(
      { _id: kpiName },
      {
        $inc: { value: increment },
        $set: { lastUpdated: Date.now() }
      },
      { upsert: true }
    );
  }

  // Utility methods

  async generateId(prefix: string): Promise<string> {
    // Simple ID generation - in production you might want something more robust
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const collections = await this.db.listCollections().toArray();
    for (const collection of collections) {
      await this.db.collection(collection.name).deleteMany({});
    }
  }

  // Log operations (not persisted in MongoDB, just stub)
  async addLog(_message: string): Promise<void> {
    // No-op for MongoDB
  }

  async getAllLogs(): Promise<string[]> {
    return [];
  }
}
*/
