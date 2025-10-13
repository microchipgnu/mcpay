import { Hono } from "hono";
import { cors } from "hono/cors";
import { AuthHeadersHook, LoggingHook, withProxy, X402MonetizationHook } from "mcpay/handler";
import type { Network, Price } from "x402/types";
import { redisStore, type StoredServerConfig } from "./db/redis.js";
import { config } from 'dotenv';
import getPort from "get-port";
import { serve } from "@hono/node-server";

config();

export const runtime = 'nodejs';

type RecipientWithTestnet = { address: string; isTestnet?: boolean };

// Initialize Redis store
async function initializeStore(): Promise<void> {
    try {
        await redisStore.connect();
        console.log(`[${new Date().toISOString()}] Redis store initialized successfully`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to initialize Redis store:`, error);
        throw error;
    }
}

// Resolve upstream target MCP origin from header/query (base64) or store by server id
async function resolveTargetUrl(req: Request): Promise<string | null> {
    console.log(`[${new Date().toISOString()}] Resolving target URL for request: ${req.url}`);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    console.log(`[${new Date().toISOString()}] ID: ${id}`);
    if (id) {
        const server = await redisStore.getServerById(id);
        console.log(`[${new Date().toISOString()}] Server: ${JSON.stringify(server)}`);
        if (server?.mcpOrigin) {
            console.log(`[${new Date().toISOString()}] Found server by ID: ${id}, returning MCP origin: ${server.mcpOrigin}`);
            return server.mcpOrigin;
        }
    }

    const directEncoded = req.headers.get("x-mcpay-target-url") ?? url.searchParams.get("target-url");
    if (directEncoded) {
        try {
            const decoded = atob(decodeURIComponent(directEncoded));
            return decoded;
        } catch {
            // if not base64, assume raw URL
            return directEncoded;
        }
    }
    return null;
}

async function buildMonetizationForTarget(targetUrl: string): Promise<{
    prices: Record<string, Price>;
    recipient: Partial<Record<Network, string>>;
} | null> {
    try {
        const server = await redisStore.getServerByOrigin(targetUrl);
        if (!server) return null;

        const tools = server.tools ?? [];

        // Build recipients from the new recipient structure
        const recipient: Partial<Record<Network, string>> = {};

        // Handle the new recipient format: { evm: { address: string, isTestnet?: boolean } }
        if (server.recipient?.evm?.address) {
            // For now, we'll use a generic network key since we're simplifying to EVM
            // In a real implementation, you might want to map testnet vs mainnet to specific networks
            const networkKey = server.recipient.evm.isTestnet ? 'base-sepolia' : 'base';
            recipient[networkKey as Network] = server.recipient.evm.address;
        }

        // Fallback to old receiverAddressByNetwork if it exists (for backwards compatibility)
        if (!Object.keys(recipient).length && server.receiverAddressByNetwork) {
            const map = server.receiverAddressByNetwork ?? {};
            for (const [net, addr] of Object.entries(map)) {
                if (addr) recipient[net as Network] = String(addr);
            }
        }

        // If there are no recipients configured, monetization cannot be applied
        if (!Object.keys(recipient).length) return null;

        // Build prices per tool - now pricing is a simple string like "$0.01"
        const prices: Record<string, Price> = {};
        for (const t of tools) {
            const pricing = t.pricing;
            if (typeof pricing === 'string' && pricing.startsWith('$')) {
                // Convert string price like "$0.01" to a Price object
                // For now, we'll create a simple price structure
                prices[t.name as string] = pricing as any; // The x402 system should handle string prices
            }
        }

        return { prices, recipient };
    } catch {
        return null;
    }
}

// Initialize Redis store at startup
void initializeStore();

const app = new Hono();
app.use("*", cors());

// Admin: register or update an MCP server config
app.post("/register", async (c) => {
    const body = await c.req.json().catch(() => null) as { id?: string; mcpOrigin?: string; requireAuth?: boolean; authHeaders?: Record<string, string>; receiverAddressByNetwork?: Record<string, string>; recipient?: Record<string, string>; tools?: Record<string, string>; metadata?: Record<string, unknown> };
    if (!body || typeof body !== 'object') {
        return c.json({ error: "invalid_json" }, 400);
    }

    const { id, mcpOrigin } = body;
    if (!id || !mcpOrigin) {
        return c.json({ error: "missing_id_or_origin" }, 400);
    }

    const input: Partial<StoredServerConfig> = {
        id,
        mcpOrigin,
        requireAuth: body.requireAuth === true,
        authHeaders: body.authHeaders ?? {},
        // Support both old and new recipient formats for backwards compatibility
        receiverAddressByNetwork: body.receiverAddressByNetwork ?? {},
        recipient: body.recipient ?? undefined,
        tools: Array.isArray(body.tools) ? body.tools : [],
        metadata: body.metadata ?? {},
    } as StoredServerConfig;

    try {
        const saved = await redisStore.upsertServerConfig(input as StoredServerConfig);
        return c.json({ ok: true, id: saved.id });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error registering server:`, error);
        return c.json({ error: "failed_to_save" }, 500);
    }
});

// Admin: list or fetch stored servers
app.get("/servers", async (c) => {
    try {
        const list = await redisStore.getAllServers();
        return c.json({ servers: list });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error listing servers:`, error);
        return c.json({ error: "failed_to_list" }, 500);
    }
});

// app.get("/servers/:id", async (c) => {
//     const id = c.req.param("id");
//     try {
//         const s = id ? await redisStore.getServerById(id) : null;
//         if (!s) return c.json({ error: "not_found" }, 404);

//         // Hide mcpOrigin and authHeaders
//         const { mcpOrigin, authHeaders, ...rest } = s;
//         return c.json(rest);
//     } catch (error) {
//         console.error(`[${new Date().toISOString()}] Error getting server:`, error);
//         return c.json({ error: "failed_to_get" }, 500);
//     }
// });

// Proxy endpoint: /mcp?id=<ID>
app.all("/mcp", async (c) => {
    console.log(`[${new Date().toISOString()}] Handling request to ${c.req.url}`);
    const original = c.req.raw;
    const targetUrl = await resolveTargetUrl(original);
    console.log(`[${new Date().toISOString()}] Target URL: ${targetUrl}`);

    let prices: Record<string, Price> = {};
    let recipient: Partial<Record<Network, string>> | { evm: RecipientWithTestnet } = {
        evm: { address: "0x0000000000000000000000000000000000000000", isTestnet: false },
    };

    if (targetUrl) {
        const monetization = await buildMonetizationForTarget(targetUrl);
        if (monetization && Object.keys(monetization.prices).length > 0) {
            prices = monetization.prices;
            recipient = monetization.recipient;
        }
    }

    // Ensure the proxy receives a base64 target-url header
    const headers = new Headers(original.headers);
    if (targetUrl && !headers.get("x-mcpay-target-url")) {
        headers.set("x-mcpay-target-url", btoa(targetUrl));
    }

    const reqForProxy = new Request(original.url, {
        method: original.method,
        headers,
        body: original.body,
        duplex: 'half'
    } as RequestInit);

    const proxy = withProxy([
        new LoggingHook(),
        new X402MonetizationHook({
            recipient: recipient,
            prices,
            facilitator: {
                url: "https://facilitator.payai.network",
            },
        }),
        new AuthHeadersHook(async (_req, extra) => {
            const serverId = extra.serverId;
            if (!serverId) return null;
            const mcpConfig = await redisStore.getServerById(serverId);
            if (!mcpConfig?.authHeaders || mcpConfig.requireAuth !== true) return null;
            const result: Record<string, string> = {};
            for (const [key, value] of Object.entries(mcpConfig.authHeaders)) {
                if (typeof value === "string" && value.length > 0) result[key] = value;
            }
            return result;
        }),
    ]);

    return proxy(reqForProxy);
});

const portPromise = getPort({ port: process.env.PORT ? Number(process.env.PORT) : 3006 });
const port = await portPromise;

// Support both Vercel-style export (for serverless) and local node listening
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
    serve({
        fetch: app.fetch,
        port: port,
        hostname: '0.0.0.0' // Important for sandbox access
    }, (info) => {
        console.log(`[MCP2] Server running on http://0.0.0.0:${info.port}`);
    });
}

// For Vercel (Edge/Serverless) export just the app instance
export default isVercel
    ? app
    : {
        app,
        port: port,
    };