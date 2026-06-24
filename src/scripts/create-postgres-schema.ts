#!/usr/bin/env node

/**
 * PostgreSQL Database Schema Creation Script
 *
 * This script creates all the necessary tables and indexes for the attonews
 * PostgreSQL data storage backend.
 *
 * Usage: npx ts-node scripts/create-postgres-schema.ts
 */

import { Pool } from "pg";

async function createSchema() {
  const pool = new Pool({
    connectionString:
      process.env.POSTGRES_URL || "postgresql://localhost:5432/newsroom",
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });

  try {
    console.log("Connecting to PostgreSQL...");
    const client = await pool.connect();
    console.log("Connected successfully!");

    await client.query("BEGIN");

    console.log("Creating tables...");

    // Create editors table
    console.log("Creating editors table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS editors (
        id SERIAL PRIMARY KEY,
        bio TEXT NOT NULL,
        prompt TEXT NOT NULL,
        model_name TEXT NOT NULL DEFAULT 'gpt-5-nano',
        message_slice_count INTEGER NOT NULL,
        input_token_cost DECIMAL(10,6) NOT NULL,
        output_token_cost DECIMAL(10,6) NOT NULL,
        article_generation_period_minutes INTEGER NOT NULL,
        last_article_generation_time BIGINT,
        event_generation_period_minutes INTEGER NOT NULL,
        last_event_generation_time BIGINT,
        edition_generation_period_minutes INTEGER NOT NULL,
        last_edition_generation_time BIGINT
      )
    `);

    // Create reporters table
    console.log("Creating reporters table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS reporters (
        id TEXT PRIMARY KEY,
        beats JSONB NOT NULL DEFAULT '[]',
        prompt TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // Create articles table
    console.log("Creating articles table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES reporters(id),
        headline TEXT NOT NULL,
        body TEXT NOT NULL,
        generation_time BIGINT NOT NULL,
        prompt TEXT NOT NULL,
        message_ids JSONB NOT NULL DEFAULT '[]',
        message_texts JSONB NOT NULL DEFAULT '[]',
        message_dids JSONB NOT NULL DEFAULT '[]',
        message_rkeys JSONB NOT NULL DEFAULT '[]',
        model_name TEXT NOT NULL DEFAULT 'gpt-5-nano'
      )
    `);

    // Create events table
    console.log("Creating events table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL REFERENCES reporters(id),
        title TEXT NOT NULL,
        created_time BIGINT NOT NULL,
        updated_time BIGINT NOT NULL,
        facts JSONB NOT NULL DEFAULT '[]',
        location TEXT,
        event_time TEXT,
        message_ids JSONB,
        message_texts JSONB,
        model_name TEXT NOT NULL DEFAULT 'gpt-5-nano'
      )
    `);

    // Create newspaper_editions table
    console.log("Creating newspaper_editions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS newspaper_editions (
        id TEXT PRIMARY KEY,
        stories JSONB NOT NULL DEFAULT '[]',
        generation_time BIGINT NOT NULL,
        prompt TEXT NOT NULL,
        model_name TEXT NOT NULL DEFAULT 'gpt-5-nano'
      )
    `);

    // Create daily_editions table
    console.log("Creating daily_editions table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_editions (
        id TEXT PRIMARY KEY,
        editions JSONB NOT NULL DEFAULT '[]',
        generation_time BIGINT NOT NULL,
        front_page_headline TEXT NOT NULL,
        front_page_article TEXT NOT NULL,
        newspaper_name TEXT NOT NULL,
        model_feedback_positive TEXT NOT NULL,
        model_feedback_negative TEXT NOT NULL,
        topics JSONB NOT NULL DEFAULT '[]',
        prompt TEXT NOT NULL,
        model_name TEXT NOT NULL DEFAULT 'gpt-5-nano'
      )
    `);

    // Create users table (must be created before ads due to foreign key)
    console.log("Creating users table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'reporter', 'user')),
        created_at BIGINT NOT NULL,
        last_login_at BIGINT,
        has_reader BOOLEAN NOT NULL DEFAULT false,
        has_reporter BOOLEAN NOT NULL DEFAULT false,
        has_editor BOOLEAN NOT NULL DEFAULT false
      )
    `);

    // Create ads table
    console.log("Creating ads table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        bid_price DECIMAL(10,2) NOT NULL,
        prompt_content TEXT NOT NULL
      )
    `);

    // Create kpis table
    console.log("Creating kpis table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS kpis (
        name TEXT PRIMARY KEY,
        value DECIMAL(20,2) NOT NULL,
        last_updated BIGINT NOT NULL
      )
    `);

    // Create job_status table
    console.log("Creating job_status table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_status (
        name TEXT PRIMARY KEY,
        running BOOLEAN NOT NULL DEFAULT false,
        last_run BIGINT,
        last_success BIGINT
      )
    `);

    console.log("Creating indexes...");

    // Create indexes
    console.log("Creating articles indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_articles_reporter_time ON articles(reporter_id, generation_time DESC)`
    );

    console.log("Creating events indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_events_reporter_created ON events(reporter_id, created_time DESC)`
    );

    console.log("Creating newspaper editions indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_newspaper_editions_time ON newspaper_editions(generation_time DESC)`
    );

    console.log("Creating daily editions indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_daily_editions_time ON daily_editions(generation_time DESC)`
    );

    console.log("Creating users indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    );

    console.log("Creating ads indexes...");
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id)`
    );

    await client.query("COMMIT");
    console.log("✅ Schema created successfully!");

    client.release();
  } catch (error) {
    console.error("❌ Error creating schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  createSchema()
    .then(() => {
      console.log("🎉 PostgreSQL schema creation completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Schema creation failed:", error);
      process.exit(1);
    });
}

export { createSchema };
