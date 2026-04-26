import { Worker, Job } from "bullmq";
import { ServiceContainer } from "../services/service-container";

const QUEUES = ["artifact_generate", "daily_edition", "reporter_articles"];

async function processJob(job: Job): Promise<void> {
  const container = ServiceContainer.getInstance();
  const jobQueueService = await container.getJobQueueService();
  await jobQueueService.processJob(job);
}

async function run() {
  console.log("Starting unified BullMQ worker for all queues...");
  const container = ServiceContainer.getInstance();
  const jobQueueService = await container.getJobQueueService();
  const connection = {
    host: "localhost",
    port: 6379
  };

  const worker = new Worker(QUEUES as any, processJob, {
    connection,
    concurrency: 4, // Total across queues
    limiter: { max: 10, duration: 60000 } // Fallback
  });

  process.on("SIGINT", async () => {
    console.log("Shutting down unified worker...");
    await worker.close();
    await container.disconnect();
    process.exit(0);
  });
}

run().catch(console.error);
