import env from "../../env.js";

export const analyticsSink = async (event: Record<string, unknown>) => {
    if (!env.MCP_DATA_URL) return;
    try {
        const payload = {
            ts: (event as any).ts || new Date().toISOString(),
            origin_raw: (event as any).origin,
            server_id: (event as any).server_id,
            method: (event as any).method,
            jsonrpc_id: (event as any).request_id,
            http_status: (event as any).status_code,
            duration_ms: (event as any).latency_ms,
            request: (event as any).meta?.req || {},
            response: (event as any).meta?.res || {},
            meta: {
                kind: (event as any).kind,
                payment: (event as any).payment,
            },
        };
        await fetch(`${env.MCP_DATA_URL}/ingest/rpc`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                Authorization: `Bearer ${env.MCP_DATA_SECRET}`,
            },
            body: JSON.stringify([payload]),
        });
    } catch {}
};