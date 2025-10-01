import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { Hook, RequestExtra } from "./hooks";
import { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

async function resolveTargetUrl(req: Request): Promise<string | null> {
    // First, try to get target URL from header or query param
    const directUrl = req.headers.get("x-mcpay-target-url")
        ?? new URL(req.url).searchParams.get("target-url");

    if (directUrl) {
        return directUrl;
    }

    // Second, try to resolve from ID parameter (like route.ts does)
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
        try {
            const mcpConfig = await withTransaction(async (tx) => {
                return await txOperations.internal_getMcpServerByServerId(id)(tx);
            });

            if (mcpConfig?.mcpOrigin) {
                return mcpConfig.mcpOrigin;
            }
        } catch (error) {
            // Swallow error, fall through to return null
        }
    }

    return null;
}

function jsonResponse(obj: unknown, status = 200): Response {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "content-type": "application/json" },
    });
}

export function withProxy(hooks: Hook[]) {
    return async (req: Request): Promise<Response> => {
        const targetUrl = await resolveTargetUrl(req);
        if (!targetUrl) {
            return new Response("target-url missing", { status: 400 });
        }

        if (!req.headers.get("content-type")?.includes("json")) {
            return fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
        }

        const body = await req.clone().json().catch((err) => {
            return null;
        });
        if (!body || Array.isArray(body)) {
            return fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
        }

        // Check if this is a tools/call request according to MCP standard
        const isToolCall = body.method === "tools/call";

        // Only process tool calls through hooks
        if (!isToolCall) {
            return fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: JSON.stringify(body)
            });
        }

        const url = new URL(req.url);
        const extra: RequestExtra = {
            requestId: crypto.randomUUID(),
            sessionId: body.params?._meta?.sessionId,
            originalUrl: req.url,
            targetUrl,
            inboundHeaders: new Headers(req.headers),
            serverId: url.searchParams.get("id"),
        };

        // REQUEST hooks (forward)
        const originalRpc = body as Record<string, unknown>;
        let currentReq = body as CallToolRequest;
        for (const h of hooks) {
            if (h.processCallToolRequest) {
                const r = await h.processCallToolRequest(currentReq, extra);
                if (r.resultType === "continue") {
                    currentReq = r.request;
                    continue;
                }
                if (r.resultType === "abort") {
                    return jsonResponse({ error: r.reason, body: r.body }, 400);
                }
                if (r.resultType === "respond") {
                    // Wrap early responses in a JSON-RPC envelope so the client can parse them
                    const id = (originalRpc?.id as string | number | undefined) ?? 0;
                    const envelope = { jsonrpc: "2.0", id, result: r.response } as const;
                    return jsonResponse(envelope, 200);
                }
            }
        }

        // Prepare upstream headers (start from inbound headers)
        const forwardHeaders = new Headers(req.headers);
        // Allow hooks to mutate upstream headers before forwarding
        for (const h of hooks) {
            if (h.prepareUpstreamHeaders) {
                try {
                    await h.prepareUpstreamHeaders(forwardHeaders, currentReq, extra);
                } catch {
                    // Ignore header hook errors to avoid blocking
                }
            }
        }

        // send upstream
        const upstream = await fetch(targetUrl, {
            method: req.method,
            headers: forwardHeaders,
            // Preserve the original JSON-RPC envelope while forwarding modified params
            body: JSON.stringify({
                ...originalRpc,
                // Ensure method stays as tools/call
                method: "tools/call",
                params: currentReq.params ?? (originalRpc["params"] as Record<string, unknown> | undefined)
            }),
        });

        // Check if response is JSON or SSE before trying to parse
        const contentType = upstream.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const isStreaming = contentType.includes("text/event-stream");

        // Unified parsing path: if SSE, collect and parse last data message; if JSON, parse JSON; else pass-through
        let data: unknown;
        if (isStreaming) {
            const text = await upstream.text();
            try {
                const dataLines = text
                    .split('\n')
                    .filter(line => line.startsWith('data: '))
                    .map(line => line.substring(6));
                if (dataLines.length === 0) {
                    data = JSON.parse(text);
                } else {
                    const lastMessage = dataLines[dataLines.length - 1];
                    data = JSON.parse(lastMessage);
                }
            } catch (e) {
                return new Response(text, {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    headers: upstream.headers,
                });
            }
        } else if (isJson) {
            try {
                data = await upstream.json();
            } catch (e) {
                const text = await upstream.text().catch(() => "");
                return new Response(text, {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    headers: upstream.headers,
                });
            }
        } else {
            return new Response(upstream.body, {
                status: upstream.status,
                statusText: upstream.statusText,
                headers: upstream.headers,
            });
        }

        // If the data looks like a JSON-RPC response with a result field, optionally run hooks on the result only
        const maybeRpc = data as Record<string, unknown>;
        if (maybeRpc && typeof maybeRpc === "object" && "jsonrpc" in maybeRpc && "result" in maybeRpc) {
            const envelope = { ...maybeRpc } as Record<string, unknown>;
            const originalResult = (envelope["result"] ?? null) as CallToolResult;

            // RESPONSE hooks (reverse). Hooks must not break RPC envelope.
            let currentRes = originalResult;
            for (const h of hooks.slice().reverse()) {
                if (h.processCallToolResult) {
                    const r = await h.processCallToolResult(currentRes, currentReq, extra);
                    if (r.resultType === "continue") {
                        currentRes = r.response;
                        continue;
                    }
                    if (r.resultType === "abort") {
                        return jsonResponse({ error: r.reason, body: r.body }, 400);
                    }
                }
            }

            envelope["result"] = currentRes as unknown as Record<string, unknown>;
            return new Response(JSON.stringify(envelope), {
                status: upstream.status,
                statusText: upstream.statusText,
                headers: new Headers({ ...Object.fromEntries(upstream.headers), "content-type": "application/json" })
            });
        }

        // If upstream returned a bare CallToolResult-like object (no JSON-RPC envelope), wrap it
        if (maybeRpc && typeof maybeRpc === "object" && !("jsonrpc" in maybeRpc) && ("content" in maybeRpc || "isError" in maybeRpc)) {
            let currentRes = maybeRpc as unknown as CallToolResult;
            for (const h of hooks.slice().reverse()) {
                if (h.processCallToolResult) {
                    const r = await h.processCallToolResult(currentRes, currentReq, extra);
                    if (r.resultType === "continue") {
                        currentRes = r.response;
                        continue;
                    }
                    if (r.resultType === "abort") {
                        return jsonResponse({ error: r.reason, body: r.body }, 400);
                    }
                }
            }

            const id = (originalRpc?.id as string | number | undefined) ?? 0;
            const envelope = { jsonrpc: "2.0", id, result: currentRes };
            return new Response(JSON.stringify(envelope), {
                status: upstream.status,
                statusText: upstream.statusText,
                headers: new Headers({ ...Object.fromEntries(upstream.headers), "content-type": "application/json" })
            });
        }

        // Fallback: return JSON as-is without attempting to run hooks
        return new Response(JSON.stringify(data), {
            status: upstream.status,
            statusText: upstream.statusText,
            headers: new Headers({ ...Object.fromEntries(upstream.headers), "content-type": "application/json" })
        });
    };
}
