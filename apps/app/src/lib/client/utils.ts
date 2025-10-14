import { type ApiError } from "@/types/api"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import env from "@/env";
import { Price } from "x402/types";
import type { UnifiedNetwork } from "@/lib/commons/networks";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Text sanitization utilities for security
export const textUtils = {
  // Sanitize text for display - removes potentially dangerous characters
  sanitizeForDisplay: (text: string, maxLength: number = 100): string => {
    if (!text || typeof text !== 'string') return ''

    // Remove HTML tags and dangerous characters
    const sanitized = text
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove remaining angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:/gi, '') // Remove data: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .trim()

    // Truncate if too long
    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength) + '...'
    }

    return sanitized
  },

}

// API Configuration
export const API_CONFIG = {
  baseUrl: "/api",
  mcpBaseUrl: "/mcp",
  timeout: 30000, // 30 seconds in milliseconds
}

// URL Generation Utilities
export const urlUtils = {
  // Get the API base URL
  getApiBaseUrl: () => API_CONFIG.baseUrl,

  // Get the MCP base URL
  getMcpBaseUrl: () => API_CONFIG.mcpBaseUrl,

  // Generate API endpoint URL
  getApiUrl: (endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${API_CONFIG.baseUrl}${cleanEndpoint}`
  },

  // Get service URLs from environment
  getAuthUrl: () => env.NEXT_PUBLIC_AUTH_URL!,
  getMcp2Url: () => env.NEXT_PUBLIC_MCP2_URL!,
  getMcpProxyUrl: () => env.NEXT_PUBLIC_MCP_PROXY_URL!,
  getMcpDataUrl: () => env.NEXT_PUBLIC_MCP_DATA_URL!,

  // Generate MCP server URL
  getMcpUrl: (serverUrl: string) => {
    if (typeof window === "undefined" || !window.location?.origin) {
      throw new Error("window.location.origin is not available")
    }

    const MCP_PROXY_URL = env.NEXT_PUBLIC_MCP_PROXY_URL
    // Compose the target MCP2 URL
    // const mcp2Url = `${urlUtils.getMcp2Url()}/mcp?id=${serverIdOrUrl}`

    const base64ServerUrl = btoa(serverUrl)
    // Compose the MCP proxy URL with the base64-encoded target-url param
    const url = `${MCP_PROXY_URL}/mcp?target-url=${encodeURIComponent(base64ServerUrl)}`
    return url

  },

  // Generate full URLs for different services
  getAuthApiUrl: (endpoint: string) => {
    const baseUrl = urlUtils.getAuthUrl()
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${baseUrl}${cleanEndpoint}`
  },

  getMcpDataApiUrl: (endpoint: string) => {
    const baseUrl = urlUtils.getMcpDataUrl()
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${baseUrl}${cleanEndpoint}`
  },
}

// API utility function with proper error handling
export async function apiCall<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = urlUtils.getApiUrl(endpoint)

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const config: RequestInit = {
    ...options,
    headers: defaultHeaders,
    credentials: 'include'
  }

  // Add timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)
  config.signal = controller.signal

  try {
    const response = await fetch(url, config)
    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      let errorDetails: unknown = null

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        errorDetails = errorData.details || errorData
      } catch {
        // Failed to parse error JSON, use status text
        errorMessage = `${response.status}: ${response.statusText}`
      }

      // Include status code in error message for frontend handling
      const statusAwareMessage = `${response.status}: ${errorMessage}`
      const error = new Error(statusAwareMessage) as ApiError
      error.status = response.status
      error.details = errorDetails
      throw error
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }

    throw new Error('An unknown error occurred')
  }
}

// Generic API call function for any service
export async function serviceApiCall<T = unknown>(
  baseUrl: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const config: RequestInit = {
    ...options,
    headers: defaultHeaders,
    credentials: 'include'
  }

  // Add timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout)
  config.signal = controller.signal

  try {
    const response = await fetch(url, config)
    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      let errorDetails: unknown = null

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
        errorDetails = errorData.details || errorData
      } catch {
        // Failed to parse error JSON, use status text
        errorMessage = `${response.status}: ${response.statusText}`
      }

      // Include status code in error message for frontend handling
      const statusAwareMessage = `${response.status}: ${errorMessage}`
      const error = new Error(statusAwareMessage) as ApiError
      error.status = response.status
      error.details = errorDetails
      throw error
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }

    throw new Error('An unknown error occurred')
  }
}

// Service-specific API functions
export const authApi = {
  // Get user wallets
  getWallets: async () => {
    return serviceApiCall(urlUtils.getAuthUrl(), '/api/wallets')
  },

  // Get wallet balance for specific network
  getBalance: async (
    walletAddress: string,
    network: string
  ): Promise<{
    native: {
      balance?: string
      balanceFormatted?: string
      [key: string]: unknown
    } | null
    usdc: {
      balance?: string
      balanceFormatted?: string
      [key: string]: unknown
    } | null
  }> => {
    return serviceApiCall(urlUtils.getAuthUrl(), `/api/balance?walletAddress=${walletAddress}&network=${network}`)
  },

  // Get API keys
  getApiKeys: async () => {
    return serviceApiCall(urlUtils.getAuthUrl(), '/api/keys')
  },

  // Create API key
  createApiKey: async (): Promise<{ key: string }> => {
    return serviceApiCall(urlUtils.getAuthUrl(), '/api/keys', {
      method: 'POST',
    })
  },

  // Update API key
  updateApiKey: async (id: string, enabled: boolean) => {
    return serviceApiCall(urlUtils.getAuthUrl(), `/api/keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
  },

  // Delete API key
  deleteApiKey: async (id: string) => {
    return serviceApiCall(urlUtils.getAuthUrl(), `/api/keys/${id}`, {
      method: 'DELETE',
    })
  },

  // Get onramp URL
  getOnrampUrl: async (walletAddress: string) => {
    return serviceApiCall(urlUtils.getAuthUrl(), '/api/onramp/url', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    })
  },
}

export type McpServer = {
  id: string
  origin: string
  status: string
  last_seen_at: string
  tools: unknown[]
  server: {
    info: {
      name: string
      description: string
      icon: string
    }
  }
}

export const mcpDataApi = {
  // Get MCP servers
  getServers: async (): Promise<{ servers: McpServer[] }> => {
    return serviceApiCall(urlUtils.getMcpDataUrl(), '/servers')
  },

  // Get a single MCP server details (rich payload)
  getServerById: async (
    id: string
  ): Promise<{
    serverId: string
    origin: string
    originRaw?: string
    status?: string
    lastSeenAt?: string
    indexedAt?: string
    info: { name?: string; description?: string; icon?: string }
    tools: unknown[]
    summary: { lastActivity?: string; totalTools: number; totalRequests: number; totalPayments: number }
    dailyAnalytics: Array<{ date: string; totalRequests: number }>
    recentPayments: Array<{
      id: string
      createdAt: string
      status: 'completed' | 'failed'
      network?: string
      transactionHash?: string
      payer?: string
    }>
  }> => {
    return serviceApiCall(urlUtils.getMcpDataUrl(), `/server/${encodeURIComponent(id)}`)
  },

  // Trigger a fresh index by origin URL
  runIndex: async (origin: string): Promise<{ ok: boolean; serverId?: string } | { error: string }> => {
    return serviceApiCall(urlUtils.getMcpDataUrl(), `/index/run`, {
      method: 'POST',
      body: JSON.stringify({ origin }),
    })
  },

  // Explorer stats (paginated)
  getExplorer: async (
    limit: number,
    offset: number
  ): Promise<{
    stats: Array<{
      id: string
      ts: string
      method: string
      serverId: string
      serverName: string
      payment: {
        hasPayment: boolean
        paymentRequested: boolean
        paymentProvided: boolean
        metadata: {
          paymentResponse?: {
            payer: string
            network: string
            success: boolean
            transaction: string
          }
          paymentRequest?: {
            x402Version?: number
            scheme?: string
            network?: string
            payload?: {
              signature?: string
              authorization?: {
                from?: string
                to?: string
                value?: string
                validAfter?: string
                validBefore?: string
                nonce?: string
              }
            }
          }
        }
      }
    }>
    total: number
    limit: number
    offset: number
    nextOffset: number
    hasMore: boolean
  }> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    return serviceApiCall(urlUtils.getMcpDataUrl(), `/explorer?${params.toString()}`)
  },
}


// Specific API functions
export const api = {
  // Register a new MCP server
  registerServer: async (data: {
    mcpOrigin: string
    receiverAddress: string
    name?: string
    description?: string
    requireAuth?: boolean
    authHeaders?: Record<string, unknown>
    tools?: Array<{
      name: string
      price: Price
    }>
    metadata?: Record<string, unknown>
  }) => {
    return apiCall('/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get MCP tools from a server URL
  getMcpTools: async (url: string) => {
    return apiCall(`/inspect-mcp-tools?url=${encodeURIComponent(url)}`)
  },

  // Get MCP server info from a server URL
  getMcpServerInfo: async (url: string) => {
    return apiCall(`/inspect-mcp-server?url=${encodeURIComponent(url)}`)
  },

  // Get servers list
  getServers: async (limit = 10, offset = 0) => {
    return apiCall(`/servers?limit=${limit}&offset=${offset}`)
  },

  // Get server tools
  getServerTools: async (serverId: string) => {
    return apiCall(`/servers/${serverId}/tools`)
  },

  // Wallet management (future functionality)
  getUserWallets: async (userId: string) => {
    return apiCall(`/users/${userId}/wallets`)
  },

  // Get user wallets with balance information
  getUserWalletsWithBalances: async (includeTestnet = true) => {
    // Fetch wallets from auth service
    const wallets = await authApi.getWallets()

    if (!Array.isArray(wallets) || wallets.length === 0) {
      return {
        wallets: [],
        totalFiatValue: '0',
        testnetTotalFiatValue: '0',
        summary: {
          hasMainnetBalances: false,
          hasTestnetBalances: false,
          mainnetValueUsd: 0,
          testnetValueUsd: 0
        },
        mainnetBalancesByChain: {},
        testnetBalancesByChain: {}
      }
    }

    // Define networks to check for each wallet
    const networks = includeTestnet
      ? ["base", "polygon", "base-sepolia", "polygon-amoy"]
      : ["base", "polygon"]

    let totalFiatValue = 0
    let testnetTotalFiatValue = 0
    let hasMainnetBalances = false
    let hasTestnetBalances = false
    let mainnetValueUsd = 0
    let testnetValueUsd = 0

    const mainnetBalancesByChain: Partial<Record<UnifiedNetwork, unknown[]>> = {}
    const testnetBalancesByChain: Partial<Record<UnifiedNetwork, unknown[]>> = {}

    // For each wallet, fetch balances for each network
    const walletsWithBalances = await Promise.all(
      wallets.map(async (wallet: { walletAddress: string;[key: string]: unknown }) => {
        const walletBalances = []

        for (const network of networks) {
          try {
            const balanceData = await authApi.getBalance(wallet.walletAddress, network)

            if (balanceData && balanceData.usdc) {
              const isTestnet = network.includes('sepolia') || network.includes('amoy')

              // Calculate fiat value from balance data
              let fiatValue = 0
              if (balanceData.usdc?.balanceFormatted) {
                fiatValue += parseFloat(balanceData.usdc.balanceFormatted) || 0
              }

              if (isTestnet) {
                testnetTotalFiatValue += fiatValue
                testnetValueUsd += fiatValue
                hasTestnetBalances = true

                if (!testnetBalancesByChain[network as UnifiedNetwork]) {
                  testnetBalancesByChain[network as UnifiedNetwork] = []
                }
                testnetBalancesByChain[network as UnifiedNetwork]!.push(balanceData.usdc)
              } else {
                totalFiatValue += fiatValue
                mainnetValueUsd += fiatValue
                hasMainnetBalances = true

                if (!mainnetBalancesByChain[network as UnifiedNetwork]) {
                  mainnetBalancesByChain[network as UnifiedNetwork] = []
                }
                mainnetBalancesByChain[network as UnifiedNetwork]!.push(balanceData.usdc)
              }

              walletBalances.push({
                network,
                native: null,
                usdc: balanceData.usdc,
                fiatValue
              })
            }
          } catch (error) {
            // If balance fails for a network, continue with other networks
            console.warn(`Failed to get balance for ${wallet.walletAddress} on ${network}:`, error)
          }
        }

        return {
          ...wallet,
          balances: walletBalances
        }
      })
    )

    return {
      wallets: walletsWithBalances,
      totalFiatValue: totalFiatValue.toString(),
      testnetTotalFiatValue: testnetTotalFiatValue.toString(),
      summary: {
        hasMainnetBalances,
        hasTestnetBalances,
        mainnetValueUsd,
        testnetValueUsd
      },
      mainnetBalancesByChain,
      testnetBalancesByChain
    }
  },

  addWalletToUser: async (userId: string, walletData: {
    walletAddress: string;
    blockchain: string;
    walletType: 'external' | 'managed' | 'custodial';
    provider?: string;
    isPrimary?: boolean;
    walletMetadata?: Record<string, unknown>;
  }) => {
    return apiCall(`/users/${userId}/wallets`, {
      method: 'POST',
      body: JSON.stringify(walletData),
    })
  },

  setWalletAsPrimary: async (userId: string, walletId: string) => {
    return apiCall(`/users/${userId}/wallets/${walletId}/primary`, {
      method: 'PUT',
    })
  },

  removeWallet: async (userId: string, walletId: string) => {
    return apiCall(`/users/${userId}/wallets/${walletId}`, {
      method: 'DELETE',
    })
  },

  // Coinbase Onramp integration
  createOnrampUrl: async (userId: string, options: {
    walletAddress?: string;
    network?: string;
    asset?: string;
    amount?: number;
    currency?: string;
    redirectUrl?: string;
  } = {}) => {
    return apiCall(`/users/${userId}/onramp/buy-url`, {
      method: 'POST',
      body: JSON.stringify(options),
    })
  },

  getOnrampConfig: async () => {
    return apiCall('/onramp/config')
  },

  // API Keys management
  getUserApiKeys: async (userId: string) => {
    return apiCall(`/users/${userId}/api-keys`)
  },

  createApiKey: async (userId: string, data: {
    name: string;
    permissions: string[];
    expiresInDays?: number;
  }) => {
    return apiCall(`/users/${userId}/api-keys`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  revokeApiKey: async (userId: string, keyId: string) => {
    return apiCall(`/users/${userId}/api-keys/${keyId}`, {
      method: 'DELETE',
    })
  },

  // User History
  getUserToolUsageHistory: async (userId: string, limit = 50, offset = 0) => {
    return apiCall(`/users/${userId}/tool-usage?limit=${limit}&offset=${offset}`)
  },

  getUserPaymentHistory: async (userId: string, limit = 50, offset = 0) => {
    return apiCall(`/users/${userId}/payments?limit=${limit}&offset=${offset}`)
  },

  // Mock: latest payments for explorer
  getLatestPayments: async (
    limit: number,
    offset: number,
    status: 'completed' | 'pending' | 'failed' | undefined = 'completed'
  ): Promise<{
    items: Array<{
      id: string;
      status: 'success' | 'pending' | 'failed';
      serverId: string;
      serverName: string;
      tool: string;
      amountFormatted: string;
      currency: string;
      network: string;
      user: string;
      timestamp: string;
      txHash: string;
    }>; total: number
  }> => {
    const total = 240

    const baseTime = Date.now()
    const networks = [
      'ethereum',
      'base',
      'base-sepolia',
      'sei-testnet',
    ] as const
    const tools = ['chat', 'image', 'audio', 'embed', 'moderate'] as const
    const servers = [
      { id: 'srv-openai', name: 'OpenAI GPT' },
      { id: 'srv-claude', name: 'Claude' },
      { id: 'srv-llama', name: 'Llama' },
      { id: 'srv-stable', name: 'Stable Diffusion' },
      { id: 'srv-whisper', name: 'Whisper' },
    ] as const

    const rng = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    const mkItem = (i: number) => {
      const net = networks[i % networks.length]
      const tool = tools[i % tools.length]
      const srv = servers[i % servers.length]
      const isPending = (i + 1) % 23 === 0
      const isFailed = (i + 7) % 53 === 0
      const s: 'success' | 'pending' | 'failed' = isFailed ? 'failed' : isPending ? 'pending' : 'success'
      const amt = (rng(i + 1) * 3 + 0.0005).toFixed(4)
      const ts = new Date(baseTime - (i + 1) * 90_000).toISOString()
      const hash = `0x${(i.toString(16).padStart(6, '0'))}${Math.floor(rng(i + 3) * 1e12).toString(16).padStart(12, '0')}`
      const user = `0x${Math.floor(rng(i + 5) * 1e16).toString(16).padStart(16, '0')}`

      return {
        id: `pay-${i + 1}`,
        status: s,
        serverId: srv.id,
        serverName: srv.name,
        tool,
        amountFormatted: amt,
        currency: net === 'sei-testnet' ? 'SEI' : 'ETH',
        network: net,
        user,
        timestamp: ts,
        txHash: hash,
      }
    }

    const start = Math.max(0, offset)
    const end = Math.min(total, start + Math.max(0, limit))
    const itemsAll: Array<ReturnType<typeof mkItem>> = Array.from({ length: total }, (_, i) => mkItem(i))

    let filtered = itemsAll
    if (status === 'pending') filtered = itemsAll.filter(i => i.status === 'pending')
    else if (status === 'failed') filtered = itemsAll.filter(i => i.status === 'failed')
    else if (status === 'completed') filtered = itemsAll.filter(i => i.status === 'success')

    const paged = filtered.slice(start, end)

    // Simulate async latency
    await new Promise(res => setTimeout(res, 250))

    return { items: paged, total: filtered.length }
  },
}
