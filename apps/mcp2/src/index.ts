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
        // No console logging
    } catch (error) {
        // No console logging
        throw error;
    }
}

// Resolve upstream target MCP origin from header/query (base64) or store by server id
async function resolveTargetUrl(req: Request): Promise<string | null> {
    // No console logging
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    // No console logging
    if (id) {
        const server = await redisStore.getServerById(id);
        // No console logging
        if (server?.mcpOrigin) {
            // No console logging
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

        // Get selected networks from metadata
        const selectedNetworks = server.metadata?.networks as string[] | undefined;
        
        // Define network types for proper filtering
        const evmNetworks = ['base', 'base-sepolia', 'avalanche', 'avalanche-fuji', 'iotex', 'sei', 'sei-testnet', 'polygon', 'polygon-amoy'];
        const svmNetworks = ['solana', 'solana-devnet'];

        // Handle the new recipient format: { evm: { address: string, isTestnet?: boolean } }
        if (server.recipient?.evm?.address) {
            if (selectedNetworks && selectedNetworks.length > 0) {
                // Use only EVM networks selected by the user
                const selectedEvmNetworks = selectedNetworks.filter(n => evmNetworks.includes(n));
                for (const network of selectedEvmNetworks) {
                    recipient[network as Network] = server.recipient.evm.address;
                }
            } else {
                // Fallback: Map EVM address to all supported EVM networks based on testnet flag
                const isTestnet = server.recipient.evm.isTestnet;
                const evmTestnets = ['base-sepolia', 'avalanche-fuji', 'sei-testnet', 'polygon-amoy'];
                const evmMainnets = ['base', 'avalanche', 'iotex', 'sei', 'polygon'];
                
                const targetNetworks = isTestnet ? evmTestnets : evmMainnets;
                for (const network of targetNetworks) {
                    recipient[network as Network] = server.recipient.evm.address;
                }
            }
        }

        // Handle SVM recipient format: { svm: { address: string, isTestnet?: boolean } }
        if (server.recipient?.svm?.address) {
            if (selectedNetworks && selectedNetworks.length > 0) {
                // Use only SVM networks selected by the user
                const selectedSvmNetworks = selectedNetworks.filter(n => svmNetworks.includes(n));
                for (const network of selectedSvmNetworks) {
                    recipient[network as Network] = server.recipient.svm.address;
                }
            } else {
                // Fallback: Map SVM address based on testnet flag
                const isTestnet = server.recipient.svm.isTestnet;
                if (isTestnet) {
                    recipient['solana-devnet' as Network] = server.recipient.svm.address;
                } else {
                    // Default to supporting both networks for SVM
                    recipient['solana-devnet' as Network] = server.recipient.svm.address;
                    recipient['solana' as Network] = server.recipient.svm.address;
                }
            }
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

        // Build prices per tool - convert string prices like "$0.01" to proper Price objects
        const prices: Record<string, Price> = {};
        for (const t of tools) {
            const pricing = t.pricing;
            if (typeof pricing === 'string' && pricing.startsWith('$')) {
                // Extract numeric value from string like "$0.01"
                const numericValue = parseFloat(pricing.substring(1));
                if (!isNaN(numericValue) && numericValue > 0) {
                    // Use the numeric value as Money type (which is string | number)
                    prices[t.name as string] = numericValue;
                }
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
    const body = await c.req.json().catch(() => null) as { 
        id?: string; 
        mcpOrigin?: string; 
        requireAuth?: boolean; 
        authHeaders?: Record<string, string>; 
        receiverAddressByNetwork?: Record<string, string>; 
        recipient?: { 
            evm?: { address: string; isTestnet?: boolean }; 
            svm?: { address: string; isTestnet?: boolean } 
        }; 
        tools?: Array<{ name: string; pricing: string }>; 
        metadata?: Record<string, unknown> 
    };
    if (!body || typeof body !== 'object') {
        return c.json({ error: "invalid_json" }, 400);
    }

    // No console logging

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
        // No console logging
        return c.json({ ok: true, id: saved.id });
    } catch (error) {
        // No console logging
        return c.json({ error: "failed_to_save" }, 500);
    }
});

// Admin: list or fetch stored servers
app.get("/servers", async (c) => {
    try {
        const list = await redisStore.getAllServers();
        return c.json({ servers: list });
    } catch (error) {
        // No console logging
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
    // No console logging
    const original = c.req.raw;
    const targetUrl = await resolveTargetUrl(original);
    // No console logging

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

    const serverId = new URL(original.url).searchParams.get("id");
    if (!serverId) {
        return new Response("server-id missing", { status: 400 });
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

    if (!targetUrl) {
        return new Response("target-url missing", { status: 400 });
    }

    const proxy = withProxy(targetUrl, [
        new LoggingHook(),
        new X402MonetizationHook({
            recipient: recipient,
            prices,
            facilitator: {
                url: "https://facilitator.payai.network",
            },
        })
    ]);


    const mcpConfig = await redisStore.getServerById(serverId);
    // No console logging
    if (!mcpConfig?.authHeaders || mcpConfig.requireAuth !== true) {
        // No console logging
        return new Response("Auth headers missing", { status: 400 });
    }
    // Iterate through auth headers and set them in the request headers
    for (const [key, value] of Object.entries(mcpConfig.authHeaders)) {
        if (typeof value === "string" && value.length > 0) {
            headers.set(key, value);
        }
    }

    const reqForProxyWithHeaders = new Request(targetUrl, {
        method: original.method,
        headers: headers,
        body: original.body,
        duplex: 'half'
    } as RequestInit);  

    // No console logging

    return await proxy(reqForProxyWithHeaders);
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
        // No console logging
    });
}

// For Vercel (Edge/Serverless) export just the app instance
export default isVercel
    ? app
    : {
        app,
        port: port,
    };