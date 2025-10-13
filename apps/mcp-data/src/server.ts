import { serve } from '@hono/node-server';
import 'dotenv/config';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { Context, Hono } from 'hono';
import { db } from './db/client.js';
import { mcpServers, rpcLogs } from './db/schema.js';
import { inspectMcp } from './inspect/mcp.js';

const app = new Hono();

app.get('/health', (c: Context) => c.json({ ok: true }));

app.post('/ingest/rpc', async (c: Context) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'invalid_json' }, 400);

  try {
    const asArray = Array.isArray(body) ? body : [body];

    const sanitizeOrigin = (raw: string) => {
      try {
        const u = new URL(raw);
        u.search = '';
        u.hash = '';
        return u.toString();
      } catch {
        return raw;
      }
    };

    const parseTimestamp = (input: any): Date | undefined => {
      if (input == null) return undefined;
      if (input instanceof Date) return input;
      if (typeof input === 'number') {
        const ms = input > 1e12 ? input : input * 1000;
        return new Date(ms);
      }
      if (typeof input === 'string') {
        const asNum = Number(input);
        if (!Number.isNaN(asNum)) {
          const ms = asNum > 1e12 ? asNum : asNum * 1000;
          return new Date(ms);
        }
        const d = new Date(input);
        if (!Number.isNaN(d.getTime())) return d;
      }
      return undefined;
    };

    const rows = await Promise.all(
      asArray.map(async (entry: any) => {
        const ts = parseTimestamp(entry.ts ?? entry.timestamp ?? entry.time ?? entry.date);

        const originRaw = entry.origin_raw ?? entry.originRaw ?? entry.origin;
        const origin = originRaw ? sanitizeOrigin(originRaw) : undefined;

        let serverId = entry.server_id ?? entry.serverId;
        if (!serverId && originRaw) {
          const found = await db
            .select({ id: mcpServers.id })
            .from(mcpServers)
            .where(eq(mcpServers.originRaw, originRaw));
          if (found.length > 0) serverId = found[0].id;
        }
        if (!serverId && origin) {
          const found2 = await db
            .select({ id: mcpServers.id })
            .from(mcpServers)
            .where(eq(mcpServers.origin, origin));
          if (found2.length > 0) serverId = found2[0].id;
        }

        const req = entry.request ?? entry.req ?? {};
        const res = entry.response ?? entry.res ?? {};

        const jsonrpcId =
          req?.id ?? res?.id ?? entry.jsonrpc_id ?? entry.jsonrpcId ?? entry.id;
        const method = req?.method ?? entry.method;
        const httpStatus = typeof entry.http_status === 'number' ? entry.http_status : entry.httpStatus;
        const errorCode = res?.error?.code ?? entry.error_code ?? entry.errorCode;
        const durationMsRaw =
          entry.duration_ms ?? entry.durationMs ?? entry.response_time_ms ?? entry.responseTimeMs;
        let durationMs =
          typeof durationMsRaw === 'number'
            ? durationMsRaw
            : typeof durationMsRaw === 'string'
            ? Number(durationMsRaw)
            : undefined;
        if (typeof durationMs === 'number' && Number.isNaN(durationMs)) durationMs = undefined;

        let meta: any = entry.meta ?? entry.metadata ?? {};
        if (meta == null || typeof meta !== 'object') meta = { value: meta };

        return {
          ts,
          serverId,
          originRaw,
          origin,
          jsonrpcId: jsonrpcId != null ? String(jsonrpcId) : undefined,
          method,
          durationMs,
          errorCode: errorCode != null ? String(errorCode) : undefined,
          httpStatus,
          request: req,
          response: res,
          meta,
        };
      })
    );

    if (rows.length === 0) return c.json({ ok: true, inserted: 0 });

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      // @ts-ignore drizzle types allow partial defaulted inserts
      await db.insert(rpcLogs).values(chunk as any);
    }

    return c.json({ ok: true, inserted: rows.length });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.post('/index/run', async (c: Context) => {
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

app.get('/servers', async (c: Context) => {
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

const port = Number(process.env.PORT) ?? 3010;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[MCP-DATA] running on http://localhost:${info.port}`);
});


