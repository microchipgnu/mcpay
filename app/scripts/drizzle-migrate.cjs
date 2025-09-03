#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
// Programmatic migrations for reliability in CI/tests
const { Client } = require('pg');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(connectionString, maxAttempts, delayMs) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      // Wait and retry; Postgres inside container may not be ready yet
      await sleep(delayMs);
    }
  }
  throw lastError;
}

(async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL is required');
      process.exit(1);
    }

    const { drizzle } = await import('drizzle-orm/node-postgres');
    const { migrate } = await import('drizzle-orm/node-postgres/migrator');

    // Retry for up to ~30s to allow containerized Postgres to get ready
    const client = await connectWithRetry(databaseUrl, 60, 500);

    const db = drizzle(client);
    await migrate(db, { migrationsFolder: './drizzle' });

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('[drizzle-migrate] Migration failed:', err);
    process.exit(1);
  }
})();
