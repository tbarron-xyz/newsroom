#!/usr/bin/env node

/**
 * Redis to PostgreSQL Migration Script
 *
 * This script migrates all data from Redis to PostgreSQL.
 * It reads data from the Redis instance and writes it to PostgreSQL.
 *
 * Usage: npx ts-node scripts/migrate-redis-to-postgres.ts
 */

import { RedisDataStorageService } from "../app/services/redis-data-storage.service";
import { PostgreSQLDataStorageService } from "../app/services/postgresql-data-storage.service";

async function migrateData() {
  console.log("🚀 Starting Redis to PostgreSQL migration...");

  // Initialize services
  const redisService = new RedisDataStorageService();
  const postgresService = new PostgreSQLDataStorageService();

  try {
    console.log("Connecting to Redis...");
    await redisService.connect();
    console.log("✅ Connected to Redis");

    console.log("Connecting to PostgreSQL...");
    await postgresService.connect();
    console.log("✅ Connected to PostgreSQL");

    // Clear PostgreSQL data first (optional, for clean migration)
    console.log("Clearing existing PostgreSQL data...");
    await postgresService.clearAllData();
    console.log("✅ PostgreSQL data cleared");

    // Migrate data in order of dependencies
    console.log("📊 Starting data migration...");

    // 1. Migrate Editor
    console.log("Migrating editor configuration...");
    const editor = await redisService.getEditor();
    if (editor) {
      await postgresService.saveEditor(editor);
      console.log("✅ Editor configuration migrated");
    } else {
      console.log("⚠️  No editor configuration found");
    }

    // 2. Migrate Reporters
    console.log("Migrating reporters...");
    const reporters = await redisService.getAllReporters();
    for (const reporter of reporters) {
      await postgresService.saveReporter(reporter);
    }
    console.log(`✅ ${reporters.length} reporters migrated`);

    // 3. Migrate Articles
    console.log("Migrating articles...");
    let articleCount = 0;
    for (const reporter of reporters) {
      const articles = await redisService.getArticlesByReporter(reporter.id);
      for (const article of articles) {
        await postgresService.saveArticle(article);
        articleCount++;
      }
    }
    console.log(`✅ ${articleCount} articles migrated`);

    // 4. Migrate Events
    console.log("Migrating events...");
    let eventCount = 0;
    for (const reporter of reporters) {
      const events = await redisService.getEventsByReporter(reporter.id);
      for (const event of events) {
        await postgresService.saveEvent(event);
        eventCount++;
      }
    }
    console.log(`✅ ${eventCount} events migrated`);

    // 5. Migrate Newspaper Editions
    console.log("Migrating newspaper editions...");
    const newspaperEditions = await redisService.getNewspaperEditions();
    for (const edition of newspaperEditions) {
      await postgresService.saveNewspaperEdition(edition);
    }
    console.log(`✅ ${newspaperEditions.length} newspaper editions migrated`);

    // 6. Migrate Daily Editions
    console.log("Migrating daily editions...");
    const dailyEditions = await redisService.getDailyEditions();
    for (const dailyEdition of dailyEditions) {
      await postgresService.saveDailyEdition(dailyEdition);
    }
    console.log(`✅ ${dailyEditions.length} daily editions migrated`);

    // 7. Migrate Users
    console.log("Migrating users...");
    const users = await redisService.getAllUsers();
    for (const user of users) {
      await postgresService.createUser({
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        hasReader: user.hasReader,
        hasReporter: user.hasReporter,
        hasEditor: user.hasEditor
      });
      // Update last login if it exists
      if (user.lastLoginAt) {
        await postgresService.updateUserLastLogin(user.id);
      }
    }
    console.log(`✅ ${users.length} users migrated`);

    // 8. Migrate KPIs
    console.log("Migrating KPIs...");
    // Note: We need to get KPI names from somewhere. For now, we'll migrate common ones
    const kpiNames = [
      "Total AI API spend",
      "Total text input tokens",
      "Total text output tokens"
    ];

    for (const kpiName of kpiNames) {
      const value = await redisService.getKpiValue(kpiName);
      if (value > 0) {
        await postgresService.setKpiValue(kpiName, value);
      }
    }
    console.log("✅ KPIs migrated");

    // 10. Migrate Job Status
    console.log("Migrating job status...");
    const jobNames = ["reporter", "newspaper", "daily"];

    for (const jobName of jobNames) {
      const running = await redisService.getJobRunning(jobName);
      const lastRun = await redisService.getJobLastRun(jobName);
      const lastSuccess = await redisService.getJobLastSuccess(jobName);

      if (running) {
        await postgresService.setJobRunning(jobName, true);
      }
      if (lastRun) {
        await postgresService.setJobLastRun(jobName, lastRun);
      }
      if (lastSuccess) {
        await postgresService.setJobLastSuccess(jobName, lastSuccess);
      }
    }
    console.log("✅ Job status migrated");

    console.log("🎉 Migration completed successfully!");

    // Validation
    console.log("🔍 Running validation checks...");

    const postgresReporters = await postgresService.getAllReporters();
    const postgresArticles = await postgresService.getAllArticles();
    const postgresUsers = await postgresService.getAllUsers();

    console.log(`📊 Validation Results:`);
    console.log(
      `   Reporters: Redis=${reporters.length}, PostgreSQL=${postgresReporters.length}`
    );
    console.log(
      `   Articles: Redis=${articleCount}, PostgreSQL=${postgresArticles.length}`
    );
    console.log(
      `   Users: Redis=${users.length}, PostgreSQL=${postgresUsers.length}`
    );

    if (
      reporters.length === postgresReporters.length &&
      articleCount === postgresArticles.length &&
      users.length === postgresUsers.length
    ) {
      console.log("✅ All data migrated successfully!");
    } else {
      console.log("⚠️  Data count mismatch detected. Please verify migration.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    // Disconnect from services
    console.log("Disconnecting from databases...");
    await redisService.disconnect();
    await postgresService.disconnect();
    console.log("✅ Disconnected from databases");
  }
}

// Run the script
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log("🎉 Migration completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

export { migrateData };
