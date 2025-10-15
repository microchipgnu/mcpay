"use client"

import { ConnectButton } from "@/components/custom-ui/connect-button"
import { useTheme } from "@/components/providers/theme-context"
import { usePrimaryWallet, useUser, useUserWallets } from "@/components/providers/user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { createInjectedSigner } from "@/lib/client/signer"
import { switchToNetwork } from "@/lib/client/wallet-utils"
import {
  formatTokenAmount,
  getNetworkByChainId,
  getTokenInfo
} from "@/lib/commons"
import { getNetworkInfo } from "@/lib/commons/tokens"
import { type Network } from "@/types/blockchain"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Copy,
  Loader2,
  Play,
  RefreshCw,
  Wallet,
  Wrench
} from "lucide-react"
import { withX402Client } from "mcpay/client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Account } from "viem/accounts"
import { useAccount, useChainId, useWalletClient } from "wagmi"
import type { MultiNetworkSigner } from "x402/types"

// Helper function to format wallet address for display
const formatWalletAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Consistent, filterable logger for this component
const LOG_PREFIX = "[MCPay][ToolExecutionModal]"
const log = {
  info: (...args: unknown[]) => console.log(LOG_PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(LOG_PREFIX, ...args),
  error: (...args: unknown[]) => console.error(LOG_PREFIX, ...args),
  debug: (...args: unknown[]) => console.debug(LOG_PREFIX, ...args),
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================



type ExecutionStatus = 'idle' | 'initializing' | 'executing' | 'success' | 'error'

interface ToolExecution {
  status: ExecutionStatus
  result?: unknown
  error?: string
  transactionId?: string
}


// =============================================================================
// STYLING UTILITIES
// =============================================================================

const getThemeClasses = (isDark: boolean) => ({
  input: "bg-background border-border text-foreground placeholder:text-muted-foreground",
  button: "border-border text-foreground hover:bg-muted/40 transition-all duration-300",
  modal: "bg-background border-border",
  text: {
    primary: "text-foreground",
    secondary: "text-muted-foreground",
    error: "text-foreground"
  },
  background: {
    error: "bg-red-500/10 text-red-600 border border-red-500/20 dark:text-red-400 dark:bg-red-800/50 dark:border-red-800/50",
    success: "bg-teal-500/10 text-teal-600 border border-teal-500/20 dark:text-teal-400 dark:bg-teal-800/50 dark:border-teal-800/50",
    warning: "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 dark:text-yellow-400 dark:bg-yellow-800/50 dark:border-yellow-800/50",
    info: "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400 dark:bg-blue-800/50 dark:border-blue-800/50",
    code: "bg-muted/50 border-border"
  }
})

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface PricingEntry {
  id?: string
  assetAddress: string
  network: string
  tokenDecimals: number
  maxAmountRequiredRaw: string
  active?: boolean
}

export interface ToolFromMcpServerWithStats {
  id: string
  name: string
  description: string
  inputSchema: ToolInputSchema
  outputSchema?: unknown
  pricing?: PricingEntry[]
  isMonetized?: boolean
}

export interface ToolExecutionModalProps {
  isOpen: boolean
  onClose: () => void
  tool: ToolFromMcpServerWithStats
  serverId: string
  url?: string
}


interface ToolInputSchema {
  type?: string
  properties?: Record<string, InputProperty>
  required?: string[]
}

interface MCPToolFromClient {
  name: string
  description?: string
  inputSchema?: { jsonSchema?: ToolInputSchema }
  parameters?: { jsonSchema?: ToolInputSchema }
  execute?: (params: Record<string, unknown>, options: { toolCallId: string; messages: unknown[] }) => Promise<unknown>
}


interface MCPToolsCollection {
  [key: string]: MCPToolFromClient
}

interface InputProperty {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  title?: string
  description?: string
  default?: unknown
  enum?: unknown[]
  minimum?: number
  maximum?: number
  properties?: Record<string, InputProperty>
  required?: string[]
  items?: InputProperty
}


interface UserWallet {
  id: string
  walletAddress: string
  walletType: 'external' | 'managed' | 'custodial' | string
  provider?: string
  isPrimary?: boolean
  isActive?: boolean
  createdAt?: string
}



export function ToolExecutionModal({ isOpen, onClose, tool, serverId, url }: ToolExecutionModalProps) {
  const { isDark } = useTheme()
  const { hasWallets } = useUser()
  const primaryWallet = usePrimaryWallet()
  const userWallets = useUserWallets()
  const { data: walletClient } = useWalletClient()
  const { address: connectedWalletAddress, isConnected: isBrowserWalletConnected } = useAccount()
  const chainId = useChainId()
  const themeClasses = getThemeClasses(isDark)

  // State for selected wallet (defaults to primary wallet)
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null)
  const [walletPopoverOpen, setWalletPopoverOpen] = useState(false)

  // Set selected wallet to primary when primary wallet changes
  useEffect(() => {
    if (primaryWallet && !selectedWallet) {
      setSelectedWallet(primaryWallet)
    }
  }, [primaryWallet, selectedWallet])



  // Get wallet connection status
  const activeWallet = selectedWallet || primaryWallet
  const walletAddress = activeWallet?.walletAddress
  const hasAccountWallets = hasWallets() && !!walletAddress

  // Check if selected wallet requires browser connection
  const requiresBrowserConnection = activeWallet?.walletType === 'external'
  const hasWalletClient = !!walletClient
  const needsBrowserConnection = requiresBrowserConnection && (!isBrowserWalletConnected || connectedWalletAddress?.toLowerCase() !== walletAddress?.toLowerCase())
  const needsWalletClient = requiresBrowserConnection // Only external wallets need wagmi wallet client

  // Overall connection status
  const isConnected = hasAccountWallets && (!needsWalletClient || hasWalletClient) && !needsBrowserConnection

  // Create stable tool reference to avoid infinite loops
  const toolInputSchemaString = useMemo(() => JSON.stringify(tool?.inputSchema), [tool?.inputSchema])

  const stableTool = useMemo(() => {
    if (!tool) return null
    return tool as ToolFromMcpServerWithStats & {
      pricing?: PricingEntry[]
    }
  }, [tool])

  // State management
  const [toolInputs, setToolInputs] = useState<Record<string, unknown>>({})
  const [execution, setExecution] = useState<ToolExecution>({ status: 'idle' })
  const [isMobile, setIsMobile] = useState(false)
  const [mcpClient, setMcpClient] = useState<Client | null>(null)
  const [mcpToolsCollection, setMcpToolsCollection] = useState<MCPToolsCollection>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  const [showPrettyJson, setShowPrettyJson] = useState(true)
  const [jsonEditorStates, setJsonEditorStates] = useState<Record<string, { value: string; error: string | null }>>({})
  const [pendingNetwork, setPendingNetwork] = useState<string | null>(null)

  // =============================================================================
  // NETWORK UTILITIES
  // =============================================================================

  const getRequiredNetwork = useCallback((): string | null => {
    return null // No pricing, so no network requirement
  }, [])

  const getCurrentNetwork = useCallback((): string | null => {
    // If a switch just succeeded, optimistically use that until wagmi updates chainId
    if (pendingNetwork) return pendingNetwork
    const network = chainId ? getNetworkByChainId(chainId) : undefined
    return typeof network === 'string' ? network : null
  }, [chainId, pendingNetwork])

  const isOnCorrectNetwork = useCallback((): boolean => {
    return true // No pricing, so always on correct network
  }, [])



  const handleNetworkSwitch = async () => {
    const requiredNetwork = getRequiredNetwork()
    if (!requiredNetwork) return

    setIsSwitchingNetwork(true)
    setExecution({ status: 'idle' }) // Clear any previous errors

    try {
      log.info(`[Network Switch] Starting switch to ${requiredNetwork}`)

      // Get network info from unified system

      const networkInfo = getNetworkInfo(requiredNetwork as Network)
      log.debug(`[Network Switch] Network info:`, networkInfo)

      const switched = await switchToNetwork(requiredNetwork as Network)
      if (!switched) {
        throw new Error(`Switch request failed or was rejected. Ensure your wallet supports ${requiredNetwork} and approve the request.`)
      }
      log.info(`[Network Switch] Successfully switched to ${requiredNetwork}`)
      toast.success(`Switched to ${requiredNetwork}`)
      setPendingNetwork(requiredNetwork)

      // Clear any previous errors after successful switch
      if (execution.status === 'error') {
        setExecution({ status: 'idle' })
      }
    } catch (error) {
      log.error('[Network Switch] Failed to switch network:', error)
      log.error('[Network Switch] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        requiredNetwork,
        error
      })

      setExecution({
        status: 'error',
        error: `Failed to switch to ${requiredNetwork}: ${error instanceof Error ? error.message : 'Unknown error. Check browser console for details.'}`
      })
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  // Clear optimistic pending network once wagmi reports the new chainId
  useEffect(() => {
    if (!pendingNetwork) return
    const current = chainId ? getNetworkByChainId(chainId) : undefined
    if (typeof current === 'string' && current === pendingNetwork) {
      setPendingNetwork(null)
    }
  }, [chainId, pendingNetwork])


  // =============================================================================
  // CURRENCY AND TOKEN UTILITIES
  // =============================================================================

  const formatCurrency = useCallback((amount: string | number, currency: string, network?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount

    // If we have network info, try to get token info from registry
    if (network) {
      const tokenInfo = getTokenInfo(currency, network as Network)
      if (tokenInfo) {
        // Use our awesome token registry formatting
        return formatTokenAmount(num, currency, network as Network, {
          showSymbol: true,
          precision: tokenInfo.isStablecoin ? 2 : 4,
          compact: num >= 1000
        })
      }
    }

    // Fallback: check if it's a token address and show abbreviated
    if (currency.startsWith('0x') && currency.length === 42) {
      return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
    }

    // Simple currency display
    return `${num.toFixed(6)} ${currency}`
  }, [])

  // =============================================================================
  // MOBILE DETECTION
  // =============================================================================

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // =============================================================================
  // TOOL SCHEMA UTILITIES
  // =============================================================================

  const getToolProperties = useCallback((toolArg: ToolFromMcpServerWithStats): Record<string, InputProperty> => {
    // First try to get from MCP client tools (if available and initialized)
    if (isInitialized && mcpToolsCollection[toolArg.name]) {
      const mcpTool = mcpToolsCollection[toolArg.name] as MCPToolFromClient
      if (mcpTool.inputSchema?.jsonSchema?.properties) {
        return mcpTool.inputSchema.jsonSchema.properties
      }
      if (mcpTool.parameters?.jsonSchema?.properties) {
        return mcpTool.parameters.jsonSchema.properties
      }
    }

    // Fallback to server tool inputSchema
    const schema = toolArg.inputSchema as ToolInputSchema
    if (schema && typeof schema === 'object' && schema.properties) {
      return schema.properties
    }
    return {}
  }, [isInitialized, mcpToolsCollection])

  const getRequiredFields = useCallback((toolArg: ToolFromMcpServerWithStats): string[] => {
    // First try to get from MCP client tools (if available and initialized)
    if (isInitialized && mcpToolsCollection[toolArg.name]) {
      const mcpTool = mcpToolsCollection[toolArg.name] as MCPToolFromClient
      if (mcpTool.parameters?.jsonSchema?.required) {
        return mcpTool.parameters.jsonSchema.required
      }
      if (mcpTool.inputSchema?.jsonSchema?.required) {
        return mcpTool.inputSchema.jsonSchema.required
      }
    }

    // Fallback to server tool inputSchema
    const schema = toolArg.inputSchema as ToolInputSchema
    if (schema && typeof schema === 'object' && schema.required) {
      return schema.required
    }
    return []
  }, [isInitialized, mcpToolsCollection])

  const hasToolInputs = useCallback((toolArg: ToolFromMcpServerWithStats): boolean => {
    const properties = getToolProperties(toolArg)
    return Object.keys(properties).length > 0
  }, [getToolProperties])

  // =============================================================================
  // TOOL INPUT MANAGEMENT
  // =============================================================================

  // Track previous tool ID and wallet ID to avoid unnecessary resets
  const [previousToolId, setPreviousToolId] = useState<string | null>(null)
  const [previousWalletId, setPreviousWalletId] = useState<string | null>(null)

  useEffect(() => {
    if (!stableTool) {
      setPreviousToolId(null)
      return
    }

    const currentWalletId = activeWallet?.id || null

    // Reset MCP initialization if the tool or active wallet changed
    const toolChanged = previousToolId !== stableTool.id
    const walletChanged = previousWalletId !== currentWalletId

    if (toolChanged || walletChanged) {
      if (toolChanged) setPreviousToolId(stableTool.id)
      if (walletChanged) setPreviousWalletId(currentWalletId)

      setIsInitialized(false)
      setIsSwitchingNetwork(false)
    }

    // Initialize tool inputs (this doesn't depend on MCP being ready)
    const inputs: Record<string, unknown> = {}
    const properties = getToolProperties(stableTool)

    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.type === 'array') {
        inputs[key] = prop.default || []
      } else if (prop.type === 'object') {
        inputs[key] = prop.default || {}
      } else if (prop.type === 'boolean') {
        inputs[key] = prop.default !== undefined ? prop.default : false
      } else if (prop.type === 'number' || prop.type === 'integer') {
        inputs[key] = prop.default !== undefined ? prop.default : 0
      } else {
        inputs[key] = prop.default || ''
      }
    })

    setToolInputs(inputs)
    setExecution({ status: 'idle' })
  }, [stableTool, activeWallet?.id, previousToolId, previousWalletId, getToolProperties])

  // Update inputs when MCP data becomes available (enhances the initial inputs)
  useEffect(() => {
    if (!stableTool || !isInitialized || !mcpToolsCollection[stableTool.name]) return

    const inputs: Record<string, unknown> = {}
    const properties = getToolProperties(stableTool)

    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.type === 'array') {
        inputs[key] = prop.default || []
      } else if (prop.type === 'object') {
        inputs[key] = prop.default || {}
      } else if (prop.type === 'boolean') {
        inputs[key] = prop.default !== undefined ? prop.default : false
      } else if (prop.type === 'number' || prop.type === 'integer') {
        inputs[key] = prop.default !== undefined ? prop.default : 0
      } else {
        inputs[key] = prop.default || ''
      }
    })

    setToolInputs(inputs)
  }, [stableTool, isInitialized, mcpToolsCollection, getToolProperties])

  // =============================================================================
  // MCP CLIENT INITIALIZATION
  // =============================================================================

  useEffect(() => {
    if (!isOpen || !isConnected || !walletAddress || !stableTool || isInitialized) return
    // Only check for walletClient if it's an external wallet that needs it
    if (needsWalletClient && !walletClient) return

    const initializeMcpClient = async () => {
      try {
        setExecution({ status: 'initializing' })

        let mcpUrl = null

        if (url) {
          // Use the local proxy route for direct URLs
          const base64ServerUrl = btoa(url)
          mcpUrl = new URL(`/api/mcp-proxy?target-url=${encodeURIComponent(base64ServerUrl)}`, window.location.origin)
        } else if (serverId) {
          // Use the local proxy route for server IDs
          const base64ServerUrl = btoa(serverId)
          mcpUrl = new URL(`/api/mcp-proxy?target-url=${encodeURIComponent(base64ServerUrl)}`, window.location.origin)
        } else {
          throw new Error("Either server ID or URL must be provided")
        }

        log.info(`Initializing MCP client for tool=${stableTool.name} walletType=${activeWallet?.walletType} url=${String(mcpUrl)}`)

        const mcpClient = new Client({ name: "mcpay-client", version: "1.0.0" })
        const networkForSigner = getRequiredNetwork() || getCurrentNetwork() || 'base'
        let evmSigner: MultiNetworkSigner['evm'] | undefined

        if (activeWallet?.walletType === 'external') {
          if (!walletClient?.account) {
            throw new Error("Wallet client required for external wallets")
          }
          // Build a signer that uses the injected provider for signing (no direct RPC to mainnet.base.org)
          evmSigner = createInjectedSigner(networkForSigner, walletClient.account as Account) as unknown as MultiNetworkSigner['evm']
          log.info(`Using external wallet signer on network=${networkForSigner}`, { address: walletClient.account.address })
        } else {
          // Managed wallets: do not set signer; server will auto-sign via CDP
          log.info("Using managed wallet - client-side signing disabled; server will auto-sign if needed", {
            address: walletAddress,
            walletType: activeWallet?.walletType
          })
        }


        const transport = new StreamableHTTPClientTransport(mcpUrl, {
          requestInit: {
            credentials: 'include',
            headers: {
              'X-Wallet-Type': activeWallet?.walletType || 'unknown',
              'X-Wallet-Address': walletAddress || '',
              'X-Wallet-Provider': activeWallet?.provider || 'unknown',
            }
          }
        });

        console.log('MCP Transport initialized with:', {
          url: mcpUrl.toString(),
          credentials: 'include',
          headers: {
            'X-Wallet-Type': activeWallet?.walletType || 'unknown',
            'X-Wallet-Address': walletAddress || '',
            'X-Wallet-Provider': activeWallet?.provider || 'unknown',
          }
        });


        await mcpClient.connect(transport)
        log.info("MCP client connected")
        log.info(`[${new Date().toISOString()}] evmSigner: ${JSON.stringify(evmSigner)}`)

        // Wrap with x402 only when we have a signer (external wallet)
        const augmentedClient = evmSigner
          ? withX402Client(mcpClient, {
              wallet: { evm: evmSigner },
              maxPaymentValue: BigInt(0.1 * 10 ** 6), // 0.1 USDC max
              confirmationCallback: async (accepts) => true
            })
          : mcpClient

        // Get available tools and build a callable tools collection
        const toolsResult = await (augmentedClient as unknown as Client).listTools()
        log.info("Available MCP tools:", toolsResult?.tools?.map(t => t.name))

        const toolsCollection: MCPToolsCollection = {}
        for (const t of toolsResult.tools) {
          const toolName = t.name
          toolsCollection[toolName] = {
            name: toolName,
            description: t.description,
            inputSchema: { jsonSchema: t.inputSchema as unknown },
            execute: async (params: Record<string, unknown>, options: { toolCallId: string; messages: unknown[] }) => {
              log.info(`[Execute] Calling tool`, { tool: toolName, params })
              const res = await (augmentedClient as unknown as Client).callTool({
                name: toolName,
                arguments: params,
                toolCallId: options.toolCallId,
              })
              // Attempt to extract a useful result from MCP response content
              const isRecord = (v: unknown): v is Record<string, unknown> =>
                typeof v === 'object' && v !== null
              const hasContentArray = (v: unknown): v is { content: unknown[] } =>
                isRecord(v) && Array.isArray((v as Record<string, unknown>)['content'])
              const content: unknown[] | undefined = hasContentArray(res) ? res.content : undefined
              let text: string | undefined
              if (Array.isArray(content)) {
                for (const item of content) {
                  if (isRecord(item)) {
                    const typeValue = item['type']
                    if (typeof typeValue === 'string' && typeValue === 'text') {
                      const textValue = item['text']
                      if (typeof textValue === 'string') {
                        text = textValue
                        break
                      }
                    }
                  }
                }
              }
              if (typeof text === 'string') {
                try {
                  const parsed = JSON.parse(text)
                  log.info(`[Execute] Parsed JSON result`, { tool: toolName })
                  return parsed
                } catch {
                  log.info(`[Execute] Non-JSON text result`, { tool: toolName })
                  return text
                }
              }
              log.info(`[Execute] Raw MCP result returned`, { tool: toolName })
              return res
            }
          } as MCPToolFromClient
        }

        setMcpClient(mcpClient)
        setMcpToolsCollection(toolsCollection)
        setIsInitialized(true)
        setExecution({ status: 'idle' })
        log.info(`MCP client initialized for tool: ${stableTool.name}`)
        log.debug(`Tools collection keys: ${Object.keys(toolsCollection).join(', ')}`)
        if (!toolsCollection[stableTool.name]) {
          log.warn(`Tool not found in MCP server tools: ${stableTool.name}`)
        }
      } catch (error) {
        log.error("Failed to initialize MCP client:", error)
        
        // Enhanced error handling for CORS and network issues
        let errorMessage = 'Failed to initialize MCP client'
        if (error instanceof Error) {
          if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
            errorMessage = `CORS Error: ${error.message}. Please check server configuration.`
          } else if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage = `Network Error: ${error.message}. Please check your connection and server status.`
          } else if (error.message.includes('404') || error.message.includes('not found')) {
            errorMessage = `Server Not Found: ${error.message}. Please verify the server URL.`
          } else {
            errorMessage = error.message
          }
        }
        
        setExecution({
          status: 'error',
          error: errorMessage
        })
      }
    }

    initializeMcpClient()
  }, [isOpen, isConnected, walletAddress, stableTool, serverId, walletClient, isInitialized, needsWalletClient, activeWallet, getCurrentNetwork, getRequiredNetwork, url])

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false)
      setMcpClient(null)
      setMcpToolsCollection({})
      setExecution({ status: 'idle' })
      setIsSwitchingNetwork(false)
      setWalletPopoverOpen(false)
      setJsonEditorStates({})
    }
  }, [isOpen])

  // =============================================================================
  // TOOL EXECUTION
  // =============================================================================

  const updateToolInput = (inputName: string, value: unknown) => {
    setToolInputs(prev => ({
      ...prev,
      [inputName]: value
    }))
  }

  const executeTool = async () => {
    if (!stableTool || !mcpClient || !isInitialized) return
    // For external wallets, ensure wallet client is available
    if (needsWalletClient && !walletClient) return

    setExecution({ status: 'executing' })

    try {
      // Get the MCP tool by name
      const mcpTool = mcpToolsCollection[stableTool.name] as MCPToolFromClient

      if (!mcpTool) {
        throw new Error(`Tool "${stableTool.name}" not found in MCP server`)
      }

      log.info(`[Execute] Starting`, { tool: stableTool.name, walletType: activeWallet?.walletType, walletAddress, inputs: toolInputs })
      log.debug(`[Execute] Schema`, mcpTool.parameters?.jsonSchema || mcpTool.inputSchema?.jsonSchema)

      // Execute the tool using the MCP client's callTool method
      const result = await mcpTool.execute?.(toolInputs, {
        toolCallId: Date.now().toString(),
        messages: []
      })

      log.info(`[Execute] Success`, { tool: stableTool.name })

      // Try to extract transaction ID from result if available
      let transactionId: string | undefined
      if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>
        transactionId = resultObj.transactionId as string ||
          resultObj.txId as string ||
          resultObj.hash as string ||
          resultObj.transaction_id as string
      }

      setExecution({
        status: 'success',
        result,
        transactionId
      })
    } catch (error) {
      log.error("[Execute] Failed:", error)

      // Enhanced error handling for managed wallets
      if (activeWallet?.walletType === 'managed' && error instanceof Error) {
        if (error.message.includes('CDP') || error.message.includes('managed')) {
          setExecution({
            status: 'error',
            error: `Managed wallet error: ${error.message}. Please try again or contact support if the issue persists.`
          })
        } else {
          setExecution({
            status: 'error',
            error: `Tool execution failed: ${error.message}`
          })
        }
      } else {
        setExecution({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }
  }

  const copyResult = (result: unknown, format: 'json' | 'raw' = 'json') => {
    if (format === 'raw') {
      navigator.clipboard.writeText(String(result))
      toast.success("Raw result copied to clipboard")
    } else {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2))
      toast.success("JSON copied to clipboard")
    }
  }

  const downloadResult = (result: unknown) => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${stableTool?.name || 'tool'}-result.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Result downloaded as JSON")
  }

  // =============================================================================
  // INPUT FIELD RENDERING
  // =============================================================================

  // Recursive function to render object fields with nested properties
  const renderObjectField = (
    inputName: string,
    inputProp: InputProperty,
    currentValue: unknown,
    isRequired: boolean,
    pathPrefix: string
  ): React.ReactElement => {
    const objectValue = (typeof currentValue === 'object' && currentValue !== null) ? currentValue as Record<string, unknown> : {}
    const fullPath = pathPrefix ? `${pathPrefix}.${inputName}` : inputName

    // If the object has defined properties, render individual fields
    if (inputProp.properties && Object.keys(inputProp.properties).length > 0) {
      const objectRequiredFields = inputProp.required || []

      const updateObjectProperty = (propertyName: string, value: unknown) => {
        const newObject = { ...objectValue }
        if (value === '' || value === null || value === undefined) {
          delete newObject[propertyName]
        } else {
          newObject[propertyName] = value
        }
        // Update the correct input path - if pathPrefix is empty, use inputName directly
        const targetPath = pathPrefix ? fullPath : inputName
        updateToolInput(targetPath, newObject)
      }

      return (
        <div key={fullPath} className="space-y-3">
          <div className="space-y-2">
            <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
              {inputProp.title || inputName}
              {isRequired && <span className="text-red-500">*</span>}
              <span className="text-xs text-gray-500 ml-1">(Object)</span>
            </label>
            {inputProp.description && (
              <p className={`text-xs ${themeClasses.text.secondary}`}>
                {inputProp.description}
              </p>
            )}
          </div>

          <div className="ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
            {Object.entries(inputProp.properties).map(([propertyName, propertySchema]) => {
              const propertyValue = objectValue[propertyName]
              const isPropertyRequired = objectRequiredFields.includes(propertyName)
              const propertyPath = `${fullPath}.${propertyName}`

              // Handle nested objects recursively
              if (propertySchema.type === 'object') {
                return renderObjectField(propertyName, propertySchema, propertyValue, isPropertyRequired, fullPath)
              }

              // Handle arrays
              if (propertySchema.type === 'array') {
                return renderArrayField(propertyName, propertySchema, propertyValue, isPropertyRequired, propertyPath, updateObjectProperty)
              }

              // Handle primitive types
              return renderPrimitiveField(propertyName, propertySchema, propertyValue, isPropertyRequired, updateObjectProperty)
            })}
          </div>
        </div>
      )
    }

    // Fallback to JSON editor for objects without defined schema
    return renderJsonEditor(inputName, inputProp, currentValue, isRequired, fullPath)
  }

  // Helper function to render array fields within objects
  const renderArrayField = (
    propertyName: string,
    propertySchema: InputProperty,
    currentValue: unknown,
    isRequired: boolean,
    propertyPath: string,
    updateProperty: (name: string, value: unknown) => void
  ): React.ReactElement => {
    const arrayValue = Array.isArray(currentValue) ? currentValue : []

    const addArrayItem = () => {
      const newArray = [...arrayValue, '']
      updateProperty(propertyName, newArray)
    }

    const removeArrayItem = (index: number) => {
      const newArray = arrayValue.filter((_: unknown, i: number) => i !== index)
      updateProperty(propertyName, newArray)
    }

    const updateArrayItem = (index: number, value: unknown) => {
      const newArray = [...arrayValue]
      newArray[index] = value
      updateProperty(propertyName, newArray)
    }

    return (
      <div key={propertyPath} className="space-y-2">
        <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
          {propertySchema.title || propertyName}
          {isRequired && <span className="text-red-500">*</span>}
          <span className="text-xs text-gray-500 ml-1">(Array)</span>
        </label>
        {propertySchema.description && (
          <p className={`text-xs ${themeClasses.text.secondary}`}>
            {propertySchema.description}
          </p>
        )}
        <div className="space-y-2">
          {arrayValue.map((item: unknown, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                type="text"
                value={String(item)}
                onChange={(e) => updateArrayItem(index, e.target.value)}
                placeholder={`Enter ${propertyName} item ${index + 1}`}
                className={`flex-1 ${themeClasses.input}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeArrayItem(index)}
                className={`px-2 ${themeClasses.button}`}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addArrayItem}
            className={`w-full ${themeClasses.button}`}
          >
            + Add {propertyName} item
          </Button>
        </div>
      </div>
    )
  }

  // Helper function to render primitive fields within objects
  const renderPrimitiveField = (
    propertyName: string,
    propertySchema: InputProperty,
    currentValue: unknown,
    isRequired: boolean,
    updateProperty: (name: string, value: unknown) => void
  ): React.ReactElement => {
    const fieldValue = currentValue ?? (propertySchema.default || '')

    if (propertySchema.enum) {
      return (
        <div key={propertyName} className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
            {propertySchema.title || propertyName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            className={`w-full px-3 py-2 rounded-md border text-sm ${isDark
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
              }`}
            value={String(fieldValue)}
            onChange={(e) => updateProperty(propertyName, e.target.value)}
          >
            <option value="">Select {propertyName}</option>
            {propertySchema.enum.map(option => (
              <option key={String(option)} value={String(option)}>{String(option)}</option>
            ))}
          </select>
          {propertySchema.description && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {propertySchema.description}
            </p>
          )}
        </div>
      )
    }

    if (propertySchema.type === 'boolean') {
      return (
        <div key={propertyName} className="space-y-2">
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.primary}`}>
            <input
              type="checkbox"
              checked={fieldValue === true}
              onChange={(e) => updateProperty(propertyName, e.target.checked)}
              className="rounded"
            />
            {propertySchema.title || propertyName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          {propertySchema.description && (
            <p className={`text-xs ml-6 ${themeClasses.text.secondary}`}>
              {propertySchema.description}
            </p>
          )}
        </div>
      )
    }

    if (propertySchema.type === 'number' || propertySchema.type === 'integer') {
      return (
        <div key={propertyName} className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
            {propertySchema.title || propertyName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="number"
            value={String(fieldValue)}
            onChange={(e) => updateProperty(propertyName, parseFloat(e.target.value) || '')}
            placeholder={`Enter ${propertyName}`}
            min={propertySchema.minimum}
            max={propertySchema.maximum}
            className={themeClasses.input}
          />
          {propertySchema.description && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {propertySchema.description}
            </p>
          )}
        </div>
      )
    }

    // Default to text input
    const isLongText = propertySchema.description && propertySchema.description.length > 100

    return (
      <div key={propertyName} className="space-y-2">
        <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
          {propertySchema.title || propertyName}
          {isRequired && <span className="text-red-500">*</span>}
        </label>
        {isLongText ? (
          <Textarea
            value={String(fieldValue)}
            onChange={(e) => updateProperty(propertyName, e.target.value)}
            placeholder={`Enter ${propertyName}`}
            rows={3}
            className={themeClasses.input}
          />
        ) : (
          <Input
            type="text"
            value={String(fieldValue)}
            onChange={(e) => updateProperty(propertyName, e.target.value)}
            placeholder={`Enter ${propertyName}`}
            className={themeClasses.input}
          />
        )}
        {propertySchema.description && (
          <p className={`text-xs ${themeClasses.text.secondary}`}>
            {propertySchema.description}
          </p>
        )}
      </div>
    )
  }

  // Fallback JSON editor for objects without schema
  const renderJsonEditor = (
    inputName: string,
    inputProp: InputProperty,
    currentValue: unknown,
    isRequired: boolean,
    fullPath: string
  ): React.ReactElement => {
    const editorKey = fullPath
    const currentState = jsonEditorStates[editorKey] || {
      value: typeof currentValue === 'object' && currentValue !== null
        ? JSON.stringify(currentValue, null, 2)
        : String(currentValue || '{}'),
      error: null
    }

    const handleJsonChange = (value: string) => {
      let error = null
      try {
        if (value.trim() === '') {
          updateToolInput(fullPath, {})
        } else {
          const parsed = JSON.parse(value)
          updateToolInput(fullPath, parsed)
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Invalid JSON'
      }

      setJsonEditorStates(prev => ({
        ...prev,
        [editorKey]: { value, error }
      }))
    }

    return (
      <div key={fullPath} className="space-y-2">
        <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
          {inputProp.title || inputName}
          {isRequired && <span className="text-red-500">*</span>}
          <span className="text-xs text-gray-500 ml-1">(JSON Object)</span>
        </label>
        <Textarea
          value={currentState.value}
          onChange={(e) => handleJsonChange(e.target.value)}
          placeholder={`Enter ${inputName} as JSON object`}
          rows={4}
          className={`font-mono text-sm ${themeClasses.input} ${currentState.error ? 'border-red-500 focus:border-red-500' : ''
            }`}
        />
        {currentState.error && (
          <p className="text-xs text-red-500">
            JSON Error: {currentState.error}
          </p>
        )}
        {inputProp.description && (
          <p className={`text-xs ${themeClasses.text.secondary}`}>
            {inputProp.description}
          </p>
        )}
      </div>
    )
  }

  const renderInputField = (inputName: string, inputProp: InputProperty) => {
    console.log("Rendering input field:", inputName, inputProp)
    if (!stableTool) return null

    const currentValue = toolInputs[inputName] || ''
    const requiredFields = getRequiredFields(stableTool)
    const isRequired = requiredFields.includes(inputName)

    // Handle array inputs
    if (inputProp.type === 'array') {
      const arrayValue = Array.isArray(currentValue) ? currentValue : []

      const addArrayItem = () => {
        const newArray = [...arrayValue, '']
        updateToolInput(inputName, newArray)
      }

      const removeArrayItem = (index: number) => {
        const newArray = arrayValue.filter((_: unknown, i: number) => i !== index)
        updateToolInput(inputName, newArray)
      }

      const updateArrayItem = (index: number, value: string) => {
        const newArray = [...arrayValue]
        newArray[index] = value
        updateToolInput(inputName, newArray)
      }

      return (
        <div key={inputName} className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
            {inputName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="space-y-2">
            {arrayValue.map((item: unknown, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={String(item)}
                  onChange={(e) => updateArrayItem(index, e.target.value)}
                  placeholder={`Enter ${inputName} item ${index + 1}`}
                  className={`flex-1 ${themeClasses.input}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeArrayItem(index)}
                  className={`px-2 ${themeClasses.button}`}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addArrayItem}
              className={`w-full ${themeClasses.button}`}
            >
              + Add {inputName} item
            </Button>
          </div>
          {inputProp.description && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {inputProp.description}
            </p>
          )}
        </div>
      )
    }

    if (inputProp.enum) {
      return (
        <div key={inputName} className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
            {inputName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          <select
            className={`w-full px-3 py-2 rounded-md border text-sm ${isDark
              ? "bg-gray-700 border-gray-600 text-white"
              : "bg-white border-gray-300 text-gray-900"
              }`}
            value={String(currentValue)}
            onChange={(e) => updateToolInput(inputName, e.target.value)}
          >
            <option value="">Select {inputName}</option>
            {inputProp.enum.map(option => (
              <option key={String(option)} value={String(option)}>{String(option)}</option>
            ))}
          </select>
          {inputProp.description && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {inputProp.description}
            </p>
          )}
        </div>
      )
    }

    if (inputProp.type === 'number' || inputProp.type === 'integer') {
      return (
        <div key={inputName} className="space-y-2">
          <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
            {inputName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          <Input
            type="number"
            value={String(currentValue)}
            onChange={(e) => updateToolInput(inputName, parseFloat(e.target.value) || '')}
            placeholder={`Enter ${inputName}`}
            min={inputProp.minimum}
            max={inputProp.maximum}
            className={themeClasses.input}
          />
          {inputProp.description && (
            <p className={`text-xs ${themeClasses.text.secondary}`}>
              {inputProp.description}
            </p>
          )}
        </div>
      )
    }

    if (inputProp.type === 'boolean') {
      return (
        <div key={inputName} className="space-y-2">
          <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.primary}`}>
            <input
              type="checkbox"
              checked={currentValue === true}
              onChange={(e) => updateToolInput(inputName, e.target.checked)}
              className="rounded"
            />
            {inputName}
            {isRequired && <span className="text-red-500">*</span>}
          </label>
          {inputProp.description && (
            <p className={`text-xs ml-6 ${themeClasses.text.secondary}`}>
              {inputProp.description}
            </p>
          )}
        </div>
      )
    }

    // Handle object inputs with dynamic form generation
    if (inputProp.type === 'object') {
      return renderObjectField(inputName, inputProp, currentValue, isRequired, '')
    }

    // Default to text input
    const isLongText = inputProp.description && inputProp.description.length > 100

    return (
      <div key={inputName} className="space-y-2">
        <label className={`text-sm font-medium flex items-center gap-1 ${themeClasses.text.primary}`}>
          {inputName}
          {isRequired && <span className="text-red-500">*</span>}
        </label>
        {isLongText ? (
          <Textarea
            value={String(currentValue)}
            onChange={(e) => updateToolInput(inputName, e.target.value)}
            placeholder={`Enter ${inputName}`}
            rows={3}
            className={themeClasses.input}
          />
        ) : (
          <Input
            type="text"
            value={String(currentValue)}
            onChange={(e) => updateToolInput(inputName, e.target.value)}
            placeholder={`Enter ${inputName}`}
            className={themeClasses.input}
          />
        )}
        {inputProp.description && (
          <p className={`text-xs ${themeClasses.text.secondary}`}>
            {inputProp.description}
          </p>
        )}
      </div>
    )
  }

  // =============================================================================
  // CONTENT RENDERING
  // =============================================================================


  const renderWalletSection = () => {
    if (!hasAccountWallets) {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-medium text-foreground">Payment Wallet</h4>
          </div>
          <div className="p-3 rounded-md border bg-muted/30 border-border">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 dark:bg-yellow-800/50">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Connect a wallet to execute this tool</h4>
                <p className="text-xs text-muted-foreground">
                  You need a connected wallet to pay for tool execution.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h4 className="text-sm font-medium text-foreground">Payment Wallet</h4>
        </div>
        <div className="p-3 rounded-md border bg-muted/30 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {activeWallet?.walletType === 'managed' ? 'MCPay Wallet' : (activeWallet?.provider || 'Wallet')} ({formatWalletAddress(walletAddress || '')})
              </span>
              {needsBrowserConnection && (
                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400" title="Connection required">
                  <AlertCircle className="h-3 w-3" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {needsBrowserConnection && (
                <ConnectButton />
              )}
              {userWallets.length > 1 && (
                <Popover open={walletPopoverOpen} onOpenChange={setWalletPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs px-3 py-1 h-7 rounded-sm"
                    >
                      Change Wallet
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4">
                      <h5 className="text-sm font-medium mb-3 text-foreground">Select Payment Wallet</h5>
                      <div className="space-y-2">
                        {[...userWallets]
                          .sort((a, b) => {
                            if (a.isPrimary && !b.isPrimary) return -1
                            if (!a.isPrimary && b.isPrimary) return 1
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          })
                          .map((wallet) => (
                            <div
                              key={wallet.id}
                              onClick={() => {
                                setSelectedWallet(wallet)
                                setWalletPopoverOpen(false)
                              }}
                              className={`p-3 rounded-md border cursor-pointer transition-all duration-300 ${selectedWallet?.id === wallet.id
                                  ? 'border-teal-500 bg-teal-500/10 dark:bg-teal-800/50'
                                  : 'border-border hover:border-border hover:bg-muted/40'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm text-foreground">
                                    {formatWalletAddress(wallet.walletAddress)}
                                  </span>
                                  {wallet.isPrimary && (
                                    <Badge variant="secondary" className="text-xs">Primary</Badge>
                                  )}
                                </div>
                                {selectedWallet?.id === wallet.id && (
                                  <CheckCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          {needsBrowserConnection && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
              Browser wallet connection required
            </p>
          )}
        </div>
      </div>
    )
  }




  const getStatusIndicator = () => {
    if (!hasAccountWallets) {
      return { icon: AlertCircle, text: "Wallet Required", variant: "warning" as const }
    }

    if (needsBrowserConnection) {
      return { icon: AlertCircle, text: "Connection Required", variant: "warning" as const }
    }

    if (!isInitialized && execution.status !== 'error') {
      return { icon: Loader2, text: "Initializing...", variant: "info" as const, animate: true }
    }

    if (execution.status === 'error') {
      return { icon: AlertCircle, text: "Error", variant: "error" as const }
    }


    if (isSwitchingNetwork) {
      return { icon: Loader2, text: "Switching Network...", variant: "info" as const, animate: true }
    }

    if (execution.status === 'executing') {
      return { icon: Loader2, text: "Executing...", variant: "info" as const, animate: true }
    }

    if (execution.status === 'initializing') {
      return { icon: Loader2, text: "Initializing...", variant: "info" as const, animate: true }
    }

    if (isInitialized && mcpToolsCollection[stableTool?.name || ''] && isConnected) {
      return { icon: CheckCircle, text: "Ready to Execute", variant: "success" as const }
    }

    return { icon: AlertCircle, text: "Not Ready", variant: "warning" as const }
  }

  const renderStatusChip = () => {
    const status = getStatusIndicator()
    const Icon = status.icon

    const variantClasses = {
      success: "text-teal-600 dark:text-teal-400 bg-teal-500/10 dark:bg-teal-800/50",
      warning: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 dark:bg-yellow-800/50",
      error: "text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-800/50",
      info: "text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-800/50"
    }

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-medium border ${variantClasses[status.variant]}`}>
        <Icon className={`h-3 w-3 ${status.animate ? 'animate-spin' : ''}`} />
        {status.text}
      </div>
    )
  }

  const resetTool = () => {
    // Reset form inputs to defaults
    const inputs: Record<string, unknown> = {}
    const properties = getToolProperties(stableTool!)

    Object.entries(properties).forEach(([key, prop]) => {
      if (prop.type === 'array') {
        inputs[key] = prop.default || []
      } else if (prop.type === 'object') {
        inputs[key] = prop.default || {}
      } else if (prop.type === 'boolean') {
        inputs[key] = prop.default !== undefined ? prop.default : false
      } else if (prop.type === 'number' || prop.type === 'integer') {
        inputs[key] = prop.default !== undefined ? prop.default : 0
      } else {
        inputs[key] = prop.default || ''
      }
    })

    setToolInputs(inputs)
    setExecution({ status: 'idle' })
    toast.success("Form reset")
  }

  const renderErrorWithRetry = () => {
    if (execution.status !== 'error' || !execution.error) return null

    return (
      <div className="p-3 rounded-md border bg-muted/30 border-border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-800/50">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Execution Error</h4>
            <p className="text-xs text-muted-foreground">{execution.error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExecution({ status: 'idle' })
                executeTool()
              }}
              className="text-xs h-7 w-7 rounded-sm"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }


  const renderExecutionResult = () => {
    if (execution.status === 'success' && execution.result) {
      const formatResult = () => {
        if (execution.result === undefined) return 'No result'
        if (typeof execution.result === 'string') {
          // Try to parse and reformat if it's JSON string
          try {
            const parsed = JSON.parse(execution.result)
            return showPrettyJson ? JSON.stringify(parsed, null, 2) : execution.result
          } catch {
            return execution.result
          }
        }
        try {
          return showPrettyJson ? JSON.stringify(execution.result, null, 2) : JSON.stringify(execution.result)
        } catch {
          return String(execution.result)
        }
      }

      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <h4 className="text-sm font-medium">Result (JSON)</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPrettyJson(!showPrettyJson)}
                className="text-xs h-6 px-2"
              >
                {showPrettyJson ? 'Raw' : 'Pretty'}
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyResult(execution.result, 'json')}
                className="text-xs h-7 px-2"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadResult(execution.result)}
                className="text-xs h-7 px-2"
              >
                Download
              </Button>
            </div>
          </div>
          <div className={`rounded-md border max-h-60 overflow-hidden ${themeClasses.background.code}`}>
            <pre className={`text-xs p-3 max-h-60 overflow-auto whitespace-pre-wrap ${themeClasses.text.primary}`}>
              {formatResult()}
            </pre>
          </div>

          {/* Transaction Info & New Query */}
          <div className="space-y-3 pt-2">
            {execution.transactionId && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                Transaction ID: <span className="font-mono">{execution.transactionId}</span>
              </div>
            )}

            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={resetTool}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                New Query
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const renderContent = () => {
    if (!stableTool) return null

    const properties = getToolProperties(stableTool)
    const hasInputs = hasToolInputs(stableTool)

    return (
      <div className="space-y-4">



        {/* Payment Wallet Section */}
        {renderWalletSection()}


        {/* Parameters Section */}
        {hasInputs && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              <h4 className="text-sm font-medium text-foreground">Parameters</h4>
            </div>
            <div className="space-y-4">
              {Object.entries(properties).map(([inputName, inputProp]) =>
                renderInputField(inputName, inputProp)
              )}
            </div>
          </div>
        )}

        {/* Error with Retry */}
        {renderErrorWithRetry()}


        {/* Execute Button */}
        <div className="flex justify-center">
          <Button
            onClick={executeTool}
            disabled={
              !isConnected ||
              !isInitialized ||
              !mcpToolsCollection[stableTool.name] ||
              execution.status === 'executing' ||
              execution.status === 'initializing' ||
              needsBrowserConnection
            }
            size="lg"
            className="px-8 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {execution.status === 'executing' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute Tool
              </>
            )}
          </Button>
        </div>

        {/* Execution Result */}
        {renderExecutionResult()}
      </div>
    )
  }

  // =============================================================================
  // MODAL RENDERING
  // =============================================================================

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[85vh] bg-background border-border">
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2 text-foreground">
                <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                {stableTool?.name || 'Run Tool'}
              </DrawerTitle>
              {stableTool && renderStatusChip()}
            </div>
            <DrawerDescription className="text-muted-foreground">
              {stableTool
                ? ((isInitialized && (mcpToolsCollection[stableTool.name] as MCPToolFromClient)?.description) || stableTool.description || 'Configure and execute').slice(0, 100) + ((stableTool.description && stableTool.description.length > 100) ? '...' : '')
                : 'Configure and execute'
              }
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {renderContent()}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-background border-border">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Wrench className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              {stableTool?.name || 'Run Tool'}
            </DialogTitle>
            {stableTool && renderStatusChip()}
          </div>
          <DialogDescription className="text-muted-foreground">
            {stableTool
              ? ((isInitialized && (mcpToolsCollection[stableTool.name] as MCPToolFromClient)?.description) || stableTool.description || 'Configure and execute').slice(0, 100) + ((stableTool.description && stableTool.description.length > 100) ? '...' : '')
              : 'Configure and execute'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
} 