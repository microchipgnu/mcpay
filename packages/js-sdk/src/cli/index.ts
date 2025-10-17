#!/usr/bin/env node

import { Command } from "commander";
import { config } from "dotenv";
import { createSigner } from "x402/types";
import packageJson from '../../package.json' with { type: 'json' };
import type { X402ClientConfig } from "../client/with-x402-client.js";
import { ServerType, startStdioServer } from '../server/stdio/start-stdio-server.js';
import {  SupportedEVMNetworks,  SupportedSVMNetworks } from "x402/types";

config();

interface ServerOptions {
  urls: string;
  apiKey?: string;
  x402MaxAtomic?: string;
  evm?: string;
  svm?: string;
  evmNetwork?: string;
  svmNetwork?: string;
  authMode?: string;
  autopay?: boolean; // commander will set false if --no-autopay
  x420?: boolean;
}

const program = new Command();

program
  .name('mcpay')
  .description('MCPay CLI - MCP servers with payment capabilities')
  .version(packageJson.version);

program
  .command('connect')
  .description('Start an MCP stdio server with payment transport')
  .requiredOption('-u, --urls <urls>', 'Comma-separated list of server URLs')
  .option('-a, --api-key <key>', 'API key for authentication (or set API_KEY env var). Get yours at https://mcpay.tech')
  .option('--max-atomic <value>', 'Max payment in atomic units (e.g. 100000 for 0.1 USDC). Env: X402_MAX_ATOMIC')
  .option('--evm <privateKey>', 'EVM private key (0x...) (env: EVM_PRIVATE_KEY)')
  .option('--svm <secretKey>', 'SVM secret key (base58/hex) (env: SVM_SECRET_KEY)')
  .option('--evm-network <network>', 'EVM network (base-sepolia, base, avalanche-fuji, avalanche, iotex, sei, sei-testnet). Default: base-sepolia (env: EVM_NETWORK)')
  .option('--svm-network <network>', 'SVM network (solana-devnet, solana). Default: solana-devnet (env: SVM_NETWORK)')
  .option('--auth-mode <mode>', 'Auth mode for proxy: auto|api-key|mcp-auth|none (default: auto)')
  .option('--no-autopay', 'Disable proxy-side auto-payment (skip X402 wallet hook)')
  .option('--x420', 'Request HTTP 420 on x402 errors instead of 200 JSON')
  .action(async (options: ServerOptions) => {
    try {
      const apiKey = options.apiKey || process.env.API_KEY;
      const maxAtomicArg = options.x402MaxAtomic || process.env.X402_MAX_ATOMIC;
      const evmPkArg = options.evm || process.env.EVM_PRIVATE_KEY;
      const svmSkArg = options.svm || process.env.SVM_SECRET_KEY;
      const evmNetwork = (options.evmNetwork || process.env.EVM_NETWORK || 'base-sepolia') as typeof SupportedEVMNetworks[number];
      const svmNetwork = (options.svmNetwork || process.env.SVM_NETWORK || 'solana-devnet') as typeof SupportedSVMNetworks[number];

      if (!apiKey && !evmPkArg && !svmSkArg) {
        console.error('Error: Provide either an API key for proxying or a signer with --evm/--svm (or env EVM_PRIVATE_KEY/SVM_SECRET_KEY).');
        process.exit(1);
      }

      // Validate networks only for wallet types that are provided
      const supportedEvmNetworks = SupportedEVMNetworks;
      const supportedSvmNetworks = SupportedSVMNetworks;

      if (evmPkArg && !supportedEvmNetworks.includes(evmNetwork)) {
        console.error(`Error: Invalid EVM network '${evmNetwork}'. Supported networks: ${supportedEvmNetworks.join(', ')}`);
        process.exit(1);
      }

      if (svmSkArg && !supportedSvmNetworks.includes(svmNetwork)) {
        console.error(`Error: Invalid SVM network '${svmNetwork}'. Supported networks: ${supportedSvmNetworks.join(', ')}`);
        process.exit(1);
      }

      const serverType = ServerType.HTTPStream;

      const serverUrls = options.urls.split(',').map((url: string) => url.trim());

      if (serverUrls.length === 0) {
        console.error('Error: At least one server URL is required.');
        process.exit(1);
      }

      // Determine if we're using proxy mode or direct mode
      // API keys can be used with any proxy endpoint, not just mcpay.tech
      const isProxyMode = apiKey && serverUrls.some(url => 
        url.includes('/v1/mcp') || url.includes('mcpay.tech') || url.includes('proxy')
      );

      // API key can only be used with proxy mode
      if (apiKey && !isProxyMode) {
        console.error('Error: API key can only be used with proxy URLs (containing /v1/mcp, mcpay.tech, or proxy). Use --evm/--svm for direct payments to other servers.');
        process.exit(1);
      }
      
      // Create individual server connections with appropriate transport options
      // Only apply API key authentication to proxy URLs
      const serverConnections = serverUrls.map(url => {
        const isProxyUrl = url.includes('/v1/mcp') || url.includes('mcpay.tech') || url.includes('proxy');
        
        const headers = new Headers();
        // Control-plane headers
        if (options.authMode) headers.set('x-mcpay-auth-mode', String(options.authMode));
        if (options.autopay === false) headers.set('x-mcpay-autopay', 'off');
        if (options.x420) headers.set('x-mcpay-402-mode', 'x420');
        // API key only to proxy URLs
        if (apiKey && isProxyUrl) headers.set('x-api-key', apiKey);

        const transportOptions: any = {
          requestInit: {
            credentials: 'include',
            headers,
          }
        };
        
        return {
          url,
          serverType,
          transportOptions
        };
      });

      // Optional X402 client configuration (only when not using API key)
      let x402ClientConfig: X402ClientConfig | undefined = undefined;
      if (!apiKey && (evmPkArg || svmSkArg)) {
        const walletObj: Record<string, unknown> = {};
        
        if (evmPkArg) {
          const pk = evmPkArg.trim();
          if (!pk.startsWith('0x') || pk.length !== 66) {
            console.error('Error: Invalid --evm private key. Must be 0x-prefixed 64-hex.');
            process.exit(1);
          }
          
          try {
            walletObj.evm = await createSigner(evmNetwork, pk);
          } catch (error) {
            console.error(`Error: Failed to create EVM signer for network '${evmNetwork}':`, error instanceof Error ? error.message : String(error));
            process.exit(1);
          }
        }

        if (svmSkArg) {
          const sk = svmSkArg.trim();
          if (!sk) {
            console.error('Error: Invalid --svm secret key.');
            process.exit(1);
          }
          
          try {
            walletObj.svm = await createSigner(svmNetwork, sk);
          } catch (error) {
            console.error(`Error: Failed to create SVM signer for network '${svmNetwork}':`, error instanceof Error ? error.message : String(error));
            process.exit(1);
          }
        }

        const maybeMax = maxAtomicArg ? (() => { try { return BigInt(maxAtomicArg); } catch { return undefined; } })() : undefined;

        x402ClientConfig = {
          wallet: walletObj as X402ClientConfig['wallet'],
          ...(maybeMax !== undefined ? { maxPaymentValue: maybeMax } : {}),
          confirmationCallback: async (payment) => {
            return true;
          }
        };
      }

      await startStdioServer({
        serverConnections,
        x402ClientConfig,
      });

    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log('mcpay-sdk version ' + packageJson.version);
  });

// Parse command line arguments
program.parse();

// If no command was provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 