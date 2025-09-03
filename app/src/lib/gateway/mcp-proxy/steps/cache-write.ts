import type { Step } from "./types";
import { responseCache, type CacheEntry } from "./cache-utils";

const DEFAULT_CACHE_TTL = 30000; // 30s
function computeTTLForUrl(url: string): number {
    try { const hostname = new URL(url).hostname.toLowerCase(); if (hostname.includes('coingecko')) return 60000; return 45000; } catch { return DEFAULT_CACHE_TTL; }
}

export const cacheWriteStep: Step = async (ctx) => {
    if (ctx.req.method !== 'GET') return ctx;
    const res = ctx.upstreamResponse;
    if (!res || res.status >= 400) return ctx;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) { try { res.headers.set('x-mcpay-cache', 'BYPASS'); } catch {} return ctx; }
    try {
        const cloned = res.clone();
        const body = await cloned.text();
        const headersObj: Record<string, string> = {};
        cloned.headers.forEach((v, k) => { headersObj[k] = v; });
        const upstreamUrl = (ctx.upstreamUrl?.toString()) || ctx.req.url;
        const ttl = computeTTLForUrl(upstreamUrl);
        const entry: CacheEntry = { response: { status: res.status, statusText: res.statusText, headers: headersObj, body }, timestamp: Date.now(), ttl };
        if (ctx.cacheKey) responseCache.set(ctx.cacheKey, entry);
        res.headers.set('x-mcpay-cache', 'MISS');
    } catch {}
    return ctx;
};

export default cacheWriteStep;


