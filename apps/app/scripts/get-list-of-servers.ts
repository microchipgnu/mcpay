#!/usr/bin/env tsx

import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, desc } from "drizzle-orm";
import * as schema from "../src/lib/gateway/db/schema";
import { getDatabaseUrl } from '../src/lib/gateway/env';
import type { Network, Price } from "x402/types";

// Types to match the mcp-store.json structure
type StoredTool = {
    name: string;
    pricing: Price | Price[];
};

type StoredServerConfig = {
    id: string;
    mcpOrigin: string;
    requireAuth?: boolean;
    authHeaders?: Record<string, string>;
    receiverAddressByNetwork?: Partial<Record<Network, string>>;
    tools?: StoredTool[];
};

type StoreShape = {
    serversById: Record<string, StoredServerConfig>;
    serverIdByOrigin: Record<string, string>;
};

// Database connection
const pool = new Pool({
    connectionString: getDatabaseUrl(),
    ssl: false
});
const db = drizzle(pool, { schema });

async function getServersFromDatabase(): Promise<StoreShape> {
    console.log('🔍 Fetching servers from database...');
    
    try {
        // Get all active servers with their tools
        const servers = await db.query.mcpServers.findMany({
            where: eq(schema.mcpServers.status, 'active'),
            orderBy: [desc(schema.mcpServers.createdAt)],
            with: {
                tools: {
                    where: eq(schema.mcpTools.status, 'active'),
                    orderBy: [schema.mcpTools.name]
                }
            }
        });

        console.log(`📊 Found ${servers.length} active servers`);

        const serversById: Record<string, StoredServerConfig> = {};
        const serverIdByOrigin: Record<string, string> = {};

        for (const server of servers) {
            console.log(`\n🖥️  Processing server: ${server.name || server.serverId}`);
            console.log(`   ID: ${server.serverId}`);
            console.log(`   Origin: ${server.mcpOrigin}`);
            console.log(`   Tools: ${server.tools?.length || 0}`);

            // Transform tools to match StoredTool format
            const tools: StoredTool[] = [];
            if (server.tools) {
                for (const tool of server.tools) {
                    if (tool.isMonetized && tool.pricing) {
                        // Parse pricing from JSONB
                        let pricing: Price | Price[] = [];
                        try {
                            if (typeof tool.pricing === 'string') {
                                pricing = JSON.parse(tool.pricing);
                            } else if (Array.isArray(tool.pricing)) {
                                pricing = tool.pricing;
                            } else if (tool.pricing && typeof tool.pricing === 'object') {
                                pricing = [tool.pricing as Price];
                            }
                        } catch (error) {
                            console.warn(`   ⚠️  Failed to parse pricing for tool ${tool.name}:`, error);
                            continue;
                        }

                        tools.push({
                            name: tool.name,
                            pricing: pricing
                        });
                    }
                }
            }

            // Build receiver address by network
            // For now, we'll use the single receiverAddress and map it to a default network
            // You might want to extend this based on your specific network requirements
            const receiverAddressByNetwork: Partial<Record<Network, string>> = {};
            if (server.receiverAddress) {
                // Default to base-sepolia for now, but you can extend this logic
                receiverAddressByNetwork['base-sepolia'] = server.receiverAddress;
            }

            const storedServer: StoredServerConfig = {
                id: server.serverId,
                mcpOrigin: server.mcpOrigin,
                requireAuth: server.requireAuth || false,
                authHeaders: server.authHeaders as Record<string, string> || {},
                receiverAddressByNetwork,
                tools: tools.length > 0 ? tools : undefined
            };

            serversById[server.serverId] = storedServer;
            serverIdByOrigin[server.mcpOrigin] = server.serverId;

            console.log(`   ✅ Processed with ${tools.length} monetized tools`);
        }

        return {
            serversById,
            serverIdByOrigin
        };

    } catch (error) {
        console.error('❌ Error fetching servers from database:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('🚀 Starting server list generation...');
        
        const storeData = await getServersFromDatabase();
        
        console.log('\n📋 Generated server list:');
        console.log(`   Total servers: ${Object.keys(storeData.serversById).length}`);
        console.log(`   Total origins: ${Object.keys(storeData.serverIdByOrigin).length}`);
        
        // Display summary
        for (const [serverId, server] of Object.entries(storeData.serversById)) {
            console.log(`\n🖥️  ${serverId}:`);
            console.log(`   Name: ${server.mcpOrigin}`);
            console.log(`   Auth Required: ${server.requireAuth ? 'Yes' : 'No'}`);
            console.log(`   Tools: ${server.tools?.length || 0}`);
            if (server.tools && server.tools.length > 0) {
                console.log(`   Tool Names: ${server.tools.map(t => t.name).join(', ')}`);
            }
        }

        // Optionally save to a file
        const outputPath = './server-list.json';
        const fs = await import('fs/promises');
        await fs.writeFile(outputPath, JSON.stringify(storeData, null, 2));
        console.log(`\n💾 Server list saved to: ${outputPath}`);

        // Also display the JSON structure that would be compatible with mcp-store.json
        console.log('\n📄 JSON Structure (compatible with mcp-store.json):');
        console.log(JSON.stringify(storeData, null, 2));

    } catch (error) {
        console.error('💥 Script failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

export { getServersFromDatabase, type StoreShape, type StoredServerConfig, type StoredTool };
