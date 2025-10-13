import { pgTable, text, uuid, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';

export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  origin: text('origin').notNull().unique(),
  title: text('title'),
  description: text('description'),
  requireAuth: text('require_auth'),
  tags: jsonb('tags').$type<unknown>().default([]),
  recipients: jsonb('recipients').$type<unknown>().default({}),
  receiverByNetwork: jsonb('receiver_by_network').$type<unknown>().default({}),
  tools: jsonb('tools').$type<unknown>().default([]),
  resources: jsonb('resources').$type<unknown>().default([]),
  capabilities: jsonb('capabilities').$type<unknown>().default({}),
  metadata: jsonb('metadata').$type<unknown>().default({}),
  status: text('status'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  indexedAt: timestamp('indexed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  ts: timestamp('ts', { withTimezone: true }).defaultNow(),
  requestId: text('request_id').unique(),
  serverId: uuid('server_id'),
  origin: text('origin'),
  kind: text('kind'),
  method: text('method'),
  statusCode: integer('status_code'),
  latencyMs: integer('latency_ms'),
  errorCode: text('error_code'),
  payment: jsonb('payment').$type<unknown>().default({}),
  meta: jsonb('meta').$type<unknown>().default({}),
});


