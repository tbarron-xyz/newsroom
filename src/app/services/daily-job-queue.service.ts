import { Queue, Worker, QueueEvents, Job } from "bullmq";
import { EditorService } from "./editor.service";
import { IDataStorageService } from "./data-storage.interface";

const QUEUE_NAME = "daily_edition";

export class DailyJobQueueService {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;

  constructor(
    private editorService: EditorService,
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
      concurrency: 1, // single daily edition job at a time
      limiter: { max: 1, duration: 60 * 60 * 1000 } // 1 per hour to protect against retries
    });
    this.queueEvents = new QueueEvents(QUEUE_NAME, { connection });

    // Listen for completed jobs
    this.queueEvents.on("completed", ({ jobId }) => {
      console.log(`Daily edition job ${jobId} completed successfully`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.log(`Daily edition job ${jobId} failed: ${failedReason}`);
    });
  }

  async queueDailyEdition(): Promise<string> {
    const job = await this.queue.add("generate", {});
    return job.id!;
  }

  private async processJob(job: Job): Promise<void> {
    console.log(`Processing daily edition (job ${job.id})`);
    try {
      await this.dataStorageService.setJobRunning("daily", true);
      await this.dataStorageService.setJobLastRun("daily", Date.now());

      const dailyEdition = await this.editorService.generateDailyEdition();

      await this.dataStorageService.setJobRunning("daily", false);
      await this.dataStorageService.setJobLastSuccess("daily", Date.now());

      console.log(`Daily edition ${dailyEdition.id} generated successfully`);
    } catch (error) {
      console.error(`Daily edition generation failed:`, error);
      await this.dataStorageService.setJobRunning("daily", false);
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
