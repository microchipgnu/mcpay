import { Hook, RequestExtra } from "./hooks.js";
import {
    CallToolRequest,
    CallToolResult,
    InitializeRequest,
    InitializeResult,
    ListPromptsRequest,
    ListPromptsResult,
    ListResourcesRequest,
    ListResourcesResult,
    ListResourceTemplatesRequest,
    ListResourceTemplatesResult,
    ListToolsRequest,
    ListToolsResult,
    Notification,
    ReadResourceRequest,
    ReadResourceResult,
    Request as McpRequest,
    Result as McpResult
} from "@modelcontextprotocol/sdk/types.js";

function jsonResponse(obj: unknown, status = 200): Response {
    return new Response(JSON.stringify(obj), {
        status,
        headers: { "content-type": "application/json" },
    });
}

function wrapUpstreamResponse(upstream: Response): Response {
    // Clone headers to avoid immutable header guards on upstream responses
    const headers = new Headers(upstream.headers);
    // If the runtime already decompressed the body, avoid advertising compression again
    headers.delete("content-encoding");
    headers.delete("content-length");
    headers.delete("transfer-encoding");
    return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
    });
}

export function withProxy(targetUrl: string, hooks: Hook[]) {
    return async (req: Request): Promise<Response> => {
        console.log(`[${new Date().toISOString()}] Target URL: ${targetUrl}`);

        // Preserve original body for non-JSON requests
        if (!req.headers.get("content-type")?.includes("json")) {
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
            return wrapUpstreamResponse(upstream);
        }

        // Parse JSON while preserving original body stream
        let originalRpc: Record<string, unknown> | null = null;
        let originalBodyText: string | null = null;
        
        try {
            // Clone request to preserve original body for forwarding
            const clonedReq = req.clone();
            originalBodyText = await clonedReq.text();
            
            // Parse JSON for hook processing
            originalRpc = JSON.parse(originalBodyText) as Record<string, unknown>;
        } catch (err) {
            // If JSON parsing fails, forward original body
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: req.body,
                duplex: 'half'
            } as RequestInit);
            return wrapUpstreamResponse(upstream);
        }

        if (!originalRpc || Array.isArray(originalRpc)) {
            // Forward original body for non-object JSON
            const upstream = await fetch(targetUrl, {
                method: req.method,
                headers: req.headers,
                body: originalBodyText,
                duplex: 'half'
            } as RequestInit);
            return wrapUpstreamResponse(upstream);
        }

        // Generalized MCP routing
        const method = String(originalRpc["method"] || "");
        const isNotification = !("id" in originalRpc);

        const url = new URL(req.url);
        const extra: RequestExtra = {
            requestId: crypto.randomUUID(),
            sessionId: (originalRpc?.params as any)?._meta?.sessionId,
            originalUrl: req.url,
            targetUrl,
            inboundHeaders: new Headers(req.headers),
            serverId: url.searchParams.get("id"),
        };

        // Notifications: allow hooks to observe, then forward
        if (isNotification) {
            const notification = originalRpc as unknown as Notification;
            for (const h of hooks) {
                if (h.processNotification) {
                    try { await h.processNotification(notification); } catch (e) {
                        if (h.processNotificationError) {
                            await h.processNotificationError({ code: 0, message: (e as Error)?.message || "notification_error" }, notification);
                        }
                    }
                }
            }
            const forwardHeaders = new Headers(req.headers);
            forwardHeaders.delete("content-length");
            forwardHeaders.delete("host");
            forwardHeaders.delete("connection");
            forwardHeaders.delete("transfer-encoding");
            forwardHeaders.delete("content-encoding");
            forwardHeaders.set("content-type", "application/json");
            // Forward original body text instead of reconstructing JSON
            const upstream = await fetch(targetUrl, { method: req.method, headers: forwardHeaders, body: originalBodyText });
            return wrapUpstreamResponse(upstream);
        }

        // Helper for non-tool methods
        const handleGeneric = async <TReq extends McpRequest, TRes extends McpResult>(
            currentReq: TReq,
            runRequest: (h: Hook, req: TReq) => Promise<{ resultType: "continue"; request: TReq } | { resultType: "respond"; response: TRes } | { resultType: "continueAsync"; response: TRes }> | null,
            runResponse: (h: Hook, res: TRes, req: TReq) => Promise<{ resultType: "continue"; response: TRes }> | null,
            runError: (h: Hook, err: { code: number; message: string; data?: unknown }, req: TReq) => Promise<{ resultType: "continue" } | { resultType: "respond"; response: TRes }> | null,
            methodName: string
        ): Promise<Response> => {
            const originalRpcLocal = originalRpc;
            for (const h of hooks) {
                const r = await (runRequest(h, currentReq) || Promise.resolve(null));
                if (!r) continue;
                if (r.resultType === "continue") { currentReq = r.request; continue; }
                if (r.resultType === "continueAsync") {
                    const id = (originalRpcLocal?.id as string | number | undefined) ?? 0;
                    const envelope = { jsonrpc: "2.0", id, result: r.response } as const;
                    return jsonResponse(envelope, 200);
                }
                if (r.resultType === "respond") {
                    const id = (originalRpcLocal?.id as string | number | undefined) ?? 0;
                    const envelope = { jsonrpc: "2.0", id, result: r.response } as const;
                    return jsonResponse(envelope, 200);
                }
            }

            const forwardHeaders = new Headers(req.headers);
            for (const h of hooks) {
                if (h.prepareUpstreamHeaders) {
                    try { await h.prepareUpstreamHeaders(forwardHeaders, req, extra); } catch {}
                }
            }
            forwardHeaders.delete("content-length");
            forwardHeaders.delete("host");
            forwardHeaders.delete("connection");
            forwardHeaders.delete("transfer-encoding");
            forwardHeaders.delete("content-encoding");
            forwardHeaders.set("content-type", "application/json");

            let upstream: Response;
            try {
                // Check if hooks modified the request - if so, reconstruct body
                const hasModifications = currentReq !== (originalRpcLocal as TReq);
                if (hasModifications) {
                    // Hooks modified the request, reconstruct body
                    upstream = await fetch(targetUrl, {
                        method: req.method,
                        headers: forwardHeaders,
                        body: JSON.stringify({
                            ...originalRpcLocal,
                            method: methodName,
                            params: (currentReq as unknown as { params?: unknown })?.params ?? (originalRpcLocal["params"] as Record<string, unknown> | undefined)
                        }),
                    });
                } else {
                    // No modifications, forward original body
                    upstream = await fetch(targetUrl, {
                        method: req.method,
                        headers: forwardHeaders,
                        body: originalBodyText,
                    });
                }
            } catch (e) {
                for (const h of hooks.slice().reverse()) {
                    const rr = await (runError(h, { code: 0, message: (e as Error)?.message || "upstream_error" }, currentReq) || Promise.resolve(null));
                    if (rr && rr.resultType === "respond") {
                        const id = (originalRpcLocal?.id as string | number | undefined) ?? 0;
                        const envelope = { jsonrpc: "2.0", id, result: rr.response } as const;
                        return jsonResponse(envelope, 200);
                    }
                }
                return jsonResponse({ jsonrpc: "2.0", id: (originalRpcLocal?.id as any) ?? 0, error: { code: -32000, message: "Upstream fetch failed" } }, 502);
            }

            const contentType = upstream.headers.get("content-type") || "";
            const isJson = contentType.includes("application/json");
            const isStreaming = contentType.includes("text/event-stream");

            let data: unknown;
            if (isStreaming) {
                let text: string | null = null;
                try { text = await upstream.text(); } catch { return wrapUpstreamResponse(upstream); }
                try {
                    const dataLines = text.split('\n').filter(line => line.startsWith('data: ')).map(line => line.substring(6));
                    if (dataLines.length === 0) { data = JSON.parse(text); } else { const lastMessage = dataLines[dataLines.length - 1]; data = JSON.parse(lastMessage); }
                } catch { return wrapUpstreamResponse(upstream); }
            } else if (isJson) {
                try { data = await upstream.json(); } catch { return wrapUpstreamResponse(upstream); }
            } else {
                return wrapUpstreamResponse(upstream);
            }

            const maybeRpc = data as Record<string, unknown>;
            if (maybeRpc && typeof maybeRpc === "object" && "jsonrpc" in maybeRpc) {
                if ("error" in maybeRpc) {
                    for (const h of hooks.slice().reverse()) {
                        const rr = await (runError(h, { code: (maybeRpc.error as any)?.code ?? -32000, message: (maybeRpc.error as any)?.message ?? "error" }, currentReq) || Promise.resolve(null));
                        if (rr && rr.resultType === "respond") {
                            const id = (originalRpcLocal?.id as string | number | undefined) ?? 0;
                            const envelope = { jsonrpc: "2.0", id, result: rr.response } as const;
                            return jsonResponse(envelope, 200);
                        }
                    }
                    return wrapUpstreamResponse(upstream);
                }
                if ("result" in maybeRpc) {
                    let currentRes = (maybeRpc["result"] ?? null) as TRes;
                    for (const h of hooks.slice().reverse()) {
                        const r = await (runResponse(h, currentRes, currentReq) || Promise.resolve(null));
                        if (r && r.resultType === "continue") { currentRes = r.response; continue; }
                    }
                    const id = (originalRpcLocal?.id as string | number | undefined) ?? 0;
                    const envelope = { jsonrpc: "2.0", id, result: currentRes };
                    const headers = new Headers(upstream.headers);
                    headers.delete("content-encoding"); headers.delete("content-length"); headers.delete("transfer-encoding"); headers.set("content-type", "application/json");
                    return new Response(JSON.stringify(envelope), { status: upstream.status, statusText: upstream.statusText, headers });
                }
            }

            return wrapUpstreamResponse(upstream);
        };

        switch (method) {
            case "tools/call": {
                // Specialized tools/call handler with retry support
                let currentReq = originalRpc as CallToolRequest;

                // request hooks
                for (const h of hooks) {
                    if (!h.processCallToolRequest) continue;
                    const r = await h.processCallToolRequest(currentReq, extra);
                    if (r.resultType === "continue") { currentReq = r.request; continue; }
                    if (r.resultType === "continueAsync") {
                        const id = (originalRpc?.id as string | number | undefined) ?? 0;
                        const envelope = { jsonrpc: "2.0", id, result: r.response } as const;
                        return jsonResponse(envelope, 200);
                    }
                    if (r.resultType === "respond") {
                        const id = (originalRpc?.id as string | number | undefined) ?? 0;
                        const envelope = { jsonrpc: "2.0", id, result: r.response } as const;
                        return jsonResponse(envelope, 200);
                    }
                }

                let attempts = 0;
                const maxRetries = 1;
                while (true) {
                    const forwardHeaders = new Headers(req.headers);
                    for (const h of hooks) {
                        if (h.prepareUpstreamHeaders) {
                            try { await h.prepareUpstreamHeaders(forwardHeaders, req, extra); } catch {}
                        }
                    }
                    forwardHeaders.delete("content-length");
                    forwardHeaders.delete("host");
                    forwardHeaders.delete("connection");
                    forwardHeaders.delete("transfer-encoding");
                    forwardHeaders.delete("content-encoding");
                    forwardHeaders.set("content-type", "application/json");

                    // Check if hooks modified the request - if so, reconstruct body
                    const hasModifications = currentReq !== (originalRpc as CallToolRequest);
                    let upstream: Response;
                    if (hasModifications) {
                        // Hooks modified the request, reconstruct body
                        upstream = await fetch(targetUrl, {
                            method: req.method,
                            headers: forwardHeaders,
                            body: JSON.stringify({
                                ...originalRpc,
                                method: "tools/call",
                                params: currentReq.params ?? (originalRpc["params"] as Record<string, unknown> | undefined)
                            }),
                        });
                    } else {
                        // No modifications, forward original body
                        upstream = await fetch(targetUrl, {
                            method: req.method,
                            headers: forwardHeaders,
                            body: originalBodyText,
                        });
                    }

                    const contentType = upstream.headers.get("content-type") || "";
                    const isJson = contentType.includes("application/json");
                    const isStreaming = contentType.includes("text/event-stream");

                    let data: unknown;
                    if (isStreaming) {
                        let text: string | null = null;
                        try { text = await upstream.text(); } catch { return wrapUpstreamResponse(upstream); }
                        try {
                            const dataLines = text.split('\n').filter(line => line.startsWith('data: ')).map(line => line.substring(6));
                            if (dataLines.length === 0) { data = JSON.parse(text); } else { const lastMessage = dataLines[dataLines.length - 1]; data = JSON.parse(lastMessage); }
                        } catch { return wrapUpstreamResponse(upstream); }
                    } else if (isJson) {
                        try { data = await upstream.json(); } catch { return wrapUpstreamResponse(upstream); }
                    } else {
                        return wrapUpstreamResponse(upstream);
                    }

                    const maybeRpc = data as Record<string, unknown>;
                    if (maybeRpc && typeof maybeRpc === "object" && "jsonrpc" in maybeRpc && "result" in maybeRpc) {
                        let currentRes = (maybeRpc["result"] ?? null) as CallToolResult;
                        let requestedRetry: { request: CallToolRequest } | null = null;
                        for (const h of hooks.slice().reverse()) {
                            if (!h.processCallToolResult) continue;
                            const r = await h.processCallToolResult(currentRes, currentReq, extra);
                            if (r.resultType === "continue") { currentRes = r.response; continue; }
                            if ((r as { resultType: string } | null)?.resultType === "retry") { requestedRetry = { request: (r as { request: CallToolRequest } as any).request }; break; }
                            if ((r as { resultType: string } | null)?.resultType === "abort") {
                                const rr = r as unknown as { reason: string; body?: unknown };
                                return jsonResponse({ error: rr.reason, body: rr.body }, 400);
                            }
                        }
                        if (requestedRetry && attempts < maxRetries) { attempts++; currentReq = requestedRetry.request; continue; }
                        const id = (originalRpc?.id as string | number | undefined) ?? 0;
                        const envelope = { jsonrpc: "2.0", id, result: currentRes };
                        const headers = new Headers(upstream.headers);
                        headers.delete("content-encoding"); headers.delete("content-length"); headers.delete("transfer-encoding"); headers.set("content-type", "application/json");
                        return new Response(JSON.stringify(envelope), { status: upstream.status, statusText: upstream.statusText, headers });
                    }

                    // If upstream returns bare result-like, wrap it
                    if (maybeRpc && typeof maybeRpc === "object" && !("jsonrpc" in maybeRpc) && ("content" in maybeRpc || "isError" in maybeRpc)) {
                        let currentRes = maybeRpc as unknown as CallToolResult;
                        let requestedRetry: { request: CallToolRequest } | null = null;
                        for (const h of hooks.slice().reverse()) {
                            if (!h.processCallToolResult) continue;
                            const r = await h.processCallToolResult(currentRes, currentReq, extra);
                            if (r.resultType === "continue") { currentRes = r.response; continue; }
                            if ((r as { resultType: string } | null)?.resultType === "retry") { requestedRetry = { request: (r as { request: CallToolRequest } as any).request }; break; }
                            if ((r as { resultType: string } | null)?.resultType === "abort") {
                                const rr = r as unknown as { reason: string; body?: unknown };
                                return jsonResponse({ error: rr.reason, body: rr.body }, 400);
                            }
                        }
                        if (requestedRetry && attempts < maxRetries) { attempts++; currentReq = requestedRetry.request; continue; }
                        const id = (originalRpc?.id as string | number | undefined) ?? 0;
                        const envelope = { jsonrpc: "2.0", id, result: currentRes };
                        const headers = new Headers(upstream.headers);
                        headers.delete("content-encoding"); headers.delete("content-length"); headers.delete("transfer-encoding"); headers.set("content-type", "application/json");
                        return new Response(JSON.stringify(envelope), { status: upstream.status, statusText: upstream.statusText, headers });
                    }

                    // Fallback
                    return wrapUpstreamResponse(upstream);
                }
            }
            
            case "initialize":
                return handleGeneric<InitializeRequest, InitializeResult>(
                    originalRpc as InitializeRequest,
                    (h, reqObj) => h.processInitializeRequest ? h.processInitializeRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processInitializeResult ? h.processInitializeResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processInitializeError ? h.processInitializeError(err, reqObj, extra) : null,
                    "initialize"
                );
            case "tools/list":
                return handleGeneric<ListToolsRequest, ListToolsResult>(
                    originalRpc as ListToolsRequest,
                    (h, reqObj) => h.processListToolsRequest ? h.processListToolsRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processListToolsResult ? h.processListToolsResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processListToolsError ? h.processListToolsError(err, reqObj, extra) : null,
                    "tools/list"
                );
            case "prompts/list":
                return handleGeneric<ListPromptsRequest, ListPromptsResult>(
                    originalRpc as ListPromptsRequest,
                    (h, reqObj) => h.processListPromptsRequest ? h.processListPromptsRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processListPromptsResult ? h.processListPromptsResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processListPromptsError ? h.processListPromptsError(err, reqObj, extra) : null,
                    "prompts/list"
                );
            case "resources/list":
                return handleGeneric<ListResourcesRequest, ListResourcesResult>(
                    originalRpc as ListResourcesRequest,
                    (h, reqObj) => h.processListResourcesRequest ? h.processListResourcesRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processListResourcesResult ? h.processListResourcesResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processListResourcesError ? h.processListResourcesError(err, reqObj, extra) : null,
                    "resources/list"
                );
            case "resources/templates/list":
                return handleGeneric<ListResourceTemplatesRequest, ListResourceTemplatesResult>(
                    originalRpc as ListResourceTemplatesRequest,
                    (h, reqObj) => h.processListResourceTemplatesRequest ? h.processListResourceTemplatesRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processListResourceTemplatesResult ? h.processListResourceTemplatesResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processListResourceTemplatesError ? h.processListResourceTemplatesError(err, reqObj, extra) : null,
                    "resources/templates/list"
                );
            case "resources/read":
                return handleGeneric<ReadResourceRequest, ReadResourceResult>(
                    originalRpc as ReadResourceRequest,
                    (h, reqObj) => h.processReadResourceRequest ? h.processReadResourceRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processReadResourceResult ? h.processReadResourceResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processReadResourceError ? h.processReadResourceError(err, reqObj, extra) : null,
                    "resources/read"
                );
            default:
                return handleGeneric<McpRequest, McpResult>(
                    originalRpc as McpRequest,
                    (h, reqObj) => h.processOtherRequest ? h.processOtherRequest(reqObj, extra) : null,
                    (h, res, reqObj) => h.processOtherResult ? h.processOtherResult(res, reqObj, extra) : null,
                    (h, err, reqObj) => h.processOtherError ? h.processOtherError(err, reqObj, extra) : null,
                    method
                );
        }
    };
}
