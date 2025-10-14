import { serve } from '@hono/node-server';
import 'dotenv/config';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { Context, Hono } from 'hono';
import { db } from './db/client.js';
import { mcpServers, rpcLogs } from './db/schema.js';
import { inspectMcp } from './inspect/mcp.js';
import { cors } from 'hono/cors';

const app = new Hono();
app.use(
  cors({
    origin: (origin) => {
      // Allow all origins, or customize as needed
      return origin ?? "*";
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.get('/health', (c: Context) => c.json({ ok: true }));

app.post('/ingest/rpc', async (c: Context) => {
  const expected = process.env.INGESTION_SECRET;
  if (expected) {
    const auth = c.req.header('authorization') || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const alt = c.req.header('x-api-key') || '';
    const provided = bearer || alt;
    if (!provided || provided !== expected) {
      return c.json({ error: 'unauthorized' }, 401);
    }
  }

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

        const method = req?.method ?? entry.method ?? 'unknown';
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
          method,
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
    // Only strip query/hash if sensitive parameters are present (e.g. API key in query)
    const originRaw = origin;
    let displayOrigin = originRaw;
    try {
      const u = new URL(originRaw);
      // Check for known sensitive keys
      const sensitiveKeys = ['api_key', 'apikey', 'access_token', 'token', 'key', 'auth', 'api-key'];
      const queryKeys = Array.from(u.searchParams.keys()).map(k => k.toLowerCase());
      const hasSensitive = sensitiveKeys.some(k => queryKeys.includes(k));
      if (hasSensitive) {
        u.search = '';
        u.hash = '';
        displayOrigin = u.toString();
      }
    } catch { }

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
  try {
    // Always fetch the most recent 200 servers, no query logic.
    const rows = await db
      .select({
        id: mcpServers.id,
        origin: mcpServers.origin,
        status: mcpServers.status,
        last_seen_at: mcpServers.lastSeenAt,
        data: mcpServers.data,
      })
      .from(mcpServers)
      .orderBy(desc(mcpServers.lastSeenAt))
      .limit(200);

    const servers = rows.map(row => ({
      id: row.id,
      origin: row.origin,
      status: row.status,
      last_seen_at: row.last_seen_at,
      // @ts-ignore
      tools: row.data?.tools || [],
      server: {
        info: {
          // @ts-ignore
          name: row.data?.server?.info?.name || '',
          // @ts-ignore
          description: row.data?.server?.info?.description || '',
          // @ts-ignore
          icon: row.data?.server?.info?.icon || '',
        },
      }
    }));

    return c.json({ servers });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/server/:id', async (c: Context) => {
  const id = c.req.param('id');

  try {
    const rows = await db
      .select({
        id: mcpServers.id,
        origin: mcpServers.origin,
        originRaw: mcpServers.originRaw,
        status: mcpServers.status,
        lastSeenAt: mcpServers.lastSeenAt,
        indexedAt: mcpServers.indexedAt,
        data: mcpServers.data,
      })
      .from(mcpServers)
      .where(eq(mcpServers.id, id));

    if (rows.length === 0) return c.json({ error: 'not_found' }, 404);

    const server = rows[0];

    // Pull recent RPC logs for this server to derive lightweight analytics
    const logs = await db
      .select({
        id: rpcLogs.id,
        ts: rpcLogs.ts,
        method: rpcLogs.method,
        request: rpcLogs.request,
        response: rpcLogs.response,
        meta: rpcLogs.meta,
      })
      .from(rpcLogs)
      .where(eq(rpcLogs.serverId, id))
      .orderBy(desc(rpcLogs.ts))
      .limit(500);

    const toLowerCaseHeaders = (h: unknown): Record<string, unknown> => {
      if (!h || typeof h !== 'object') return {};
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
        out[String(k).toLowerCase()] = v;
      }
      return out;
    };

    const safeBase64Decode = (input: unknown): string | undefined => {
      if (typeof input !== 'string' || input.length === 0) return undefined;
      try {
        const decoded = Buffer.from(input, 'base64').toString('utf8');
        return decoded;
      } catch {
        return undefined;
      }
    };

    const safeJsonParse = (input: unknown): unknown => {
      if (typeof input !== 'string' || input.length === 0) return undefined;
      try {
        return JSON.parse(input);
      } catch {
        return undefined;
      }
    };

    const detectPayment = (req: unknown, res: unknown, meta: unknown) => {
      const request = (req && typeof req === 'object') ? (req as Record<string, unknown>) : {};
      const response = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
      const metaObj = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};

      const headersLc = toLowerCaseHeaders((request as { headers?: unknown }).headers);
      const headerToken = (headersLc['x-payment'] as string | undefined) || undefined;

      const paramsObj = ((request as { params?: unknown }).params && typeof (request as { params?: unknown }).params === 'object'
        ? (request as { params?: Record<string, unknown> }).params
        : undefined);
      const reqMeta = (paramsObj && typeof (paramsObj as any)._meta === 'object'
        ? ((paramsObj as any)._meta as Record<string, unknown>)
        : undefined);
      const reqMetaToken = reqMeta && (reqMeta['x402/payment'] as string | undefined);
      const metaToken = metaObj && (metaObj['x402/payment'] as string | undefined);

      const resMeta = (response._meta as Record<string, unknown> | undefined) || undefined;
      const paymentResponse = resMeta && (resMeta['x402/payment-response'] as Record<string, unknown> | undefined);
      const x402Error = resMeta && (resMeta['x402/error'] as { accepts?: unknown } | undefined);

      const hasPayment = !!paymentResponse;
      const paymentRequestRaw = reqMetaToken || metaToken;
      const paymentRequestDecoded = safeBase64Decode(paymentRequestRaw) ?? paymentRequestRaw;
      const paymentRequestJson = typeof paymentRequestDecoded === 'string' ? safeJsonParse(paymentRequestDecoded) : undefined;
      const paymentRequested = !!((x402Error && Array.isArray(x402Error.accepts)) || paymentRequestRaw);
      const paymentProvided = !!(headerToken || reqMetaToken || metaToken);

      return {
        hasPayment, paymentRequested, paymentProvided, metadata: {
          paymentResponse,
          x402Error,
          paymentRequest: paymentRequestJson,
        }
      };
    };

    // Build summary
    const totalRequests = logs.length;
    const lastActivity = logs[0]?.ts ?? server.lastSeenAt;

    // Derive recent payments from logs where payment response present
    const payments = logs
      .map(l => ({ l, p: detectPayment(l.request, l.response, l.meta) }))
      .filter(x => !!x.p.hasPayment)
      .slice(0, 50)
      .map(x => {
        const pr = x.p.metadata.paymentResponse as any | undefined;
        return {
          id: x.l.id,
          createdAt: x.l.ts,
          status: pr?.success === false ? 'failed' : 'completed',
          network: pr?.network,
          transactionHash: pr?.transaction,
          payer: pr?.payer,
        };
      });

    // Daily analytics: count by day for recent 30 days based on available logs
    const byDay = new Map<string, number>();
    for (const l of logs) {
      const d = new Date(l.ts!);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    const dailyAnalytics = Array.from(byDay.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 30)
      .map(([date, totalRequests]) => ({ date, totalRequests }));

    // Extract basic info and tools from inspection data
    const name = (server.data as any)?.server?.info?.name || '';
    const description = (server.data as any)?.server?.info?.description || '';
    const icon = (server.data as any)?.server?.info?.icon || '';
    const tools = Array.isArray((server.data as any)?.tools) ? (server.data as any).tools : [];

    const payload = {
      serverId: server.id,
      origin: server.origin,
      originRaw: server.originRaw,
      status: server.status,
      lastSeenAt: server.lastSeenAt,
      indexedAt: server.indexedAt,
      info: { name, description, icon },
      tools,
      summary: {
        lastActivity,
        totalTools: Array.isArray(tools) ? tools.length : 0,
        totalRequests,
        totalPayments: payments.length,
      },
      dailyAnalytics,
      recentPayments: payments,
    };

    return c.json(payload);
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

app.get('/explorer', async (c: Context) => {
  // Parse optional ?limit and ?offset query params for pagination
  const limit = Math.max(1, Math.min(100, parseInt(c.req.query('limit') ?? '5', 10))) // default 5, max 100
  const offset = Math.max(0, parseInt(c.req.query('offset') ?? '0', 10))

  // Get total count for pagination metadata
  const [{ count }] = await db.select({ count: sql`count(*)` }).from(rpcLogs);

  // Fetch paginated results
  const rows = await db
    .select({
      id: rpcLogs.id,
      ts: rpcLogs.ts,
      serverId: rpcLogs.serverId,
      origin: rpcLogs.origin,
      originRaw: rpcLogs.originRaw,
      method: rpcLogs.method,
      request: rpcLogs.request,
      response: rpcLogs.response,
      meta: rpcLogs.meta,
      serverData: mcpServers.data,
      serverOrigin: mcpServers.origin,
    })
    .from(rpcLogs)
    .leftJoin(mcpServers, eq(rpcLogs.serverId, mcpServers.id))
    .orderBy(desc(rpcLogs.ts))
    .limit(limit)
    .offset(offset);

  const toLowerCaseHeaders = (h: unknown): Record<string, unknown> => {
    if (!h || typeof h !== 'object') return {};
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
      out[String(k).toLowerCase()] = v;
    }
    return out;
  };

  const safeBase64Decode = (input: unknown): string | undefined => {
    if (typeof input !== 'string' || input.length === 0) return undefined;
    try {
      // decode base64 to utf8; if it fails, return undefined
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      return decoded;
    } catch {
      return undefined;
    }
  };

  const safeJsonParse = (input: unknown): unknown => {
    if (typeof input !== 'string' || input.length === 0) return undefined;
    try {
      return JSON.parse(input);
    } catch {
      return undefined;
    }
  };

  const detectPayment = (req: unknown, res: unknown, meta: unknown) => {
    const request = (req && typeof req === 'object') ? (req as Record<string, unknown>) : {};
    const response = (res && typeof res === 'object') ? (res as Record<string, unknown>) : {};
    const metaObj = (meta && typeof meta === 'object') ? (meta as Record<string, unknown>) : {};

    const headersLc = toLowerCaseHeaders((request as { headers?: unknown }).headers);
    const headerToken = (headersLc['x-payment'] as string | undefined) || undefined;

    const paramsObj = ((request as { params?: unknown }).params && typeof (request as { params?: unknown }).params === 'object'
      ? (request as { params?: Record<string, unknown> }).params
      : undefined);
    const reqMeta = (paramsObj && typeof (paramsObj as any)._meta === 'object'
      ? ((paramsObj as any)._meta as Record<string, unknown>)
      : undefined);
    const reqMetaToken = reqMeta && (reqMeta['x402/payment'] as string | undefined);
    const metaToken = metaObj && (metaObj['x402/payment'] as string | undefined);

    const resMeta = (response._meta as Record<string, unknown> | undefined) || undefined;
    const paymentResponse = resMeta && (resMeta['x402/payment-response'] as Record<string, unknown> | undefined);
    const x402Error = resMeta && (resMeta['x402/error'] as { accepts?: unknown } | undefined);

    const hasPayment = !!paymentResponse;
    const paymentRequestRaw = reqMetaToken || metaToken;
    const paymentRequestDecoded = safeBase64Decode(paymentRequestRaw) ?? paymentRequestRaw;
    const paymentRequestJson = typeof paymentRequestDecoded === 'string' ? safeJsonParse(paymentRequestDecoded) : undefined;
    const paymentRequested = !!((x402Error && Array.isArray(x402Error.accepts)) || paymentRequestRaw);
    const paymentProvided = !!(headerToken || reqMetaToken || metaToken);

    return {
      hasPayment, paymentRequested, paymentProvided, metadata: {
        paymentResponse,
        x402Error,
        paymentRequest: paymentRequestJson,
      }
    };
  };

  const stats = rows.map((r) => {
    // @ts-ignore
    const name = (r.serverData && (r.serverData as any)?.server?.info?.name) || '';
    const payment = detectPayment(r.request, r.response, r.meta);
    return {
      id: r.id,
      ts: r.ts,
      method: r.method,
      serverId: r.serverId,
      serverName: name,
      payment,
    };
  });

  return c.json({
    stats,
    total: Number(count),
    limit,
    offset,
    nextOffset: offset + stats.length < Number(count) ? offset + stats.length : null,
    hasMore: offset + stats.length < Number(count),
  });
});



const port = 3010;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[MCP-DATA] running on http://localhost:${info.port}`);
});


