import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra } from "../hooks.js";

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
}


