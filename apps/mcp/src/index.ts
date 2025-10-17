import { serve } from "@hono/node-server";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata, withMcpAuth } from "better-auth/plugins";
import dotenv from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { LoggingHook, withProxy, createMcpHandler } from "mcpay/handler";
import { AnalyticsHook } from "mcpay/handler";
import { z } from "zod";
import { getPort, getTrustedOrigins, isDevelopment } from "./env.js";
import { auth, db } from "./lib/auth.js";
import { getBalancesSummary } from "./lib/balance-tracker.js";
import { isNetworkSupported, type UnifiedNetwork } from "./lib/3rd-parties/cdp/wallet/networks.js";
import { SecurityHook } from "./lib/proxy/hooks/security-hook.js";
import { X402WalletHook } from "./lib/proxy/hooks/x402-wallet-hook.js";
import { CONNECT_HTML } from "./ui/connect.js";
import { USER_HTML } from "./ui/user.js";
import { createOneClickBuyUrl } from "./lib/3rd-parties/cdp/onramp/index.js";
import { analyticsSink } from "./lib/analytics/index.js";

dotenv.config();

const TRUSTED_ORIGINS = getTrustedOrigins();
const isDev = isDevelopment();
const DEFAULT_DEV_ORIGINS = [
    "http://localhost:*",
    "http://127.0.0.1:3000",
    "http://localhost:3050",
    "http://127.0.0.1:3050",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:6274"
];
const ALLOWED_ORIGINS = new Set([
    ...(isDev ? DEFAULT_DEV_ORIGINS : []),
    ...TRUSTED_ORIGINS,
]);


const app = new Hono();




app.use("*", cors({
    allowHeaders: [
        "Origin", 
        "Content-Type", 
        "Authorization", 
        "WWW-Authenticate", 
        "x-api-key",
        // Client-controlled routing of auth and autopay behavior
        "X-MCP-Auth-Mode", // "api-key" | "mcp-auth" | "none"
        "X-MCP-Auto-Pay",  // "on" | "off"
        "X-MCP-Error-Mode", // e.g. "x420" (used by app proxy)
        "X-Wallet-Type",
        "X-Wallet-Address", 
        "X-Wallet-Provider"
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    origin: (origin) => {
        if (!origin) return "";
        if (ALLOWED_ORIGINS.has(origin)) return origin;
        if (isDev) {
            try {
                const url = new URL(origin);
                if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
                    return origin;
                }
            } catch { }
        }
        return "";
    },
    exposeHeaders: ["WWW-Authenticate"],
}))

// // 1. CORS for all routes (including preflight)
// app.use("*", cors({
// //   origin: (origin) => {
// //     if (!origin) return "";

// //     if (TRUSTED_ORIGINS?.includes(origin)) {
// //       return origin;
// //     }
// //     return "";
// //   },
// origin: "*",
//   allowMethods: ["GET", "POST", "OPTIONS"],
//   allowHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// }));

// 2. Handle OPTIONS explicitly on auth route (preflight)
app.options("/api/auth/*", (c) => {
    // The cors middleware should already have set the headers
    return c.body(null, 204);
});

// 3. Mount Better Auth for all GET/POST on /api/auth/*
app.on(["GET", "POST"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
});

// 4. (Optional) additional non-auth routes
app.get("/api/me", async (c) => {
    // If you want to inspect session, use auth.api.getSession etc.
    const session = await auth.api.getSession({
        headers: c.req.raw.headers,
    });
    if (!session) {
        return c.json({ user: null }, 401);
    }
    return c.json({ user: session.user });
});

app.get("/health", (c) => {
    return c.json({ status: "ok" });
});


// Onramp - preflight
app.options("/api/onramp/*", (c) => {
    return c.body(null, 204);
});

// Onramp - create one-click buy URL
app.post("/api/onramp/url", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        type OnrampUrlBody = {
            walletAddress: string;
            network?: string;
            asset?: string;
            amount?: number;
            currency?: string;
            redirectUrl?: string;
        };

        const body = (await c.req.json().catch(() => ({}))) as Partial<OnrampUrlBody>;
        const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
        if (!walletAddress) {
            return c.json({ error: "Missing walletAddress" }, 400);
        }

        const url = await createOneClickBuyUrl(walletAddress, {
            network: typeof body.network === "string" && body.network ? body.network : undefined,
            asset: typeof body.asset === "string" && body.asset ? body.asset : undefined,
            amount: typeof body.amount === "number" && !Number.isNaN(body.amount) ? body.amount : undefined,
            currency: typeof body.currency === "string" && body.currency ? body.currency : undefined,
            userId: session.user.id,
            redirectUrl: typeof body.redirectUrl === "string" && body.redirectUrl ? body.redirectUrl : undefined,
        });

        return c.json({ url });
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// Wallets - handle preflight
app.options("/api/wallets", (c) => {
    return c.body(null, 204);
});

// Wallets - list current user's wallets
app.get("/api/wallets", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const includeInactive = c.req.query("includeInactive") === "true";

        const wallets = await db.query.userWallets.findMany({
            where: (t, { and, eq }) => {
                const conditions = [eq(t.userId, session.user.id)];
                if (!includeInactive) {
                    conditions.push(eq(t.isActive, true));
                }
                return and(...conditions);
            },
            orderBy: (t, { desc }) => [desc(t.isPrimary), desc(t.createdAt)],
        });

        return c.json(wallets);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// Balances - handle preflight
app.options("/api/balance", (c) => {
    return c.body(null, 204);
});

// Balances - get current user's primary wallet balance (or specified wallet)
app.get("/api/balance", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const queryWallet = c.req.query("walletAddress")?.trim();
        const queryNetwork = c.req.query("network")?.trim();

        let walletAddress = queryWallet || "";
        let network: UnifiedNetwork | undefined = undefined;

        if (queryNetwork && isNetworkSupported(queryNetwork)) {
            network = queryNetwork as UnifiedNetwork;
        }

        if (!walletAddress) {
            const wallets = await db.query.userWallets.findMany({
                where: (t, { and, eq }) => and(eq(t.userId, session.user.id), eq(t.isActive, true)),
                orderBy: (t, { desc }) => [desc(t.isPrimary), desc(t.createdAt)],
            });
            if (!wallets || wallets.length === 0) {
                return c.json({ error: "No wallets found for user" }, 404);
            }
            const primary = wallets.find((w: any) => w.isPrimary) || wallets[0];
            walletAddress = primary.walletAddress;
            if (!network && typeof primary.blockchain === "string" && isNetworkSupported(primary.blockchain)) {
                network = primary.blockchain as UnifiedNetwork;
            }
        }

        // Fallback default network if not provided/derived
        if (!network) {
            network = "base" as UnifiedNetwork;
        }

        const summary = await getBalancesSummary(walletAddress as any, network);

        const serializeNative = (n: any) => n ? {
            address: n.address,
            network: n.network,
            chainId: n.chainId,
            nativeSymbol: n.nativeSymbol,
            balanceWei: String(n.balanceWei),
            balanceFormatted: n.balanceFormatted,
            decimals: n.decimals,
        } : null;

        const serializeToken = (t: any) => t ? {
            address: t.address,
            network: t.network,
            chainId: t.chainId,
            tokenAddress: t.tokenAddress,
            tokenSymbol: t.tokenSymbol,
            tokenName: t.tokenName,
            decimals: t.decimals,
            balance: String(t.balance),
            balanceFormatted: t.balanceFormatted,
        } : null;

        return c.json({
            walletAddress,
            network,
            native: serializeNative(summary.native),
            usdc: serializeToken(summary.usdc),
        });
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - handle preflight
app.options("/api/keys/*", (c) => {
    return c.body(null, 204);
});

// API Keys - list current user's keys
app.get("/api/keys", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const keys = await auth.api.listApiKeys({ headers: c.req.raw.headers });
        return c.json(keys);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - create new key for current user
app.post("/api/keys", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const body = await c.req.json().catch(() => ({} as any)) as any;

        const expiresIn = typeof body.expiresIn === "number"
            ? body.expiresIn
            : (typeof body.expiresInDays === "number" ? Math.floor(body.expiresInDays * 86400) : undefined);

        const payload: any = {
            userId: session.user.id,
            name: body.name,
            prefix: body.prefix,
            remaining: body.remaining,
            metadata: body.metadata,
            permissions: body.permissions,
            expiresIn,
            rateLimitEnabled: body.rateLimitEnabled,
            rateLimitTimeWindow: body.rateLimitTimeWindow,
            rateLimitMax: body.rateLimitMax,
        };

        const created = await auth.api.createApiKey({ body: payload, headers: c.req.raw.headers });
        return c.json(created, 201);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - get by id (without returning secret key)
app.get("/api/keys/:id", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const id = c.req.param("id");
        const data = await auth.api.getApiKey({ query: { id }, headers: c.req.raw.headers });
        return c.json(data);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - update by id
app.put("/api/keys/:id", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const id = c.req.param("id");
        const body = await c.req.json().catch(() => ({} as any)) as any;

        const payload: any = {
            keyId: id,
            userId: session.user.id,
            name: body.name,
            enabled: body.enabled,
            remaining: body.remaining,
            refillAmount: body.refillAmount,
            refillInterval: body.refillInterval,
            metadata: body.metadata,
            permissions: body.permissions,
        };

        const updated = await auth.api.updateApiKey({ body: payload, headers: c.req.raw.headers });
        return c.json(updated);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - delete by id
app.delete("/api/keys/:id", async (c) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });
        if (!session) return c.json({ error: "Unauthorized" }, 401);

        const id = c.req.param("id");
        const result = await auth.api.deleteApiKey({ body: { keyId: id }, headers: c.req.raw.headers });
        return c.json(result);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

// API Keys - verify a presented key
app.post("/api/keys/verify", async (c) => {
    try {
        const body = await c.req.json().catch(() => ({} as any)) as any;
        if (!body.key || typeof body.key !== "string") {
            return c.json({ error: "Missing 'key' in body" }, 400);
        }

        const result = await auth.api.verifyApiKey({ body: { key: body.key, permissions: body.permissions } });
        return c.json(result);
    } catch (error) {
        return c.json({ error: (error as Error).message }, 400);
    }
});

app.options(".well-known/oauth-authorization-server", (c) => {
    return c.body(null, 204);
});
app.options(".well-known/oauth-protected-resource", (c) => {
    return c.body(null, 204);
});

app.get(".well-known/oauth-authorization-server", async (c) => {
    return await oAuthDiscoveryMetadata(auth)(c.req.raw);
});
app.get(".well-known/oauth-protected-resource", async (c) => {
    return await oAuthProtectedResourceMetadata(auth)(c.req.raw);
});

// Removed custom /callback handler; Better Auth handles provider callbacks at /api/auth/callback/{provider}

app.get("/connect", async (c) => {
    const currentUrl = new URL(c.req.url);
    const continueParam =
        currentUrl.searchParams.get("continue") ||
        currentUrl.searchParams.get("return_to") ||
        currentUrl.searchParams.get("next");

    // If already authenticated, resume the original authorization flow
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session) {
        if (continueParam) {
            return c.redirect(continueParam);
        }
        // Fallback: if this looks like an OIDC authorize request, forward it to the authorization endpoint
        const hasAuthorizeParams =
            currentUrl.searchParams.has("response_type") &&
            currentUrl.searchParams.has("client_id");
        if (hasAuthorizeParams) {
            const authorizeUrl = new URL("/api/auth/oauth/authorize", `${currentUrl.protocol}//${currentUrl.host}`);
            authorizeUrl.search = currentUrl.search; // preserve original authorize query
            return c.redirect(authorizeUrl.toString());
        }
        return c.redirect("/");
    }

    // Render a minimal page that initiates social sign-in on the client
    return c.html(
        CONNECT_HTML
    );
});

app.get("/", async (c) => {
    return c.html(
        USER_HTML
    );
});

async function resolveTargetUrl(req: Request): Promise<string | null> {
    // First, try to get target URL from header or query param (base64-encoded)
    const directUrlEncoded = req.headers.get("x-mcpay-target-url")
        ?? new URL(req.url).searchParams.get("target-url");

    if (directUrlEncoded) {
        try {

            // The value is base64-encoded, so decode it
            // decodeURIComponent in case it was URL-encoded as well
            const decoded = decodeURIComponent(atob(directUrlEncoded));
            return decoded;
        } catch (e) {
            // If decoding fails, treat as invalid and fall through
        }
    }

    return null;
}

app.all("/mcp", async (c) => {

    const currentUrl = new URL(c.req.url);
    const targetUrlParam = currentUrl.searchParams.get("target-url");
    const hasId = !!currentUrl.searchParams.get("id");
    const shouldProxy = hasId || !!targetUrlParam;
    const original = c.req.raw;

    if (shouldProxy) {
        console.log("[MCP] Proxying request:", {
            url: original.url,
            method: original.method,
        });

        const targetUrl = await resolveTargetUrl(original);
        if (!targetUrl) {
            return new Response("target-url missing", { status: 400 });
        }

        // Determine routing mode and autopay behavior from headers
        const inbound = new Headers(original.headers);
        const authMode = (inbound.get("x-mcp-auth-mode") || "").toLowerCase();
        const autoPay = (inbound.get("x-mcp-auto-pay") || "on").toLowerCase(); // default on for CLI
        const errorMode = (inbound.get("x-mcp-error-mode") || "").toLowerCase();

        // Build proxy hooks conditionally (X402WalletHook toggled by autoPay)
        const buildHooks = (sessionLike: any) => {
            const hooks = [
                new AnalyticsHook(analyticsSink, targetUrl),
                new LoggingHook(),
                new SecurityHook(),
            ] as any[];
            if (autoPay !== "off") {
                hooks.splice(2, 0, new X402WalletHook(sessionLike));
            }
            return hooks;
        };
        const withMcpProxy = (session: any) => withProxy(targetUrl, buildHooks(session));
        
        // Extract API key from sources
        const apiKeyFromQuery = currentUrl.searchParams.get("apiKey") || currentUrl.searchParams.get("api_key");
        const apiKeyFromXHeader = original.headers.get("x-api-key");
        const apiKey = apiKeyFromQuery || apiKeyFromXHeader;

        // Header-based mode selection
        // 1) api-key: prefer header key, ignore cookie/session
        if (authMode === "api-key") {
            if (!apiKey) {
                // Explicit api-key mode but no key provided
                const wantsX420 = errorMode === "x420";
                const body = wantsX420 ? { error: "API_KEY_REQUIRED" } : { error: "Unauthorized" };
                return new Response(JSON.stringify(body), { status: wantsX420 ? 420 : 401, headers: { 'content-type': 'application/json' } });
            }
            const session = await auth.api.getSession({ headers: new Headers({ 'x-api-key': apiKey }) });
            if (!session) {
                const wantsX420 = errorMode === "x420";
                const body = wantsX420 ? { error: "INVALID_API_KEY" } : { error: "Unauthorized" };
                return new Response(JSON.stringify(body), { status: wantsX420 ? 420 : 401, headers: { 'content-type': 'application/json' } });
            }
            return withMcpProxy(session.session)(original);
        }

        // 2) none: bypass Better Auth; run proxy with anonymous session
        if (authMode === "none") {
            const anon = { userId: undefined } as any;
            return withMcpProxy(anon)(original);
        }

        // 3) default or "mcp-auth": attempt cookie/session; if missing, fall back to OIDC flow via withMcpAuth
        let session = await auth.api.getSession({ headers: original.headers });
        if (session) {
            console.log("[MCP] Authenticated session found, proxying with session:", session.session?.userId || session.session);
            return withMcpProxy(session.session)(original);
        }

        console.log("[MCP] No authenticated session, using withMcpAuth");
        const handler = withMcpAuth(auth, (req, session) => {
            console.log("[MCP] withMcpAuth session:", session?.userId || session);
            return withMcpProxy(session)(req);
        });

        return handler(original);
    }

    const handler = (session: any) => createMcpHandler(async (server) => {
        server.tool(
            "ping",
            "Health check that echoes an optional message",
            { message: z.string().optional() },
            async ({ message }) => {
                return {
                    content: [
                        { type: "text", text: message ? `pong: ${message}` : "pong" },
                    ],
                };
            }
        );

        server.tool(
            "me",
            "Returns the current authenticated user's basic info if available",
            {},
            async (_args, extra) => {

                console.log(original)

                const session = await auth.api.getSession({ headers: original.headers });

                if (!session) {
                    return { content: [{ type: "text", text: "Not authenticated" }] };
                }
                return {
                    content: [
                        { type: "text", text: JSON.stringify({ ...session.user }) },
                    ],
                };
            }
        );

        // server.tool(
        //     "create_onramp_url",
        //     "Generate a one-click buy URL for funding a wallet",
        //     {
        //         walletAddress: z.string().describe("Destination wallet address"),
        //         network: z.string().optional(),
        //         asset: z.string().optional(),
        //         amount: z.number().optional(),
        //         currency: z.string().optional(),
        //         redirectUrl: z.string().url().optional(),
        //     },
        //     async ({ walletAddress, network, asset, amount, currency, redirectUrl }, extra) => {
        //         const inboundHeaders = (extra?.requestInfo && (extra.requestInfo as unknown as { headers?: unknown }).headers) as unknown as Headers | undefined;
        //         if (!inboundHeaders) {
        //             return { content: [{ type: "text", text: "Unauthorized" }] };
        //         }
        //         const session = await auth.api.getSession({ headers: inboundHeaders });
        //         if (!session) {
        //             return { content: [{ type: "text", text: "Unauthorized" }] };
        //         }

        //         const url = await createOneClickBuyUrl(walletAddress, {
        //             network: network || undefined,
        //             asset: asset || undefined,
        //             amount: typeof amount === "number" && !Number.isNaN(amount) ? amount : undefined,
        //             currency: currency || undefined,
        //             userId: session.user.id,
        //             redirectUrl: redirectUrl || undefined,
        //         });

        //         return { content: [{ type: "text", text: url }] };
        //     }
        // );
    });

    return withMcpAuth(auth, (req, session) => handler(session)(req))(c.req.raw);
});

// app.all("/mcp/*", async (c) => {

//     const withMcpProxy = (session: any) => withProxy([
//         new LoggingHook(),
//         new X402WalletHook(session),
//         new SecurityHook(),
//     ]);

//     const session = await auth.api.getSession({ headers: c.req.raw.headers });
    

//     if(session) {
//         return withMcpProxy(session.session)(c.req.raw);
//     }

//     const handler = withMcpAuth(auth, (req, session) => {
//         return withMcpProxy(session)(req);
//     });

//     return handler(c.req.raw);
// });


const port = 3005;
console.log(`[MCP] Server starting on port http://localhost:${port}`);

serve({
    fetch: app.fetch,
    port: port
});