-- Enable pgcrypto for gen_random_uuid (Neon-friendly)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- mcp_servers: document-like registry
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  require_auth TEXT,
  tags JSONB NOT NULL DEFAULT '[]',
  recipients JSONB NOT NULL DEFAULT '{}',
  receiver_by_network JSONB NOT NULL DEFAULT '{}',
  tools JSONB NOT NULL DEFAULT '[]',
  resources JSONB NOT NULL DEFAULT '[]',
  capabilities JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  status TEXT,
  last_seen_at TIMESTAMPTZ,
  indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_origin ON mcp_servers(origin);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_tags ON mcp_servers USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_capabilities ON mcp_servers USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_metadata ON mcp_servers USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_tools ON mcp_servers USING GIN (tools);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_resources ON mcp_servers USING GIN (resources);

-- events: generic time-series
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_id TEXT UNIQUE,
  server_id UUID REFERENCES mcp_servers(id),
  origin TEXT,
  kind TEXT,
  method TEXT,
  status_code INT,
  latency_ms INT,
  error_code TEXT,
  payment JSONB NOT NULL DEFAULT '{}',
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_events_origin_ts ON events(origin, ts);
CREATE INDEX IF NOT EXISTS idx_events_server_ts ON events(server_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_kind_ts ON events(kind, ts);
CREATE INDEX IF NOT EXISTS idx_events_meta ON events USING GIN (meta);
CREATE INDEX IF NOT EXISTS idx_events_payment ON events USING GIN (payment);

-- Optional: Declarative partitioning (vanilla). Create parent and first monthly partition.
-- Parent partitioned table (if not already created as plain table above)
-- You can re-run migrations idempotently; skip if already partitioned.
-- ALTER TABLE events PARTITION BY RANGE (ts);
-- CREATE TABLE IF NOT EXISTS events_2025_10 PARTITION OF events FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');


