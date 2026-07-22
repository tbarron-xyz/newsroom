import {
  Editor,
  Reporter,
  Article,
  OpinionArticle,
  NewspaperEdition,
  DailyEdition,
  Event,
  User,
  ForumSection,
  ForumThread,
  ForumPost,
  DynamicPersona,
  Artifact,
  ArtifactJob,
  PrismDailyEditionPair,
  Ticker,
  HomepageChatMessage,
  ResearchEntry
} from "../schemas/types";
import { CLASSIC_PERSONAS } from "./ai-prompts";

export interface IDataStorageService {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Editor operations
  saveEditor(editor: Editor): Promise<void>;
  getEditor(): Promise<Editor | null>;

  // Reporter operations
  saveReporter(reporter: Reporter): Promise<void>;
  getAllReporters(): Promise<Reporter[]>;
  getReporter(id: string): Promise<Reporter | null>;

  // Article operations
  saveArticle(article: Article): Promise<void>;
  getLatestArticles(limit?: number): Promise<Article[]>;
  searchArticles(query: string, limit?: number): Promise<Article[]>;
  getArticlesByReporter(reporterId: string, limit?: number): Promise<Article[]>;
  getArticlesInTimeRange(
    reporterId: string,
    startTime: number,
    endTime: number
  ): Promise<Article[]>;
  getArticlesInTimeRangeGlobal(
    startTime: number,
    endTime: number
  ): Promise<Article[]>;
  getArticle(articleId: string): Promise<Article | null>;
  deleteArticle(articleId: string): Promise<boolean>;

  // Event operations
  saveEvent(event: Event): Promise<void>;
  getEventsByReporter(reporterId: string, limit?: number): Promise<Event[]>;
  getLatestUpdatedEvents(limit?: number): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | null>;

  // Newspaper Edition operations
  saveNewspaperEdition(edition: NewspaperEdition): Promise<void>;
  getNewspaperEditions(limit?: number): Promise<NewspaperEdition[]>;
  getLatestEditions(limit?: number): Promise<NewspaperEdition[]>;
  getNewspaperEdition(editionId: string): Promise<NewspaperEdition | null>;

  // Daily Edition operations
  saveDailyEdition(dailyEdition: DailyEdition): Promise<void>;
  getDailyEditions(limit?: number): Promise<DailyEdition[]>;
  getDailyEdition(dailyEditionId: string): Promise<DailyEdition | null>;

  // Ticker operations
  saveTicker(ticker: Ticker): Promise<void>;
  getLatestTicker(): Promise<Ticker | null>;

  // Opinion Article operations
  saveOpinionArticle(opinion: OpinionArticle): Promise<void>;
  getOpinionArticle(opinionId: string): Promise<OpinionArticle | null>;
  getLatestOpinionArticles(limit?: number): Promise<OpinionArticle[]>;

  // Research operations
  saveResearchEntry(entry: ResearchEntry): Promise<void>;
  getLatestResearchEntries(limit?: number): Promise<ResearchEntry[]>;
  getResearchEntry(id: string): Promise<ResearchEntry | null>;

  // User operations
  createUser(
    user: Omit<User, "id" | "createdAt" | "lastLoginAt">
  ): Promise<User>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUserLastLogin(userId: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;

  // Job status operations
  setJobRunning(jobName: string, running: boolean): Promise<void>;
  getJobRunning(jobName: string): Promise<boolean>;
  setJobLastRun(jobName: string, timestamp: number): Promise<void>;
  getJobLastRun(jobName: string): Promise<number | null>;
  setJobLastSuccess(jobName: string, timestamp: number): Promise<void>;
  getJobLastSuccess(jobName: string): Promise<number | null>;

  // KPI operations
  getKpiValue(kpiName: string): Promise<number>;
  setKpiValue(kpiName: string, value: number): Promise<void>;
  incrementKpiValue(kpiName: string, increment: number): Promise<void>;

  // Log operations
  addLog(message: string): Promise<void>;
  getAllLogs(): Promise<string[]>;

  // Forum operations
  saveForumSections(sections: ForumSection[]): Promise<void>;
  getForumSections(): Promise<ForumSection[] | null>;
  createThread(
    forumId: string,
    title: string,
    author: string,
    firstPostContent: string
  ): Promise<{ threadId: number; postId: number }>;
  createPost(
    threadId: number,
    content: string,
    author: string
  ): Promise<{ postId: number }>;
  getForumThreads(
    forumId: string,
    offset?: number,
    limit?: number
  ): Promise<ForumThread[]>;
  getThread(threadId: number): Promise<ForumThread | null>;
  getThreadPosts(
    threadId: number,
    offset?: number,
    limit?: number
  ): Promise<ForumPost[]>;
  getForumCounters(forumId: string): Promise<{
    threadCount: number;
    postCount: number;
  }>;

  // Utility methods
  generateId(prefix: string): Promise<string>;
  clearAllData(): Promise<void>;

  // Memory info
  getMemoryInfo(): Promise<{
    redis: { usedMemory: number; usedMemoryPeak: number };
    system: { totalMemory: number; usedMemory: number; freeMemory: number };
  }>;

  // Persona operations
  getDynamicPersonas(): Promise<DynamicPersona[] | null>;
  setDynamicPersonas(
    personas: DynamicPersona[],
    ttlHours?: number
  ): Promise<void>;
  getClassicPersonas(): Promise<typeof CLASSIC_PERSONAS>;

  // Prism Daily Edition Pair operations
  savePrismDailyEditionPair(pair: PrismDailyEditionPair): Promise<void>;
  getPrismDailyEditionPairs(limit?: number): Promise<PrismDailyEditionPair[]>;

  // Homepage Chat operations
  saveHomepageChatMessage(message: HomepageChatMessage): Promise<void>;
  getHomepageChatMessages(limit?: number): Promise<HomepageChatMessage[]>;

  // Chat session operations
  saveChatSession(
    sessionId: string,
    messages: unknown[],
    ttlSeconds?: number
  ): Promise<void>;
  getChatSession(sessionId: string): Promise<unknown[] | null>;

  // Artifact operations
  saveArtifact(artifact: Artifact): Promise<void>;
  getArtifact(artifactId: string): Promise<Artifact | null>;
  getAllArtifacts(): Promise<Artifact[]>;
  getArtifactsByType(type: string, limit?: number): Promise<Artifact[]>;
  getArtifactsByReporter(reporterId: string): Promise<Artifact[]>;
  deleteArtifact(artifactId: string): Promise<void>;
  updateArtifact(artifactId: string, updates: Partial<Artifact>): Promise<void>;
}
