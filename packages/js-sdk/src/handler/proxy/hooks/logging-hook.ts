import { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Hook, RequestExtra } from "../hooks";

export class LoggingHook implements Hook {
    name = "logging";
    async processCallToolRequest(req: CallToolRequest, extra: RequestExtra) {
        console.log(`[${extra.requestId}] Tool called: ${JSON.stringify(req, null, 2)}`);
        return { resultType: "continue" as const, request: req };
    }
    async processCallToolResult(res: CallToolResult, req: CallToolRequest, extra: RequestExtra) {
        console.log(`[${extra.requestId}] Response from: ${req.params.name}`);
        console.log(`[${extra.requestId}] Response: ${JSON.stringify(res, null, 2)}`);
        // Do not mutate the response shape; pass through unchanged to preserve JSON-RPC envelope expectations
        return { resultType: "continue" as const, response: res };
    }
}