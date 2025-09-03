import type { Step } from "./types";

export const upstreamStep: Step = async (ctx) => {
    const upstreamUrl = ctx.upstreamUrl?.toString();
    const requestInit = ctx.forwardInit;
    const fetchWithRetry = ctx.fetchWithRetry;
    if (!upstreamUrl || !requestInit || !fetchWithRetry) return ctx;
    const init: RequestInit = { ...requestInit };
    if (init.method && init.method !== 'GET') {
        if (ctx.requestBody) {
            init.body = ctx.requestBody;
        }
    }
    const fetched = await fetchWithRetry(new URL(upstreamUrl), init);
    ctx.rawUpstreamResponse = fetched;
    const forClient = fetched.clone();
    const headers = new Headers();
    forClient.headers.forEach((v, k) => headers.set(k, v));
    const mirrored = new Response(forClient.body, { status: forClient.status, statusText: forClient.statusText, headers });
    ctx.upstreamResponse = mirrored;
    return ctx;
};

export default upstreamStep;


