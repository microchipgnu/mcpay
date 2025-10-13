<!-- d73ca5be-e589-4210-a90a-138bb82fbd5f 4bda7b4c-c97b-4a42-8caf-6316df5a7b33 -->
# MCP Data App — Postgres (Neon‑ready) Registry + Generic Events, No Ownership

## Overview
- New app: `apps/mcp-data` for indexing, analytics ingestion, and queries.
- Registry: Postgres is the source of truth with flexible JSONB (no ownership model). All MCP resources (tools, resources, pricing, capabilities) live inside the server doc.
- Events: Generic event stream table (not tool‑call specific). Start on Neon with vanilla Postgres; Enable TimescaleDB without changing producers.
- Optional cache: keep Upstash Redis for proxy hot‑path only; authoritative data is Postgres.

## Storage Design (Drizzle + raw SQL where needed)
- `mcp_servers` (document‑like with JSONB)
  - id uuid pk DEFAULT gen_random_uuid()  // via `pgcrypto`
  - origin text UNIQUE
  - title text, description text, require_auth boolean
  - tags jsonb DEFAULT '[]'::jsonb
  - recipients jsonb, receiver_by_network jsonb
  - tools jsonb DEFAULT '[]'::jsonb  // array of objects: { name, description?, pricing?, metadata? }
  - resources jsonb DEFAULT '[]'::jsonb  // array of objects: { type, key, data?, description?, metadata? }
  - capabilities jsonb DEFAULT '{}'::jsonb, metadata jsonb DEFAULT '{}'::jsonb
  - status text, last_seen_at timestamptz, indexed_at timestamptz, created_at/updated_at
  - Indexes: btree(origin), GIN(tags), GIN(capabilities), GIN(metadata), GIN(tools), GIN(resources)

- `events` (generic append‑only time‑series)
  - id uuid pk DEFAULT gen_random_uuid(), ts timestamptz DEFAULT now(), request_id text UNIQUE
  - server_id uuid REFERENCES mcp_servers(id), origin text
  - kind text  // 'mcp.request' | 'mcp.response' | 'tool.call' | 'verify' | 'settle' | 'discovery' | 'health' | 'proxy' | ...
  - method text, status_code int, latency_ms int, error_code text
  - payment jsonb DEFAULT '{}'::jsonb  // x402 fields
  - meta jsonb DEFAULT '{}'::jsonb     // raw payload/headers/envelope fragments
  - Indexes: (origin, ts), (server_id, ts), (kind, ts), UNIQUE(request_id), GIN(meta), GIN(payment)

Notes:
- Use `jsonb` columns that store arrays, not `jsonb[]` (Drizzle/PG best‑practice).
- Enable `pgcrypto` and use `gen_random_uuid()` (Neon‑friendly) instead of `uuid-ossp`.

## Time‑series Scale Options
- Vanilla (Neon default):
  - Declarative monthly partitions via raw SQL migration:
    - `CREATE TABLE events (...) PARTITION BY RANGE (ts);`
    - `CREATE TABLE events_YYYY_MM PARTITION OF events FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');`
  - Add a tiny scheduler (cron/node-cron) to auto‑create next month’s partition.
- Timescale (later): `CREATE EXTENSION IF NOT EXISTS timescaledb;` then `create_hypertable('events','ts', ...)`.
- Citus (later): `CREATE EXTENSION IF NOT EXISTS citus;` then `create_distributed_table('events','server_id')`.
- Gate with `ANALYTICS_BACKEND=vanilla|timescale|citus`; run init SQL idempotently.

## New App: `apps/mcp-data`
- `src/server.ts`
  - `POST /ingest/event` → insert into `events` with `ON CONFLICT (request_id) DO NOTHING`; batch up to ~500 rows per Neon guidance.
  - `POST /index/run` → probe origin, `tools/list` + `resources/list`, update `mcp_servers` JSONB.
  - `GET /events/summary?origin=...` → derived payments + counts over `events`.
  - `GET /servers?query=...` → JSONB filters over `mcp_servers`.
- `src/indexer/*` → health/discovery, enrich pricing/capabilities, upsert doc.
- `src/db/*` → Drizzle PG; optional Redis helper to refresh proxy cache.

## Proxy Integration
- `packages/js-sdk`: add `AnalyticsHook` that emits generic events (request/response, tool calls, payments if present).
- Update proxy glue so analytics runs for all JSON requests (not only `tools/call`): add a lightweight request/response tap when bypassing tool‑specific path.
- `apps/mcp2/src/index.ts`: include `AnalyticsHook` next to `LoggingHook` and `X402MonetizationHook`.

## Payments (derived from events)
- No separate ledger; compute from `events` where `payment` fields exist or `kind IN ('verify','settle','tool.call')`.
- Example queries by origin:
  - Paid calls: `WHERE origin=$1 AND (payment->>'payer') IS NOT NULL AND COALESCE((payment->>'success')::boolean, false)`.
  - Revenue estimate: sum network‑specific amounts stored in `payment`; or count × fixed price when applicable.
  - Error rates: `WHERE origin=$1 AND error_code IS NOT NULL`.

## Provider Compatibility
- Neon: supported (JSONB, GIN, partitions, `pgcrypto`). Add Timescale


## Performance & Ops
- Use partial GIN indexes (e.g., `jsonb_path_ops`) where useful; consider materialized views for heavy summaries.
- Batch ingestion ≤500 rows; exponential backoff on failures; drop non‑critical fields if needed.
- Idempotency via `request_id` dedupe.
- Partition rotation cron; alert if next partition is missing.
- Add `pgvector` for capability embeddings on `mcp_servers`.

## To‑dos
- [ ] Scaffold `apps/mcp-data` service and env
- [ ] Implement Drizzle schema (mcp_servers JSONB + events) using `jsonb` arrays and `pgcrypto`
- [ ] Add raw SQL migrations: base tables, indexes, vanilla monthly partitions, partition rotation job
- [ ] Gate Timescale init SQL behind `ANALYTICS_BACKEND`
- [ ] Implement `AnalyticsHook` (all JSON requests) and wire into `apps/mcp2`
- [ ] Implement `/ingest/event` with batching, `ON CONFLICT DO NOTHING`, retries
- [ ] Build indexer (probe + tools/resources refresh) writing to JSONB doc
- [ ] Implement summary and search endpoints
- [ ] pgvector for search; optional Redis cache refresh after index

### To-dos

- [ ] Scaffold apps/mcp-data service and env
- [ ] Create Drizzle schema for servers JSONB + events with pgcrypto
- [ ] Write raw SQL migrations: tables, indexes, monthly partitions, rotation cron
- [ ] Gate Timescale/Citus init SQL by ANALYTICS_BACKEND
- [ ] Implement AnalyticsHook for all JSON requests and wire into mcp2
- [ ] Implement /ingest/event with batching and dedupe
- [ ] Build indexer to probe, list tools/resources, update servers doc
- [ ] Add summary and search endpoints
- [ ] Optional pgvector for capabilities search