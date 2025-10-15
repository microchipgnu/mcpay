#!/usr/bin/env tsx
/**
 * Migrate Servers to Multi-Network Support
 * 
 * This script migrates existing servers to support multiple networks by adding
 * networks metadata based on their recipient configuration and isTestnet flag.
 * 
 * Usage: npx tsx scripts/migrate-servers.ts
 */

import { redisStore } from '../src/db/redis.js';

async function migrateServers() {
  try {
    await redisStore.connect();
    const servers = await redisStore.getAllServers();
    console.log('Total servers:', servers.length);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const server of servers) {
      const config = await redisStore.getServerById(server.id);
      if (!config) continue;
      
      // Skip if already has networks metadata
      if (config.metadata?.networks) {
        console.log(`Skipping ${server.id} - already has networks metadata`);
        skipped++;
        continue;
      }
      
      // Determine networks based on recipient and isTestnet flag
      let networks: string[] = [];
      
      if (config.recipient?.evm?.address) {
        const isTestnet = config.recipient.evm.isTestnet;
        if (isTestnet) {
          networks = ['base-sepolia', 'avalanche-fuji', 'sei-testnet', 'polygon-amoy'];
        } else {
          networks = ['base', 'avalanche', 'iotex', 'sei', 'polygon'];
        }
      }
      
      if (config.recipient?.svm?.address) {
        const isTestnet = config.recipient.svm.isTestnet;
        if (isTestnet) {
          networks.push('solana-devnet');
        } else {
          networks.push('solana-devnet', 'solana');
        }
      }
      
      // Update the server with networks metadata
      const updatedConfig = {
        ...config,
        metadata: {
          ...config.metadata,
          networks: networks,
          migratedAt: new Date().toISOString(),
          migrationReason: 'Add missing networks metadata for multi-network support'
        }
      };
      
      await redisStore.upsertServerConfig(updatedConfig);
      console.log(`Migrated ${server.id}: added networks ${JSON.stringify(networks)}`);
      migrated++;
    }
    
    console.log(`\n=== MIGRATION COMPLETE ===`);
    console.log(`Servers migrated: ${migrated}`);
    console.log(`Servers skipped: ${skipped}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

migrateServers();
