# chatgpt-mcpay

A minimal ChatGPT app example using MCPay SDK with a paid tool and a custom inline widget rendered via `text/html+skybridge`.

## Quickstart

```bash
pnpm -w -r install
pnpm -C examples/chatgpt-mcpay build:widget
pnpm -C examples/chatgpt-mcpay start
```

- MCP endpoint: `http://localhost:3020/mcp`
- Expose locally for ChatGPT dev mode: `ngrok http 3020`

## Connect in ChatGPT
- Enable developer mode → Connectors
- Create connector pointing to your public `/mcp` URL
- Add starter prompts like: "Show the sample report", "Create a paid summary"

## What’s included
- `index.ts` — Hono app exporting an MCP server using `createMcpPaidHandler`
- `web/` — React widget built with esbuild and loaded as `text/html+skybridge`

## Tools
- `report.show` (free): returns structured content for the widget
- `summary.paid` (paid): charges a small testnet fee and returns a text summary

## Notes
- Uses Base Sepolia and Solana Devnet via facilitator config
- Replace recipient addresses with your own test accounts for payments
