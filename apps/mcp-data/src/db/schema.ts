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

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ts: timestamp('ts', { withTimezone: true }).defaultNow(),
    requestId: text('request_id').unique(),
    serverId: uuid('server_id').references(() => mcpServers.id),
    origin: text('origin'),
    kind: text('kind'),
    method: text('method'),
    statusCode: integer('status_code'),
    latencyMs: integer('latency_ms'),
    errorCode: text('error_code'),
    payment: jsonb('payment').$type<unknown>().default({}),
    meta: jsonb('meta').$type<unknown>().default({}),
  },
  (table) => [
    index('idx_events_origin_ts').on(table.origin, table.ts),
    index('idx_events_server_ts').on(table.serverId, table.ts),
    index('idx_events_kind_ts').on(table.kind, table.ts),
    index('idx_events_meta').using('gin', table.meta),
    index('idx_events_payment').using('gin', table.payment),
  ]
);


