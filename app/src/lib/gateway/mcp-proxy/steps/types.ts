import { Context } from "hono";
import type { PricingEntry, ToolCall, UserWithWallet } from "@/types";

export interface PipelineCtx {
    req: Request;             // original request (don’t mutate)
    hono: Context; // only for adapter in/out
    startTime: number;
    response?: Response;      // set to short-circuit
    user?: UserWithWallet | null;
    authMethod?: 'api_key' | 'session' | 'wallet_header' | 'none';
    toolCall?: ToolCall | null;
    pickedPricing?: PricingEntry | null;
    upstreamUrl?: URL;
    upstreamHeaders?: Headers;
    requestBody?: ArrayBuffer;        // parsed once
    fetchWithRetry?: (url: URL, init: RequestInit) => Promise<Response>;
    upstreamResponse?: Response;
    rawUpstreamResponse?: Response;
    cacheKey?: string;
    jsonrpc?: { isBatch: boolean; hasRequests: boolean };
    targetUpstream?: URL;
    forwardInit?: RequestInit;
    expectsSse?: boolean;
    paymentHeader?: string;
}

export type Step = (ctx: PipelineCtx) => Promise<PipelineCtx>;


