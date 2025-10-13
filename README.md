# [MCPay](https://mcpay.tech)

<div align="center">
    
  ![X (formerly Twitter) Follow](https://img.shields.io/twitter/follow/mcpaytech) 
  [![GitHub Repo stars](https://img.shields.io/github/stars/Merit-Systems/echo?style=social)](https://github.com/microchipgnu/mcpay) 
  [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

![](/assets/gh_cover.png)

**Payments for MCPs**. Pay-per-call, no subscriptions, agent‑ready.

[Website](https://mcpay.tech) · [Browse Registry](https://mcpay.tech/servers) · [Build MCP](https://mcpay.tech/build) · [Register/Monetize](https://mcpay.tech/register)

> Check out the MCPay Build server dashboard at [mcpay.tech/mcpay-build](https://mcpay.tech/servers/23e2ab26-7808-4984-855c-ec6a7dc97c3a)
>
> The code lives at [github.com/microchipgnu/mcpay-build](https://github.com/microchipgnu/mcpay-build)

---

## What is MCPay?

MCPay is a **payment layer for MCP servers and plain HTTP APIs**. It uses the long‑dormant `HTTP 402 Payment Required` status and the **x402** pattern so that a client (human app or AI agent) can:

1. call a protected endpoint → 2) receive **402 + price metadata** → 3) pay on‑chain (e.g. USDC) → 4) **retry automatically** → 5) get the result.

No subscriptions. No manual API keys. Works with autonomous agents.

---

## Why MCPay (in 30 seconds)

* **Developers**: Ship paid tools in minutes. No OAuth, no recurring billing infra, no key juggling.
* **MCP Hosts**: Price **each tool** (per call / per token / dynamic) and get instant revenue.
* **AI Agents**: Do true **agent↔service micropayments** without human sign‑ups.

Use cases: paid search, embeddings, scraping, premium APIs, inference, downloads, rate‑limited features, one‑off unlocks.

---

## How it works

```
                            ┌──────────────┐
                            │    Client    │
                            │ (app/agent)  │
                            └──────┬───────┘
                ① unauthenticated │ HTTP request
                                   ▼
        ┌─────────────────────────────────────────────┐
        │              MCP Proxy (Edge)               │
        │  • replies 402 + price metadata             │
        │  • signs & broadcasts payment               │
        │  • retries request once payment confirmed   │
        └──────┬──────────────┬───────────────────────┘
               │              │
               │② on-chain    │③ original request
               │   payment    │   (after pay)
               ▼              ▼
        ┌──────────────┐  ┌──────────────┐
        │  Blockchain   │  │   Your API   │
        │ (USDC/EUROe)  │  │ (any stack)  │
        └──────┬────────┘  └──────────────┘
               │
               │④ streamed usage & revenue events
               ▼
           (dashboard / analytics)
```

Under the hood we:

* Return `402` with structured **price metadata** (asset, amount, destination, memo, expiry).
* Accept the in‑flight payment, verify on‑chain, and **retry the original request**.
* Emit **usage/revenue events** for your dashboard.

---

## Key components

### 1) Registry

Discover MCP servers and their priced tools at **[mcpay.tech/servers](https://mcpay.tech/servers)**. Searchable, machine‑readable, agent‑friendly.

### 2) Builder (MCPay Build)

Create and iterate on new MCP servers quickly at **[mcpay.tech/build](https://mcpay.tech/build)**. Preview in a sandbox, publish, and (optionally) set prices per tool.

With MCPay Build you can:

- **Create & iterate** on MCP servers entirely in a chat flow.
- **Preview** them live in an isolated Vercel Sandbox.
- **Deploy** to GitHub + Vercel with one click.
- **Monetize** your tools instantly with MCPay (x402 per-call payments).

This lowers the barrier for developers who find MCP confusing or want to get started without boilerplate. The default template is a production-ready MCP server with free + paid tools side by side.

The MCP code lives in https://github.com/microchipgnu/mcpay-build


### 3) Monetizer (Proxy)

Wrap existing HTTP endpoints or MCP servers with the **MCPay proxy** to enforce pay‑per‑call. Zero code changes to your upstream service.

You can monetize via [MCPay Registry](https://mcpay.tech/register) or [programmatically](/js-sdk/).

---

## How the `apps/app` works (high level)

This repo includes a Next.js app (`app/`) that powers the website, registry, builder, monetizer proxy, and APIs.

- Registry UI and pages
  - `/` shows featured/trending servers using `GET /api/servers?type=trending`.
  - `/servers` lists servers; `/servers/[id]` shows analytics, recent payments, tools, and integration snippets.

- Builder (sandbox) UI
  - `/build` is a chat-driven builder. It calls `POST /api/chat`, which spins up an MCP client via streamable HTTP transport, discovers tools, and streams preview links and session data back to the UI.

- Monetizer proxy (x402)
  - `ALL /v1/mcp/:id/*` forwards MCP JSON-RPC over HTTP to the upstream server URL stored for `:id`.
  - If a tool is monetized, the route returns `402` with `accepts` payment requirements unless a valid `X-PAYMENT` header is present. When provided, payment is verified and settled, analytics are recorded, then the original request is retried upstream.
  - Extras: header scrubbing, basic caching for GETs, lightweight rate limiting, optional auto‑signing for managed wallets or API‑key callers.

- Payment services (for paid tool flows)
  - `POST /requirements` – given simple or advanced pricing, returns x402 "accepts" requirements. Requires API key.
  - `POST /validate` – validates an `X-PAYMENT` header against recorded payments (e.g., after settlement).
  - `POST /ping` – inspects a remote MCP server, extracts tools and pricing, and auto‑registers/updates it in the registry. Requires API key.

- REST API (selected endpoints)
  - `GET /api/servers`, `GET /api/servers/:id` – registry and analytics.
  - `GET /api/analytics/usage` – usage analytics.
  - `POST /api/proofs` – submit verification proofs (vLayer), plus list/get/verify endpoints.
  - Wallets & keys: `GET/POST /api/users/:userId/wallets`, `GET/POST/DELETE /api/users/:userId/api-keys`.
  - Onramp helpers: `POST /api/users/:userId/onramp/buy-url`, `GET /api/onramp/config`.

Environment is validated via `apps/app/src/lib/gateway/env.ts` (Zod). See that file for the full list of vars and defaults.

---

## Quickstart

### Option A — Connect to a paid MCP server (CLI)

Start an MCP stdio proxy to one or more remote MCP servers. Use either an API key or a wallet private key.

```bash
# Using an API key (recommended)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/05599356-7a27-4519-872a-2ebb22467470 --api-key mcpay_YOUR_API_KEY

# Or using an EVM wallet private key (x402 payments)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/05599356-7a27-4519-872a-2ebb22467470 --evm 0xYOUR_PRIVATE_KEY --evm-network base-sepolia

# Or using an SVM wallet secret key (x402 payments)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/05599356-7a27-4519-872a-2ebb22467470 --svm YOUR_SECRET_KEY --svm-network solana-devnet
```

You can pass multiple URLs via a comma‑separated list to `--urls`.

### Option B — Programmatic client (SDK)

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { withX402Client } from 'mcpay/client'
import { createSigner } from 'x402/types'

// Create signer for EVM network
const evmSigner = await createSigner('base-sepolia', process.env.EVM_PRIVATE_KEY!) // dev only; secure in prod
const url = new URL('https://mcpay.tech/v1/mcp/05599356-7a27-4519-872a-2ebb22467470')

// Create transport
const transport = new StreamableHTTPClientTransport(url)

// Initialize MCP client
const client = new Client({ name: 'my-mcp-client', version: '1.0.0' }, { capabilities: {} })
await client.connect(transport)

// Wrap client with X402 payment capabilities
const paymentClient = withX402Client(client, {
  wallet: { evm: evmSigner },
  maxPaymentValue: BigInt(0.1 * 10 ** 6) // limit max on‑chain value (base units, e.g. 6‑decimals for USDC)
})

const tools = await paymentClient.listTools()
console.log('Available tools:', tools)
```

---

## SDK

Install:

```bash
npm i mcpay   # pnpm add mcpay / yarn add mcpay / bun add mcpay
```

Features:

* Automatic `402` handling (x402 pattern).
* Works with plain HTTP **and** MCP servers.
* Pluggable wallet/transport; supports multiple chains/tokens (EVM & SVM).
* Includes a **CLI** for local/prod proxying.
* Support for Base, Avalanche, IoTeX, Sei (EVM) and Solana (SVM) networks.

See **[js-sdk/README.md](./js-sdk/README.md)** for API details.

### Building monetized server (NextJS)

```ts
import { createMcpPaidHandler } from 'mcpay/handler';
import { z } from 'zod';

const handler = createMcpPaidHandler(async (server) => {
  server.paidTool(
    'hello',
    'Say hello to someone',
    { price: 0.05, currency: 'USD' },
    { name: z.string().describe('Your name') },
    {}, //annotations
    async ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] })
  );
}, {
  recipient: {
    'base-sepolia': '0x1234567890abcdef1234567890abcdef12345678',
    'solana-devnet': 'So11111111111111111111111111111111111111112'
  },
  facilitator: {
    url: "FACILITATOR_URL"
  }
});

// Next.js (route handlers)
export { handler as GET, handler as POST, handler as DELETE };
```

---

## CLI

Start a local stdio proxy to remote MCP servers:

```json
{
  "mcpServers": {
    "Paid Server": {
      "command": "npx",
      "args": [
        "mcpay",
        "connect",
        "--urls",
        "https://mcpay.tech/v1/mcp/05599356-7a27-4519-872a-2ebb22467470",
        "--api-key",
        "mcpay_YOUR_API_KEY"
      ]
    }
  }
}
```

Run `mcpay connect --help` for all flags.

---

## Pricing models

* **Flat per call** (e.g., \$0.05 per tool call)
* **Tiered** (different tools/routes have different prices)

---

## Project structure

* **`apps/app`** – Next.js app for website, registry, builder, monetizer proxy, and APIs
* **`apps/app-v2`** – Next.js app (v2) for newer UI/flows
* **`apps/mcp2`** – Hono service and scripts (Upstash, tooling)
* **`packages/js-sdk`** – JS/TS SDK + CLI ([packages/js-sdk/README.md](./packages/js-sdk/README.md))
* **`assets/`** – Static repo assets (docs, images)

---

## Getting started (repo)

```bash
git clone https://github.com/your-username/mcpay.fun.git
cd mcpay.fun
```

Run the website (Next.js):

```bash
pnpm install
pnpm dev --filter @mcpay/app
# or
pnpm dev --filter @mcpay/app-v2
```

Build SDK/CLI:

```bash
pnpm -F mcpay build
```

Notes:
- Minimal env for local dev lives in `app/src/lib/gateway/env.ts`. Common vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, GitHub OAuth (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`), KV (`KV_REST_API_URL`/`KV_REST_API_TOKEN`). For managed wallets and on-chain flows: `CDP_*`, and a facilitator key if you enable auto‑signing.
- For real payments, use a secure signer and set a low‑value test key in development only.

---

## FAQ

**Stripe but for agents?**  Similar goal (monetize usage), different approach: **no checkout**, **no subscriptions**, **no API keys**.

**Do I have to use MCP?**  No. MCPay works for plain HTTP endpoints too. MCP features (tool discovery/pricing) make it nicer for agent ecosystems.

**Can humans pay in a browser?**  Yes, via wallet extensions or embedded wallets — same `402` flow.

---

## Contributing

PRs welcome. For large changes, open a discussion first. See [LICENSE](./LICENSE) (MIT).
