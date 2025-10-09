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

interface ProxyConfig {
    upstreams: UpstreamTarget[];
    retry: RetryConfig;
    timeout: number;
    healthCheckEndpoint: string;
    userAgent: string;
}

const USER_AGENT = "facilitator-proxy-mcpay.tech/1.0";

class FacilitatorProxy {
    private config: ProxyConfig;

    constructor() {
        this.config = {
            upstreams: [
                {
                    name: "facilitator.x402.rs",
                    url: "https://facilitator.x402.rs",
                    weight: 1,
                },
                {
                    name: "facilitator.payai.network",
                    url: "https://facilitator.payai.network",
                    weight: 1,
                },
                {
                    name: "facilitator.corbits.dev",
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
        };
    }

    private async performHealthCheck(target: UpstreamTarget): Promise<boolean> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

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

            // Consider the target healthy if we get a valid response (even if 401/403 for auth)
            // The important thing is that the service is responding
            return response.status < 500;
        } catch (error) {
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

    async proxyRequest(request: Request): Promise<Response> {
        let lastError: Error | null = null;
        let lastTarget: UpstreamTarget | null = null;
        const attemptedTargets = new Set<string>();

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

            // Mark this target as attempted
            attemptedTargets.add(target.name);
            lastTarget = target;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

                // Clone the request and update the URL
                const proxyUrl = new URL(request.url);
                const targetUrl = new URL(proxyUrl.pathname + proxyUrl.search, target.url);

                // Clone headers and add proxy identification
                const proxyHeaders = new Headers(request.headers);
                proxyHeaders.set("User-Agent", this.config.userAgent);
                proxyHeaders.set("X-Forwarded-For", request.headers.get("X-Forwarded-For") || "unknown");
                proxyHeaders.set("X-Proxy-By", this.config.userAgent);

                const proxyRequest = new Request(targetUrl.toString(), {
                    method: request.method,
                    headers: proxyHeaders,
                    body: request.body,
                    signal: controller.signal,
                    // @ts-ignore
                    duplex: 'half',
                });

                const response = await fetch(proxyRequest);
                clearTimeout(timeoutId);

                // Clone the response to avoid consuming the body
                const responseClone = response.clone();

                // Add proxy headers
                const headers = new Headers(response.headers);
                headers.set("X-Proxy-Target", target.name);
                headers.set("X-Proxy-Attempt", attempt.toString());
                headers.set("X-Proxy-Timestamp", new Date().toISOString());

                return new Response(responseClone.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers,
                });

            } catch (error) {
                lastError = error as Error;
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
                return {
                    name: target.name,
                    url: target.url,
                    isHealthy,
                };
            }),
            healthyCount: healthyTargets.length,
            totalCount: this.config.upstreams.length,
        };
    }

    // No cleanup needed for stateless approach
}

// Initialize the proxy
const proxy = new FacilitatorProxy();

// Create Hono app
const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
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
            <li><strong>GET /v2/x402/supported</strong> - Proxy to upstream facilitators</li>
            <li><strong>POST /v2/x402/verify</strong> - Proxy to upstream facilitators</li>
            <li><strong>POST /v2/x402/settle</strong> - Proxy to upstream facilitators</li>
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
    const response = await proxy.proxyRequest(c.req.raw);
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
    });
});

serve({
    fetch: app.fetch,
    port: 3020,
});