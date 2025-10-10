# X402 Facilitator Proxy

A high-availability passthrough proxy for x402 facilitators with automatic failover and retry logic. Optimized for edge and serverless environments.

## Features

- **Passthrough Proxy**: Forwards requests to upstream x402 facilitators
- **On-Demand Health Checks**: Stateless health monitoring (no caching)
- **Automatic Failover**: Switches to healthy targets when others fail
- **Retry Logic**: Exponential backoff retry strategy for failed requests
- **Load Balancing**: Random selection among healthy targets
- **Monitoring Endpoints**: Health and status endpoints for observability
- **Edge/Serverless Optimized**: No background processes or persistent connections

## Upstream Targets

- `facilitator.x402.rs`
- `facilitator.payai.network`

## x402 API Endpoints

The proxy forwards requests to these x402 facilitator endpoints:

- `GET /supported` - Get supported payment schemes and networks
- `POST /verify` - Verify a payment
- `POST /settle` - Settle a payment

## Configuration

The proxy is configured with the following defaults:

- **Max Retries**: 3 attempts
- **Base Delay**: 1000ms
- **Max Delay**: 10000ms
- **Backoff Multiplier**: 2x
- **Health Check Strategy**: On-demand (no caching)
- **Request Timeout**: 10 seconds
- **Health Check Endpoint**: `/v2/x402/supported`

## Usage

### Start the proxy

```bash
# Development mode with hot reload
bun run dev

# Production mode
bun run start
```

### Endpoints

- `GET /health` - Health check endpoint (returns 200 if at least one upstream is healthy)
- `GET /status` - Detailed status of all upstream targets
- `*` - All other requests are proxied to upstream facilitators

### Example Usage

```bash
# Check proxy health
curl http://localhost:3000/health

# Check detailed status
curl http://localhost:3000/status

# Proxy a request to facilitators
curl http://localhost:3000/some-endpoint
```

## Response Headers

The proxy adds the following headers to responses:

- `X-Proxy-Target`: Name of the upstream target that handled the request
- `X-Proxy-Attempt`: Number of retry attempts (0 for first attempt)
- `X-Proxy-Timestamp`: Timestamp when the request was processed

## Error Handling

- **503 Service Unavailable**: When no healthy upstream targets are available
- **502 Bad Gateway**: When all retry attempts fail
- **Timeout**: Requests timeout after 10 seconds

## Serverless/Edge Optimizations

This proxy is specifically designed for edge and serverless environments:

- **No Background Processes**: No timers, intervals, or persistent connections
- **Stateless Health Checks**: Health checks are performed on-demand (no caching)
- **Memory Efficient**: No persistent state between function invocations
- **Cold Start Friendly**: No initialization overhead or warmup required
- **Request-Scoped**: Each request is handled independently

## Development

Built with:
- [Hono](https://hono.dev/) - Fast web framework optimized for edge
- [Bun](https://bun.sh/) - JavaScript runtime
- TypeScript - Type safety

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.21. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
