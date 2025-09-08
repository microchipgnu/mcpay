import type { Step } from "./types";
import { getCacheKey, getCachedResponse } from "./cache-utils";

export const cacheReadStep: Step = async (ctx) => {
    if (ctx.req.method !== 'GET') return ctx;
    const cacheKey = ctx.cacheKey ?? getCacheKey(ctx.req.url, ctx.req.method);
    const cached = cacheKey ? getCachedResponse(cacheKey) : null;
    if (cached) { ctx.response = cached; }
    return ctx;
};

export default cacheReadStep;


