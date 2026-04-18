import { ServiceContainer } from "../services/service-container";

async function run() {
  console.log("Starting daily job worker...");
  const container = ServiceContainer.getInstance();
  await container.getDailyJobQueueService(); // initializes and starts worker
  console.log("Daily job worker is running. Press Ctrl+C to exit.");
  // Keep process alive
  process.on("SIGINT", async () => {
    console.log("Shutting down daily job worker...");
    await container.disconnect();
    process.exit(0);
  });
}

run().catch(console.error);
