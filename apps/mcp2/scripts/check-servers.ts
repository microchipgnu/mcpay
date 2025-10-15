#!/usr/bin/env tsx
/**
 * Check Server Configurations
 * 
 * This script analyzes all registered MCP servers and shows their configuration,
 * including recipient addresses, networks, tools, and pricing.
 * 
 * Usage: npx tsx scripts/check-servers.ts
 */

import { redisStore } from '../src/db/redis.js';

async function checkServers() {
  try {
    await redisStore.connect();
    const servers = await redisStore.getAllServers();
    console.log('Total servers:', servers.length);
    
    let withNetworks = 0;
    let withoutNetworks = 0;
    let withRecipient = 0;
    let withOldFormat = 0;
    
    for (const server of servers) {
      const config = await redisStore.getServerById(server.id);
      if (!config) continue;
      
      console.log(`\nServer ${server.id}:`);
      console.log(`  mcpOrigin: ${config.mcpOrigin}`);
      console.log(`  recipient: ${JSON.stringify(config.recipient)}`);
      console.log(`  receiverAddressByNetwork: ${JSON.stringify(config.receiverAddressByNetwork)}`);
      console.log(`  metadata: ${JSON.stringify(config.metadata)}`);
      
      if (config.metadata?.networks) {
        withNetworks++;
        console.log(`  ✓ Has networks metadata: ${JSON.stringify(config.metadata.networks)}`);
      } else {
        withoutNetworks++;
        console.log(`  ✗ No networks metadata`);
      }
      
      if (config.recipient) {
        withRecipient++;
        console.log(`  ✓ Has new recipient format`);
      }
      
      if (config.receiverAddressByNetwork && Object.keys(config.receiverAddressByNetwork).length > 0) {
        withOldFormat++;
        console.log(`  ✓ Has old receiverAddressByNetwork format`);
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Servers with networks metadata: ${withNetworks}`);
    console.log(`Servers without networks metadata: ${withoutNetworks}`);
    console.log(`Servers with new recipient format: ${withRecipient}`);
    console.log(`Servers with old receiverAddressByNetwork: ${withOldFormat}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkServers();
