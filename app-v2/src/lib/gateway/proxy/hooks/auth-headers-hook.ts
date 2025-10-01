import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import { Hook, RequestExtra } from ".";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";

/**
 * Injects per-server auth headers configured in DB into the forwarded upstream request.
 * Looks up by RequestExtra.serverId.
 */
export class AuthHeadersHook implements Hook {
    name = "auth-headers";

    async processCallToolRequest(req: CallToolRequest) {
        return { resultType: "continue" as const, request: req };
    }

    async prepareUpstreamHeaders(headers: Headers, _req: CallToolRequest, extra: RequestExtra) {
        const serverId = extra.serverId;
        if (!serverId) return;

        try {
            const mcpConfig = await withTransaction(async (tx) => {
                return await txOperations.internal_getMcpServerByServerId(serverId)(tx);
            });
            if (!mcpConfig?.authHeaders || mcpConfig.requireAuth !== true) return;

            const authHeaders = mcpConfig.authHeaders as Record<string, unknown>;
            for (const [key, value] of Object.entries(authHeaders)) {
                if (typeof value === "string" && value.length > 0) {
                    headers.set(key, value);
                }

            }
        } catch {
            // Best-effort only; ignore failures
        }
    }
}


