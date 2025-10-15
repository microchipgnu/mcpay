#!/usr/bin/env tsx
/**
 * Check Server Pricing
 * 
 * This script analyzes pricing configuration for all registered MCP servers,
 * showing tool pricing, recipient addresses, and networks.
 * 
 * Usage: npx tsx scripts/check-prices.ts
 */

import { redisStore } from '../src/db/redis.js';

async function checkPrices() {
  try {
    await redisStore.connect();
    const servers = await redisStore.getAllServers();
    console.log('Total servers:', servers.length);
    
    for (const server of servers) {
      const config = await redisStore.getServerById(server.id);
      if (!config) continue;
      
      console.log(`\nServer ${server.id}:`);
      console.log(`  mcpOrigin: ${config.mcpOrigin}`);
      console.log(`  tools: ${config.tools?.length || 0} tools`);
      
      if (config.tools && config.tools.length > 0) {
        console.log(`  Tool pricing:`);
        for (const tool of config.tools) {
          console.log(`    - ${tool.name}: ${tool.pricing}`);
        }
      } else {
        console.log(`  No tools configured`);
      }
      
      console.log(`  recipient: ${JSON.stringify(config.recipient)}`);
      console.log(`  networks: ${JSON.stringify(config.metadata?.networks)}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPrices();
