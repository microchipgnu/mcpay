import { Request as McpRequest } from "@modelcontextprotocol/sdk/types.js";
import { Hook, RequestExtra, CallToolRequestWithContext } from "../hooks";

/**
 * Injects per-server auth headers configured in DB into the forwarded upstream request.
 * Looks up by RequestExtra.serverId.
 */
type ResolvedHeaders = Headers | Record<string, string> | Array<[string, string]> | null | undefined;

export type ResolveAuthHeaders = (
    req: McpRequest,
    extra: RequestExtra
) => Promise<ResolvedHeaders> | ResolvedHeaders;

export class AuthHeadersHook implements Hook {
    name = "auth-headers";

    constructor(private readonly resolveAuthHeaders: ResolveAuthHeaders) {}

    async processCallToolRequest(req: CallToolRequestWithContext, _extra: RequestExtra) {
        return { resultType: "continue" as const, request: req };
    }

    async prepareUpstreamHeaders(headers: Headers, req: McpRequest, extra: RequestExtra) {
        const resolved = await this.resolveAuthHeaders(req, extra);
        if (!resolved) return;

        if (resolved instanceof Headers) {
            resolved.forEach((value, key) => {
                if (typeof value === "string" && value.length > 0) headers.set(key, value);
            });
            return;
        }

        if (Array.isArray(resolved)) {
            for (const [key, value] of resolved) {
                if (typeof value === "string" && value.length > 0) headers.set(key, value);
            }
            return;
        }

        for (const [key, value] of Object.entries(resolved)) {
            if (typeof value === "string" && value.length > 0) headers.set(key, value);
        }
    }
}


