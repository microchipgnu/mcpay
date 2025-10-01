// minimal-mcp-proxy.ts
import type {
    CallToolRequest,
    CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

export interface RequestExtra {
    requestId: string | number;
    sessionId?: string;
}

export type ToolCallRequestHookResult =
    | { resultType: "continue"; request: CallToolRequest }
    | { resultType: "abort"; reason: string; body?: unknown }
    | { resultType: "respond"; response: CallToolResult };

export type ToolCallResponseHookResult =
    | { resultType: "continue"; response: CallToolResult }
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
}
