// Shared cache entry format so a later "cache write" step can store entries here
export interface CacheEntry {
    response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
    };
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

// In-memory response cache. This is intentionally module-scoped to persist across requests.
export const responseCache = new Map<string, CacheEntry>();

// Compute cache key as method:url:bodyHash
export function getCacheKey(url: string, method: string, body?: ArrayBuffer): string {
    const bodyHash = body ? btoa(String.fromCharCode(...new Uint8Array(body))).substring(0, 32) : '';
    return `${method}:${url}:${bodyHash}`;
}

// Return a hydrated Response if present and not expired; otherwise null
export function getCachedResponse(cacheKey: string): Response | null {
    const entry = responseCache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
        responseCache.delete(cacheKey);
        return null;
    }

    const headers = new Headers(entry.response.headers);
    // Optional hint header for debugging/observability
    headers.set('x-mcpay-cache', 'HIT');

    return new Response(entry.response.body, {
        status: entry.response.status,
        statusText: entry.response.statusText,
        headers
    });
}


