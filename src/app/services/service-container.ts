import { RedisDataStorageService } from "./redis-data-storage.service";
import { PostgreSQLDataStorageService } from "./postgresql-data-storage.service";
import { SQLiteDataStorageService } from "./sqlite-data-storage.service";
import { MongoDBDataStorageService } from "./mongodb-data-storage.service";
import { IDataStorageService } from "./data-storage.interface";
import { AuthService } from "./auth.service";
import { ReporterService } from "./reporter.service";
import { EditorService } from "./editor.service";
import { KpiService } from "./kpi.service";
import { AIService } from "./ai.service";
import { AbilitiesService } from "./abilities.service";
import { ArtifactService } from "./artifact.service";
import { JobQueueService } from "./job-queue.service";
import { WikipediaService } from "./wikipedia.service";

export class ServiceContainer {
  private static instance: ServiceContainer;
  private dataStorageService: IDataStorageService | null = null;
  private authService: AuthService | null = null;
  private reporterService: ReporterService | null = null;
  private editorService: EditorService | null = null;
  private kpiService: KpiService | null = null;
  private aiService: AIService | null = null;
  private abilitiesService: AbilitiesService | null = null;
  private artifactService: ArtifactService | null = null;
  private jobQueueService: JobQueueService | null = null;
  private wikipediaService: WikipediaService | null = null;

  private constructor() {}

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  async getDataStorageService(): Promise<IDataStorageService> {
    if (!this.dataStorageService) {
      // Check environment variable to determine which storage backend to use
      const storageBackend = process.env.DATA_STORAGE_BACKEND || "redis";

      if (storageBackend === "sqlite") {
        console.log("Using SQLite data storage backend");
        this.dataStorageService = new SQLiteDataStorageService(
          process.env.SQLITE_DB_PATH
        );
      } else if (storageBackend === "mongodb" || storageBackend === "mongo") {
        console.log("Using MongoDB data storage backend");
        this.dataStorageService = new MongoDBDataStorageService();
        // } else if (
        //   storageBackend === "postgres" ||
        //   storageBackend === "postgresql"
        // ) {
        // console.log("Using PostgreSQL data storage backend");
        // this.dataStorageService = new PostgreSQLDataStorageService();
      } else {
        console.log("Using Redis data storage backend");
        this.dataStorageService = new RedisDataStorageService();
      }

      await this.dataStorageService.connect();
    }
    return this.dataStorageService;
  }

  async getAuthService(): Promise<AuthService> {
    if (!this.authService) {
      const dataStorage = await this.getDataStorageService();
      this.authService = new AuthService(dataStorage);
    }
    return this.authService;
  }

  async getReporterService(): Promise<ReporterService> {
    if (!this.reporterService) {
      const dataStorage = await this.getDataStorageService();
      const aiService = await this.getAIService();
      this.reporterService = new ReporterService(dataStorage, aiService);
    }
    return this.reporterService;
  }

  async getEditorService(): Promise<EditorService> {
    if (!this.editorService) {
      const dataStorage = await this.getDataStorageService();
      const aiService = await this.getAIService();
      const reporterService = await this.getReporterService();
      this.editorService = new EditorService(
        dataStorage,
        aiService,
        reporterService
      );
    }
    return this.editorService;
  }

  async getKpiService(): Promise<KpiService> {
    if (!this.kpiService) {
      const dataStorage = await this.getDataStorageService();
      this.kpiService = new KpiService(dataStorage);
    }
    return this.kpiService;
  }

  async getAIService(): Promise<AIService> {
    if (!this.aiService) {
      const dataStorage = await this.getDataStorageService();
      this.aiService = new AIService(dataStorage);
    }
    return this.aiService;
  }

  async getAbilitiesService(): Promise<AbilitiesService> {
    if (!this.abilitiesService) {
      this.abilitiesService = new AbilitiesService();
    }
    return this.abilitiesService;
  }

  async getArtifactService(): Promise<ArtifactService> {
    if (!this.artifactService) {
      const dataStorage = await this.getDataStorageService();
      const aiService = await this.getAIService();
      this.artifactService = new ArtifactService(dataStorage, aiService);
    }
    return this.artifactService;
  }

  async getWikipediaService(): Promise<WikipediaService> {
    if (!this.wikipediaService) {
      this.wikipediaService = new WikipediaService();
    }
    return this.wikipediaService;
  }

  async getJobQueueService(): Promise<JobQueueService> {
    if (!this.jobQueueService) {
      this.jobQueueService = new JobQueueService(this);
    }
    return this.jobQueueService;
  }

  // Cleanup method for testing or shutdown
  async disconnect(): Promise<void> {
    if (this.jobQueueService) {
      await this.jobQueueService.close();
    }
    if (this.dataStorageService) {
      await this.dataStorageService.disconnect();
    }
    // Reset all services
    this.dataStorageService = null;
    this.authService = null;
    this.reporterService = null;
    this.editorService = null;
    this.kpiService = null;
    this.aiService = null;
    this.abilitiesService = null;
    this.artifactService = null;
    this.jobQueueService = null;
    this.wikipediaService = null;
  }
}
