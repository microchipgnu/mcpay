// minimal-mcp-proxy.ts
import type {
    CallToolRequest,
    CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

export interface RequestExtra {
    requestId: string | number;
    sessionId?: string;
    // Absolute URL string of the original incoming request
    originalUrl?: string;
    // Resolved upstream target URL
    targetUrl?: string;
    // Inbound request headers (read-only clone)
    inboundHeaders?: Headers;
    // Optional server identifier parsed from query parameters
    serverId?: string | null;
}

export type ToolCallRequestHookResult =
    | { resultType: "continue"; request: CallToolRequest }
    | { resultType: "abort"; reason: string; body?: unknown }
    | { resultType: "respond"; response: CallToolResult };

export type ToolCallResponseHookResult =
    | { resultType: "continue"; response: CallToolResult }
    | { resultType: "retry"; request: CallToolRequest }
    | { resultType: "abort"; reason: string; body?: unknown };

export interface Hook {
    name: string;
    processCallToolRequest?(
        req: CallToolRequest,
        extra: RequestExtra
    ): Promise<ToolCallRequestHookResult>;
    processCallToolResult?(
        res: CallToolResult,
        original: CallToolRequest,
        extra: RequestExtra
    ): Promise<ToolCallResponseHookResult>;
    /**
     * Optional stage to allow hooks to mutate headers that will be forwarded to the upstream server.
     * Hooks should only set or delete headers on the provided Headers instance.
     */
    prepareUpstreamHeaders?(
        headers: Headers,
        req: CallToolRequest,
        extra: RequestExtra
    ): Promise<void>;
}
