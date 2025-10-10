import { Hook, RequestExtra } from "./hooks";
import { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

async function resolveTargetUrl(req: Request): Promise<string | null> {
    // First, try to get target URL from header or query param (base64-encoded)
    const directUrlEncoded = req.headers.get("x-mcpay-target-url")
        ?? new URL(req.url).searchParams.get("target-url");

    if (directUrlEncoded) {
        try {

            // The value is base64-encoded, so decode it
            // decodeURIComponent in case it was URL-encoded as well
            const decoded = decodeURIComponent(atob(directUrlEncoded));
            return decoded;
        } catch (e) {
            // If decoding fails, treat as invalid and fall through
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

function wrapUpstreamResponse(upstream: Response): Response {
    // Clone headers to avoid immutable header guards on upstream responses
    const headers = new Headers(upstream.headers);
    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
    });
}

export function withProxy(hooks: Hook[]) {
    return async (req: Request): Promise<Response> => {
        const targetUrl = await resolveTargetUrl(req);
        console.log(`[${new Date().toISOString()}] Target URL: ${targetUrl}`);
        if (!targetUrl) {
            return new Response("target-url missing", { status: 400 });
        }

        if (!req.headers.get("content-type")?.includes("json")) {
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
            return wrapUpstreamResponse(upstream);
        }

        const body = await req.clone().json().catch((err) => {
            return null;
        });
        if (!body || Array.isArray(body)) {
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
            return wrapUpstreamResponse(upstream);
        }

        // Check if this is a tools/call request according to MCP standard
        const isToolCall = body.method === "tools/call";

        // Only process tool calls through hooks
        if (!isToolCall) {
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: JSON.stringify(body)
            });
            return wrapUpstreamResponse(upstream);
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
        let attempts = 0;
        const maxRetries = 1;
        while (true) {
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
            // Remove/normalize hop-by-hop or mismatched headers before sending a new JSON body
            forwardHeaders.delete("content-length");
            forwardHeaders.delete("host");
            forwardHeaders.delete("connection");
            forwardHeaders.delete("transfer-encoding");
            // Ensure correct content type for JSON body
            forwardHeaders.set("content-type", "application/json");

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
                let text: string | null = null;
                try {
                    text = await upstream.text();
                } catch (e) {
                    // If reading text fails (e.g., decompression), pass upstream through as-is
                    return new Response(upstream.body, {
                        status: upstream.status,
                        statusText: upstream.statusText,
                        headers: new Headers(upstream.headers),
                    });
                }
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
                        headers: new Headers(upstream.headers),
                    });
                }
            } else if (isJson) {
                try {
                    data = await upstream.json();
                } catch (e) {
                    // If parsing fails (e.g., decompression), pass upstream through as-is
                    return new Response(upstream.body, {
                        status: upstream.status,
                        statusText: upstream.statusText,
                        headers: new Headers(upstream.headers),
                    });
                }
            } else {
                return new Response(upstream.body, {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    headers: new Headers(upstream.headers),
                });
            }

            // If the data looks like a JSON-RPC response with a result field, optionally run hooks on the result only
            const maybeRpc = data as Record<string, unknown>;
            if (maybeRpc && typeof maybeRpc === "object" && "jsonrpc" in maybeRpc && "result" in maybeRpc) {
                const envelope = { ...maybeRpc } as Record<string, unknown>;
                const originalResult = (envelope["result"] ?? null) as CallToolResult;

                // RESPONSE hooks (reverse). Hooks must not break RPC envelope.
                let currentRes = originalResult;
                let requestedRetry: { request: CallToolRequest } | null = null;
                for (const h of hooks.slice().reverse()) {
                    if (h.processCallToolResult) {
                        const r = await h.processCallToolResult(currentRes, currentReq, extra);
                        if (r.resultType === "continue") {
                            currentRes = r.response;
                            continue;
                        }
                        if (r.resultType === "retry") {
                            requestedRetry = { request: r.request };
                            break;
                        }
                        if (r.resultType === "abort") {
                            return jsonResponse({ error: r.reason, body: r.body }, 400);
                        }
                    }
                }

                if (requestedRetry && attempts < maxRetries) {
                    attempts++;
                    currentReq = requestedRetry.request;
                    continue; // resend
                }

                envelope["result"] = currentRes as unknown as Record<string, unknown>;
                const headers = new Headers(upstream.headers);
                headers.set("content-type", "application/json");
                return new Response(JSON.stringify(envelope), {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    headers
                });
            }

            // If upstream returned a bare CallToolResult-like object (no JSON-RPC envelope), wrap it
            if (maybeRpc && typeof maybeRpc === "object" && !("jsonrpc" in maybeRpc) && ("content" in maybeRpc || "isError" in maybeRpc)) {
                let currentRes = maybeRpc as unknown as CallToolResult;
                let requestedRetry: { request: CallToolRequest } | null = null;
                for (const h of hooks.slice().reverse()) {
                    if (h.processCallToolResult) {
                        const r = await h.processCallToolResult(currentRes, currentReq, extra);
                        if (r.resultType === "continue") {
                            currentRes = r.response;
                            continue;
                        }
                        if (r.resultType === "retry") {
                            requestedRetry = { request: r.request };
                            break;
                        }
                        if (r.resultType === "abort") {
                            return jsonResponse({ error: r.reason, body: r.body }, 400);
                        }
                    }
                }

                if (requestedRetry && attempts < maxRetries) {
                    attempts++;
                    currentReq = requestedRetry.request;
                    continue; // resend
                }

                const id = (originalRpc?.id as string | number | undefined) ?? 0;
                const envelope = { jsonrpc: "2.0", id, result: currentRes };
                const headers = new Headers(upstream.headers);
                headers.set("content-type", "application/json");
                return new Response(JSON.stringify(envelope), {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    headers
                });
            }

            // Fallback: return JSON as-is without attempting to run hooks
            const headers = new Headers(upstream.headers);
            headers.set("content-type", "application/json");
            return new Response(JSON.stringify(data), {
                status: upstream.status,
                statusText: upstream.statusText,
                headers
            });
        }
    };
}
