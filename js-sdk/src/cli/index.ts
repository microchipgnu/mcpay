#!/usr/bin/env node

import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import packageJson from '../../package.json';
import { createServerConnections, ServerType, startStdioServer } from '../server/stdio/start-stdio-server';
import type { X402ClientConfig } from "../client/with-x402-client";
import { createSigner } from "x402/types";

config();

interface ServerOptions {
  urls: string;
  apiKey?: string;
  x402MaxAtomic?: string;
  evm?: string;
  svm?: string;
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
  .action(async (options: ServerOptions) => {
    try {
      const apiKey = options.apiKey || process.env.API_KEY;
      const maxAtomicArg = options.x402MaxAtomic || process.env.X402_MAX_ATOMIC;
      const evmPkArg = options.evm || process.env.EVM_PRIVATE_KEY;
      const svmSkArg = options.svm || process.env.SVM_SECRET_KEY;
      
      if (!apiKey && !evmPkArg && !svmSkArg) {
        console.error('Error: Provide either an API key for proxying or a signer with --evm/--svm (or env EVM_PRIVATE_KEY/SVM_SECRET_KEY).');
        process.exit(1);
      }

      const serverType = ServerType.HTTPStream;
      
      const serverUrls = options.urls.split(',').map((url: string) => url.trim());
      
      if (serverUrls.length === 0) {
        console.error('Error: At least one server URL is required.');
        process.exit(1);
      }
      
      //console.log(`Starting MCP server...`);
      // console.log(`Connecting to ${serverUrls.length} server(s): ${serverUrls.join(', ')}`);

      // Prepare transport options with API key if provided
      const transportOptions = apiKey ? { 
        requestInit: {
          headers: { 
            'Authorization': `Bearer ${apiKey}` 
          }
        }
      } : undefined;
      
      // Optional X402 client configuration
      let x402ClientConfig: X402ClientConfig | undefined = undefined;
      if (evmPkArg || svmSkArg) {
        const walletObj: Record<string, unknown> = {};
        if (evmPkArg) {
          const pk = evmPkArg.trim();
          if (!pk.startsWith('0x') || pk.length !== 66) {
            console.error('Invalid --evm private key. Must be 0x-prefixed 64-hex.');
            process.exit(1);
          }
          walletObj.evm = await createSigner("base-sepolia", pk);
        }

        if (svmSkArg) {
          const sk = svmSkArg.trim();
          if (!sk) {
            console.error('Invalid --svm secret key.');
            process.exit(1);
          }
          walletObj.svm = await createSigner("solana-devnet", sk);
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
      
      const serverConnections = createServerConnections(serverUrls, serverType, transportOptions);
      
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