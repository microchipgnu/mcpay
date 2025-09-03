import type { Step } from "./types";
import env from "@/lib/gateway/env";

interface TokenBucket { tokens: number; lastRefillMs: number; lastRequestMs: number; }
const buckets = new Map<string, TokenBucket>();

function getRateLimitConfig() {
    const capacity = typeof env.RATE_LIMIT_CAPACITY === 'number' ? env.RATE_LIMIT_CAPACITY : 30;
    const refillPerSecond = typeof env.RATE_LIMIT_REFILL_PER_SECOND === 'number' ? env.RATE_LIMIT_REFILL_PER_SECOND : 0.5;
    const minDelayMs = typeof env.RATE_LIMIT_MIN_DELAY_MS === 'number' ? env.RATE_LIMIT_MIN_DELAY_MS : 1000;
    return { capacity, refillPerSecond, minDelayMs };
}

function refill(bucket: TokenBucket, nowMs: number, refillPerSecond: number, capacity: number) {
    const elapsedMs = Math.max(0, nowMs - bucket.lastRefillMs);
    const add = (elapsedMs / 1000) * refillPerSecond;
    bucket.tokens = Math.min(capacity, bucket.tokens + add);
    bucket.lastRefillMs = nowMs;
}

function getOrCreateBucket(host: string, capacity: number): TokenBucket {
    const existing = buckets.get(host);
    if (existing) return existing;
    const bucket: TokenBucket = { tokens: capacity, lastRefillMs: Date.now(), lastRequestMs: 0 };
    buckets.set(host, bucket);
    return bucket;
}

async function sleep(ms: number) { if (ms > 0) await new Promise(r => setTimeout(r, ms)); }

export const rateLimitStep: Step = async (ctx) => {
    const cfg = getRateLimitConfig();
    const hostname = (ctx.targetUpstream?.hostname) || (() => { try { return new URL(ctx.req.url).hostname; } catch { return undefined; } })();
    if (!hostname) return ctx;
    const now = Date.now();
    const bucket = getOrCreateBucket(hostname, cfg.capacity);
    refill(bucket, now, cfg.refillPerSecond, cfg.capacity);
    let waitForTokenMs = 0;
    if (bucket.tokens < 1) {
        const deficit = 1 - bucket.tokens;
        waitForTokenMs = Math.ceil((deficit / cfg.refillPerSecond) * 1000);
    }
    const sinceLast = now - bucket.lastRequestMs;
    const waitForMinDelayMs = Math.max(0, cfg.minDelayMs - sinceLast);
    const waitMs = Math.max(waitForTokenMs, waitForMinDelayMs);
    if (waitMs > 0) { await sleep(waitMs); const afterWait = Date.now(); refill(bucket, afterWait, cfg.refillPerSecond, cfg.capacity); }
    bucket.tokens = Math.max(0, bucket.tokens - 1);
    bucket.lastRequestMs = Date.now();
    return ctx;
};

export default rateLimitStep;


