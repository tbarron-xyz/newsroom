import { Queue, Worker, QueueEvents, Job } from "bullmq";
import { ReporterService } from "./reporter.service";
import { IDataStorageService } from "./data-storage.interface";

const QUEUE_NAME = "reporter_articles";

export class ReporterJobQueueService {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;

  constructor(
    private reporterService: ReporterService,
    private dataStorageService: IDataStorageService
  ) {
    // Redis connection
    const connection = {
      host: "localhost",
      port: 6379
    };

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(QUEUE_NAME, this.processJob.bind(this), {
      connection,
      concurrency: 1, // single reporter job at a time
      limiter: { max: 1, duration: 15 * 60 * 1000 } // 1 per 15min to match default throttle
    });
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection });

    // Listen for completed jobs
    this.queueEvents.on("completed", ({ jobId }) => {
      console.log(`Reporter articles job ${jobId} completed successfully`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.log(`Reporter articles job ${jobId} failed: ${failedReason}`);
    });
  }

  async queueReporterArticles(): Promise<string> {
    const job = await this.queue.add("generate", {});
    return job.id!;
  }

  private async processJob(job: Job): Promise<void> {
    console.log(`Processing reporter articles (job ${job.id})`);
    try {
      await this.dataStorageService.setJobRunning("reporter", true);
      await this.dataStorageService.setJobLastRun("reporter", Date.now());

      const results = await this.reporterService.generateArticlesFromEvents();

      await this.dataStorageService.setJobRunning("reporter", false);
      await this.dataStorageService.setJobLastSuccess("reporter", Date.now());

      console.log(`Reporter articles generation completed successfully - generated ${results.totalArticles} articles`);
    } catch (error) {
      console.error(`Reporter articles generation failed:`, error);
      await this.dataStorageService.setJobRunning("reporter", false);
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
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

  async getActiveJobId(): Promise<string | null> {
    const jobs = await this.queue.getJobs(["active"]);
    return jobs.length > 0 ? jobs[0].id || null : null;
  }

  async getJobs(
    status?: "waiting" | "active" | "completed" | "failed",
    limit = 10
  ): Promise<any[]> {
    const jobs = await this.queue.getJobs(
      status ? [status] : undefined,
      0,
      limit
    );
    return jobs.map((job) => ({
      id: job.id,
      status: job.opts.jobId, // wait, need state
      progress: job.progress,
      createdAt: job.timestamp
    }));
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
  }
}