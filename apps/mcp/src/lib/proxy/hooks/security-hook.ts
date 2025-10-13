import type { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Hook, RequestExtra } from "mcpay/handler";

/**
 * Removes sensitive headers from the request
 */
export class SecurityHook implements Hook {
    name = "security";

    private removeSensitiveHeaders(headers: Headers) {
        const sensitive = new Set<string>([
            "authorization",
            "proxy-authorization",
            "cookie",
            "set-cookie",
            "x-api-key",
            "x-api-secret",
            "x-api-token",
            "x-access-token",
            "x-id-token",
            "x-refresh-token",
            "x-supabase-key",
            "x-supabase-auth",
            "x-mcp-secret",
            "x-mcpay-secret",
            "x-mcpay-internal",
            "x-mcpay-target-url",
            "x-client-secret",
            "x-client-token",
            "x-sentry-auth",
        ]);
        const toDelete: string[] = [];
        headers.forEach((_, name) => {
            const lower = name.toLowerCase();
            if (sensitive.has(lower)) {
                toDelete.push(name);
            }
        });
        for (const name of toDelete) {
            headers.delete(name);
        }
    }

    async prepareUpstreamHeaders(headers: Headers, _req: CallToolRequest, _extra: RequestExtra) {
        this.removeSensitiveHeaders(headers);
    }
}


