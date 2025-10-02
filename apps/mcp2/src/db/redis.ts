import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { config } from 'dotenv';

config();


// Environment variables for Upstash Redis connection
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing required Upstash Redis environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
}

// Upstash Redis client configuration
const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

// Key prefixes for organization
const KEYS = {
  SERVER: 'mcp:server:',
  SERVER_BY_ORIGIN: 'mcp:origin:',
  TOOLS: 'mcp:tools:',
  AUDIT: 'mcp:audit:',
  SERVER_IDS_SET: 'mcp:server_ids',
} as const;

// Validation schemas
const StoredToolSchema = z.object({
  name: z.string(),
  pricing: z.string(), // Simplified to just a string like "$0.01"
});

const RecipientSchema = z.object({
  evm: z.object({
    address: z.string(),
    isTestnet: z.boolean().optional(),
  }).optional(),
  svm: z.object({
    address: z.string(),
    isTestnet: z.boolean().optional(),
  }).optional(),
});

const StoredServerConfigSchema = z.object({
  id: z.string(),
  mcpOrigin: z.string(),
  requireAuth: z.boolean().optional(),
  authHeaders: z.record(z.string(), z.string()).optional(),
  // Support both old and new recipient formats for backwards compatibility
  receiverAddressByNetwork: z.record(z.string(), z.string()).optional(),
  recipient: RecipientSchema.optional(),
  tools: z.array(StoredToolSchema).optional(),
  // Server metadata for additional information
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const StoreShapeSchema = z.object({
  serversById: z.record(z.string(), StoredServerConfigSchema),
  serverIdByOrigin: z.record(z.string(), z.string()),
});

// Types
export type StoredTool = z.infer<typeof StoredToolSchema>;
export type StoredServerConfig = z.infer<typeof StoredServerConfigSchema>;
export type StoreShape = z.infer<typeof StoreShapeSchema>;

// Redis store class
export class RedisMcpStore {
  private redis: Redis;

  constructor(redisInstance?: Redis) {
    this.redis = redisInstance || redis;
  }

  // Initialize Redis connection (Upstash Redis is stateless, no connection needed)
  async connect(): Promise<void> {
    try {
      // Test the connection with a ping
      await this.redis.ping();
      console.log(`[${new Date().toISOString()}] Upstash Redis connected successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Upstash Redis connection failed:`, error);
      throw error;
    }
  }

  // Load all data from Redis
  async loadStore(): Promise<StoreShape> {
    try {
      // Try to use SMEMBERS first (new optimized approach)
      let serverIds = await this.redis.smembers(KEYS.SERVER_IDS_SET);
      
      // If the set is empty, fall back to keys() and migrate existing data
      if (serverIds.length === 0) {
        console.log(`[${new Date().toISOString()}] SERVER_IDS_SET is empty during loadStore, migrating existing data...`);
        await this.migrateExistingServersToSet();
        serverIds = await this.redis.smembers(KEYS.SERVER_IDS_SET);
      }
      
      const serversById: Record<string, StoredServerConfig> = {};
      const serverIdByOrigin: Record<string, string> = {};

      // Load all servers
      for (const serverId of serverIds) {
        const serverData = await this.redis.get(`${KEYS.SERVER}${serverId}`);
        
        if (serverData) {
          try {
            const parsed = typeof serverData === 'string' ? JSON.parse(serverData) : serverData;
            const validated = StoredServerConfigSchema.parse(parsed);
            serversById[serverId] = validated;
            serverIdByOrigin[validated.mcpOrigin] = serverId;
          } catch (error) {
            console.warn(`[${new Date().toISOString()}] Invalid server data for ${serverId}:`, error);
          }
        }
      }

      console.log(`[${new Date().toISOString()}] Loaded ${Object.keys(serversById).length} servers from Redis`);
      return { serversById, serverIdByOrigin };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error loading store from Redis:`, error);
      return { serversById: {}, serverIdByOrigin: {} };
    }
  }

  // Save server configuration
  async upsertServerConfig(input: Partial<StoredServerConfig> & { id: string; mcpOrigin: string }): Promise<StoredServerConfig> {
    try {
      // Get existing server or create new one
      const existingData = await this.redis.get(`${KEYS.SERVER}${input.id}`);
      const current = existingData ? (typeof existingData === 'string' ? JSON.parse(existingData) : existingData) : { id: input.id, mcpOrigin: input.mcpOrigin };

      // Merge configurations
      const merged: StoredServerConfig = {
        ...current,
        ...input,
        authHeaders: { ...(current.authHeaders ?? {}), ...(input.authHeaders ?? {}) },
        receiverAddressByNetwork: { ...(current.receiverAddressByNetwork ?? {}), ...(input.receiverAddressByNetwork ?? {}) },
        recipient: input.recipient ?? current.recipient,
        tools: input.tools ?? current.tools ?? [],
        metadata: { ...(current.metadata ?? {}), ...(input.metadata ?? {}) },
      };

      // Validate before saving
      const validated = StoredServerConfigSchema.parse(merged);

      // Save to Redis with expiration (30 days = 30 * 24 * 60 * 60 seconds)
      const expirationSeconds = 30 * 24 * 60 * 60;
      
      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.setex(`${KEYS.SERVER}${merged.id}`, expirationSeconds, JSON.stringify(validated));
      pipeline.setex(`${KEYS.SERVER_BY_ORIGIN}${merged.mcpOrigin}`, expirationSeconds, merged.id);
      
      // Add server ID to the set for efficient listing
      pipeline.sadd(KEYS.SERVER_IDS_SET, merged.id);
      
      // Save tools separately for better performance
      if (merged.tools && merged.tools.length > 0) {
        pipeline.setex(`${KEYS.TOOLS}${merged.id}`, expirationSeconds, JSON.stringify(merged.tools));
      }

      await pipeline.exec();

      // Log the operation
      await this.logAudit('upsert', 'server', merged.id, { action: 'upsert_server', serverId: merged.id });

      return validated;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error upserting server config:`, error);
      throw error;
    }
  }

  // Get server by ID
  async getServerById(id: string): Promise<StoredServerConfig | null> {
    try {
      const data = await this.redis.get(`${KEYS.SERVER}${id}`);
      if (!data) return null;
      
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return StoredServerConfigSchema.parse(parsed);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting server by ID:`, error);
      return null;
    }
  }

  // Get server by origin
  async getServerByOrigin(origin: string): Promise<StoredServerConfig | null> {
    try {
      const serverId = await this.redis.get(`${KEYS.SERVER_BY_ORIGIN}${origin}`);
      if (!serverId) return null;
      
      return await this.getServerById(serverId as string);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting server by origin:`, error);
      return null;
    }
  }

  // Get all servers (for listing)
  async getAllServers(): Promise<Array<{ id: string; url: string }>> {
    try {
      // Try to use SMEMBERS first (new optimized approach)
      let serverIds = await this.redis.smembers(KEYS.SERVER_IDS_SET);
      
      // If the set is empty, fall back to keys() and migrate existing data
      if (serverIds.length === 0) {
        console.log(`[${new Date().toISOString()}] SERVER_IDS_SET is empty, migrating existing data...`);
        await this.migrateExistingServersToSet();
        serverIds = await this.redis.smembers(KEYS.SERVER_IDS_SET);
      }
      
      const servers = [];

      for (const serverId of serverIds) {
        const server = await this.getServerById(serverId);
        if (server) {
          servers.push({
            id: serverId,
            url: `https://mcp2.mcpay.tech/mcp?id=${serverId}`
          });
        }
      }

      return servers;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error getting all servers:`, error);
      return [];
    }
  }

  // Delete server
  async deleteServer(id: string): Promise<boolean> {
    try {
      const server = await this.getServerById(id);
      if (!server) return false;

      const pipeline = this.redis.pipeline();
      pipeline.del(`${KEYS.SERVER}${id}`);
      pipeline.del(`${KEYS.SERVER_BY_ORIGIN}${server.mcpOrigin}`);
      pipeline.del(`${KEYS.TOOLS}${id}`);
      
      // Remove server ID from the set
      pipeline.srem(KEYS.SERVER_IDS_SET, id);
      
      await pipeline.exec();
      
      await this.logAudit('delete', 'server', id, { action: 'delete_server', serverId: id });
      return true;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error deleting server:`, error);
      return false;
    }
  }

  // Migrate existing servers to use the SERVER_IDS_SET
  private async migrateExistingServersToSet(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Starting migration of existing servers to SERVER_IDS_SET...`);
      
      // Use keys() to find existing server keys (one-time operation for migration)
      const serverKeys = await this.redis.keys(`${KEYS.SERVER}*`);
      
      if (serverKeys.length === 0) {
        console.log(`[${new Date().toISOString()}] No existing servers found to migrate`);
        return;
      }
      
      // Add all existing server IDs to the set
      const serverIds = serverKeys.map(key => key.replace(KEYS.SERVER, ''));
      
      if (serverIds.length > 0) {
        // Add server IDs to the set one by one to avoid spread operator issues
        const pipeline = this.redis.pipeline();
        for (const serverId of serverIds) {
          pipeline.sadd(KEYS.SERVER_IDS_SET, serverId);
        }
        await pipeline.exec();
        console.log(`[${new Date().toISOString()}] Migrated ${serverIds.length} servers to SERVER_IDS_SET`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error migrating existing servers:`, error);
    }
  }

  // Audit logging
  async logAudit(action: string, tableName: string, recordId: string, details?: any): Promise<void> {
    try {
      const auditEntry = {
        action,
        tableName,
        recordId,
        timestamp: new Date().toISOString(),
        details: details ? JSON.stringify(details) : null,
      };

      await this.redis.lpush(
        `${KEYS.AUDIT}${Date.now()}`,
        JSON.stringify(auditEntry)
      );

      // Keep only last 1000 audit entries
      await this.redis.ltrim(`${KEYS.AUDIT}`, 0, 999);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error logging audit:`, error);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Redis health check failed:`, error);
      return false;
    }
  }

  // Close connection (Upstash Redis is stateless, no disconnection needed)
  async disconnect(): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Upstash Redis disconnected (stateless)`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error disconnecting Redis:`, error);
    }
  }
}

// Export singleton instance
export const redisStore = new RedisMcpStore();
export default redisStore;
