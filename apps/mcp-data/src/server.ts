import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { db } from './db/client.js';
import { events, mcpServers } from './db/schema.js';
import { eq, sql } from 'drizzle-orm';

const app = new Hono();

app.get('/health', (c: any) => c.json({ ok: true }));

app.post('/ingest/event', async (c: any) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_json' }, 400);

  try {
    const asArray = Array.isArray(body) ? body : [body];
    const rows = asArray.map((payload: any) => ({
      ts: payload.ts ? new Date(payload.ts) : undefined,
      requestId: payload.request_id ?? payload.requestId,
      serverId: payload.server_id ?? payload.serverId,
      origin: payload.origin,
      kind: payload.kind,
      method: payload.method,
      statusCode: typeof payload.status_code === 'number' ? payload.status_code : payload.statusCode,
      latencyMs: typeof payload.latency_ms === 'number' ? payload.latency_ms : payload.latencyMs,
      errorCode: payload.error_code ?? payload.errorCode,
      payment: payload.payment ?? {},
      meta: payload.meta ?? {},
    }));

    if (rows.length === 0) return c.json({ ok: true, inserted: 0 });

    // Insert in chunks of 500 for Neon guidance
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      // @ts-ignore drizzle types allow partial defaulted inserts
      await db.insert(events).values(chunk as any).onConflictDoNothing({ target: events.requestId });
    }
    return c.json({ ok: true, inserted: rows.length });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post('/index/run', async (c: any) => {
  const body = await c.req.json().catch(() => null);
  const origin = body?.origin as string | undefined;
  if (!origin) return c.json({ error: 'missing_origin' }, 400);

  try {
    // Probe origin minimally
    const start = Date.now();
    let health = { status: 'unknown', latencyMs: undefined as number | undefined } as any;
    try {
      const resp = await fetch(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'ping', params: {} }) });
      health.latencyMs = Date.now() - start;
      health.status = resp.ok ? 'ok' : 'error';
    } catch {
      health.latencyMs = Date.now() - start;
      health.status = 'error';
    }

    // Try to list tools
    let tools: any[] = [];
    try {
      const tRes = await fetch(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) });
      const tJson = await tRes.json().catch(() => null) as any;
      const listed = (tJson?.result?.tools ?? tJson?.result ?? []) as any[];
      if (Array.isArray(listed)) tools = listed;
    } catch {}

    // Try to list resources
    let resources: any[] = [];
    try {
      const rRes = await fetch(origin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'resources/list', params: {} }) });
      const rJson = await rRes.json().catch(() => null) as any;
      const listed = (rJson?.result?.resources ?? rJson?.result ?? []) as any[];
      if (Array.isArray(listed)) resources = listed;
    } catch {}

    const now = new Date();
    const doc = {
      origin,
      lastSeenAt: now,
      indexedAt: now,
      status: health.status,
      tools,
      resources,
      metadata: { health },
    } as any;

    // Upsert by origin
    const existing = await db.select().from(mcpServers).where(eq(mcpServers.origin, origin));
    if (existing.length > 0) {
      await db.update(mcpServers).set(doc).where(eq(mcpServers.origin, origin));
    } else {
      await db.insert(mcpServers).values(doc);
    }

    return c.json({ ok: true, health });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/events/summary', async (c: any) => {
  const origin = c.req.query('origin');
  if (!origin) return c.json({ error: 'missing_origin' }, 400);
  try {
    // Minimal aggregate example: counts per kind for given origin
    const rows = await db.execute(
      sql`SELECT kind, COUNT(*)::int AS count FROM events WHERE origin = ${origin} GROUP BY kind ORDER BY count DESC`
    );
    return c.json({ origin, byKind: rows });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/servers', async (c: any) => {
  const query = c.req.query('query')?.trim();
  try {
    if (!query) {
      const rows = await db.execute(
        sql`SELECT id, origin, title, status, last_seen_at FROM mcp_servers ORDER BY last_seen_at DESC NULLS LAST LIMIT 200`
      );
      return c.json({ servers: rows });
    }
    // Simple case-insensitive match on origin/title and tag include via JSONB
    const rows = await db.execute(
      sql`SELECT id, origin, title, status, last_seen_at
          FROM mcp_servers
          WHERE origin ILIKE '%' || ${query} || '%' OR title ILIKE '%' || ${query} || '%' OR (tags::text ILIKE '%' || ${query} || '%')
          ORDER BY last_seen_at DESC NULLS LAST LIMIT 200`
    );
    return c.json({ servers: rows });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

const port = Number(((globalThis as any).process?.env?.PORT ?? 3010));
serve({ fetch: app.fetch, port }, (info: any) => {
  console.log(`[MCP-DATA] running on http://localhost:${info.port}`);
});


