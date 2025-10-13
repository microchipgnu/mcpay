import type {
    CallToolRequest,
    CallToolResult,
    InitializeResult,
    ListToolsResult,
    ListPromptsResult,
    ListResourcesResult,
    ListResourceTemplatesResult,
    ReadResourceResult,
    Request as McpRequest,
    Result as McpResult,
} from "@modelcontextprotocol/sdk/types.js";
import type {
    Hook,
    RequestExtra,
    InitializeRequestWithContext,
    ListToolsRequestWithContext,
    ListPromptsRequestWithContext,
    ListResourcesRequestWithContext,
    ListResourceTemplatesRequestWithContext,
    ReadResourceRequestWithContext,
} from "../hooks.js";

export type AnalyticsSink = (event: Record<string, unknown>) => Promise<void>;

export class AnalyticsHook implements Hook {
    name = "analytics";
    private sink: AnalyticsSink;
    private origin: string;

    constructor(sink: AnalyticsSink, origin: string) {
        this.sink = sink;
        this.origin = origin;
    }

    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra) {
        console.log("[AnalyticsHook] processCallToolResult called", { res, req, extra });
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processInitializeResult(res: InitializeResult, req: InitializeRequestWithContext, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processListToolsResult(res: ListToolsResult, req: ListToolsRequestWithContext, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processListPromptsResult(res: ListPromptsResult, req: ListPromptsRequestWithContext, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processListResourcesResult(res: ListResourcesResult, req: ListResourcesRequestWithContext, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processListResourceTemplatesResult(
        res: ListResourceTemplatesResult,
        req: ListResourceTemplatesRequestWithContext,
        extra: RequestExtra
    ) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processReadResourceResult(res: ReadResourceResult, req: ReadResourceRequestWithContext, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req.method,
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }

    async processOtherResult(res: McpResult, req: McpRequest, extra: RequestExtra) {
        try {
            this.sink({
                request_id: extra?.requestId,
                server_id: extra?.serverId,
                origin: this.origin,
                method: req?.method || "other",
                meta: { res, req, extra },
                ts: new Date().toISOString(),
            });
        } catch { }
        return { resultType: "continue" as const, response: res };
    }
}


