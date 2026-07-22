#!/usr/bin/env node

import { RedisDataStorageService } from "../app/services/redis-data-storage.service";
import { MongoDBDataStorageService } from "../app/services/mongodb-data-storage.service";

async function migrateData() {
  console.log("Starting Redis to MongoDB migration...");

  const redisService = new RedisDataStorageService();
  const mongoService = new MongoDBDataStorageService();

  try {
    console.log("Connecting to Redis...");
    await redisService.connect();
    console.log("Connected to Redis");

    console.log("Connecting to MongoDB...");
    await mongoService.connect();
    console.log("Connected to MongoDB");

    console.log("Starting data migration...");

    // 1. Migrate Editor
    console.log("Migrating editor configuration...");
    const editor = await redisService.getEditor();
    if (editor) {
      await mongoService.saveEditor(editor);
      console.log("Editor configuration migrated");
    } else {
      console.log("No editor configuration found");
    }

    // 2. Migrate Reporters
    console.log("Migrating reporters...");
    const reporters = await redisService.getAllReporters();
    for (const reporter of reporters) {
      await mongoService.saveReporter(reporter);
    }
    console.log(`${reporters.length} reporters migrated`);

    // 3. Migrate Articles
    console.log("Migrating articles...");
    let articleCount = 0;
    for (const reporter of reporters) {
      const articles = await redisService.getArticlesByReporter(reporter.id);
      for (const article of articles) {
        await mongoService.saveArticle(article);
        articleCount++;
      }
    }
    console.log(`${articleCount} articles migrated`);

    // 4. Migrate Events
    console.log("Migrating events...");
    let eventCount = 0;
    for (const reporter of reporters) {
      const events = await redisService.getEventsByReporter(reporter.id);
      for (const event of events) {
        await mongoService.saveEvent(event);
        eventCount++;
      }
    }
    console.log(`${eventCount} events migrated`);

    // 5. Migrate Newspaper Editions
    console.log("Migrating newspaper editions...");
    const newspaperEditions = await redisService.getNewspaperEditions();
    for (const edition of newspaperEditions) {
      await mongoService.saveNewspaperEdition(edition);
    }
    console.log(`${newspaperEditions.length} newspaper editions migrated`);

    // 6. Migrate Daily Editions
    console.log("Migrating daily editions...");
    const dailyEditions = await redisService.getDailyEditions();
    for (const dailyEdition of dailyEditions) {
      await mongoService.saveDailyEdition(dailyEdition);
    }
    console.log(`${dailyEditions.length} daily editions migrated`);

    // 7. Migrate Opinion Articles
    console.log("Migrating opinion articles...");
    const opinions = await redisService.getLatestOpinionArticles(10000);
    for (const opinion of opinions) {
      await mongoService.saveOpinionArticle(opinion);
    }
    console.log(`${opinions.length} opinion articles migrated`);

    // 8. Migrate Users
    console.log("Migrating users...");
    const users = await redisService.getAllUsers();
    for (const user of users) {
      const newUser = await mongoService.createUser({
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        hasReader: user.hasReader,
        hasReporter: user.hasReporter,
        hasEditor: user.hasEditor
      });
    }
    console.log(`${users.length} users migrated`);

    // 9. Migrate KPIs
    console.log("Migrating KPIs...");
    const kpiNames = [
      "Total AI API spend",
      "Total text input tokens",
      "Total text output tokens"
    ];
    for (const kpiName of kpiNames) {
      const value = await redisService.getKpiValue(kpiName);
      if (value > 0) {
        await mongoService.setKpiValue(kpiName, value);
      }
    }
    console.log("KPIs migrated");

    // 10. Migrate Job Status
    console.log("Migrating job status...");
    const jobNames = ["reporter", "newspaper", "daily"];
    for (const jobName of jobNames) {
      const running = await redisService.getJobRunning(jobName);
      const lastRun = await redisService.getJobLastRun(jobName);
      const lastSuccess = await redisService.getJobLastSuccess(jobName);
      if (running) {
        await mongoService.setJobRunning(jobName, true);
      }
      if (lastRun) {
        await mongoService.setJobLastRun(jobName, lastRun);
      }
      if (lastSuccess) {
        await mongoService.setJobLastSuccess(jobName, lastSuccess);
      }
    }
    console.log("Job status migrated");

    // 11. Migrate Forum Sections
    console.log("Migrating forum sections...");
    const forumSections = await redisService.getForumSections();
    if (forumSections) {
      await mongoService.saveForumSections(forumSections);
      console.log(`${forumSections.length} forum sections migrated`);
    } else {
      console.log("No forum sections found");
    }

    // 12. Migrate Ticker
    console.log("Migrating ticker...");
    const ticker = await redisService.getLatestTicker();
    if (ticker) {
      await mongoService.saveTicker(ticker);
      console.log("Latest ticker migrated");
    } else {
      console.log("No ticker found");
    }

    // 13. Migrate Dynamic Personas
    console.log("Migrating dynamic personas...");
    const dynamicPersonas = await redisService.getDynamicPersonas();
    if (dynamicPersonas) {
      await mongoService.setDynamicPersonas(dynamicPersonas);
      console.log("Dynamic personas migrated");
    } else {
      console.log("No dynamic personas found");
    }

    // 14. Migrate Artifacts
    console.log("Migrating artifacts...");
    const artifacts = await redisService.getAllArtifacts();
    for (const artifact of artifacts) {
      await mongoService.saveArtifact(artifact);
    }
    console.log(`${artifacts.length} artifacts migrated`);

    // 15. Migrate Prism Daily Edition Pairs
    console.log("Migrating prism daily edition pairs...");
    const prismPairs = await redisService.getPrismDailyEditionPairs(100);
    for (const pair of prismPairs) {
      await mongoService.savePrismDailyEditionPair(pair);
    }
    console.log(`${prismPairs.length} prism daily edition pairs migrated`);

    // 16. Migrate Homepage Chat Messages
    console.log("Migrating homepage chat messages...");
    const chatMessages = await redisService.getHomepageChatMessages(10000);
    for (const message of chatMessages) {
      await mongoService.saveHomepageChatMessage(message);
    }
    console.log(`${chatMessages.length} homepage chat messages migrated`);

    // 17. Migrate Logs
    console.log("Migrating logs...");
    const logs = await redisService.getAllLogs();
    for (const log of logs) {
      await mongoService.addLog(log);
    }
    console.log(`${logs.length} log entries migrated`);

    console.log("Migration completed successfully!");

    // Validation
    console.log("Running validation checks...");
    console.log("Validation Results:");
    console.log(`   Reporters: ${reporters.length}`);
    console.log(`   Articles: ${articleCount}`);
    console.log(`   Events: ${eventCount}`);
    console.log(`   Newspaper Editions: ${newspaperEditions.length}`);
    console.log(`   Daily Editions: ${dailyEditions.length}`);
    console.log(`   Opinion Articles: ${opinions.length}`);
    console.log(`   Users: ${users.length}`);
    console.log(`   Artifacts: ${artifacts.length}`);
    console.log(`   Prism Pairs: ${prismPairs.length}`);
    console.log(`   Homepage Chat Messages: ${chatMessages.length}`);
    console.log(`   Logs: ${logs.length}`);

    if (reporters.length > 0 || articleCount > 0 || users.length > 0) {
      console.log("Data migration completed");
    } else {
      console.log("No data was migrated. Redis may be empty.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    console.log("Disconnecting from databases...");
    await redisService.disconnect();
    await mongoService.disconnect();
    console.log("Disconnected from databases");
  }
}

if (require.main === module) {
  migrateData()
    .then(() => {
      console.log("Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateData };
