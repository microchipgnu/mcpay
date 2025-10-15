#!/usr/bin/env tsx
/**
 * Test Payment Enforcement
 * 
 * This script tests payment enforcement by making requests to MCP servers
 * and checking if they return 402 Payment Required responses.
 * 
 * Usage: npx tsx scripts/test-payment-enforcement.ts [server-id]
 */

import { redisStore } from '../src/db/redis.js';

async function testPaymentEnforcement(serverId?: string) {
  try {
    await redisStore.connect();
    
    let servers;
    if (serverId) {
      const config = await redisStore.getServerById(serverId);
      if (!config) {
        console.error(`Server ${serverId} not found`);
        return;
      }
      servers = [{ id: serverId }];
    } else {
      servers = await redisStore.getAllServers();
    }
    
    console.log(`Testing payment enforcement for ${servers.length} server(s)...\n`);
    
    for (const server of servers) {
      const config = await redisStore.getServerById(server.id);
      if (!config) continue;
      
      console.log(`\n=== Testing Server ${server.id} ===`);
      console.log(`mcpOrigin: ${config.mcpOrigin}`);
      console.log(`Tools: ${config.tools?.length || 0}`);
      console.log(`Recipient: ${JSON.stringify(config.recipient)}`);
      console.log(`Networks: ${JSON.stringify(config.metadata?.networks)}`);
      
      // Check if server can enforce payments
      const hasRecipient = config.recipient?.evm?.address || config.recipient?.svm?.address;
      const hasNetworks = config.metadata?.networks && config.metadata.networks.length > 0;
      const hasTools = config.tools && config.tools.length > 0;
      
      if (!hasRecipient) {
        console.log('❌ No recipient configured - cannot enforce payments');
        continue;
      }
      
      if (!hasNetworks) {
        console.log('❌ No networks configured - cannot enforce payments');
        continue;
      }
      
      if (!hasTools) {
        console.log('❌ No tools configured - no payments to enforce');
        continue;
      }
      
      console.log('✅ Configuration looks good for payment enforcement');
      
      // Test a request to the server
      const testUrl = `http://localhost:3006/mcp?id=${server.id}`;
      console.log(`Testing URL: ${testUrl}`);
      
      try {
        const response = await fetch(testUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list'
          })
        });
        
        console.log(`Response status: ${response.status}`);
        
        if (response.status === 402) {
          console.log('✅ Payment enforcement working - received 402 Payment Required');
        } else if (response.status === 200) {
          console.log('⚠️  Received 200 OK - payment enforcement may not be working');
        } else {
          console.log(`⚠️  Unexpected status: ${response.status}`);
        }
        
        // Try to get response body for more info
        try {
          const body = await response.text();
          if (body) {
            console.log(`Response body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
          }
        } catch (e) {
          // Ignore body parsing errors
        }
        
      } catch (error) {
        console.log(`❌ Request failed: ${error}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Get server ID from command line args
const serverId = process.argv[2];
testPaymentEnforcement(serverId);
