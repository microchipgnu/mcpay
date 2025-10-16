import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { SSEClientTransportOptions } from "@modelcontextprotocol/sdk/client/sse.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import packageJson from '../../../package.json' with { type: 'json' };
import { withX402Client, type X402ClientConfig } from "../../client/with-x402-client.js";
import { proxyServer } from "./proxy-server.js";

export enum ServerType {
    HTTPStream = "HTTPStream",
}

export interface ServerConnection {
    url: string;
    serverType: ServerType;
    transportOptions?: SSEClientTransportOptions | StreamableHTTPClientTransportOptions;
    client?: Client;
}

/**
 * Enhanced proxy server that connects to multiple MCP servers and exposes them via a stdio interface
 */
export const startStdioServer = async ({
    initStdioServer,
    initStreamClient,
    serverConnections,
    x402ClientConfig,
}: {
    initStdioServer?: () => Promise<Server>;
    initStreamClient?: () => Promise<Client>;
    serverConnections: ServerConnection[];
    x402ClientConfig?: X402ClientConfig;
}): Promise<Server[]> => {
    if (serverConnections.length === 0) {
        throw new Error("No server connections provided");
    }

    // Connect to all servers
    const connectedClients: Client[] = [];

    for (const connection of serverConnections) {
        let transport: SSEClientTransport | StreamableHTTPClientTransport;

        transport = new StreamableHTTPClientTransport(
            new URL(connection.url),
            connection.transportOptions,
        );

        let streamClient: Client;

        if (connection.client) {
            streamClient = connection.client;
        } else if (initStreamClient) {
            streamClient = await initStreamClient();
        } else {
            streamClient = new Client(
                {
                    name: "mcpay-cli",
                    version: packageJson.version,
                },
                {
                    capabilities: {},
                },
            );
        }

        
        
        await streamClient.connect(transport);
        
        // Optionally wrap the client with X402 payment capabilities
        const wrappedClient = x402ClientConfig
            ? (withX402Client(streamClient, x402ClientConfig) as Client)
            : streamClient;


        connectedClients.push(wrappedClient);
    }

    // We know there's at least one client because we check at the start
    // TypeScript doesn't understand our check above, so we'll assert that connectedClients[0] exists

    const servers: Server[] = [];

    for (const client of connectedClients) {
        const serverVersion = client.getServerVersion() as {
            name: string;
            version: string;
        };

        const serverCapabilities = client.getServerCapabilities() as {
            capabilities: Record<string, unknown>;
        };

        // Create the stdio server
        const stdioServer = initStdioServer
            ? await initStdioServer()
            : new Server(serverVersion, {
                capabilities: serverCapabilities,
            });

        const stdioTransport = new StdioServerTransport();
        await stdioServer.connect(stdioTransport);

        // Set up proxies for all connected clients
        // Start with primary client
        await proxyServer({
            client,
            server: stdioServer,
            serverCapabilities,
        });

        // Set up any additional clients if needed
        // This is where you could add logic to distribute requests across servers
        // or handle specific capabilities from different servers

        servers.push(stdioServer);
    }

    return servers;
};

/**
 * Creates server connection configurations from a list of URLs
 */
export const createServerConnections = (
    urls: string[],
    serverType: ServerType = ServerType.HTTPStream,
    transportOptions: StreamableHTTPClientTransportOptions = {}
): ServerConnection[] => {
    return urls.map(url => ({
        url,
        serverType,
        transportOptions,
    }));
};