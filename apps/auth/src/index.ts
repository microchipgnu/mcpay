import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { auth } from "./lib/auth.js";
import dotenv from "dotenv";

dotenv.config();

const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS?.split(",");

const app = new Hono();

// 1. CORS for all routes (including preflight)
app.use("*", cors({
  origin: (origin) => {
    if (!origin) return "";

    if (TRUSTED_ORIGINS?.includes(origin)) {
      return origin;
    }
    return "";
  },
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

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

serve({
  fetch: app.fetch,
  port: 3050,
});