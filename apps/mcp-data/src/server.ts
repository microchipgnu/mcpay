import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { db } from './db/client.js';
import { events, mcpServers } from './db/schema.js';
import { eq, sql, count, desc, ilike, or, and } from 'drizzle-orm';
import { inspectMcp } from './inspect/mcp.js';

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
    // Keep raw origin, and build a sanitized display origin (strip query and hash)
    const originRaw = origin;
    let displayOrigin = originRaw;
    try {
      const u = new URL(originRaw);
      u.search = '';
      u.hash = '';
      displayOrigin = u.toString();
    } catch {}

    // Perform rich inspection via MCP client (best-effort)
    const inspection = await inspectMcp(originRaw).catch(() => null);

    const now = new Date();
    const doc = {
      originRaw,
      origin: displayOrigin,
      lastSeenAt: now,
      indexedAt: now,
      status: inspection ? 'ok' : 'error',
      data: inspection ?? {},
    };

    // Upsert by origin_raw
    const existing = await db.select().from(mcpServers).where(eq(mcpServers.originRaw, originRaw));
    if (existing.length > 0) {
      await db.update(mcpServers).set(doc).where(eq(mcpServers.originRaw, originRaw));
    } else {
      await db.insert(mcpServers).values(doc);
    }

    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/events/summary', async (c: any) => {
  const origin = c.req.query('origin');
  if (!origin) return c.json({ error: 'missing_origin' }, 400);
  try {
    // Minimal aggregate example: counts per kind for given origin (Drizzle ORM)
    const countCol = count().as('count');
    const rows = await db
      .select({ kind: events.kind, count: countCol })
      .from(events)
      .where(eq(events.origin, origin))
      .groupBy(events.kind)
      .orderBy(desc(countCol));
    return c.json({ origin, byKind: rows as Array<{ kind: string; count: number }> });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/servers', async (c: any) => {
  const query = c.req.query('query')?.trim();
  try {
    if (!query) {
      const rows = await db
        .select({
          id: mcpServers.id,
          origin: mcpServers.origin,
          status: mcpServers.status,
          last_seen_at: mcpServers.lastSeenAt,
        })
        .from(mcpServers)
        .orderBy(desc(mcpServers.lastSeenAt))
        .limit(200);
      return c.json({ servers: rows });
    }
    // Simple case-insensitive match on origin/title and tag include via JSONB
    const q = `%${query}%`;
    const rows = await db
      .select({
        id: mcpServers.id,
        origin: mcpServers.origin,
        status: mcpServers.status,
        last_seen_at: mcpServers.lastSeenAt,
      })
      .from(mcpServers)
      .where(
        or(
          ilike(mcpServers.origin, q),
          // JSONB text search on data -> title or tags within data
          sql`${mcpServers.data}::text ILIKE ${q}`
        )
      )
      .orderBy(desc(mcpServers.lastSeenAt))
      .limit(200);
    return c.json({ servers: rows });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

const port = Number(((globalThis as any).process?.env?.PORT ?? 3010));
serve({ fetch: app.fetch, port }, (info: any) => {
  console.log(`[MCP-DATA] running on http://localhost:${info.port}`);
});


