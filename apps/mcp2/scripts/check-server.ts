#!/usr/bin/env tsx
/**
 * Check Specific Server
 * 
 * This script checks the configuration and payment enforcement status
 * for a specific server by ID.
 * 
 * Usage: npx tsx scripts/check-server.ts <server-id>
 */

import { redisStore } from '../src/db/redis.js';

async function checkServer(serverId: string) {
  try {
    await redisStore.connect();
    const config = await redisStore.getServerById(serverId);
    
    if (!config) {
      console.log(`❌ Server ${serverId} not found`);
      return;
    }
    
    console.log(`=== Server ${serverId} ===`);
    console.log(`mcpOrigin: ${config.mcpOrigin}`);
    console.log(`Tools: ${config.tools?.length || 0}`);
    console.log(`Recipient: ${JSON.stringify(config.recipient)}`);
    console.log(`Networks: ${JSON.stringify(config.metadata?.networks)}`);
    
    // Check payment enforcement capability
    const hasRecipient = config.recipient?.evm?.address || config.recipient?.svm?.address;
    const hasNetworks = config.metadata?.networks && config.metadata.networks.length > 0;
    const hasTools = config.tools && config.tools.length > 0;
    
    console.log('\n=== Payment Enforcement Status ===');
    console.log(`Has recipient: ${hasRecipient ? '✅' : '❌'}`);
    console.log(`Has networks: ${hasNetworks ? '✅' : '❌'}`);
    console.log(`Has tools: ${hasTools ? '✅' : '❌'}`);
    
    if (hasRecipient && hasNetworks && hasTools) {
      console.log('✅ Server can enforce payments');
      
      if (config.tools && config.tools.length > 0) {
        console.log('\nTool pricing:');
        for (const tool of config.tools) {
          console.log(`  - ${tool.name}: ${tool.pricing}`);
        }
      }
    } else {
      console.log('❌ Server cannot enforce payments');
      if (!hasRecipient) console.log('  Missing recipient address');
      if (!hasNetworks) console.log('  Missing networks configuration');
      if (!hasTools) console.log('  No tools configured');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get server ID from command line args
const serverId = process.argv[2];
if (!serverId) {
  console.error('Usage: npx tsx scripts/check-server.ts <server-id>');
  process.exit(1);
}

checkServer(serverId);
