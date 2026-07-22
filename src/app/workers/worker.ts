import { Worker, Job } from "bullmq";
import { ServiceContainer } from "../services/service-container";

const QUEUE_CONFIGS: Record<string, { concurrency: number }> = {
  artifact_generate: { concurrency: 2 },
  daily_edition: { concurrency: 1 },
  reporter_articles: { concurrency: 1 }
};

async function processJob(job: Job): Promise<void> {
  const container = ServiceContainer.getInstance();
  const jobQueueService = await container.getJobQueueService();
  await jobQueueService.processJob(job);
}

async function run() {
  console.log("Starting BullMQ workers for all queues...");
  const container = ServiceContainer.getInstance();
  await container.getJobQueueService();
  const connection = {
    host: "localhost",
    port: 6379
  };

  const workers = Object.entries(QUEUE_CONFIGS).map(([queueName, config]) => {
    const worker = new Worker(queueName, processJob, {
      connection,
      concurrency: config.concurrency
    });
    worker.on("ready", () =>
      console.log(`Worker ready for queue: ${queueName}`)
    );
    worker.on("error", (err) =>
      console.error(`Worker error for queue ${queueName}:`, err)
    );
    worker.on("failed", (job, err) =>
      console.error(`Job ${job?.id} failed on queue ${queueName}:`, err)
    );
    return worker;
  });

  process.on("SIGINT", async () => {
    console.log("Shutting down workers...");
    await Promise.all(workers.map((w) => w.close()));
    await container.disconnect();
    process.exit(0);
  });
}

run().catch(console.error);
