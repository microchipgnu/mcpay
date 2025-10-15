import { type UnifiedNetwork } from "@/lib/commons/networks"
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
// (unused guards removed)

/**
 * Helper function to resolve token information for a currency symbol on a specific network
 */
// (unused token resolver removed)


/**
 * Helper function to get default USDC address for a network
 */
// (unused default USDC address helper removed)