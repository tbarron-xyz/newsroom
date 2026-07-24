import { Queue, Job } from "bullmq";
import { ServiceContainer } from "./service-container";
import { processResearchJob as processResearchJobHandler } from "../workers/research-worker";

interface QueueConfig {
  name: string;
  concurrency: number;
  limiter?: { max: number; duration: number };
}

const QUEUE_CONFIGS: Record<string, QueueConfig> = {
  artifact_generate: {
    name: "artifact_generate",
    concurrency: 2, // restrict to avoid rate limits
    limiter: { max: 10, duration: 60 * 1000 } // 10 per minute
  },
  daily_edition: {
    name: "daily_edition",
    concurrency: 1, // single daily edition job at a time
    limiter: { max: 1, duration: 60 * 60 * 1000 } // 1 per hour
  },
  reporter_articles: {
    name: "reporter_articles",
    concurrency: 1, // single reporter job at a time
    limiter: { max: 1, duration: 15 * 60 * 1000 } // 1 per 15min
  },
  research: {
    name: "research",
    concurrency: 1,
    limiter: { max: 5, duration: 60 * 1000 } // 5 per minute
  }
};

export class JobQueueService {
  private queues: Map<string, Queue> = new Map();

  constructor(private container: ServiceContainer) {
    const connection = {
      host: "localhost",
      port: 6379
    };

    Object.entries(QUEUE_CONFIGS).forEach(([key, config]) => {
      this.queues.set(key, new Queue(config.name, { connection }));
    });
  }

  async addJob(queueKey: string, data: any = {}): Promise<string> {
    const queue = this.queues.get(queueKey);
    if (!queue) throw new Error(`Unknown queue: ${queueKey}`);
    const job = await queue.add("generate", data);
    return job.id!;
  }

  async getJobStatus(queueKey: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueKey);
    if (!queue) return null;
    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
      id: job.id,
      status: state,
      progress: job.progress,
      createdAt: job.timestamp,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    };
  }

  async getActiveJobId(queueKey: string): Promise<string | null> {
    const queue = this.queues.get(queueKey);
    if (!queue) return null;
    const jobs = await queue.getJobs(["active"]);
    return jobs.length > 0 ? jobs[0].id || null : null;
  }

  async getJobs(
    queueKey: string,
    status?: "waiting" | "active" | "completed" | "failed",
    limit = 10
  ): Promise<any[]> {
    const queue = this.queues.get(queueKey);
    if (!queue) return [];
    const jobs = await queue.getJobs(status ? [status] : undefined, 0, limit);
    return await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        status: await job.getState(),
        progress: job.progress,
        createdAt: job.timestamp
      }))
    );
  }

  async processJob(job: Job): Promise<void> {
    switch (job.queueName) {
      case "artifact_generate":
        await this.processArtifactJob(job);
        break;
      case "daily_edition":
        await this.processDailyJob(job);
        break;
      case "reporter_articles":
        await this.processReporterJob(job);
        break;
      case "research":
        await this.processResearchJob(job);
        break;
      default:
        throw new Error(`Unknown queue: ${job.queueName}`);
    }
  }

  private async processArtifactJob(job: Job): Promise<void> {
    const { artifactId } = job.data;
    console.log(`Processing artifact ${artifactId} (job ${job.id})`);
    try {
      const artifactService = await this.container.getArtifactService();
      const dataStorageService = await this.container.getDataStorageService();
      const result = await artifactService.generate(artifactId);
      console.log(`Artifact ${artifactId} generated successfully`);
    } catch (error) {
      console.error(`Artifact ${artifactId} generation failed:`, error);
      try {
        const artifactService = await this.container.getArtifactService();
        const dataStorageService = await this.container.getDataStorageService();
        const currentArtifact =
          await dataStorageService.getArtifact(artifactId);
        if (currentArtifact) {
          await dataStorageService.updateArtifact(artifactId, {
            metadata: {
              ...currentArtifact.metadata,
              status: "failed" as const,
              error_message:
                error instanceof Error ? error.message : String(error)
            }
          });
          console.log(`Artifact ${artifactId} marked as failed`);
        }
      } catch (updateError) {
        console.error(
          `Failed to update artifact ${artifactId} status:`,
          updateError
        );
      }
      throw error;
    }
  }

  private async processDailyJob(job: Job): Promise<void> {
    console.log(`Processing daily edition (job ${job.id})`);
    try {
      const editorService = await this.container.getEditorService();
      const dataStorageService = await this.container.getDataStorageService();
      await dataStorageService.setJobRunning("daily", true);
      await dataStorageService.setJobLastRun("daily", Date.now());

      const dailyEdition = await editorService.generateDailyEdition({
        published: job.data.published,
        modelName: job.data.modelName
      });

      await dataStorageService.setJobRunning("daily", false);
      await dataStorageService.setJobLastSuccess("daily", Date.now());

      console.log(`Daily edition ${dailyEdition.id} generated successfully`);
    } catch (error) {
      console.error(`Daily edition generation failed:`, error);
      const dataStorageService = await this.container.getDataStorageService();
      await dataStorageService.setJobRunning("daily", false);
      throw error;
    }
  }

  private async processReporterJob(job: Job): Promise<void> {
    console.log(`Processing reporter articles (job ${job.id})`);
    try {
      const reporterService = await this.container.getReporterService();
      const dataStorageService = await this.container.getDataStorageService();
      await dataStorageService.setJobRunning("reporter", true);
      await dataStorageService.setJobLastRun("reporter", Date.now());

      const results = await reporterService.generateArticlesFromEvents(
        Date.now(),
        null,
        {
          published: job.data.published,
          modelName: job.data.modelName
        }
      );

      await dataStorageService.setJobRunning("reporter", false);
      await dataStorageService.setJobLastSuccess("reporter", Date.now());

      console.log(
        `Reporter articles generation completed successfully - generated ${results.totalArticles} articles`
      );
    } catch (error) {
      console.error(`Reporter articles generation failed:`, error);
      const dataStorageService = await this.container.getDataStorageService();
      await dataStorageService.setJobRunning("reporter", false);
      throw error;
    }
  }

  private async processResearchJob(job: Job): Promise<void> {
    const container = this.container;
    await processResearchJobHandler(job, container);
  }

  async close(): Promise<void> {
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
  }
}
