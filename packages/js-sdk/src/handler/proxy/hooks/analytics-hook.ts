import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra } from "../hooks.js";

export type AnalyticsSink = (event: Record<string, unknown>) => Promise<void>;

export class AnalyticsHook implements Hook {
    name = "analytics";
    private sink: AnalyticsSink;

    constructor(sink: AnalyticsSink) {
        this.sink = sink;
    }

    async processCallToolRequest(req: CallToolRequest, extra: RequestExtra) {
        const startedAt = Date.now();
        (req as any)._analyticsStartedAt = startedAt;
        // Emit request event
        try {
            await this.sink({
                kind: "tool.call",
                request_id: extra.requestId,
                server_id: extra.serverId,
                origin: extra.targetUrl,
                method: "tools/call",
                meta: { req },
                ts: new Date().toISOString(),
            });
        } catch {}
        return { resultType: "continue" as const, request: req };
    }

    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra) {
        const startedAt = (req as any)._analyticsStartedAt as number | undefined;
        const latency = typeof startedAt === "number" ? Date.now() - startedAt : undefined;
        const payment = (res?._meta && (res._meta as any)["x402/payment-response"]) || undefined;
        try {
            await this.sink({
                kind: "tool.result",
                request_id: extra.requestId,
                server_id: extra.serverId,
                origin: extra.targetUrl,
                status_code: 200,
                latency_ms: latency,
                payment,
                meta: { res },
                ts: new Date().toISOString(),
            });
        } catch {}
        return { resultType: "continue" as const, response: res };
    }
}


