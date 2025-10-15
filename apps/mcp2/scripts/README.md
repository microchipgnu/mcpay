# MCP2 Management Scripts

This directory contains utility scripts for managing and analyzing MCP2 servers.

## Available Scripts

### Analysis Scripts

#### `check-servers.ts`
Analyzes all registered MCP servers and shows their configuration, including recipient addresses, networks, tools, and pricing.

```bash
npx tsx scripts/check-servers.ts
```

**Output**: Detailed server configurations with summary statistics.

#### `check-prices.ts`
Analyzes pricing configuration for all registered MCP servers, showing tool pricing, recipient addresses, and networks.

```bash
npx tsx scripts/check-prices.ts
```

**Output**: Tool pricing information for each server.

#### `pricing-summary.ts`
Provides comprehensive analysis of pricing across all servers, including payment enforcement status, price distribution, and recommendations.

```bash
npx tsx scripts/pricing-summary.ts
```

**Output**: 
- Total servers and tools count
- Payment enforcement statistics
- Price range and distribution
- Servers without payment enforcement

### Management Scripts

#### `migrate-servers.ts`
Migrates existing servers to support multiple networks by adding networks metadata based on their recipient configuration and isTestnet flag.

```bash
npx tsx scripts/migrate-servers.ts
```

**What it does**:
- Adds networks metadata to servers that don't have it
- Maps networks based on `isTestnet` flag:
  - `isTestnet: true` → `["base-sepolia", "avalanche-fuji", "sei-testnet", "polygon-amoy"]`
  - `isTestnet: false` → `["base", "avalanche", "iotex", "sei", "polygon"]`
- Skips servers that already have networks metadata

### Testing Scripts

#### `test-payment-enforcement.ts`
Tests payment enforcement by making requests to MCP servers and checking if they return 402 Payment Required responses.

```bash
# Test all servers
npx tsx scripts/test-payment-enforcement.ts

# Test specific server
npx tsx scripts/test-payment-enforcement.ts srv_kc9lfhpy
```

**What it does**:
- Checks server configuration for payment enforcement capability
- Makes test requests to MCP endpoints
- Verifies 402 Payment Required responses
- Reports on payment enforcement status

## Prerequisites

- MCP2 server running on `localhost:3006`
- Redis connection configured
- All dependencies installed (`pnpm install`)

## Usage Examples

### Check overall system health
```bash
npx tsx scripts/pricing-summary.ts
```

### Migrate servers for multi-network support
```bash
npx tsx scripts/migrate-servers.ts
```

### Test specific server payment enforcement
```bash
npx tsx scripts/test-payment-enforcement.ts srv_puuqidn9
```

### Get detailed server information
```bash
npx tsx scripts/check-servers.ts
```

## Script Development

When adding new scripts:

1. Add proper shebang: `#!/usr/bin/env tsx`
2. Include comprehensive documentation
3. Add error handling
4. Use consistent logging format
5. Update this README with usage instructions

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure MCP2 server is running on port 3006
2. **Redis connection failed**: Check Redis credentials in `.env`
3. **Module not found**: Run `pnpm install` to install dependencies

### Debug Mode

Set `DEBUG=1` environment variable for verbose output:
```bash
DEBUG=1 npx tsx scripts/check-servers.ts
```
