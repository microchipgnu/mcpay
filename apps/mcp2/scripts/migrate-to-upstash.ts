#!/usr/bin/env bun

import { readFileSync } from 'fs';
import { join } from 'path';
import { RedisMcpStore } from '../src/db/redis.js';

// Load environment variables
import { config } from 'dotenv';
config();

interface LegacyServerConfig {
  id: string;
  mcpOrigin: string;
  requireAuth?: boolean;
  authHeaders?: Record<string, string>;
  receiverAddressByNetwork?: Record<string, string>;
  recipient?: {
    evm?: {
      address: string;
      isTestnet?: boolean;
    };
    svm?: {
      address: string;
      isTestnet?: boolean;
    };
  };
  tools?: Array<{
    name: string;
    pricing: string;
  }>;
  metadata?: Record<string, unknown>;
}

interface LegacyStore {
  serversById: Record<string, LegacyServerConfig>;
  serverIdByOrigin: Record<string, string>;
}

async function migrateToUpstash() {
  console.log('🚀 Starting migration from JSON store to Upstash Redis...');
  
  // Check if environment variables are set
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ Missing required environment variables:');
    console.error('   UPSTASH_REDIS_REST_URL');
    console.error('   UPSTASH_REDIS_REST_TOKEN');
    console.error('');
    console.error('Please set these in your .env file or environment.');
    process.exit(1);
  }

  try {
    // Initialize Redis store
    const redisStore = new RedisMcpStore();
    await redisStore.connect();
    console.log('✅ Connected to Upstash Redis');

    // Load existing JSON data
    const jsonStorePath = join(process.cwd(), 'mcp-store.json');
    let jsonData: LegacyStore;
    
    try {
      const jsonContent = readFileSync(jsonStorePath, 'utf-8');
      jsonData = JSON.parse(jsonContent);
      console.log(`📁 Loaded JSON store with ${Object.keys(jsonData.serversById).length} servers`);
    } catch (error) {
      console.error('❌ Failed to load JSON store:', error);
      process.exit(1);
    }

    // Migrate each server
    let migratedCount = 0;
    let errorCount = 0;

    for (const [serverId, serverConfig] of Object.entries(jsonData.serversById)) {
      try {
        console.log(`🔄 Migrating server: ${serverId}`);
        
        // Convert legacy format to new format
        const migratedConfig = {
          id: serverConfig.id,
          mcpOrigin: serverConfig.mcpOrigin,
          requireAuth: serverConfig.requireAuth ?? false,
          authHeaders: serverConfig.authHeaders ?? {},
          receiverAddressByNetwork: serverConfig.receiverAddressByNetwork ?? {},
          recipient: serverConfig.recipient,
          tools: serverConfig.tools ?? [],
          metadata: serverConfig.metadata ?? {},
        };

        // Save to Redis
        await redisStore.upsertServerConfig(migratedConfig);
        migratedCount++;
        console.log(`✅ Migrated server: ${serverId}`);
      } catch (error) {
        console.error(`❌ Failed to migrate server ${serverId}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${migratedCount} servers`);
    if (errorCount > 0) {
      console.log(`❌ Failed to migrate: ${errorCount} servers`);
    }

    // Verify migration
    console.log('');
    console.log('🔍 Verifying migration...');
    const allServers = await redisStore.getAllServers();
    console.log(`📊 Total servers in Redis: ${allServers.length}`);

    // Test a few servers
    if (allServers.length > 0) {
      const testServer = allServers[0];
      if (testServer) {
        const serverDetails = await redisStore.getServerById(testServer.id);
        if (serverDetails) {
          console.log(`✅ Test server loaded successfully: ${serverDetails.mcpOrigin}`);
        } else {
          console.log('❌ Failed to load test server');
        }
      }
    }

    await redisStore.disconnect();
    console.log('👋 Disconnected from Redis');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateToUpstash().catch(console.error);

export { migrateToUpstash };
