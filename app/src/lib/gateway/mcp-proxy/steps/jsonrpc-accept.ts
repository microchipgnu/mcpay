import type { Step } from "./types";
import { tryParseJson } from "./utils";

export const jsonrpcAcceptStep: Step = async (ctx) => {
    const method = ctx.req.method.toUpperCase();
    if (method === 'GET') {
        const accept = (ctx.req.headers.get('accept') || '').toLowerCase();
        if (accept.includes('text/event-stream')) ctx.expectsSse = true;
        return ctx;
    }
    if (method !== 'POST') return ctx;

    const contentType = (ctx.req.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) return ctx;

    const jsonData = await tryParseJson(ctx.req);
    if (jsonData === undefined) return ctx;

    function isJsonRpcRequest(obj: unknown): boolean {
        if (!obj || typeof obj !== 'object') return false;
        const o = obj as Record<string, unknown>;
        return typeof o.method === 'string';
    }
    function hasId(obj: unknown): boolean {
        if (!obj || typeof obj !== 'object') return false;
        return Object.prototype.hasOwnProperty.call(obj as object, 'id');
    }
    function isJsonRpcResponse(obj: unknown): boolean {
        if (!obj || typeof obj !== 'object') return false;
        const o = obj as Record<string, unknown>;
        const hasResult = Object.prototype.hasOwnProperty.call(o, 'result');
        const hasError = Object.prototype.hasOwnProperty.call(o, 'error');
        const hasMethod = Object.prototype.hasOwnProperty.call(o, 'method');
        return (hasResult || hasError) && !hasMethod;
    }

    if (Array.isArray(jsonData)) {
        const items = jsonData;
        const requestItems = items.filter(isJsonRpcRequest);
        const withIds = requestItems.filter(hasId);
        const responsesOnly = items.every(isJsonRpcResponse);
        ctx.jsonrpc = { isBatch: true, hasRequests: withIds.length > 0 };
        if (responsesOnly || (requestItems.length > 0 && withIds.length === 0)) {
            ctx.response = new Response(null, { status: 202 });
        }
        return ctx;
    }

    if (typeof jsonData === 'object' && jsonData !== null) {
        const obj = jsonData as Record<string, unknown>;
        const isRequest = isJsonRpcRequest(obj);
        const hasRequestId = hasId(obj);
        const isResponse = isJsonRpcResponse(obj);
        ctx.jsonrpc = { isBatch: false, hasRequests: isRequest && hasRequestId };
        if ((isRequest && !hasRequestId) || isResponse) {
            ctx.response = new Response(null, { status: 202 });
            return ctx;
        }
    }
    return ctx;
};

export default jsonrpcAcceptStep;


