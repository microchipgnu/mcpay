import { withProxy } from "mcpay/handler";
import { LoggingHook } from "mcpay/handler";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel";

export const runtime = 'nodejs';

const proxy = withProxy([
    new LoggingHook(),
]);

const app = new Hono();
app.use("*", cors());
app.all("/*", (c) => proxy(c.req.raw));

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
