import { pgTable, text, uuid, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const mcpServers = pgTable(
  'mcp_servers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // origin_raw is the full unredacted URL (may include secrets in query)
    originRaw: text('origin_raw').notNull().unique(),
    // origin is a sanitized display variant (no query/fragment)
    origin: text('origin').notNull(),
    // Consolidated JSON blob for most server attributes (title, tags, tools, resources, capabilities, metadata, etc.)
    data: jsonb('data').$type<unknown>().default({}),
    status: text('status'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    indexedAt: timestamp('indexed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // GIN index on data for flexible JSONB search (e.g., tags/title/capabilities)
    index('idx_mcp_servers_data').using('gin', table.data),
  ]
);

export const rpcLogs = pgTable(
  'rpc_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow(),
    // Linkage and addressing
    serverId: uuid('server_id').references(() => mcpServers.id),
    originRaw: text('origin_raw'),
    origin: text('origin'),
    // JSON-RPC extracted fields
    jsonrpcId: text('jsonrpc_id'),
    method: text('method'),
    durationMs: integer('duration_ms'),
    errorCode: text('error_code'),
    httpStatus: integer('http_status'),
    // Raw payloads
    request: jsonb('request').$type<unknown>().default({}),
    response: jsonb('response').$type<unknown>().default({}),
    meta: jsonb('meta').$type<unknown>().default({}),
  },
  (table) => [
    index('idx_rpc_logs_origin_ts').on(table.origin, table.ts),
    index('idx_rpc_logs_server_ts').on(table.serverId, table.ts),
    index('idx_rpc_logs_method_ts').on(table.method, table.ts),
    index('idx_rpc_logs_request').using('gin', table.request),
    index('idx_rpc_logs_response').using('gin', table.response),
  ]
);


