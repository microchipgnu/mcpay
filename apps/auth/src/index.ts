import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./lib/auth.js";
import dotenv from "dotenv";
import { getPort, getTrustedOrigins, isDevelopment } from "./env.js";
import { withProxy } from "mcpay/handler";
import { LoggingHook } from "mcpay/handler";
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata, withMcpAuth } from "better-auth/plugins";

dotenv.config();

const TRUSTED_ORIGINS = getTrustedOrigins();
const isDev = isDevelopment();
const DEFAULT_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3050",
    "http://127.0.0.1:3050",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];
const ALLOWED_ORIGINS = new Set([
    ...(isDev ? DEFAULT_DEV_ORIGINS : []),
    ...TRUSTED_ORIGINS,
]);

const withMcpProxy = withProxy([
    new LoggingHook(),
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
            } catch {}
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
    return c.html(`
<!doctype html>
<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign In</title>
  <body>
    <h1>Sign In</h1>
    <p>Please sign in to authorize the application.</p>
    <button id="gh">Sign in with GitHub</button>
    <script type="module">
      const callbackURL = window.location.href;
      const authBaseURL = window.location.origin + '/api/auth';
      async function startSignIn() {
        try {
          const { createAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client');
          const { genericOAuthClient } = await import('https://esm.sh/better-auth@1.3.26/client/plugins');
          const authClient = createAuthClient({
            baseURL: authBaseURL,
            fetchOptions: { credentials: 'include' },
            plugins: [genericOAuthClient()],
          });
          await authClient.signIn.social({ provider: 'github', callbackURL });
        } catch (err) {
          console.error('Sign-in failed', err);
          alert('Failed to start sign-in. Check console for details.');
        }
      }
      document.getElementById('gh')?.addEventListener('click', (e) => {
        e.preventDefault();
        startSignIn();
      });
    </script>
  </body>
</html>
    `);
});

app.all("/mcp/*", async (c) => {
    const handler = withMcpAuth(auth, (req, session) => withMcpProxy(req));
    return handler(c.req.raw);
});

serve({
    fetch: app.fetch,
    port: getPort(),
});