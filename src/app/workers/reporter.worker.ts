import { ServiceContainer } from "../services/service-container";

async function run() {
  console.log("Starting reporter job worker...");
  const container = ServiceContainer.getInstance();
  await container.getReporterJobQueueService(); // initializes and starts worker
  console.log("Reporter job worker is running. Press Ctrl+C to exit.");
  // Keep process alive
  process.on("SIGINT", async () => {
    console.log("Shutting down reporter job worker...");
    await container.disconnect();
    process.exit(0);
  });
}

run().catch(console.error);