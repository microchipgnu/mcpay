# MCPay SDK & CLI

A TypeScript SDK and CLI for connecting to MCP (Model Context Protocol) servers with payment capabilities via the x402 protocol. It can:

- 🔌 Connect to multiple MCP servers at once (proxy)
- 💳 Handle 402 Payment Required automatically (x402)
- 📦 Provide programmatic APIs for clients and servers
- 🚀 Support both EVM and SVM networks for payments

## Quick start

Install the CLI globally or use `npx`:

```bash
npm i -g mcpay
# or
npx mcpay connect -u "https://api.example.com/mcp" -a "<YOUR_API_KEY>"
```

Start a payment-aware stdio proxy to one or more MCP servers:

```bash
# Using an EVM private key (Payment transport)
mcpay connect -u "https://api.example.com/mcp" --evm 0x1234... --evm-network base-sepolia

# Using an SVM secret key (Payment transport)
mcpay connect -u "https://api.example.com/mcp" --svm <SECRET_KEY> --svm-network solana-devnet

# Using an API key only (HTTP transport)
mcpay connect -u "https://api.example.com/mcp" -a "$API_KEY"
```

Tip: You can pass multiple URLs: `-u "https://api1/mcp,https://api2/mcp"`.

## Installation

### SDK (project dependency)

```bash
npm i mcpay
# or
pnpm i mcpay
# or
yarn add mcpay
# or
bun add mcpay
```

## CLI

### Commands

- `mcpay connect` – start an MCP stdio proxy to remote servers with payment capabilities
- `mcpay version` – show version information

### Examples

```bash
# Basic (env vars)
export SERVER_URLS="https://api.example.com/mcp"
export EVM_PRIVATE_KEY="0x1234..."
mcpay connect -u "$SERVER_URLS"

# Multiple servers + API key header forwarded to remotes
mcpay connect -u "https://api1/mcp,https://api2/mcp" -a "$API_KEY"

# Using EVM wallet with specific network
mcpay connect -u "https://api.example.com/mcp" --evm 0x1234... --evm-network base

# Using SVM wallet
mcpay connect -u "https://api.example.com/mcp" --svm <SECRET_KEY> --svm-network solana

# Set maximum payment amount
mcpay connect -u "https://api.example.com/mcp" --evm 0x1234... --max-atomic 100000
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --urls <urls>` | Comma-separated list of MCP server URLs | Required |
| `-a, --api-key <key>` | API key for authentication | `API_KEY` env |
| `--evm <privateKey>` | EVM private key (0x...) | `EVM_PRIVATE_KEY` env |
| `--svm <secretKey>` | SVM secret key (base58/hex) | `SVM_SECRET_KEY` env |
| `--evm-network <network>` | EVM network (base-sepolia, base, avalanche-fuji, avalanche, iotex, sei, sei-testnet) | `base-sepolia` |
| `--svm-network <network>` | SVM network (solana-devnet, solana) | `solana-devnet` |
| `--max-atomic <value>` | Max payment in atomic units | `X402_MAX_ATOMIC` env |

Behavior:
- If `--evm` or `--svm` is provided, the proxy uses Payment transport (x402) and can settle 402 challenges automatically.
- If only `--api-key` is provided, the proxy uses standard HTTP transport and forwards the bearer token.
- API keys can only be used with MCPay proxy URLs (mcpay.tech/v1/mcp/*).

## Financial Server Integration Guide

### MCP Client Integration

Connect to AI assistants like Claude, Cursor, and Windsurf.

#### One-Click Install for Cursor

If available on the website, use the "Install in Cursor" action to auto-generate an API key and configure your Cursor MCP settings.

#### Manual Configuration with API Key (Recommended)

Create an API key in your account settings and add this to your MCP client config (e.g., `claude_desktop_config.json`). Replace `mcpay_YOUR_API_KEY_HERE` with your real key.

```json
{
  "mcpServers": {
    "Financial Server": {
      "command": "npx",
      "args": [
        "mcpay",
        "connect",
        "--urls",
        "https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0",
        "--api-key",
        "mcpay_YOUR_API_KEY_HERE"
      ]
    }
  }
}
```

#### Manual Configuration with EVM Private Key (Alternative)

Use a wallet private key instead of an API key. Replace with your own private key (handle securely).

```json
{
  "mcpServers": {
    "Financial Server": {
      "command": "npx",
      "args": [
        "mcpay",
        "connect",
        "--urls",
        "https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0",
        "--evm",
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        "--evm-network",
        "base-sepolia"
      ]
    }
  }
}
```

#### Manual Configuration with SVM Secret Key (Alternative)

Use a Solana secret key for SVM networks.

```json
{
  "mcpServers": {
    "Financial Server": {
      "command": "npx",
      "args": [
        "mcpay",
        "connect",
        "--urls",
        "https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0",
        "--svm",
        "YOUR_SECRET_KEY",
        "--svm-network",
        "solana-devnet"
      ]
    }
  }
}
```

### MCPay CLI (Direct Connection)

```bash
# Using API Key (recommended)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0 --api-key mcpay_YOUR_API_KEY_HERE

# Using EVM Private Key (alternative)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0 --evm 0xYOUR_PRIVATE_KEY --evm-network base-sepolia

# Using SVM Secret Key (alternative)
npx mcpay connect --urls https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0 --svm YOUR_SECRET_KEY --svm-network solana-devnet
```

### Direct API Integration (JavaScript/TypeScript SDK)

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { withX402Client } from 'mcpay/client'
import { createSigner } from 'x402/types'

// Initialize signer from private key
const evmSigner = await createSigner('base-sepolia', '0x1234567890abcdef...')
const url = new URL('https://mcpay.tech/v1/mcp/d67aaf0d-fcc8-4136-948d-c470abe41ac0')

// Create transport
const transport = new StreamableHTTPClientTransport(url)

// Initialize MCP client
const client = new Client(
  { name: 'my-mcp-client', version: '1.0.0' },
  { capabilities: {} }
)

await client.connect(transport)

// Wrap client with X402 payment capabilities
const paymentClient = withX402Client(client, {
  wallet: { evm: evmSigner },
  maxPaymentValue: BigInt(0.1 * 10 ** 6), // 0.1 USDC max payment
})

// Use tools with automatic payment handling
const tools = await paymentClient.listTools()
console.log('Available tools:', tools)
```

## SDK usage

### Programmatic stdio proxy

```ts
import { startStdioServer, createServerConnections, ServerType } from 'mcpay';
import { createSigner } from 'x402/types';

// Create signer for EVM network
const evmSigner = await createSigner('base-sepolia', '0x123...');
const serverConnections = createServerConnections(
  ['https://api.example.com/mcp'],
  ServerType.HTTPStream
);

const x402Config = {
  wallet: { evm: evmSigner },
  maxPaymentValue: BigInt(0.1 * 10 ** 6) // 0.10 USDC
};

await startStdioServer({ 
  serverConnections, 
  x402ClientConfig: x402Config 
});
```

### Client: X402 Payment Wrapper

```ts
import { withX402Client } from 'mcpay/client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createSigner } from 'x402/types';

// Create signer
const evmSigner = await createSigner('base-sepolia', '0x123...');

// Initialize MCP client
const client = new Client(
  { name: 'my-app', version: '1.0.0' }, 
  { capabilities: {} }
);

const transport = new StreamableHTTPClientTransport(new URL('https://api.example.com/mcp'));
await client.connect(transport);

// Wrap with payment capabilities
const paymentClient = withX402Client(client, {
  wallet: { evm: evmSigner },
  maxPaymentValue: BigInt(0.1 * 10 ** 6) // 0.10 USDC
});
```

### Protecting your MCP server with payments

Use `createMcpPaidHandler` to require a valid `X-PAYMENT` header (validated via x402) before your tools run. Works in serverless/edge-compatible runtimes.

```ts
import { createMcpPaidHandler } from 'mcpay/handler';
import { z } from 'zod';

const handler = createMcpPaidHandler(async (server) => {
  server.paidTool(
    'hello',
    'Say hello to someone',
    { price: 0.05, currency: 'USD' },
    { name: z.string().describe('Your name') },
    {},
    async ({ name }) => ({ 
      content: [{ type: 'text', text: `Hello, ${name}!` }] 
    })
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

Notes:
- `server.paidTool` accepts a price object `{ price, currency }` and recipient addresses for different networks.
- When no valid payment is provided, the handler returns structured payment requirements that clients (like `withX402Client`) can satisfy.
- The facilitator configuration connects to MCPay services for payment verification and settlement.

## Environment variables

CLI:
- `EVM_PRIVATE_KEY`: Hex private key for EVM x402 signing
- `SVM_SECRET_KEY`: Secret key for SVM x402 signing  
- `SERVER_URLS`: Comma-separated MCP endpoints
- `API_KEY`: Optional, forwarded as `Authorization: Bearer <API_KEY>` to remotes
- `X402_MAX_ATOMIC`: Maximum payment amount in atomic units
- `EVM_NETWORK`: EVM network (base-sepolia, base, avalanche-fuji, avalanche, iotex, sei, sei-testnet)
- `SVM_NETWORK`: SVM network (solana-devnet, solana)

Server (payment auth):
- `MCPAY_API_URL` (default `https://mcpay.fun`)
- `MCPAY_API_KEY`

## Transports

- `HTTPStream` – standard streaming HTTP transport
- `withX402Client` – wraps HTTP transport with automatic `402 Payment Required` handling using x402 and your wallet

## Payment protocol (x402)

On a `402 Payment Required` response, MCPay will:
1. Parse the server-provided requirements
2. Create and sign an authorization with your wallet (EVM or SVM)
3. Retry the original request with `X-PAYMENT` header

Supported networks: 
- **EVM**: Base Sepolia, Base, Avalanche Fuji, Avalanche, IoTeX, Sei, Sei Testnet
- **SVM**: Solana Devnet, Solana

Default USDC addresses are built-in per chain.

## Troubleshooting

- "Payment amount exceeds maximum allowed": increase `maxPaymentValue` in your `x402ClientConfig`.
- Wrong chain/network: ensure your wallet/client network matches the server requirement.
- Invalid private key: ensure EVM keys are 0x-prefixed 64-hex characters.
- API key errors: ensure API keys are only used with MCPay proxy URLs (mcpay.tech/v1/mcp/*).

## Development

```bash
pnpm i
pnpm run build
# Dev watch
pnpm run dev
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `x402` - Payment protocol implementation  
- `x402-fetch` - Fetch integration for x402
- `viem` - EVM blockchain interactions
- `commander` - CLI framework
- `zod` - Schema validation
- `mcp-handler` - MCP server handler utilities

## Security

- Never commit private keys. Prefer environment variables and scoped, low-value keys for development.
- Use the `maxPaymentValue` guard in clients and per-tool pricing in servers.

## License

MIT

## Contributing

Issues and PRs are welcome.

## Support

Please open an issue in the repository.