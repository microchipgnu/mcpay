import { type AuthType } from "@/types";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { run, PIPELINE_STEPS, type PipelineCtx } from "@/lib/gateway/mcp-proxy";

export const runtime = 'nodejs'

const app = new Hono<{ Bindings: AuthType }>({ strict: false }).basePath("/mcp");

// Thin adapter: run the functional pipeline for all verbs
app.all("*", async (c) => {
    const ctx: PipelineCtx = {
        req: c.req.raw,
        hono: c,
        startTime: Date.now(),
    };
    return await run(PIPELINE_STEPS, ctx);
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);

