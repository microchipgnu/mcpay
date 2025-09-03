import type { Step } from "./types";
import { filterIncomingHeaders } from "./header-utils";

export const browserHeadersStep: Step = async (ctx) => {
    const prepared = filterIncomingHeaders(ctx.req.headers);
    if (!prepared.has('user-agent')) {
        prepared.set('user-agent', 'Mozilla/5.0 (compatible; MCPayProxy/1.0)');
    }
    prepared.set('accept', 'application/json, text/event-stream, text/plain, */*');
    prepared.set('accept-language', 'en-US,en;q=0.9');
    prepared.set('accept-encoding', 'gzip, deflate, br');
    prepared.set('sec-fetch-dest', 'empty');
    prepared.set('sec-fetch-mode', 'cors');
    prepared.set('sec-fetch-site', 'cross-site');
    try {
        const originalUrl = new URL(ctx.req.url);
        const refererUrl = ctx.targetUpstream || originalUrl;
        prepared.set('referer', refererUrl.origin);
        prepared.set('origin', refererUrl.origin);
    } catch {
        prepared.set('referer', 'https://mcpay.fun');
        prepared.set('origin', 'https://mcpay.fun');
    }
    if (!prepared.has('sec-ch-ua')) prepared.set('sec-ch-ua', '"Chromium";v="120", "Not A(Brand";v="24", "Google Chrome";v="120"');
    if (!prepared.has('sec-ch-ua-mobile')) prepared.set('sec-ch-ua-mobile', '?0');
    if (!prepared.has('sec-ch-ua-platform')) prepared.set('sec-ch-ua-platform', '"macOS"');
    const walletAddress = ctx.user?.walletAddress || '';
    prepared.set('x-mcpay-wallet-address', walletAddress);
    ctx.upstreamHeaders = prepared;
    return ctx;
};

export default browserHeadersStep;


