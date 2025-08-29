import type { Step } from "./types";
import { getCacheKey } from "./cache-utils";

export const forwardStep: Step = async (ctx) => {
    const targetUpstream = ctx.targetUpstream;
    if (!targetUpstream) return ctx;
    const originalUrl = new URL(ctx.req.url);
    originalUrl.host = targetUpstream.host;
    originalUrl.protocol = targetUpstream.protocol;
    originalUrl.port = targetUpstream.port;
    const pathWithoutId = originalUrl.pathname.replace(/^\/mcp\/[^\/]+/, "");
    originalUrl.pathname = targetUpstream.pathname + (pathWithoutId || "");
    if (targetUpstream.search) {
        const targetParams = new URLSearchParams(targetUpstream.search);
        targetParams.forEach((value, key) => { originalUrl.searchParams.set(key, value); });
    }
    const preparedHeaders = new Headers(ctx.upstreamHeaders);
    preparedHeaders.set('host', targetUpstream.host);
    let bodyForHash: ArrayBuffer | undefined = undefined;
    try { const cloned = ctx.req.clone(); if (cloned.body) bodyForHash = await cloned.arrayBuffer(); } catch {}
    if (bodyForHash) {
        ctx.requestBody = bodyForHash;
    }
    const method = ctx.req.method.toUpperCase();
    const requestInit: RequestInit = {
        method,
        headers: preparedHeaders,
        body: method !== 'GET' ? ctx.requestBody : undefined,
        // @ts-expect-error Node fetch extension
        duplex: 'half',
    };
    const upstreamUrl = originalUrl.toString();
    const cacheKey = getCacheKey(upstreamUrl, method, bodyForHash);
    ctx.upstreamUrl = new URL(upstreamUrl);
    ctx.forwardInit = requestInit;
    ctx.cacheKey = cacheKey;
    return ctx;
};

export default forwardStep;


