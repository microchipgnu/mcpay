import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./lib/auth.js";
import dotenv from "dotenv";
import { getPort, getTrustedOrigins, isDevelopment } from "./env.js";
import { withProxy } from "mcpay/handler";
import { AuthHeadersHook, LoggingHook } from "mcpay/handler";
import { X402WalletHook } from "./lib/proxy/hooks/x402-wallet-hook.js";
import { SecurityHook } from "./lib/proxy/hooks/security-hook.js";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata, withMcpAuth } from "better-auth/plugins";
import { CONNECT_HTML } from "./ui/connect.js";
import { USER_HTML } from "./ui/user.js";
import { Session, User } from "better-auth";

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
    allowHeaders: ["Origin", "Content-Type", "Authorization", "WWW-Authenticate"],
    allowMethods: ["GET", "POST", "OPTIONS"],
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

app.all("/mcp/*", async (c) => {

    const withMcpProxy = (session: any) => withProxy([
        new LoggingHook(),
        new X402WalletHook(session),
        new SecurityHook(),
    ]);

    const handler = withMcpAuth(auth, (req, session) => {
        return withMcpProxy(session)(req);
    });

    return handler(c.req.raw);
});

serve({
    fetch: app.fetch,
    port: getPort(),
});