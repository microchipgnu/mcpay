import { STABLECOIN_CONFIGS, getNetworkTokens, type UnifiedNetwork } from "@/lib/commons/networks"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { experimental_createMCPClient as createMCPClient } from "ai"
import { Price } from "x402/types"

// Server metadata type definition
export interface MCPServerMetadata {
  name?: string
  version?: string
  description?: string
  protocolVersion?: string
  capabilities?: {
    experimental?: Record<string, unknown>
    logging?: Record<string, unknown>
    prompts?: {
      listChanged?: boolean
    }
    resources?: {
      subscribe?: boolean
      listChanged?: boolean
    }
    tools?: {
      listChanged?: boolean
    }
  }
  metadata?: Record<string, unknown>
  vendor?: {
    name?: string
    version?: string
  }
}

// Tool with payment information
export interface MCPToolWithPayments {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  annotations?: Record<string, unknown>
  pricing?: Price[]
}

// Comprehensive server information
export interface MCPServerInfo {
  metadata: MCPServerMetadata
  tools: MCPToolWithPayments[]
  toolCount: number
  hasPayments: boolean,
  prompts?: Record<string, unknown>
}

// Payment annotation type definitions
interface SimplePaymentOption {
  type?: 'simple'
  price: number
  currency?: string
  network?: string
  recipient?: string
}

interface AdvancedPaymentOption {
  type?: 'advanced'
  rawAmount: string | number
  tokenDecimals?: number
  tokenSymbol?: string
  currency?: string
  network?: string
  recipient?: string
  description?: string
}


export async function getMcpTools(url: string) {
  try {
    const transport = new StreamableHTTPClientTransport(new URL(url))

    const client = await createMCPClient({
      transport,
    })

    const tools = await client.tools()

    if (!tools) {
      throw new Error("No tools found")
    }

    const toolsNames = Object.keys(tools)

    return toolsNames.map((toolName) => ({
      name: toolName,
      description: tools[toolName]?.description,
      inputSchema: tools[toolName]?.inputSchema,
    }))
  } catch (error) {
    console.warn("Warning: MCP tools unavailable (returning empty set):", error)
    return []
  }
}


export async function getMcpPrompts(url: string) {
  const transport = new StreamableHTTPClientTransport(new URL(url))
  const client = new Client({ name: "mcpay-inspect", version: "1.0.0" })
  await client.connect(transport)
  const prompts = await client.listPrompts()

  const enrichedPrompts = []
  for (const prompt of prompts.prompts) {
    const promptDetail = await client.getPrompt({ name: prompt.name })

    // Extract text content from messages
    const textContent = promptDetail.messages
      ?.map(message => {
        if (typeof message.content === 'string') {
          return message.content
        } else if (message.content?.type === 'text') {
          return message.content.text
        }
        return ''
      })
      .filter(text => text.length > 0)
      .join('\n\n') || ''

    enrichedPrompts.push({
      name: prompt.name,
      description: prompt.description || promptDetail.description,
      content: textContent,
      messages: promptDetail.messages || []
    })
  }

  return {
    prompts: enrichedPrompts
  }
}

// Type guard functions
function isSimplePaymentOption(option: unknown): option is SimplePaymentOption {
  return typeof option === 'object' && option !== null && 'price' in option && typeof (option as Record<string, unknown>).price === 'number'
}

function isAdvancedPaymentOption(option: unknown): option is AdvancedPaymentOption {
  return typeof option === 'object' && option !== null && 'rawAmount' in option && (option as Record<string, unknown>).rawAmount !== undefined
}

/**
 * Helper function to resolve token information for a currency symbol on a specific network
 */
function resolveTokenForCurrency(currencySymbol: string, network: UnifiedNetwork) {
  // First, check stablecoin configs for known decimals
  const upperSymbol = currencySymbol.toUpperCase()
  if (upperSymbol in STABLECOIN_CONFIGS) {
    const stablecoinConfig = STABLECOIN_CONFIGS[upperSymbol as keyof typeof STABLECOIN_CONFIGS]

    // Get the actual token from the network
    const tokens = getNetworkTokens(network)
    const token = tokens.find(t => t.symbol === upperSymbol && t.isStablecoin)

    if (token) {
      return token
    }

    // Fallback to stablecoin config if not found in network
    return {
      symbol: stablecoinConfig.symbol,
      name: stablecoinConfig.name,
      decimals: stablecoinConfig.decimals,
      isStablecoin: true,
      verified: true
    }
  }

  // For non-stablecoins, look in network token registry
  const tokens = getNetworkTokens(network)
  return tokens.find(t => t.symbol === upperSymbol)
}

/**
 * Helper function to get default token addresses when token lookup fails
 */
function getDefaultTokenAddress(tokenSymbol: string, network: UnifiedNetwork): string {
  // Known token addresses for common networks
  const tokenAddresses: Record<string, Record<string, string>> = {
    'base-sepolia': {
      'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      'ETH': '0x0000000000000000000000000000000000000000',
    },
    'base': {
      'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      'ETH': '0x0000000000000000000000000000000000000000',
    },
    'sei-testnet': {
      'USDC': '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
      'SEI': '0x0000000000000000000000000000000000000000',
    }
  }

  return tokenAddresses[network]?.[tokenSymbol.toUpperCase()] || '0x0000000000000000000000000000000000000000'
}

/**
 * Helper function to get default USDC address for a network
 */
function getDefaultUSDCAddress(network: UnifiedNetwork): string {
  return getDefaultTokenAddress('USDC', network)
}