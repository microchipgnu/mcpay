#!/usr/bin/env tsx
/**
 * Pricing Summary Analysis
 * 
 * This script provides a comprehensive analysis of pricing across all servers,
 * including payment enforcement status, price distribution, and recommendations.
 * 
 * Usage: npx tsx scripts/pricing-summary.ts
 */

import { redisStore } from '../src/db/redis.js';

async function pricingSummary() {
  try {
    await redisStore.connect();
    const servers = await redisStore.getAllServers();
    
    let totalServers = 0;
    let serversWithTools = 0;
    let serversWithoutTools = 0;
    let serversWithPayments = 0;
    let serversWithoutPayments = 0;
    let totalTools = 0;
    let priceRange = { min: Infinity, max: 0 };
    const priceDistribution: Record<string, number> = {};
    
    console.log('=== PRICING ANALYSIS ===\n');
    
    for (const server of servers) {
      const config = await redisStore.getServerById(server.id);
      if (!config) continue;
      
      totalServers++;
      
      if (config.tools && config.tools.length > 0) {
        serversWithTools++;
        totalTools += config.tools.length;
        
        // Check if server has recipient configured (can enforce payments)
        const hasRecipient = config.recipient?.evm?.address || config.recipient?.svm?.address;
        if (hasRecipient) {
          serversWithPayments++;
        } else {
          serversWithoutPayments++;
        }
        
        // Analyze pricing
        for (const tool of config.tools) {
          const priceStr = tool.pricing;
          if (typeof priceStr === 'string' && priceStr.startsWith('$')) {
            const price = parseFloat(priceStr.substring(1));
            if (!isNaN(price)) {
              priceRange.min = Math.min(priceRange.min, price);
              priceRange.max = Math.max(priceRange.max, price);
              
              const priceKey = priceStr;
              priceDistribution[priceKey] = (priceDistribution[priceKey] || 0) + 1;
            }
          }
        }
      } else {
        serversWithoutTools++;
      }
    }
    
    console.log(`Total Servers: ${totalServers}`);
    console.log(`Servers with Tools: ${serversWithTools}`);
    console.log(`Servers without Tools: ${serversWithoutTools}`);
    console.log(`Servers with Payment Enforcement: ${serversWithPayments}`);
    console.log(`Servers without Payment Enforcement: ${serversWithoutPayments}`);
    console.log(`Total Tools: ${totalTools}`);
    
    console.log(`\nPrice Range: $${priceRange.min} - $${priceRange.max}`);
    
    console.log('\nPrice Distribution:');
    const sortedPrices = Object.entries(priceDistribution)
      .sort(([,a], [,b]) => b - a);
    
    for (const [price, count] of sortedPrices) {
      console.log(`  ${price}: ${count} tools`);
    }
    
    console.log('\n=== PAYMENT ENFORCEMENT STATUS ===');
    console.log(`✅ Servers with payment enforcement: ${serversWithPayments}/${serversWithTools} (${Math.round(serversWithPayments/serversWithTools*100)}%)`);
    console.log(`❌ Servers without payment enforcement: ${serversWithoutPayments}/${serversWithTools} (${Math.round(serversWithoutPayments/serversWithTools*100)}%)`);
    
    if (serversWithoutPayments > 0) {
      console.log('\n⚠️  Servers without payment enforcement:');
      for (const server of servers) {
        const config = await redisStore.getServerById(server.id);
        if (!config || !config.tools || config.tools.length === 0) continue;
        
        const hasRecipient = config.recipient?.evm?.address || config.recipient?.svm?.address;
        if (!hasRecipient) {
          console.log(`  - ${server.id}: ${config.tools.length} tools, no recipient`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

pricingSummary();
