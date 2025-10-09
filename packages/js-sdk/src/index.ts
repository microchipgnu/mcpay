export { 
    startStdioServer,
    createServerConnections,
    ServerType,
    type ServerConnection 
} from './server/stdio/start-stdio-server.js';

export { proxyServer } from './server/stdio/proxy-server.js';

// Re-export commonly used types from dependencies
export type { Account } from 'viem';
export type { Client } from '@modelcontextprotocol/sdk/client/index.js';
export type { Server } from '@modelcontextprotocol/sdk/server/index.js';
