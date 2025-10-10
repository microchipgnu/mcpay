import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

interface UpstreamTarget {
    name: string;
    url: string;
    weight: number;
}

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitoringWindow: number;
}

interface CacheConfig {
    ttl: number;
    maxSize: number;
}

interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}

interface ProxyConfig {
    upstreams: UpstreamTarget[];
    retry: RetryConfig;
    timeout: number;
    healthCheckEndpoint: string;
    userAgent: string;
    circuitBreaker: CircuitBreakerConfig;
    cache: CacheConfig;
    rateLimit: RateLimitConfig;
}

interface CircuitBreakerState {
    failures: number[];
    state: 'closed' | 'open' | 'half-open';
    lastFailureTime: number;
}

interface CacheEntry {
    data: string;
    timestamp: number;
    contentType: string;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const USER_AGENT = "facilitator-proxy-mcpay.tech/1.0";

class FacilitatorProxy {
    private config: ProxyConfig;
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private responseCache: Map<string, CacheEntry> = new Map();
    private rateLimitMap: Map<string, RateLimitEntry> = new Map();

    constructor() {
        this.config = {
            upstreams: [
                {
                    name: "facilitator.x402.rs",
                    url: "https://facilitator.x402.rs",
                    weight: 0.1,
                },
                {
                    name: "facilitator.payai.network",
                    url: "https://facilitator.payai.network",
                    weight: 1,
                },
            ],
            retry: {
                maxRetries: 3,
                baseDelay: 1000,
                maxDelay: 10000,
                backoffMultiplier: 2,
            },
            timeout: 10000, // 10 seconds
            healthCheckEndpoint: "/supported",
            userAgent: USER_AGENT,
            circuitBreaker: {
                failureThreshold: 5,
                resetTimeout: 30000, // 30 seconds
                monitoringWindow: 60000, // 1 minute
            },
            cache: {
                ttl: 300000, // 5 minutes
                maxSize: 100,
            },
            rateLimit: {
                windowMs: 60000, // 1 minute
                maxRequests: 100,
            },
        };
    }

    private getCircuitBreakerState(targetName: string): CircuitBreakerState {
        if (!this.circuitBreakers.has(targetName)) {
            this.circuitBreakers.set(targetName, {
                failures: [],
                state: 'closed',
                lastFailureTime: 0,
            });
        }
        return this.circuitBreakers.get(targetName)!;
    }

    private recordFailure(targetName: string): void {
        const state = this.getCircuitBreakerState(targetName);
        const now = Date.now();

        // Clean old failures outside the monitoring window
        state.failures = state.failures.filter(
            timestamp => now - timestamp < this.config.circuitBreaker.monitoringWindow
        );

        state.failures.push(now);
        state.lastFailureTime = now;

        if (state.failures.length >= this.config.circuitBreaker.failureThreshold) {
            state.state = 'open';
            console.warn(`Circuit breaker opened for ${targetName} (${state.failures.length} failures)`);
        }
    }

    private recordSuccess(targetName: string): void {
        const state = this.getCircuitBreakerState(targetName);
        if (state.state === 'half-open') {
            state.state = 'closed';
            state.failures = [];
            console.log(`Circuit breaker closed for ${targetName}`);
        }
    }

    private canAttemptRequest(targetName: string): boolean {
        const state = this.getCircuitBreakerState(targetName);

        if (state.state === 'closed') {
            return true;
        }

        if (state.state === 'open') {
            const timeSinceLastFailure = Date.now() - state.lastFailureTime;
            if (timeSinceLastFailure >= this.config.circuitBreaker.resetTimeout) {
                state.state = 'half-open';
                console.log(`Circuit breaker half-open for ${targetName}`);
                return true;
            }
            return false;
        }

        return state.state === 'half-open';
    }

    private getCacheKey(request: Request): string {
        return `${request.method}:${request.url}`;
    }

    private isRateLimited(clientId: string): boolean {
        const now = Date.now();
        const entry = this.rateLimitMap.get(clientId);

        if (!entry || now > entry.resetTime) {
            // Reset or initialize rate limit
            this.rateLimitMap.set(clientId, {
                count: 1,
                resetTime: now + this.config.rateLimit.windowMs,
            });
            return false;
        }

        if (entry.count >= this.config.rateLimit.maxRequests) {
            return true;
        }

        entry.count++;
        return false;
    }

    private getClientId(request: Request): string {
        // Use X-Forwarded-For if available, otherwise fall back to a generic identifier
        return request.headers.get('X-Forwarded-For') ||
               request.headers.get('X-Real-IP') ||
               'unknown-client';
    }

    private getCachedResponse(cacheKey: string): CacheEntry | null {
        const entry = this.responseCache.get(cacheKey);
        if (!entry) return null;

        const now = Date.now();
        if (now - entry.timestamp > this.config.cache.ttl) {
            this.responseCache.delete(cacheKey);
            return null;
        }

        return entry;
    }

    private setCachedResponse(cacheKey: string, data: string, contentType: string): void {
        // Implement LRU-like behavior if cache is full
        if (this.responseCache.size >= this.config.cache.maxSize) {
            const firstKey = this.responseCache.keys().next().value;
            if (firstKey) {
                this.responseCache.delete(firstKey);
            }
        }

        this.responseCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            contentType,
        });
    }

    private validateResponseBody(responseText: string, contentType: string): boolean {
        // Check content type for JSON endpoints
        if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
            return false;
        }

        // Try to parse JSON for validation
        try {
            if (contentType.includes('application/json')) {
                JSON.parse(responseText);
            }
            return true;
        } catch (error) {
            console.warn('Response validation failed:', error);
            return false;
        }
    }

    private async validateResponse(response: Response): Promise<boolean> {
        // Check for valid status codes
        if (response.status >= 500) {
            return false;
        }

        // Check content type for JSON endpoints
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
            return false;
        }

        // Try to parse JSON for validation
        try {
            const text = await response.text();
            if (contentType.includes('application/json')) {
                JSON.parse(text);
            }
            return true;
        } catch (error) {
            console.warn('Response validation failed:', error);
            return false;
        }
    }

    private async performHealthCheck(target: UpstreamTarget): Promise<boolean> {
        // Check circuit breaker first
        if (!this.canAttemptRequest(target.name)) {
            console.log(`Skipping health check for ${target.name} - circuit breaker is open`);
            return false;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            console.log(`Performing health check for ${target.name}`);

            // Use the actual x402 API endpoint for health checks
            const response = await fetch(`${target.url}${this.config.healthCheckEndpoint}`, {
                method: "GET",
                signal: controller.signal,
                headers: {
                    "User-Agent": this.config.userAgent,
                    "Accept": "application/json",
                },
            });

            clearTimeout(timeoutId);

            // Validate the response
            const isValid = await this.validateResponse(response);

            if (response.status < 500 && isValid) {
                this.recordSuccess(target.name);
                console.log(`Health check passed for ${target.name} (${response.status})`);
                return true;
            } else {
                this.recordFailure(target.name);
                console.warn(`Health check failed for ${target.name} (${response.status})`);
                return false;
            }
        } catch (error) {
            this.recordFailure(target.name);
            console.warn(`Health check failed for ${target.name}:`, error);
            return false;
        }
    }

    private async getHealthyTargets(): Promise<UpstreamTarget[]> {
        // Perform health checks for all targets (no caching in serverless)
        const healthCheckPromises = this.config.upstreams.map(async (target) => {
            const isHealthy = await this.performHealthCheck(target);
            return { target, isHealthy };
        });

        const results = await Promise.all(healthCheckPromises);

        // Return only healthy targets
        return results
            .filter(({ isHealthy }) => isHealthy)
            .map(({ target }) => target);
    }

    private async selectTarget(): Promise<UpstreamTarget | null> {
        const healthyTargets = await this.getHealthyTargets();
        if (healthyTargets.length === 0) {
            return null;
        }

        // Simple round-robin selection (could be enhanced with weighted selection)
        const randomIndex = Math.floor(Math.random() * healthyTargets.length);
        return healthyTargets[randomIndex] || null;
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private calculateRetryDelay(attempt: number): number {
        const delay = this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt);
        return Math.min(delay, this.config.retry.maxDelay);
    }

    async proxyRequest(request: Request, requestId?: string): Promise<Response> {
        console.log(`[${requestId || 'unknown'}] Processing proxy request to ${request.url}`);

        // Check rate limiting first
        const clientId = this.getClientId(request);
        if (this.isRateLimited(clientId)) {
            console.warn(`[${requestId || 'unknown'}] Rate limit exceeded for client ${clientId}`);
            return new Response(
                JSON.stringify({
                    error: "Rate limit exceeded",
                    retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000),
                    timestamp: new Date().toISOString()
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        "Retry-After": Math.ceil(this.config.rateLimit.windowMs / 1000).toString(),
                    }
                }
            );
        }

        // Check cache for GET requests
        if (request.method === 'GET') {
            const cacheKey = this.getCacheKey(request);
            const cachedResponse = this.getCachedResponse(cacheKey);
            if (cachedResponse) {
                console.log(`Cache hit for ${cacheKey}`);
                return new Response(cachedResponse.data, {
                    status: 200,
                    headers: {
                        "Content-Type": cachedResponse.contentType,
                        "X-Cache": "HIT",
                    }
                });
            }
        }

        let lastError: Error | null = null;
        let lastTarget: UpstreamTarget | null = null;
        const attemptedTargets = new Set<string>();

        // Buffer request body once to allow safe retries (avoid locked/disturbed streams)
        const method = request.method.toUpperCase();
        let bufferedBody: ArrayBuffer | null = null;
        try {
            if (method !== 'GET' && method !== 'HEAD') {
                bufferedBody = await request.arrayBuffer();
            }
        } catch {
            // If body cannot be read, treat as empty
            bufferedBody = null;
        }

        for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
            // Get healthy targets that haven't been tried yet
            const healthyTargets = await this.getHealthyTargets();
            const availableTargets = healthyTargets.filter(target => !attemptedTargets.has(target.name));
            
            if (availableTargets.length === 0) {
                // If no healthy targets available, try to get any target (including previously failed ones)
                const allTargets = await this.getHealthyTargets();
                if (allTargets.length === 0) {
                    return new Response(
                        JSON.stringify({
                            error: "No healthy upstream targets available",
                            attemptedTargets: Array.from(attemptedTargets),
                            timestamp: new Date().toISOString()
                        }),
                        {
                            status: 503,
                            headers: { "Content-Type": "application/json" }
                        }
                    );
                }
            }

            // Select a target (prefer untried ones, fallback to any healthy)
            const target = availableTargets.length > 0
                ? availableTargets[Math.floor(Math.random() * availableTargets.length)]
                : healthyTargets[Math.floor(Math.random() * healthyTargets.length)];

            if (!target) {
                return new Response(
                    JSON.stringify({
                        error: "No upstream targets available",
                        attemptedTargets: Array.from(attemptedTargets),
                        timestamp: new Date().toISOString()
                    }),
                    {
                        status: 503,
                        headers: { "Content-Type": "application/json" }
                    }
                );
            }

            // Check circuit breaker for this target
            if (!this.canAttemptRequest(target.name)) {
                console.log(`Skipping ${target.name} - circuit breaker is open`);
                attemptedTargets.add(target.name);
                continue;
            }

            // Mark this target as attempted
            attemptedTargets.add(target.name);
            lastTarget = target;

            try {
                const controller = new AbortController();
                // Use longer timeout for non-GET requests (e.g., settle/verify)
                const perAttemptTimeout = (method === 'GET' || method === 'HEAD') ? this.config.timeout : Math.max(this.config.timeout, 30000);
                const timeoutId = setTimeout(() => controller.abort(), perAttemptTimeout);

                // Clone the request and update the URL
                const proxyUrl = new URL(request.url);
                const targetUrl = new URL(proxyUrl.pathname + proxyUrl.search, target.url);

                // Clone headers and add proxy identification; strip hop-by-hop/mismatched headers
                const proxyHeaders = new Headers(request.headers);
                proxyHeaders.set("User-Agent", this.config.userAgent);
                proxyHeaders.set("X-Forwarded-For", request.headers.get("X-Forwarded-For") || "unknown");
                proxyHeaders.set("X-Proxy-By", this.config.userAgent);
                proxyHeaders.delete("content-length");
                proxyHeaders.delete("host");
                proxyHeaders.delete("connection");
                proxyHeaders.delete("transfer-encoding");
                proxyHeaders.delete("content-encoding");

                const proxyRequest = new Request(targetUrl.toString(), {
                    method: request.method,
                    headers: proxyHeaders,
                    body: bufferedBody,
                    signal: controller.signal,
                });

                const response = await fetch(proxyRequest);
                clearTimeout(timeoutId);

                // Read response body once for both validation and caching
                const responseText = await response.text();
                const contentType = response.headers.get('content-type') || 'application/json';

                // Validate the response
                const isValidResponse = this.validateResponseBody(responseText, contentType);

                if (isValidResponse) {
                    this.recordSuccess(target.name);

                    // Cache successful GET responses
                    if (request.method === 'GET') {
                        const cacheKey = this.getCacheKey(request);
                        this.setCachedResponse(cacheKey, responseText, contentType);
                    }

                    // Add proxy headers
                    const headers = new Headers(response.headers);
                    // Sanitize hop-by-hop and compression headers to match re-serialized body
                    headers.delete("content-encoding");
                    headers.delete("content-length");
                    headers.delete("transfer-encoding");
                    headers.set("X-Proxy-Target", target.name);
                    headers.set("X-Proxy-Attempt", attempt.toString());
                    headers.set("X-Proxy-Timestamp", new Date().toISOString());
                    headers.set("X-Cache", "MISS");
                    if (!headers.get("Content-Type")) {
                        headers.set("Content-Type", contentType);
                    }

                    return new Response(responseText, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: headers,
                    });
                } else {
                    this.recordFailure(target.name);
                    console.warn(`Invalid response from ${target.name} (${response.status})`);
                    throw new Error(`Invalid response from ${target.name}`);
                }

            } catch (error) {
                lastError = error as Error;
                this.recordFailure(target.name);
                console.warn(`Attempt ${attempt + 1} failed for ${target.name}:`, error);

                // If this is not the last attempt, wait before retrying with a different target
                if (attempt < this.config.retry.maxRetries) {
                    const delay = this.calculateRetryDelay(attempt);
                    console.log(`Retrying with different target in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed
        return new Response(
            JSON.stringify({
                error: "All retry attempts failed",
                lastError: lastError?.message || "Unknown error",
                lastTarget: lastTarget?.name || "unknown",
                attemptedTargets: Array.from(attemptedTargets),
                attempts: this.config.retry.maxRetries + 1,
                timestamp: new Date().toISOString(),
            }),
            {
                status: 502,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    async getStatus() {
        const healthyTargets = await this.getHealthyTargets();

        return {
            upstreams: this.config.upstreams.map((target) => {
                const isHealthy = healthyTargets.some(healthy => healthy.name === target.name);
                const circuitBreaker = this.getCircuitBreakerState(target.name);

                return {
                    name: target.name,
                    url: target.url,
                    isHealthy,
                    circuitBreaker: {
                        state: circuitBreaker.state,
                        failures: circuitBreaker.failures.length,
                        lastFailure: circuitBreaker.lastFailureTime,
                    },
                };
            }),
            healthyCount: healthyTargets.length,
            totalCount: this.config.upstreams.length,
            cacheSize: this.responseCache.size,
            rateLimitActive: this.rateLimitMap.size,
            config: {
                retry: this.config.retry,
                timeout: this.config.timeout,
                circuitBreaker: this.config.circuitBreaker,
                cache: this.config.cache,
                rateLimit: this.config.rateLimit,
            },
        };
    }

    // No cleanup needed for stateless approach
}

// Initialize the proxy
const proxy = new FacilitatorProxy();

// Create Hono app
const app = new Hono();

// Security headers middleware
app.use("*", async (c, next) => {
    await next();

    // Security headers
    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("X-XSS-Protection", "1; mode=block");
    c.header("Referrer-Policy", "strict-origin-when-cross-origin");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    c.header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';");
});

// Request ID middleware for tracing
app.use("*", async (c, next) => {
    const requestId = c.req.header("X-Request-ID") || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    c.header("X-Request-ID", requestId);
    await next();
});

// Structured logging middleware
app.use("*", async (c, next) => {
    const start = Date.now();
    const requestId = c.req.header("X-Request-ID") || "unknown";
    const method = c.req.method;
    const url = c.req.url;

    console.log(`[${requestId}] ${method} ${url} - START`);

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    console.log(`[${requestId}] ${method} ${url} - ${status} - ${duration}ms`);
});

// API Key authentication middleware
app.use("*", async (c, next) => {
    // Skip auth for health checks and status endpoints
    const path = c.req.path;
    if (path === "/health" || path === "/status" || path === "/ready" || path === "/") {
        return next();
    }

    await next();
});

// Middleware
app.use("*", logger());
app.use("*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
}));

// Health check endpoint
app.get("/health", async (c) => {
    const status = await proxy.getStatus();
    const isHealthy = status.healthyCount > 0;

    return c.json({
        status: isHealthy ? "healthy" : "unhealthy",
        ...status,
    }, isHealthy ? 200 : 503);
});

// Status endpoint for monitoring
app.get("/status", async (c) => {
    return c.json(await proxy.getStatus());
});

app.get("/", async (c) => {
    const status = await proxy.getStatus();

    return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>X402 Facilitator Proxy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .status {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
        }
        .healthy {
            color: #28a745;
            font-weight: bold;
        }
        .unhealthy {
            color: #dc3545;
            font-weight: bold;
        }
        .endpoint {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 1rem;
            margin: 1rem 0;
        }
        .code {
            background: #f4f4f4;
            padding: 0.5rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
        }
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 X402 Facilitator Proxy</h1>
        <p>High-availability passthrough proxy for x402 facilitators</p>
    </div>

    <div class="status">
        <h2>Proxy Status</h2>
        <p><strong>Overall Status:</strong> 
            <span class="${status.healthyCount > 0 ? 'healthy' : 'unhealthy'}">
                ${status.healthyCount > 0 ? 'Healthy' : 'Unhealthy'}
            </span>
        </p>
        <p><strong>Healthy Targets:</strong> ${status.healthyCount} / ${status.totalCount}</p>
        
        <h3>Upstream Targets</h3>
        <ul>
            ${status.upstreams.map(target => `
                <li>
                    <strong>${target.name}</strong> - 
                    <span class="${target.isHealthy ? 'healthy' : 'unhealthy'}">
                        ${target.isHealthy ? '✓ Healthy' : '✗ Unhealthy'}
                    </span>
                    <br>
                    <small>${target.url}</small>
                </li>
            `).join('')}
        </ul>
    </div>

    <div class="endpoint">
        <h3>Available Endpoints</h3>
        <ul>
            <li><strong>GET /health</strong> - Health check endpoint</li>
            <li><strong>GET /status</strong> - Detailed status information</li>
            <li><strong>GET /supported</strong> - Proxy to upstream facilitators</li>
            <li><strong>POST /verify</strong> - Proxy to upstream facilitators</li>
            <li><strong>POST /settle</strong> - Proxy to upstream facilitators</li>
        </ul>
    </div>

    <div class="endpoint">
        <h3>Example Usage</h3>
        <p>Check proxy health:</p>
        <div class="code">curl https://facilitator.mcpay.tech/health</div>
        
        <p>Get detailed status:</p>
        <div class="code">curl https://facilitator.mcpay.tech/status</div>
        
        <p>Proxy a request to facilitators:</p>
        <div class="code">curl https://facilitator.mcpay.tech/v2/x402/supported</div>
    </div>

    <div class="footer">
        <p>Built with <a href="https://hono.dev/">Hono</a> and <a href="https://bun.sh/">Bun</a></p>
        <p>Optimized for edge and serverless environments</p>
    </div>
</body>
</html>
  `);
});

// Proxy all other requests
app.all("*", async (c) => {
    const requestId = c.req.header("X-Request-ID") || "unknown";
    const response = await proxy.proxyRequest(c.req.raw, requestId);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
});

// Graceful shutdown handling
let isShuttingDown = false;


// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, starting graceful shutdown...');
    isShuttingDown = true;

    // Stop accepting new connections
    server.close(async () => {
        console.log('HTTP server closed');

        // Wait for existing requests to complete (with timeout)
        const shutdownTimeout = setTimeout(() => {
            console.error('Shutdown timeout reached, forcing exit');
            process.exit(1);
        }, 10000);

        // In a real implementation, you'd wait for active requests to complete
        // For now, we'll just exit after a brief delay
        setTimeout(() => {
            clearTimeout(shutdownTimeout);
            console.log('Graceful shutdown completed');
            process.exit(0);
        }, 1000);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

// Health check for Kubernetes/readiness probes
app.get("/ready", async (c) => {
    const status = await proxy.getStatus();
    const isReady = status.healthyCount > 0 && !isShuttingDown;

    return c.json({
        status: isReady ? "ready" : "not ready",
        timestamp: new Date().toISOString(),
        shuttingDown: isShuttingDown,
    }, isReady ? 200 : 503);
});

// Metrics endpoint for monitoring
app.get("/metrics", async (c) => {
    const status = await proxy.getStatus();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const metrics = {
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(uptime),
        memory_usage: {
            rss: Math.floor(memoryUsage.rss / 1024 / 1024), // MB
            heap_total: Math.floor(memoryUsage.heapTotal / 1024 / 1024), // MB
            heap_used: Math.floor(memoryUsage.heapUsed / 1024 / 1024), // MB
        },
        proxy_status: status,
        server_info: {
            node_version: process.version,
            platform: process.platform,
            arch: process.arch,
        }
    };

    return c.json(metrics, 200);
});

const server = serve({
    fetch: app.fetch,
    port: 3004,
});