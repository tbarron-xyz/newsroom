import { RedisDataStorageService } from "./redis-data-storage.service";
import { PostgreSQLDataStorageService } from "./postgresql-data-storage.service";
import { SQLiteDataStorageService } from "./sqlite-data-storage.service";
import { IDataStorageService } from "./data-storage.interface";
import { AuthService } from "./auth.service";
import { ReporterService } from "./reporter.service";
import { EditorService } from "./editor.service";
import { KpiService } from "./kpi.service";
import { AIService } from "./ai.service";
import { AbilitiesService } from "./abilities.service";
import { ConfigService } from "./config.service";
import { ArtifactService } from "./artifact.service";
import { ArtifactQueueService } from "./artifact-queue.service";
import { DailyJobQueueService } from "./daily-job-queue.service";
import { ReporterJobQueueService } from "./reporter-job-queue.service";

export class ServiceContainer {
  private static instance: ServiceContainer;
  private dataStorageService: IDataStorageService | null = null;
  private authService: AuthService | null = null;
  private reporterService: ReporterService | null = null;
  private editorService: EditorService | null = null;
  private kpiService: KpiService | null = null;
  private aiService: AIService | null = null;
  private abilitiesService: AbilitiesService | null = null;
  private configService: ConfigService | null = null;
  private artifactService: ArtifactService | null = null;
  private artifactQueueService: ArtifactQueueService | null = null;
  private dailyJobQueueService: DailyJobQueueService | null = null;
  private reporterJobQueueService: ReporterJobQueueService | null = null;

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
        this.dataStorageService = new SQLiteDataStorageService();
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

  async getConfigService(): Promise<ConfigService> {
    if (!this.configService) {
      this.configService = new ConfigService();
    }
    return this.configService;
  }

  async getArtifactService(): Promise<ArtifactService> {
    if (!this.artifactService) {
      const dataStorage = await this.getDataStorageService();
      const aiService = await this.getAIService();
      this.artifactService = new ArtifactService(dataStorage, aiService);
    }
    return this.artifactService;
  }

  async getArtifactQueueService(): Promise<ArtifactQueueService> {
    if (!this.artifactQueueService) {
      const artifactService = await this.getArtifactService();
      const dataStorage = await this.getDataStorageService();
      this.artifactQueueService = new ArtifactQueueService(
        artifactService,
        dataStorage
      );
    }
    return this.artifactQueueService;
  }

  async getDailyJobQueueService(): Promise<DailyJobQueueService> {
    if (!this.dailyJobQueueService) {
      const editorService = await this.getEditorService();
      const dataStorage = await this.getDataStorageService();
      this.dailyJobQueueService = new DailyJobQueueService(
        editorService,
        dataStorage
      );
    }
    return this.dailyJobQueueService;
  }

  async getReporterJobQueueService(): Promise<ReporterJobQueueService> {
    if (!this.reporterJobQueueService) {
      const reporterService = await this.getReporterService();
      const dataStorage = await this.getDataStorageService();
      this.reporterJobQueueService = new ReporterJobQueueService(
        reporterService,
        dataStorage
      );
    }
    return this.reporterJobQueueService;
  }

  // Cleanup method for testing or shutdown
  async disconnect(): Promise<void> {
    if (this.artifactQueueService) {
      await this.artifactQueueService.close();
    }
    if (this.dailyJobQueueService) {
      await this.dailyJobQueueService.close();
    }
    if (this.reporterJobQueueService) {
      await this.reporterJobQueueService.close();
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
    this.configService = null;
    this.artifactService = null;
    this.artifactQueueService = null;
    this.dailyJobQueueService = null;
    this.reporterJobQueueService = null;
  }
}
