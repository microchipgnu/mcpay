#!/usr/bin/env tsx
/**
 * Migration Analysis
 * 
 * This script analyzes existing servers to determine if migration is needed
 * after the network filtering fix in buildMonetizationForTarget.
 * 
 * Usage: npx tsx scripts/migration-analysis.ts
 */

import { redisStore } from '../src/db/redis.js';

async function analyzeMigration() {
  try {
    await redisStore.connect();
    const servers = await redisStore.getAllServers();
    
    console.log('=== Migration Analysis ===');
    
    let needsMigration = 0;
    let hasBothEVMAndSVM = 0;
    let hasOnlyEVMRecipient = 0;
    let hasOnlySVMRecipient = 0;
    let hasBothRecipients = 0;
    let hasNoRecipients = 0;
    
    const evmNetworks = ['base', 'base-sepolia', 'avalanche', 'avalanche-fuji', 'iotex', 'sei', 'sei-testnet', 'polygon', 'polygon-amoy'];
    const svmNetworks = ['solana', 'solana-devnet'];
    
    for (const server of servers) {
      const networks = server.metadata?.networks as string[] || [];
      const hasEvmNetworks = networks.some(n => evmNetworks.includes(n));
      const hasSvmNetworks = networks.some(n => svmNetworks.includes(n));
      const hasEvmRecipient = !!server.recipient?.evm?.address;
      const hasSvmRecipient = !!server.recipient?.svm?.address;
      
      if (hasEvmNetworks && hasSvmNetworks) {
        hasBothEVMAndSVM++;
        
        if (hasEvmRecipient && !hasSvmRecipient) {
          hasOnlyEVMRecipient++;
          needsMigration++;
          console.log(`❌ ${server.id}: Has both EVM+SVM networks but only EVM recipient`);
          console.log(`   Networks: ${networks.join(', ')}`);
          console.log(`   EVM Recipient: ${server.recipient?.evm?.address}`);
          console.log(`   SVM Recipient: ${server.recipient?.svm?.address || 'None'}`);
          console.log('');
        } else if (!hasEvmRecipient && hasSvmRecipient) {
          hasOnlySVMRecipient++;
          needsMigration++;
          console.log(`❌ ${server.id}: Has both EVM+SVM networks but only SVM recipient`);
          console.log(`   Networks: ${networks.join(', ')}`);
          console.log(`   EVM Recipient: ${server.recipient?.evm?.address || 'None'}`);
          console.log(`   SVM Recipient: ${server.recipient?.svm?.address}`);
          console.log('');
        } else if (hasEvmRecipient && hasSvmRecipient) {
          hasBothRecipients++;
          console.log(`✅ ${server.id}: Has both EVM+SVM networks and both recipients`);
        } else {
          hasNoRecipients++;
          console.log(`⚠️  ${server.id}: Has both EVM+SVM networks but no recipients`);
        }
      }
    }
    
    console.log(`=== Summary ===`);
    console.log(`Total servers: ${servers.length}`);
    console.log(`Servers with both EVM and SVM networks: ${hasBothEVMAndSVM}`);
    console.log(`  - Only EVM recipient: ${hasOnlyEVMRecipient}`);
    console.log(`  - Only SVM recipient: ${hasOnlySVMRecipient}`);
    console.log(`  - Both recipients: ${hasBothRecipients}`);
    console.log(`  - No recipients: ${hasNoRecipients}`);
    console.log(`Servers needing migration: ${needsMigration}`);
    
    if (needsMigration === 0) {
      console.log(`\n✅ No migration needed! All servers are properly configured.`);
      console.log(`The network filtering fix will work correctly for all existing servers.`);
    } else {
      console.log(`\n⚠️  Migration recommended to fix mixed network configurations.`);
      console.log(`These servers have both EVM and SVM networks selected but only one recipient type.`);
      console.log(`The fix will work, but they will only enforce payments on the networks that match their recipient type.`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeMigration();
