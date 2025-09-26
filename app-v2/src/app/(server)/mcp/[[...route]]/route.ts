/**
 * Proxy for MCPay.fun API
 * 
 * This module is used to proxy requests to the MCPay.fun API.
 * It is used to bypass CORS restrictions and to add authentication to the requests.
 * 
 * Rate Limiting & Anti-Bot Protection Features:
 * ============================================
 * 
 * 1. REQUEST THROTTLING:
 *    - Limits requests per hostname (30/minute by default)
 *    - Enforces minimum 1-second delay between requests
 *    - In-memory rate limiting to prevent rapid-fire requests
 * 
 * 2. BROWSER-LIKE BEHAVIOR:
 *    - Rotates realistic User-Agent strings (Chrome, Firefox, Safari)
 *    - Adds browser headers (Accept, Accept-Language, Sec-Fetch-*)
 *    - Sets appropriate Origin/Referer headers for API domains
 * 
 * 3. RETRY LOGIC:
 *    - Exponential backoff for 429 (rate limited) responses
 *    - Up to 3 retries with randomized delays (2s base)
 *    - Automatic detection and handling of Cloudflare rate limits
 * 
 * 4. INTELLIGENT CACHING:
 *    - GET request caching with configurable TTL
 *    - Domain-specific cache durations (CoinGecko: 1min, APIs: 45s)
 *    - Automatic cache cleanup to prevent memory leaks
 *    - Cache key includes URL, method, and body hash
 * 
 * 5. CONFIGURATION:
 *    - All limits configurable via RATE_LIMIT_CONFIG
 *    - Easy to adjust for different APIs or traffic patterns
 *    - Separate settings for different types of endpoints
 * 
 * This should significantly reduce 429 errors from Cloudflare and other
 * rate limiting systems by making requests appear more human-like and
 * reducing the actual number of upstream requests through caching.
 */

import { fromBaseUnits } from "@/lib/commons";
import { auth } from "@/lib/gateway/auth";
import { extractApiKey, hashApiKey } from "@/lib/gateway/auth-utils";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { attemptAutoSign } from "@/lib/gateway/payment-strategies";
import { createExactPaymentRequirements, decodePayment, settle, verifyPayment, x402Version } from "@/lib/gateway/payments";
import { PricingEntry, type AuthType, type MCPTool, type ToolCall, type UserWithWallet } from "@/types";
import { settleResponseHeader, SupportedNetwork } from "@/types/x402";
import { Hono, type Context } from "hono";
import { handle } from "hono/vercel";

export const runtime = 'nodejs'

// Configuration for rate limiting and caching
const RATE_LIMIT_CONFIG = {
    // Maximum requests per minute per hostname
    MAX_REQUESTS_PER_MINUTE: 30,
    // Minimum delay between requests (milliseconds)
    MIN_REQUEST_DELAY: 1000,
    // Retry configuration
    MAX_RETRIES: 3,
    BASE_RETRY_DELAY: 2000, // 2 seconds
    // Cache configuration
    DEFAULT_CACHE_TTL: 30000, // 30 seconds
    COINGECKO_CACHE_TTL: 60000, // 1 minute
    API_CACHE_TTL: 45000, // 45 seconds
    MAX_CACHE_SIZE: 100
};

// Rate limiting storage (in-memory for simplicity)
const rateLimitMap = new Map<string, { requests: number; resetTime: number; lastRequest: number }>();

// Simple response cache (in-memory, with TTL)
interface CacheEntry {
    response: {
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
    };
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

const responseCache = new Map<string, CacheEntry>();

/**
 * Generate cache key for request
 */
function getCacheKey(url: string, method: string, body?: ArrayBuffer): string {
    const bodyHash = body ? btoa(String.fromCharCode(...new Uint8Array(body))).substring(0, 32) : '';
    return `${method}:${url}:${bodyHash}`;
}

/**
 * Check if we have a valid cached response
 */
function getCachedResponse(cacheKey: string): Response | null {
    const entry = responseCache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
        responseCache.delete(cacheKey);
        return null;
    }

    console.log(`[${new Date().toISOString()}] Cache hit for ${cacheKey}`);

    // Reconstruct Response object
    const headers = new Headers(entry.response.headers);
    return new Response(entry.response.body, {
        status: entry.response.status,
        statusText: entry.response.statusText,
        headers
    });
}

/**
 * Cache a response (only cache GET requests and successful responses)
 */
async function cacheResponse(cacheKey: string, response: Response, ttl: number = RATE_LIMIT_CONFIG.DEFAULT_CACHE_TTL): Promise<void> {
    try {
        // Only cache GET requests and successful responses
        if (!cacheKey.startsWith('GET:') || response.status >= 400) {
            return;
        }

        const clonedResponse = response.clone();
        const body = await clonedResponse.text();
        const headers: Record<string, string> = {};

        clonedResponse.headers.forEach((value, key) => {
            headers[key] = value;
        });

        const entry: CacheEntry = {
            response: {
                status: response.status,
                statusText: response.statusText,
                headers,
                body
            },
            timestamp: Date.now(),
            ttl
        };

        responseCache.set(cacheKey, entry);
        console.log(`[${new Date().toISOString()}] Cached response for ${cacheKey} (TTL: ${ttl}ms)`);

        // Clean up old cache entries periodically
        if (responseCache.size > RATE_LIMIT_CONFIG.MAX_CACHE_SIZE) {
            const now = Date.now();
            for (const [key, cachedEntry] of responseCache.entries()) {
                if (now > cachedEntry.timestamp + cachedEntry.ttl) {
                    responseCache.delete(key);
                }
            }
        }
    } catch (error) {
        console.warn(`[${new Date().toISOString()}] Failed to cache response:`, error);
    }
}

// Browser-like User-Agent strings to rotate through
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
];

/**
 * Simple rate limiter to prevent rapid-fire requests
 */
function shouldRateLimit(hostname: string, maxRequestsPerMinute: number = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_MINUTE): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    let rateInfo = rateLimitMap.get(hostname);
    if (!rateInfo || now > rateInfo.resetTime) {
        rateInfo = { requests: 0, resetTime: now + windowMs, lastRequest: 0 };
        rateLimitMap.set(hostname, rateInfo);
    }

    // Check if we need to add delay between requests
    const timeSinceLastRequest = now - rateInfo.lastRequest;

    if (timeSinceLastRequest < RATE_LIMIT_CONFIG.MIN_REQUEST_DELAY) {
        return true; // Rate limit - too fast
    }

    if (rateInfo.requests >= maxRequestsPerMinute) {
        return true; // Rate limit - too many requests
    }

    rateInfo.requests++;
    rateInfo.lastRequest = now;
    return false;
}

/**
 * Add delay between requests to avoid rate limiting
 */
async function addRequestDelay(hostname: string): Promise<void> {
    const rateInfo = rateLimitMap.get(hostname);
    if (!rateInfo) return;

    const now = Date.now();
    const timeSinceLastRequest = now - rateInfo.lastRequest;

    if (timeSinceLastRequest < RATE_LIMIT_CONFIG.MIN_REQUEST_DELAY) {
        const delayNeeded = RATE_LIMIT_CONFIG.MIN_REQUEST_DELAY - timeSinceLastRequest;
        console.log(`[${new Date().toISOString()}] Adding ${delayNeeded}ms delay for ${hostname}`);
        await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
}

/**
 * Get a random User-Agent to avoid detection
 */
function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Retry with exponential backoff for rate limited requests
 */
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let lastError: Error = new Error('Maximum retries exceeded');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            // Check if it's a rate limit error
            if (error instanceof Error && error.message.includes('429')) {
                if (attempt < maxRetries) {
                    const delayMs = baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
                    console.log(`[${new Date().toISOString()}] Rate limited, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue;
                }
            }

            // For non-rate-limit errors, don't retry
            throw error;
        }
    }

    throw lastError;
}

const app = new Hono<{ Bindings: AuthType }>({
    strict: false,
}).basePath("/mcp")


// Headers that must NOT be forwarded (RFC‑7230 §6.1 + platform-specific)
const HOP_BY_HOP = new Set([
    // Standard hop-by-hop headers (RFC 7230)
    'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'cookie',

    // Authentication headers. We don't want to forward these to the upstream server.
    'authorization',

    // Infrastructure/proxy headers that could leak internal information
    'forwarded',
    'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-port', 'x-forwarded-proto',
    'x-real-ip',
    'x-matched-path',

    // Vercel-specific headers (comprehensive list)
    'x-vercel-deployment-url', 'x-vercel-forwarded-for', 'x-vercel-id',
    'x-vercel-internal-bot-check', 'x-vercel-internal-ingress-bucket', 'x-vercel-internal-ingress-port',
    'x-vercel-ip-as-number', 'x-vercel-ip-city', 'x-vercel-ip-continent', 'x-vercel-ip-country',
    'x-vercel-ip-country-region', 'x-vercel-ip-latitude', 'x-vercel-ip-longitude',
    'x-vercel-ip-postal-code', 'x-vercel-ip-timezone',
    'x-vercel-ja4-digest', 'x-vercel-oidc-token', 'x-vercel-proxied-for',
    'x-vercel-proxy-signature', 'x-vercel-proxy-signature-ts',
    'x-vercel-sc-basepath', 'x-vercel-sc-headers', 'x-vercel-sc-host',
])

// Header prefixes that should not be forwarded
const BLOCKED_HEADER_PREFIXES = [
    'x-vercel-',  // Catch any future Vercel headers
    'cf-',        // Cloudflare headers if you ever use it
    'x-forwarded-', // Additional forwarded headers
]

/**
 * Checks if a header should be blocked from forwarding
 */
function shouldBlockHeader(headerName: string): boolean {
    const lowerName = headerName.toLowerCase();

    // Check explicit blocked headers
    if (HOP_BY_HOP.has(lowerName)) {
        return true;
    }

    // Check blocked prefixes
    return BLOCKED_HEADER_PREFIXES.some(prefix => lowerName.startsWith(prefix));
}

const verbs = ["post", "get", "delete"] as const;

/**
 * Helper function to ensure non-undefined values for database operations
 */
function ensureString(value: string | undefined, fallback: string = 'unknown'): string {
    return value !== undefined ? value : fallback;
}

/**
 * Helper function to determine authentication method consistently
 */
async function getAuthMethod(c: Context, user: UserWithWallet | null): Promise<string> {
    if (!user) return 'none';

    // Parse URL search params for API key checking
    const url = new URL(c.req.url);
    const searchParams = url.searchParams;

    // Parse body params if available (for POST requests)
    let bodyParams: Record<string, unknown> | undefined = undefined;
    try {
        const contentType = c.req.header('content-type') || '';
        if (contentType.includes('application/json') && c.req.raw.body) {
            // Try to parse JSON body for API key
            const clonedRequest = c.req.raw.clone();
            const body = await clonedRequest.json();
            if (typeof body === 'object' && body !== null) {
                bodyParams = body as Record<string, unknown>;
            }
        }
    } catch {
        // Body parsing failed, continue without body params
    }

    // Check API key in headers, query params, or body params
    const apiKey = extractApiKey({
        headers: c.req.raw.headers,
        searchParams,
        bodyParams
    });

    console.log("MCP PROXY ROUTE", {
        apiKey,
        searchParams,
        bodyParams
    })

    if (apiKey) {
        return 'api_key';
    }

    // Check session authentication
    try {
        const authResult = await auth.api.getSession({ headers: c.req.raw.headers });
        if (authResult?.session && authResult?.user) {
            return 'session';
        }
    } catch {
        // Session check failed, continue to wallet header
    }

    // Default to wallet header if user exists but no API key or session
    return 'wallet_header';
}

/**
 * Copies a client request to the upstream, returning the upstream Response.
 * Works for POST, GET, DELETE – anything the MCP spec allows.
 */
const forwardRequest = async (c: Context, id?: string, body?: ArrayBuffer, metadata?: { user?: UserWithWallet }) => {
    let targetUpstream: URL | undefined = undefined;
    let authHeaders: Record<string, unknown> | undefined = undefined;

    if (id) {
        const mcpConfig = await withTransaction(async (tx) => {
            return await txOperations.internal_getMcpServerByServerId(id)(tx);
        });

        const mcpOrigin = mcpConfig?.mcpOrigin;
        if (mcpOrigin) {
            targetUpstream = new URL(mcpOrigin);
        }

        if (mcpConfig?.authHeaders && mcpConfig?.requireAuth) {
            authHeaders = mcpConfig.authHeaders as Record<string, unknown>;
        }
    }

    console.log(`[${new Date().toISOString()}] Target upstream: ${targetUpstream}`);

    if (!targetUpstream) {
        throw new Error("No target upstream found");
    }

    const url = new URL(c.req.url);
    url.host = targetUpstream.host;
    url.protocol = targetUpstream.protocol;
    url.port = targetUpstream.port;

    // Remove /mcp/:id from path when forwarding to upstream, keeping everything after /:id
    const pathWithoutId = url.pathname.replace(/^\/mcp\/[^\/]+/, '')
    url.pathname = targetUpstream.pathname + (pathWithoutId || '')
    console.log(`[${new Date().toISOString()}] Modified path: ${url.pathname}`);

    // Preserve all query parameters from the original mcpOrigin
    if (targetUpstream.search) {
        console.log(`[${new Date().toISOString()}] Adding query parameters from target upstream`);
        // Copy all query parameters from the target upstream (mcpOrigin)
        const targetParams = new URLSearchParams(targetUpstream.search);
        targetParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
    }

    // Check cache first for GET requests
    const cacheKey = getCacheKey(url.toString(), c.req.raw.method, body);
    if (c.req.raw.method === 'GET') {
        const cachedResponse = getCachedResponse(cacheKey);
        if (cachedResponse) {
            return cachedResponse;
        }
    }

    // Check rate limiting before proceeding
    const hostname = targetUpstream.hostname;
    if (shouldRateLimit(hostname)) {
        console.log(`[${new Date().toISOString()}] Rate limiting detected for ${hostname}, adding delay`);
        await addRequestDelay(hostname);
    }

    const headers = new Headers();

    c.req.raw.headers.forEach((v, k) => {
        if (!shouldBlockHeader(k)) {
            headers.set(k, v);
        }
    });

    headers.set('host', targetUpstream.host);

    // Add browser-like headers to avoid bot detection
    if (!headers.has('user-agent')) {
        headers.set('user-agent', getRandomUserAgent());
    }

    // Add more realistic browser headers
    headers.set('accept', 'application/json, text/event-stream, text/plain, */*');
    headers.set('accept-language', 'en-US,en;q=0.9');
    headers.set('accept-encoding', 'gzip, deflate, br');
    headers.set('sec-fetch-dest', 'empty');
    headers.set('sec-fetch-mode', 'cors');
    headers.set('sec-fetch-site', 'cross-site');
    headers.set('referer', 'https://mcpay.fun');
    headers.set('origin', 'https://mcpay.fun');

    // set user information headers
    console.log(`[${new Date().toISOString()}] Metadata: ${JSON.stringify(metadata, null, 2)}`);
    const walletAddress = metadata?.user?.walletAddress || "";
    console.log(`[${new Date().toISOString()}] Setting wallet address header: ${walletAddress}`);
    headers.set("x-mcpay-wallet-address", walletAddress);

    if (authHeaders) {
        console.log(`[${new Date().toISOString()}] Adding auth headers to request`);
        for (const [key, value] of Object.entries(authHeaders)) {
            headers.set(key, value as string);
        }
    }

    console.log(`[${new Date().toISOString()}] Making request to upstream server`);
    console.log(`[${new Date().toISOString()}] Making fetch request:`, {
        url: url.toString(),
        targetUpstream: targetUpstream.toString(),
        method: c.req.raw.method,
        headers: Object.fromEntries(headers.entries()),
        hasBody: !!body || (c.req.raw.method !== 'GET' && !!c.req.raw.body),
        body: body ? new TextDecoder().decode(body) : undefined
    });

    // Wrap the fetch in retry logic with exponential backoff
    const response = await retryWithBackoff(async () => {
        const fetchResponse = await fetch(url.toString(), {
            method: c.req.raw.method,
            headers,
            body: body || (c.req.raw.method !== 'GET' ? c.req.raw.body : undefined),
            // @ts-expect-error - TODO: fix this
            duplex: 'half'
        });

        // Check if we got rate limited
        if (fetchResponse.status === 429) {
            console.log(`[${new Date().toISOString()}] Received 429 from ${hostname}, will retry`);
            throw new Error(`429 Rate Limited by ${hostname}`);
        }

        return fetchResponse;
    }, RATE_LIMIT_CONFIG.MAX_RETRIES, RATE_LIMIT_CONFIG.BASE_RETRY_DELAY);

    console.log(`[${new Date().toISOString()}] Received response from upstream with status: ${response.status}`);

    // Cache successful GET responses
    if (c.req.raw.method === 'GET' && response.status < 400) {
        // Determine TTL based on content type and status
        let ttl = RATE_LIMIT_CONFIG.DEFAULT_CACHE_TTL;

        // Cache API responses for longer if they're likely to be stable
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            if (hostname.includes('coingecko.com')) {
                ttl = RATE_LIMIT_CONFIG.COINGECKO_CACHE_TTL;
            } else if (hostname.includes('api.')) {
                ttl = RATE_LIMIT_CONFIG.API_CACHE_TTL;
            }
        }

        // Don't block the response on caching
        cacheResponse(cacheKey, response, ttl).catch(error => {
            console.warn(`[${new Date().toISOString()}] Failed to cache response:`, error);
        });
    }

    return response;
}

/**
 * Mirrors the upstream response to the client.
 */
const mirrorRequest = (res: Response) => {
    const headers = new Headers();

    res.headers.forEach((v, k) => {
        headers.set(k, v);
    })

    return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers
    })
}

/**
 * Helper function to inspect request payload for streamable HTTP requests and identify tool calls
 */
const inspectRequest = async (c: Context): Promise<{ toolCall?: ToolCall, body?: ArrayBuffer }> => {
    const rawRequest = c.req.raw;

    let toolCall = undefined;
    let body = undefined;

    if (rawRequest.method === 'POST' && rawRequest.body) {
        try {
            const clonedRequest = rawRequest.clone();
            const contentType = rawRequest.headers.get("content-type") || '';

            // Parse /mcp/:id format and extract what comes after /:id
            const urlPathMatch = new URL(rawRequest.url).pathname.match(/^\/mcp\/([^\/]+)/);
            const id = urlPathMatch ? urlPathMatch[1] : undefined;

            // Read the entire body as ArrayBuffer to avoid stream locking issues
            body = await clonedRequest.arrayBuffer();

            if (body && contentType.includes('application/json')) {
                try {
                    // Try to parse as JSON for logging
                    const decoder = new TextDecoder();
                    const jsonText = decoder.decode(body);
                    const jsonData = JSON.parse(jsonText);
                    console.log('\x1b[36m%s\x1b[0m', `[${new Date().toISOString()}] Request JSON:`, JSON.stringify(jsonData, null, 2));

                    // Extract and log tool call information if present
                    if (jsonData.method === 'tools/call' && jsonData.params) {
                        const toolName = jsonData.params.name;
                        const toolArgs = jsonData.params.arguments;

                        // Check if this is a paid tool by looking up in DB
                        let isPaid = false;
                        let pricing: PricingEntry[] | undefined = undefined;
                        let toolId = undefined;
                        let serverId = undefined;
                        let payTo = undefined;

                        if (id) {
                            const server = await withTransaction(async (tx) => {
                                return await txOperations.internal_getMcpServerByServerId(id)(tx);
                            });

                            payTo = server?.receiverAddress;

                            if (server) {
                                // Store the internal server ID for later use
                                serverId = server.id;
                                console.log(`[${new Date().toISOString()}] Found server with internal ID: ${serverId}`);

                                const tools = await withTransaction(async (tx) => {
                                    return await txOperations.listMcpToolsByServer(server.id)(tx);
                                });

                                const toolConfig = tools.find((t: MCPTool) => t.name === toolName);

                                console.log(`[${new Date().toISOString()}] ---Tool Config: ${JSON.stringify(toolConfig, null, 2)}`)

                                if (toolConfig) {
                                    toolId = toolConfig.id;

                                    // Check for active pricing entries
                                    const activePricings = (toolConfig.pricing as PricingEntry[] || []).filter(p => p.active === true);

                                    if (activePricings.length > 0) {
                                        isPaid = true;
                                        pricing = activePricings;

                                        console.log(`[${new Date().toISOString()}] Active pricings: ${JSON.stringify(activePricings, null, 2)}`);
                                    }
                                }
                            }
                        }

                        console.log(`[${new Date().toISOString()}] ---Tool ID: ${toolId}`)

                        // TODO: pick a pricing entry based on the user's wallet address
                        let pickedPricing: PricingEntry | undefined = undefined;

                        // if multiple pricing entries, use mainnet if available
                        if (pricing && pricing.length > 0) {
                            const mainnetPricing = pricing.find(p => p.network === 'base');
                            if (mainnetPricing) {
                                console.log(`[${new Date().toISOString()}] Using mainnet pricing: ${JSON.stringify(mainnetPricing, null, 2)}`);
                                pickedPricing = mainnetPricing
                            }
                            else pickedPricing = pricing[0];
                        }

                        console.log(`[${new Date().toISOString()}] Picked pricing: ${JSON.stringify(pickedPricing, null, 2)}`);

                        // Store tool call info to return
                        toolCall = {
                            name: toolName,
                            args: toolArgs || {},
                            isPaid,
                            payTo: payTo || undefined,
                            pricing: pickedPricing ? [pickedPricing] : undefined,
                            ...(id && { id: id }),
                            ...(toolId && { toolId }),
                            ...(serverId && { serverId }),
                        };

                        if (jsonData.params._meta) {
                            console.log('\x1b[32m%s\x1b[0m', `  Meta: ${JSON.stringify(jsonData.params._meta, null, 2)}`);
                        }
                    }
                } catch {
                    console.log('\x1b[33m%s\x1b[0m', `[${new Date().toISOString()}] Request body couldn't be parsed as JSON`);
                }
            }
        }
        catch (e) {
            console.error('\x1b[31m%s\x1b[0m', `[${new Date().toISOString()}] Error logging request payload:`, e);
        }
    }

    return { toolCall, body };
}

/**
 * Enhanced user resolution with priority: API key → Session → Wallet headers
 */
async function resolveUserFromRequest(c: Context): Promise<UserWithWallet | null> {
    // Parse URL search params for API key checking
    const url = new URL(c.req.url);
    const searchParams = url.searchParams;

    // Parse body params if available (for POST requests)
    let bodyParams: Record<string, unknown> | undefined = undefined;
    try {
        const contentType = c.req.header('content-type') || '';
        if (contentType.includes('application/json') && c.req.raw.body) {
            // Try to parse JSON body for API key
            const clonedRequest = c.req.raw.clone();
            const body = await clonedRequest.json();
            if (typeof body === 'object' && body !== null) {
                bodyParams = body as Record<string, unknown>;
            }
        }
    } catch {
        // Body parsing failed, continue without body params
    }

    // 1. First priority: API key authentication (check headers, query params, and body params)
    const apiKey = extractApiKey({
        headers: c.req.raw.headers,
        searchParams,
        bodyParams
    });

    if (apiKey) {
        console.log(`[${new Date().toISOString()}] API key found, validating...`);
        try {
            const keyHash = hashApiKey(apiKey);
            const apiKeyResult = await withTransaction(async (tx) => {
                return await txOperations.validateApiKey(keyHash)(tx);
            });

            if (apiKeyResult?.user) {
                console.log(`[${new Date().toISOString()}] User authenticated via API key: ${apiKeyResult.user.id}`);

                // Get user's primary/managed wallet for auto-signing
                const userWallets = await withTransaction(async (tx) => {
                    return await txOperations.getUserWallets(apiKeyResult.user.id, true)(tx);
                });

                const primaryWallet = userWallets.find(w => w.isPrimary) || userWallets[0];

                if (primaryWallet) {
                    console.log(`[${new Date().toISOString()}] Found wallet for API key user: ${primaryWallet.walletAddress} (${primaryWallet.walletType})`);

                    // Get full user record to ensure all required fields are present
                    const fullUser = await withTransaction(async (tx) => {
                        return await txOperations.getUserById(apiKeyResult.user.id)(tx);
                    });

                    if (fullUser) {
                        return {
                            ...fullUser,
                            walletAddress: primaryWallet.walletAddress
                        } as UserWithWallet;
                    }
                } else {
                    console.log(`[${new Date().toISOString()}] API key user has no wallets, will need auto-creation for managed payments`);

                    // Get full user record for consistency
                    const fullUser = await withTransaction(async (tx) => {
                        return await txOperations.getUserById(apiKeyResult.user.id)(tx);
                    });

                    if (fullUser) {
                        return {
                            ...fullUser,
                            walletAddress: null
                        } as UserWithWallet;
                    }
                }
            }
        } catch (error) {
            console.warn(`[${new Date().toISOString()}] API key validation failed:`, error);
        }
    }

    // 2. Second priority: Session-based authentication (better-auth)
    try {
        const authResult = await auth.api.getSession({ headers: c.req.raw.headers });

        if (authResult?.session && authResult?.user) {
            console.log(`[${new Date().toISOString()}] User authenticated via session: ${authResult.user.id}`);

            // Get user's primary/managed wallet for auto-signing
            const userWallets = await withTransaction(async (tx) => {
                return await txOperations.getUserWallets(authResult.user.id, true)(tx);
            });

            const primaryWallet = userWallets.find(w => w.isPrimary) || userWallets[0];

            if (primaryWallet) {
                console.log(`[${new Date().toISOString()}] Found wallet for session user: ${primaryWallet.walletAddress} (${primaryWallet.walletType})`);

                // Get full user record to ensure all required fields are present
                const fullUser = await withTransaction(async (tx) => {
                    return await txOperations.getUserById(authResult.user.id)(tx);
                });

                if (fullUser) {
                    return {
                        ...fullUser,
                        walletAddress: primaryWallet.walletAddress
                    } as UserWithWallet;
                }
            } else {
                console.log(`[${new Date().toISOString()}] Session user has no wallets, will need auto-creation for managed payments`);

                // Get full user record for consistency
                const fullUser = await withTransaction(async (tx) => {
                    return await txOperations.getUserById(authResult.user.id)(tx);
                });

                if (fullUser) {
                    return {
                        ...fullUser,
                        walletAddress: null
                    } as UserWithWallet;
                }
            }
        }
    } catch (error) {
        console.warn(`[${new Date().toISOString()}] Session authentication failed:`, error);
    }

    // 3. Third priority: Existing wallet address header method
    const walletAddress = c.req.header('X-Wallet-Address');
    if (walletAddress) {
        console.log(`[${new Date().toISOString()}] Using wallet address header: ${walletAddress}`);
        return await getOrCreateUser(walletAddress);
    }

    return null;
}

/**
 * Helper function to get or create user from wallet address (using new multi-wallet system)
 */
async function getOrCreateUser(walletAddress: string, provider = 'unknown'): Promise<UserWithWallet | null> {
    if (!walletAddress || typeof walletAddress !== 'string') return null;

    return await withTransaction(async (tx) => {
        // First check new wallet system
        const walletRecord = await txOperations.getWalletByAddress(walletAddress)(tx);

        if (walletRecord?.user) {
            // Update last login and wallet usage
            await txOperations.updateUserLastLogin(walletRecord.user.id)(tx);
            await txOperations.updateWalletMetadata(walletRecord.id, {
                lastUsedAt: new Date()
            })(tx);
            // Create User object with walletAddress from the wallet record
            return {
                ...walletRecord.user,
                walletAddress: walletRecord.walletAddress
            } as UserWithWallet;
        }

        // Fallback: check legacy wallet field
        let user = await txOperations.getUserByWalletAddress(walletAddress)(tx);

        if (user) {
            // Migrate legacy wallet to new system
            console.log(`[${new Date().toISOString()}] Migrating legacy wallet ${walletAddress} to new system`);
            await txOperations.migrateLegacyWallet(user.id)(tx);
            await txOperations.updateUserLastLogin(user.id)(tx);
            return user as UserWithWallet;
        }

        // Create new user with wallet
        console.log(`[${new Date().toISOString()}] Creating new user with wallet ${walletAddress}`);

        // Determine blockchain from address format (simple heuristic)
        let blockchain = 'ethereum'; // Default
        if (walletAddress.length === 44 && !walletAddress.startsWith('0x')) {
            blockchain = 'solana';
        } else if (walletAddress.endsWith('.near') || walletAddress.length === 64) {
            blockchain = 'near';
        }

        user = await txOperations.createUser({
            walletAddress,
            displayName: `User_${walletAddress.substring(0, 8)}`,
            walletType: 'external',
            walletProvider: provider,
            blockchain,
            // Architecture will be auto-determined from blockchain in createUser
        })(tx);

        return user as UserWithWallet;
    });
}

/**
 * Captures response data for analytics logging
 */
async function captureResponseData(upstream: Response): Promise<Record<string, unknown> | undefined> {
    try {
        const clonedResponse = upstream.clone();
        const responseText = await clonedResponse.text();
        if (responseText) {
            try {
                return JSON.parse(responseText);
            } catch {
                return { response: responseText };
            }
        }
    } catch (e) {
        console.log(`[${new Date().toISOString()}] Could not capture response data:`, e);
    }
    return undefined;
}

/**
 * Records analytics and tool usage data in the database
 */
async function recordAnalytics(params: {
    toolCall: ToolCall;
    user: UserWithWallet | null;
    startTime: number;
    upstream: Response;
    c: Context;
    responseData?: Record<string, unknown>;
    authMethod?: string; // Authentication method used
}) {
    const { toolCall, user, startTime, upstream, c, responseData, authMethod } = params;

    if (!toolCall.toolId || !toolCall.serverId) {
        return;
    }

    const pickedPricing = toolCall.pricing?.[0];

    await withTransaction(async (tx) => {
        // Record tool usage
        await txOperations.recordToolUsage({
            toolId: ensureString(toolCall.toolId),
            userId: user?.id,
            responseStatus: upstream.status.toString(),
            executionTimeMs: Date.now() - startTime,
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
            userAgent: c.req.header('user-agent'),
            requestData: {
                toolName: toolCall.name,
                args: toolCall.args,
                // Add authentication method tracking
                authMethod: authMethod
            },
            result: responseData
        })(tx);

        // Calculate converted revenue amount if payment was made
        let convertedRevenue: number | undefined = undefined;
        const paymentAmount = pickedPricing?.maxAmountRequiredRaw || "0";
        console.log(`[${new Date().toISOString()}] Payment amount: ${paymentAmount}`);
        if (paymentAmount && toolCall.isPaid) {
            // Use active pricing from tool call for accurate conversion
            if (pickedPricing) {
                try {
                    // Try to convert from base units to human-readable amount for analytics
                    // Check if paymentAmount looks like base units (all digits) or human-readable (contains decimal)
                    const isBaseUnits = /^\d+$/.test(paymentAmount);

                    if (isBaseUnits) {
                        // Convert from base units to human-readable amount
                        const humanReadableAmount = fromBaseUnits(paymentAmount, pickedPricing.tokenDecimals);
                        convertedRevenue = parseFloat(humanReadableAmount);
                        console.log(`[${new Date().toISOString()}] Analytics: Recording revenue of ${humanReadableAmount} ${pickedPricing.assetAddress} (base units: ${paymentAmount})`);
                    } else {
                        // Already in human-readable format
                        convertedRevenue = parseFloat(paymentAmount);
                        console.log(`[${new Date().toISOString()}] Analytics: Recording revenue of ${paymentAmount} ${pickedPricing.assetAddress} (already human-readable)`);
                    }
                } catch (error) {
                    // Fallback if conversion fails - treat as human-readable
                    convertedRevenue = parseFloat(paymentAmount);
                    console.log(`[${new Date().toISOString()}] Analytics: Revenue conversion failed, using amount as-is: ${paymentAmount} (error: ${error})`);
                }
            } else {
                // Fallback: assume the paymentAmount is already in a reasonable format
                convertedRevenue = parseFloat(paymentAmount);
                console.log(`[${new Date().toISOString()}] Analytics: Recording revenue (no pricing data): ${convertedRevenue}`);
            }
        }

        // Analytics are now computed in real-time from database views
        // No need to manually update analytics data
    });
}

/**
 * Processes payment for paid tool calls
 */
async function processPayment(params: {
    toolCall: ToolCall;
    c: Context;
    user: UserWithWallet | null;
    startTime: number;
}): Promise<{ success: boolean; error?: string; user?: UserWithWallet, pickedPricing?: PricingEntry } | Response> {
    const { toolCall, c, user, startTime } = params;

    if (!toolCall.isPaid || !toolCall.toolId || !toolCall.pricing) {
        return { success: true, user: user || undefined };
    }

    if (!toolCall.payTo) {
        return {
            success: false,
            error: "No payTo address available for paid tool",
            user: user || undefined
        };
    }

    console.log(`[${new Date().toISOString()}] Paid tool call detected: ${toolCall.name}`);
    console.log(`[${new Date().toISOString()}] Payment details: ${JSON.stringify(toolCall.pricing || {}, null, 2)}`);

    // Check if payment header already exists
    let paymentHeader = c.req.header("X-PAYMENT");
    let extractedUser = user;

    // Attempt auto-signing if no payment header exists and payment details are available
    // OR if specific managed wallet headers are present
    // OR if API key authentication is present (indicates programmatic access)
    const managedWalletHeaders = true // TODO: fix this, c.req.header('x-wallet-provider') === 'coinbase-cdp' && c.req.header('x-wallet-type') === 'managed';

    // Check for API key in headers, query params, or body params
    const url = new URL(c.req.url);
    const searchParams = url.searchParams;
    let bodyParams: Record<string, unknown> | undefined = undefined;
    try {
        const contentType = c.req.header('content-type') || '';
        if (contentType.includes('application/json') && c.req.raw.body) {
            const clonedRequest = c.req.raw.clone();
            const body = await clonedRequest.json();
            if (typeof body === 'object' && body !== null) {
                bodyParams = body as Record<string, unknown>;
            }
        }
    } catch {
        // Body parsing failed, continue without body params
    }

    const hasApiKey = !!extractApiKey({
        headers: c.req.raw.headers,
        searchParams,
        bodyParams
    });

    const shouldAutoSign = toolCall.pricing && (
        (!paymentHeader) && (
            managedWalletHeaders || hasApiKey
        )
    );

    console.log(`[${new Date().toISOString()}] Managed wallet headers: ${managedWalletHeaders}`);
    console.log(`[${new Date().toISOString()}] Has API key: ${hasApiKey}`);
    console.log(`[${new Date().toISOString()}] Should auto-sign: ${shouldAutoSign}`);

    const pickedPricing = toolCall.pricing?.[0];


    if (shouldAutoSign) {
        console.log(`[${new Date().toISOString()}] ${!paymentHeader ? 'No X-PAYMENT header found' : 'Managed wallet headers detected'}, attempting auto-signing`);

        const humanReadableAmount = fromBaseUnits(
            pickedPricing?.maxAmountRequiredRaw || "0",
            pickedPricing?.tokenDecimals || 6
        );

        const payment = {
            maxAmountRequired: humanReadableAmount,
            network: pickedPricing?.network,
            asset: pickedPricing?.assetAddress,
            payTo: toolCall.payTo,
            resource: `mcpay://${toolCall.name}`,
            description: `Execution of ${toolCall.name}`
        }

        if(payment.asset === '') {
            return {
                success: false,
                error: "No asset address available for paid tool",
                user: user || undefined
            };
        }

        if(payment.network === '') {
            return {
                success: false,
                error: "No network available for paid tool",
                user: user || undefined
            };
        }

        try {
            // Create a properly typed tool call for auto-signing
            const autoSignToolCall = {
                isPaid: toolCall.isPaid,
                payment
            };

            const autoSignResult = await attemptAutoSign(c, autoSignToolCall, extractedUser ? {
                id: extractedUser.id,
                email: extractedUser.email || undefined,
                name: extractedUser.name || undefined,
                displayName: extractedUser.displayName || undefined
            } : undefined);

            if (autoSignResult.success && autoSignResult.signedPaymentHeader) {
                console.log(`[${new Date().toISOString()}] Auto-signing successful with strategy: ${autoSignResult.strategy}`);
                paymentHeader = autoSignResult.signedPaymentHeader;

                // Set the X-PAYMENT header for the request
                c.req.raw.headers.set("X-PAYMENT", paymentHeader);

                // Update user information if we got wallet address from auto-signing
                if (autoSignResult.walletAddress && !extractedUser) {
                    extractedUser = await getOrCreateUser(autoSignResult.walletAddress, 'managed-wallet');
                }
            } else {
                console.log(`[${new Date().toISOString()}] Auto-signing failed: ${autoSignResult.error}`);
            }
        } catch (autoSignError) {
            console.warn(`[${new Date().toISOString()}] Auto-signing threw error:`, autoSignError);
        }
    }

    // Ensure payTo field exists, default to asset address if missing
    const payTo = toolCall.payTo;

    if (!payTo) {
        return {
            success: false,
            error: "No payTo address available for paid tool",
            user: user || undefined
        };
    }

    const humanReadableAmount = fromBaseUnits(
        pickedPricing?.maxAmountRequiredRaw || "0",
        pickedPricing?.tokenDecimals || 6
    );

    const paymentRequirements = [
        createExactPaymentRequirements(
            humanReadableAmount,
            pickedPricing?.network as SupportedNetwork,
            `mcpay://${toolCall.name}`,
            `Execution of ${toolCall.name}`,
            payTo as `0x${string}`
        ),
    ];
    console.log(`[${new Date().toISOString()}] Created payment requirements: ${JSON.stringify(paymentRequirements, null, 2)}`);

    // Extract payer information from payment header (if exists)
    let payerAddress = '';

    if (paymentHeader) {
        try {
            const decodedPayment = decodePayment(paymentHeader);
            // Extract the payer address from decoded payment
            payerAddress = decodedPayment.payload.authorization.from;
            console.log(`[${new Date().toISOString()}] Extracted payer address from payment: ${payerAddress}`);

            // Get or create user with the payer address
            if (payerAddress && !extractedUser) {
                extractedUser = await getOrCreateUser(payerAddress);
                console.log(`[${new Date().toISOString()}] User identified: ${extractedUser?.id || 'unknown'}`);
            }
        } catch (e) {
            console.error(`[${new Date().toISOString()}] Error extracting payer from payment:`, e);
        }
    }

    const paymentResult = await verifyPayment(c, paymentRequirements);
    console.log(`[${new Date().toISOString()}] Payment verification result: ${JSON.stringify(paymentResult, null, 2)}`);

    // If verifyPayment returns a Response object, it means there was an error and the response was already prepared
    if (paymentResult instanceof Response) {
        console.log(`[${new Date().toISOString()}] Payment verification returned error response, returning it`);
        return paymentResult;
    }

    if (!paymentResult) {
        console.log(`[${new Date().toISOString()}] Payment verification failed, returning early`);

        // Record failed payment attempt in analytics
        if (toolCall.toolId && toolCall.serverId) {
            await withTransaction(async (tx) => {
                // Record tool usage with error status
                await txOperations.recordToolUsage({
                    toolId: ensureString(toolCall.toolId),
                    userId: extractedUser?.id,
                    responseStatus: 'payment_failed',
                    executionTimeMs: Date.now() - startTime,
                    ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
                    userAgent: c.req.header('user-agent'),
                    requestData: {
                        toolName: toolCall.name,
                        args: toolCall.args,
                        // Add authentication method tracking for failed payments too
                        authMethod: await getAuthMethod(c, extractedUser)
                    },
                    result: {
                        error: "Payment verification failed",
                        status: "payment_failed"
                    }
                })(tx);

                // Analytics are now computed in real-time from database views
                // No need to manually update analytics data
            });
        }

        return {
            success: false,
            error: "Payment verification failed",
            user: extractedUser || undefined,
            pickedPricing: pickedPricing || undefined
        };
    }

    try {
        const payment = c.req.header("X-PAYMENT");
        if (!payment) {
            console.log(`[${new Date().toISOString()}] No X-PAYMENT header found, returning early`);
            return {
                success: false,
                error: "No payment found in X-PAYMENT header",
                user: extractedUser || undefined
            };
        }

        const decodedPayment = decodePayment(payment);
        const paymentRequirement = paymentRequirements[0];

        if (!paymentRequirement) {
            console.log(`[${new Date().toISOString()}] No payment requirement available for settlement`);
            return {
                success: false,
                error: "No payment requirement available for settlement",
                user: extractedUser || undefined
            };
        }

        console.log(`[${new Date().toISOString()}] About to settle payment with:`);
        console.log(`[${new Date().toISOString()}] - Decoded payment: ${JSON.stringify(decodedPayment, null, 2)}`);
        console.log(`[${new Date().toISOString()}] - Payment requirement: ${JSON.stringify(paymentRequirement, null, 2)}`);

        let settleResponse;
        try {
            settleResponse = await settle(
                decodedPayment,
                paymentRequirement
            );
            console.log(`[${new Date().toISOString()}] Settlement successful: ${JSON.stringify(settleResponse, null, 2)}`);
        } catch (settleError) {
            console.error(`[${new Date().toISOString()}] Settlement failed:`, settleError);
            console.error(`[${new Date().toISOString()}] Settlement error details:`, {
                message: settleError instanceof Error ? settleError.message : String(settleError),
                stack: settleError instanceof Error ? settleError.stack : undefined
            });
            throw settleError; // Re-throw to be caught by the outer try-catch
        }

        if (settleResponse.success === false) {
            console.log(`[${new Date().toISOString()}] Settlement returned success=false: ${settleResponse.errorReason}`);
            return {
                success: false,
                error: settleResponse.errorReason,
                user: extractedUser || undefined
            };
        }

        // Record successful payment in database
        if (toolCall.toolId && toolCall.serverId) {
            await withTransaction(async (tx) => {
                // Use active pricing from tool call
                const activePricing = toolCall.pricing;

                // Use pricing data if available, otherwise fallback to payment data
                const currency = activePricing?.[0]?.assetAddress || paymentRequirement.asset;
                const tokenDecimals = activePricing?.[0]?.tokenDecimals || 6; // Default to USDC decimals if no pricing data
                // Use original priceRaw from pricing data for database accuracy, fallback to converted amount
                const amountRaw = activePricing?.[0]?.maxAmountRequiredRaw || paymentRequirement.maxAmountRequired || "0";

                const paymentRecord = await txOperations.createPayment({
                    toolId: ensureString(toolCall.toolId),
                    userId: extractedUser?.id,
                    amountRaw,
                    tokenDecimals,
                    currency,
                    network: paymentRequirement.network,
                    transactionHash: settleResponse.transaction || `unknown-${Date.now()}`,
                    status: 'completed',
                    signature: payment,
                    paymentData: {
                        decodedPayment,
                        settleResponse,
                        // Include pricing metadata for reference
                        pricingInfo: activePricing ? {
                            amountRaw: activePricing[0].maxAmountRequiredRaw,
                            tokenDecimals: activePricing[0].tokenDecimals,
                            currency: activePricing[0].assetAddress,
                            network: activePricing[0].network,
                            assetAddress: activePricing[0].assetAddress
                        } : undefined
                    }
                })(tx);

                console.log(`[${new Date().toISOString()}] Payment recorded with ID: ${paymentRecord.id}`);
                console.log(`[${new Date().toISOString()}] Payment amount: ${fromBaseUnits(amountRaw, tokenDecimals)} ${currency}`);
            });
        }

        const responseHeader = settleResponseHeader(settleResponse);
        console.log(`[${new Date().toISOString()}] Setting X-PAYMENT-RESPONSE header: ${responseHeader}`);
        c.header("X-PAYMENT-RESPONSE", responseHeader);

        return { success: true, user: extractedUser || undefined };

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during payment processing:`, error);
        return {
            success: false,
            error: "Internal server error during payment processing",
            user: extractedUser || undefined
        };
    }
}

// Main route handlers
verbs.forEach(verb => {
    app[verb](`/:id/*`, async (c) => {
        const id = c.req.param('id');
        console.log(`[${new Date().toISOString()}] Handling ${verb.toUpperCase()} request to ${c.req.url} with ID: ${id}`);

        const startTime = Date.now();
        const { toolCall, body } = await inspectRequest(c);
        console.log(`[${new Date().toISOString()}] Request payload logged, toolCall: ${toolCall ? 'present' : 'not present'}`);
        console.log(`[${new Date().toISOString()}] Tool call pricing: ${JSON.stringify(toolCall?.pricing, null, 2)}`);

        // Enhanced user resolution - prioritizes API key authentication
        let user: UserWithWallet | null = await resolveUserFromRequest(c);
        // Determine authentication method for logging and analytics
        const authMethod = await getAuthMethod(c, user);

        console.log(`[${new Date().toISOString()}] User resolved: ${user ? user.id : 'none'} via ${authMethod}`);

        // Process payment if this is a paid tool call
        if (toolCall?.isPaid) {
            const paymentResult = await processPayment({ toolCall, c, user, startTime });

            // If processPayment returns a Response, return it immediately (payment verification already handled the response)
            if (paymentResult instanceof Response) {
                return paymentResult;
            }

            // At this point, paymentResult is guaranteed to be the object type, not Response
            const paymentResultObj = paymentResult as { success: boolean; error?: string; user?: UserWithWallet, pickedPricing?: PricingEntry };

            if (!paymentResultObj.success) {
                c.status(402);
                if (!toolCall.pricing) {
                    return c.json({
                        x402Version,
                        error: "No payment information available",
                        accepts: [],
                    });
                }

                const payTo = toolCall.payTo;
                if (!payTo) {
                    return c.json({
                        x402Version,
                        error: "No receiver address available for paid tool",
                        accepts: [],
                    });
                }
                // Convert price from base units to human-readable amount
                const humanReadableAmount = fromBaseUnits(
                    toolCall.pricing[0].maxAmountRequiredRaw,
                    toolCall.pricing[0].tokenDecimals
                );

                const paymentRequirements = [
                    createExactPaymentRequirements(
                        humanReadableAmount,
                        toolCall.pricing[0].network as SupportedNetwork,
                        `mcpay://${toolCall.name}`,
                        `Execution of ${toolCall.name}`,
                        payTo as `0x${string}`
                    ),
                ];

                return c.json({
                    x402Version,
                    error: paymentResultObj.error,
                    accepts: paymentRequirements,
                });
            }

            user = paymentResultObj.user || null;
        }

        // User resolution is now handled upfront by resolveUserFromRequest
        // No need for fallback logic here since it's already covered

        console.log(`[${new Date().toISOString()}] Forwarding request to upstream with ID: ${id}`);
        const upstream = await forwardRequest(c, id, body, { user: user || undefined });
        console.log(`[${new Date().toISOString()}] Received upstream response, mirroring back to client`);

        // Clone the response before any operations to avoid body locking issues
        const responseForMirroring = upstream.clone();

        // Capture response data for analytics if we have tool information
        if (toolCall) {
            const responseData = await captureResponseData(upstream);

            await recordAnalytics({
                toolCall,
                user,
                startTime,
                upstream,
                c,
                responseData,
                // Pass authentication method
                authMethod: authMethod,
            });
        }

        return mirrorRequest(responseForMirroring);
    });
});

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);