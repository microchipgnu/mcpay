#!/usr/bin/env node

import { Command } from "commander";
import { config } from "dotenv";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import packageJson from '../../package.json';
import { createServerConnections, ServerType, startStdioServer } from '../server/stdio/start-stdio-server';

config();

interface ServerOptions {
  urls: string;
  privateKey?: string;
  apiKey?: string;
}

const program = new Command();

program
  .name('mcpay')
  .description('MCPay CLI - MCP servers with payment capabilities')
  .version(packageJson.version);

program
  .command('server')
  .description('Start an MCP stdio server with payment transport')
  .requiredOption('-u, --urls <urls>', 'Comma-separated list of server URLs')
  .option('-k, --private-key <key>', 'Private key for wallet (or set PRIVATE_KEY env var)')
  .option('-a, --api-key <key>', 'API key for authentication (or set API_KEY env var). Get yours at https://mcpay.tech')
  .action(async (options: ServerOptions) => {
    try {
      const privateKeyString = options.privateKey || process.env.PRIVATE_KEY;
      const apiKey = options.apiKey || process.env.API_KEY;
      
      if (!privateKeyString && !apiKey) {
        console.error('Error: Either a private key or API key is required. Use --private-key/--api-key or set PRIVATE_KEY/API_KEY environment variables.');
        process.exit(1);
      }

      let account;
      let serverType: ServerType;
      
      if (privateKeyString) {
        // Validate and cast to Hex type
        if (!privateKeyString.startsWith('0x') || privateKeyString.length !== 66) {
          console.error('Error: Private key must be a valid hex string starting with 0x and 64 characters long.');
          process.exit(1);
        }

        const privateKey = privateKeyString as Hex;
        account = privateKeyToAccount(privateKey);
        serverType = ServerType.Payment;
        // console.log('Using payment transport (private key provided)');
      } else {
        serverType = ServerType.HTTPStream;
        // console.log('Using HTTP transport (no private key provided)');
      }

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
      
      const serverConnections = createServerConnections(serverUrls, serverType, transportOptions);
      
      await startStdioServer({
        serverConnections,
        account,
      });

      // console.log(`Successfully connected to ${serverUrls.length} servers`);
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