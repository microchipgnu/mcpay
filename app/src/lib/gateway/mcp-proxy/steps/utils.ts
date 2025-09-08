// Utility: safe JSON parse of request body (clone-based)
export async function tryParseJson(req: Request): Promise<unknown | undefined> {
    try {
        const contentType = req.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) return undefined;
        const cloned = req.clone();
        const text = await cloned.text();
        if (!text) return undefined;
        try { return JSON.parse(text); } catch { return undefined; }
    } catch { return undefined; }
}

// Helper: capture upstream response data safely (avoid SSE)
export async function captureResponseData(upstream: Response): Promise<Record<string, unknown> | undefined> {
    try {
        const cloned = upstream.clone();
        const contentType = cloned.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream')) return undefined;
        const text = await cloned.text();
        if (!text) return undefined;
        try { return JSON.parse(text); } catch { return { response: text } as Record<string, unknown>; }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] Could not capture response data:`, e);
        return undefined;
    }
}


