import { type ApiError } from "@/types/api"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import env from "@/env";
import { Price } from "x402/types";

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

  getMcp2Url: () => {
    return env.NEXT_PUBLIC_MCP2_URL;
  },

  // Generate MCP server URL
  getMcpUrl: (serverIdOrUrl: string, usesMpc2 = true) => {
    if (typeof window === "undefined" || !window.location?.origin) {
      throw new Error("window.location.origin is not available")
    }

    console.log(serverIdOrUrl)
    const MCP_PROXY_URL = env.NEXT_PUBLIC_MCP_PROXY_URL
    if (usesMpc2) {
      // Compose the target MCP2 URL
      const mcp2Url = `${urlUtils.getMcp2Url()}/mcp?id=${serverIdOrUrl}`

      console.log(`[${new Date().toISOString()}] MCP2 URL: ${mcp2Url}`);
      // Base64 encode the MCP2 URL
      const base64Mcp2Url = btoa(mcp2Url)
      // Compose the MCP proxy URL with the base64-encoded target-url param
      const url = `${MCP_PROXY_URL}/mcp?target-url=${encodeURIComponent(base64Mcp2Url)}`
      console.log(`[${new Date().toISOString()}] MCP URL: ${url}`);
      return url
    } else {
      // Just encode the serverId directly as the target-url param
      const base64ServerId = btoa(serverIdOrUrl)
      return `${MCP_PROXY_URL}/mcp?target-url=${encodeURIComponent(base64ServerId)}`
    }
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
  getUserWalletsWithBalances: async (userId: string, includeTestnet = true) => {
    return apiCall(`/users/${userId}/wallets?includeTestnet=${includeTestnet}`)
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
  ): Promise<{ items: Array<{
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
  }>; total: number }> => {
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
