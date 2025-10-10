"use client"

import type React from "react"
import { Suspense } from "react"

import { AccountModal } from "@/components/custom-ui/account-modal"
import { useAccountModal } from "@/components/hooks/use-account-modal"
import { useTheme } from "@/components/providers/theme-context"
import { usePrimaryWallet, useUser, useUserWallets } from "@/components/providers/user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/lib/client/auth"
import { api as realApi } from "@/lib/client/utils"
import { getTokenInfo, toBaseUnits } from "@/lib/commons"
import { getNetworkConfig, type UnifiedNetwork } from "@/lib/commons/networks"
import { type Network } from "@/types/blockchain"
import { AlertCircle, ArrowRight, BookOpen, CheckCircle, ChevronDown, Copy, Globe, Info, Loader2, Lock, RefreshCw, Server, User, Wallet, Zap } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useConnect } from "wagmi"

import { getNetworkByChainId as getUnifiedNetworkByChainId } from "@/lib/commons/networks"
import { useChainId } from "wagmi"
  
// Helper function to format wallet address for display
const formatWalletAddress = (address: string): string => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}



// Helper function to extract a display name from a URL
const generateDisplayNameFromUrl = (urlStr: string): string => {
  try {
    const url = new URL(urlStr)
    let path = url.pathname
    if (path.startsWith("/")) path = path.substring(1)
    if (path.endsWith("/")) path = path.substring(0, path.length - 1)

    // Replace common repository hosting prefixes or suffixes if any
    path = path.replace(/^github\.com\//i, '').replace(/^gitlab\.com\//i, '').replace(/^bitbucket\.org\//i, '')
    path = path.replace(/\.git$/i, '')

    if (!path && url.hostname) { // If path is empty, use hostname
      path = url.hostname;
    }

    return path
      .split(/[\/\-_]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") || "Unknown Source"
  } catch {
    return "Unknown Source"
  }
}

// Local types and API with mocked fallbacks
type RegisterMCPTool = {
  name: string
  description?: string
  price?: string
}

type PricingEntry = {
  maxAmountRequiredRaw: string
  assetAddress: string
  network: Network | string
  active?: boolean
  tokenDecimals: number
}

type UserWallet = {
  id: string
  userId: string
  walletAddress: string
  blockchain: string
  walletType: 'external' | 'managed' | 'custodial'
  provider?: string
  isPrimary: boolean
  isActive: boolean
  walletMetadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Create a thin wrapper around the real API with graceful mock fallbacks
const api = {
  async registerServer(data: {
    mcpOrigin: string
    receiverAddress: string
    name?: string
    description?: string
    requireAuth?: boolean
    authHeaders?: Record<string, unknown>
    tools?: Array<{ name: string; pricing: PricingEntry[] }>
    walletInfo?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<{ serverId: string }> {
    // Fully mocked for now to keep UI functional without backend
    return { serverId: 'mock_server_' + Math.random().toString(36).slice(2, 10) }
  },

  async getMcpTools(url: string): Promise<RegisterMCPTool[]> {
    try {
      const tools = await realApi.getMcpTools(url) as unknown
      if (Array.isArray(tools)) {
        return tools as RegisterMCPTool[]
      }
      // If server returns a non-array, fall back to mock
      throw new Error('Invalid tools response')
    } catch {
      // Simple mock tools derived from URL path
      const nameSeed = generateDisplayNameFromUrl(url)
      const baseName = nameSeed.split(' ')[0] || 'Tool'
      return [
        { name: `${baseName} Search`, description: 'Search content via MCP', price: '0.01' },
        { name: `${baseName} Summarize`, description: 'Summarize text input', price: '0.02' },
        { name: `${baseName} Fetch`, description: 'Fetch a URL and return body', price: '0.01' },
      ]
    }
  }
}

// Component that uses searchParams - needs to be wrapped in Suspense
function RegisterPageContent() {
  const { isDark } = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, isPending: isSessionPending } = useSession()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    url: "",
    headers: "",
  })

  const [tools, setTools] = useState<RegisterMCPTool[]>([])
  const [isLoadingTools, setIsLoadingTools] = useState(false)
  const [toolsError, setToolsError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [showAuthHeaders, setShowAuthHeaders] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState<Network>('base-sepolia')
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<string>('')
  const [showNetworkSelection, setShowNetworkSelection] = useState(false)

  const { error: connectError } = useConnect()
  const chainId = useChainId()

  // Use UserProvider for wallet data
  const { hasWallets } = useUser()
  const primaryWallet = usePrimaryWallet()
  const userWallets = useUserWallets()
  
  // State for selected wallet (defaults to primary wallet)
  const [selectedWallet, setSelectedWallet] = useState<UserWallet | null>(null)
  const [showWalletSelection, setShowWalletSelection] = useState(false)

  // Account modal for wallet management
  const { isOpen: isAccountModalOpen, openModal: openAccountModal, closeModal: closeAccountModal } = useAccountModal()

  // Set selected wallet to primary when primary wallet changes
  useEffect(() => {
    if (primaryWallet && !selectedWallet) {
      setSelectedWallet(primaryWallet)
    }
  }, [primaryWallet, selectedWallet])

  // Autopopulate URL from search parameters
  useEffect(() => {
    const urlParam = searchParams.get('url')
    if (urlParam && !formData.url) {
      setFormData((prev) => ({ ...prev, url: urlParam }))
    }
  }, [searchParams, formData.url])

  // Require account setup - use selected wallet or fallback to primary
  const activeWallet = selectedWallet || primaryWallet
  const walletAddress = activeWallet?.walletAddress
  const hasValidWallet = session?.user && hasWallets()

  // Get current network and blockchain info
  const currentNetwork = chainId ? getUnifiedNetworkByChainId(chainId) : null
  const currentBlockchain = currentNetwork ? (currentNetwork.startsWith('sei') ? 'sei' : 'ethereum') : 'ethereum'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasValidWallet || !walletAddress) {
      setSubmitError("Please sign in and connect a wallet to continue")
      return
    }

    setIsSubmitting(true)
    setSubmitError("")

    try {
      // Parse authentication headers if provided
      let authHeaders: Record<string, unknown> | undefined
      if (showAuthHeaders && formData.headers.trim()) {
        authHeaders = {}
        const lines = formData.headers.split('\n')
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine && trimmedLine.includes(':')) {
            const [key, ...valueParts] = trimmedLine.split(':')
            const value = valueParts.join(':').trim()
            if (key && value) {
              authHeaders[key.trim()] = value
            }
          }
        }
      }

      // Get the selected payment token address - use predefined mapping for simplicity  
      const defaultPaymentTokens: Partial<Record<Network, string>> = {
        'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
        'sei-testnet': '0x4fCF1784B31630811181f670Aea7A7bEF803eaED', // USDC on Sei Testnet
        'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        // 'polygon': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // USDC on Polygon
      }

      const paymentTokenAddress = selectedPaymentToken || defaultPaymentTokens[selectedNetwork] ||
        '0x0000000000000000000000000000000000000000' // fallback to native token

      // Get token info for decimal conversion
      const tokenInfo = getTokenInfo(paymentTokenAddress, selectedNetwork)
      const tokenDecimals = tokenInfo?.decimals || 18 // Default to 18 for native tokens

      // Prepare tools data with payment information - convert prices to base units as strings
      const toolsWithPayment = tools
        .filter(tool => tool.price && parseFloat(tool.price) > 0)
        .map(tool => ({
          name: tool.name,
          pricing: [{
            maxAmountRequiredRaw: toBaseUnits(tool.price || "0", tokenDecimals), // Convert to base units as string
            assetAddress: paymentTokenAddress,
            network: selectedNetwork,
            active: true,
            tokenDecimals: tokenDecimals,
          }] as PricingEntry[] 
        }))

      // Prepare API request payload with enhanced wallet information
      const payload = {
        mcpOrigin: formData.url,
        receiverAddress: walletAddress,
        name: formData.name,
        description: formData.description,
        requireAuth: showAuthHeaders && authHeaders && Object.keys(authHeaders).length > 0,
        ...(authHeaders && Object.keys(authHeaders).length > 0 && { authHeaders }),
        ...(toolsWithPayment.length > 0 && { tools: toolsWithPayment }),
        // Enhanced wallet information for multi-wallet support
        walletInfo: {
          blockchain: currentBlockchain,
          network: currentNetwork || selectedNetwork,
          walletType: 'external' as const,
          primaryWallet: true,
        },
        metadata: {
          registeredFromUI: true,
          timestamp: new Date().toISOString(),
          toolsCount: tools.length,
          monetizedToolsCount: toolsWithPayment.length,
          registrationNetwork: currentNetwork || selectedNetwork,
          registrationBlockchain: currentBlockchain,
        }
      }

      console.log("Submitting server registration:", payload)

      // Make API call to register the server
      const result = await api.registerServer(payload)
      console.log("Server registration successful:", result)

      // Extract server ID from the result and redirect to success page
      const serverId = (result)?.serverId
      if (serverId) {
        router.push(`/register/success?serverId=${serverId}`)
      } else {
        throw new Error("Server ID not found in registration result")
      }

    } catch (error) {
      console.error("Server registration failed:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setSubmitError(`Registration failed: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fetchMCPTools = useCallback(async (url: string) => {
    if (!url.trim()) {
      setTools([])
      setToolsError("")
      return
    }

    setIsLoadingTools(true)
    setToolsError("")

    try {
      const fetchedTools = await api.getMcpTools(url) as RegisterMCPTool[]

      if (!Array.isArray(fetchedTools)) {
        console.error("Fetched data is not an array:", fetchedTools)
        throw new Error("Invalid data format received from server.")
      }

      // Set default price for all tools
      const toolsWithDefaultPrice = fetchedTools.map(tool => ({
        ...tool,
        price: tool.price || "0.01"
      }))
      setTools(toolsWithDefaultPrice)

      // Auto-fill server name and description if not already set by user
      // and if tools were successfully fetched.
      if (fetchedTools.length > 0) {
        const displayName = generateDisplayNameFromUrl(url)

        if (!formData.name) {
          handleInputChange("name", `${displayName} MCP Server`)
        }
        if (!formData.description) {
          const toolNames = fetchedTools.map(t => t.name).slice(0, 3).join(", ")
          const toolCount = fetchedTools.length
          let description = `MCP Server for ${displayName}, providing ${toolCount} tool${toolCount > 1 ? 's' : ''}.`
          if (toolCount > 0) {
            description += ` Includes: ${toolNames}${toolCount > 3 ? ' and more' : ''}.`
          }
          handleInputChange("description", description)
        }
      }
    } catch (error) {
      console.error("Failed to fetch MCP tools:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setToolsError(`Failed to fetch tools: ${errorMessage}. Please check the URL and try again.`)
      setTools([])
    } finally {
      setIsLoadingTools(false)
    }
  }, [formData.name, formData.description])



  const updateToolPrice = (toolName: string, price: string) => {
    setTools(tools.map((tool) => (tool.name === toolName ? { ...tool, price } : tool)))
  }

  const handleNetworkChange = async (network: Network) => {
    setSelectedNetwork(network)
    setSelectedPaymentToken('') // Reset payment token selection
  }



  // Debounced URL checking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.url) {
        fetchMCPTools(formData.url)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [formData.url, fetchMCPTools])

  // Update toolsError display if Wagmi connectError exists
  useEffect(() => {
    if (connectError) {
      setToolsError(`Wallet Connection Error: ${connectError.message}`);
    }
  }, [connectError]);

  const isFormValid = formData.name && formData.description && formData.url && hasValidWallet && tools.length > 0

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      {/* Header Section */}
      <div className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Server className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Register MCP Server
                </h1>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                  Connect your wallet and configure your MCP server for monetization
                </p>
              </div>
            </div>

            {/* Getting Started Guide */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`shrink-0 ${isDark ? "border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Getting Started
                </Button>
              </DialogTrigger>
              <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                <DialogHeader>
                  <DialogTitle className={`flex items-center gap-3 text-2xl ${isDark ? "text-white" : "text-gray-900"}`}>
                    <Info className="h-6 w-6 text-blue-500" />
                    Getting Started Guide
                  </DialogTitle>
                  <p className={`text-base mt-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Everything you need to know about MCP server registration
                  </p>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {/* Quick Start Section */}
                  <div className={`rounded-xl p-6 border-l-4 border-blue-500 ${isDark ? "bg-blue-500/5 bg-gradient-to-r from-blue-500/10 to-transparent" : "bg-gradient-to-r from-blue-50 to-blue-25"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"} mt-0.5`}>
                        <Server className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className={`font-semibold mb-3 text-lg ${isDark ? "text-blue-200" : "text-blue-900"}`}>Need to build an MCP server?</h5>
                        <p className={`text-sm leading-relaxed ${isDark ? "text-blue-200" : "text-blue-800"}`}>
                          Try{" "}
                          <a
                            href="https://github.com/punkpeye/fastmcp"
                            className={`font-semibold underline decoration-2 underline-offset-2 transition-colors ${isDark ? "hover:text-blue-100" : "hover:text-blue-900"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            fastmcp
                          </a>
                          {" "}to create a compliant server quickly with minimal configuration.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Section */}
                  <div className={`rounded-xl p-6 border-l-4 border-amber-500 ${isDark ? "bg-amber-500/5 bg-gradient-to-r from-amber-500/10 to-transparent" : "bg-gradient-to-r from-amber-50 to-amber-25"}`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${isDark ? "bg-amber-500/20" : "bg-amber-100"} mt-0.5`}>
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className={`font-semibold mb-3 text-lg ${isDark ? "text-amber-200" : "text-amber-900"}`}>Technical Requirements</h5>
                        <p className={`text-sm leading-relaxed ${isDark ? "text-amber-200" : "text-amber-800"}`}>
                          MCP servers must implement the{" "}
                          <a
                            href="https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http"
                            className={`font-semibold underline decoration-2 underline-offset-2 transition-colors ${isDark ? "hover:text-amber-100" : "hover:text-amber-900"}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Streamable HTTP transport
                          </a>
                          {" "}as defined in the MCP specification.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* How it Works Section */}
                  <div className={`rounded-xl border p-6 ${isDark ? "border-gray-600 bg-gradient-to-br from-gray-800/50 to-gray-800/20" : "border-gray-200 bg-gradient-to-br from-gray-50 to-white"}`}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className={`font-semibold text-xl ${isDark ? "text-white" : "text-gray-900"}`}>How it works</h4>
                    </div>
                    <div className="grid gap-4">
                      {[
                        "Connect your wallet for payment processing",
                        "Enter your MCP server URL to auto-detect available tools",
                        "Enable authentication if your server requires it",
                        "Set individual pricing for each tool",
                        "Server details are auto-filled from tool inspection",
                        "Your MCP server must use the Streamable HTTP transport"
                      ].map((step, index) => (
                        <div key={index} className="flex items-start gap-4 group p-3 rounded-lg transition-colors hover:bg-opacity-50">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mt-0.5 transition-colors ${isDark ? "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"}`}>
                            {index + 1}
                          </div>
                          <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"} group-hover:${isDark ? "text-gray-200" : "text-gray-700"} transition-colors`}>
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Wallet & Network */}
            <div className="space-y-6">
              {/* Wallet Connection */}
              <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Wallet className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Payment Wallet
                  </h3>
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </div>

                {isSessionPending ? (
                  <div className="space-y-4">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Loading your account...
                    </p>
                    <div className="p-6 rounded-xl border-2 bg-gray-900/50 border-gray-800">
                      <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    </div>
                  </div>
                ) : !session?.user ? (
                  <div className="space-y-4">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Create your MCPay account to get started
                    </p>
                    <div className={`p-6 rounded-xl border-2 ${isDark ? 'border-blue-600 bg-gradient-to-br from-blue-900/20 to-blue-800/10' : 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-25'} relative`}>
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-blue-600/20' : 'bg-blue-100'}`}>
                          <User className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <h4 className={`font-semibold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Sign In
                        </h4>
                        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                          Sign in with GitHub to manage wallets, track your servers, and receive payments from tool usage
                        </p>
                        <Button
                          type="button"
                          onClick={() => openAccountModal('wallets')}
                          className={`h-12 px-8 font-medium text-base ${isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <User className="h-5 w-5 mr-3" />
                          Sign In with GitHub
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : !hasValidWallet ? (
                  <div className="space-y-4">
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {userWallets.length === 0 ? "No wallets connected" : "Loading wallet status..."}
                    </p>
                    <div className={`p-6 rounded-xl border-2 ${isDark ? 'border-amber-600 bg-gradient-to-br from-amber-900/20 to-amber-800/10' : 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-25'} relative`}>
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-amber-600/20' : 'bg-amber-100'}`}>
                          <Wallet className={`h-8 w-8 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                        </div>
                        <h4 className={`font-semibold text-xl mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          Connect Wallet
                        </h4>
                        <p className={`text-sm mb-6 leading-relaxed ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                          Connect a wallet to your MCPay account to receive payments from tool usage
                        </p>
                        <Button
                          type="button"
                          onClick={() => openAccountModal('wallets')}
                          className={`h-12 px-8 font-medium text-base ${isDark ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}
                        >
                          <Wallet className="h-5 w-5 mr-3" />
                          Manage Wallets
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className={`text-sm font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          {userWallets.length} Wallet{userWallets.length !== 1 ? 's' : ''} Connected
                        </span>
                      </div>
                      {userWallets.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowWalletSelection(!showWalletSelection)}
                          className={`text-xs ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                        >
                          {showWalletSelection ? "Hide Options" : "Change Wallet"}
                          <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${showWalletSelection ? 'rotate-180' : ''}`} />
                        </Button>
                      )}
                    </div>

                    {/* Selected Wallet Display */}
                    <div className={`p-3 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {activeWallet?.isPrimary ? 'Primary Wallet' : 'Selected Wallet'}
                            </span>
                            {activeWallet?.isPrimary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {formatWalletAddress(walletAddress || '')}
                            </span>
                            {activeWallet?.provider && (
                              <Badge variant="outline" className="text-xs">
                                {activeWallet.provider}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {navigator.clipboard.writeText(walletAddress || ''); toast.success("Copied to clipboard")}}
                          className={`px-2 ml-2 ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}
                          title="Copy full address"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Wallet Selection Dropdown */}
                    {showWalletSelection && userWallets.length > 1 && (
                      <div className={`space-y-2 p-4 rounded-lg border ${isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50/50'}`}>
                        <h4 className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-3`}>
                          Select Payment Wallet
                        </h4>
                        {/* Sort wallets: primary first, then by creation date */}
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
                                setShowWalletSelection(false)
                              }}
                              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                selectedWallet?.id === wallet.id
                                  ? isDark 
                                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20' 
                                    : 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
                                  : isDark 
                                    ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700' 
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={`w-2 h-2 rounded-full ${
                                  wallet.isActive ? "bg-green-500" : "bg-gray-400"
                                }`} />
                                <div className="text-left flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-mono text-sm font-medium ${
                                      selectedWallet?.id === wallet.id
                                        ? isDark ? 'text-blue-200' : 'text-blue-700'
                                        : isDark ? 'text-gray-200' : 'text-gray-800'
                                    }`}>
                                      {formatWalletAddress(wallet.walletAddress)}
                                    </span>
                                    {wallet.isPrimary && (
                                      <Badge variant="secondary" className="text-xs">Primary</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {wallet.provider && (
                                      <Badge variant="outline" className={`text-xs ${
                                        selectedWallet?.id === wallet.id
                                          ? isDark ? 'border-blue-400/50 text-blue-300' : 'border-blue-400/50 text-blue-600'
                                          : ''
                                      }`}>
                                        {wallet.provider}
                                      </Badge>
                                    )}
                                    <span className={`text-xs ${
                                      selectedWallet?.id === wallet.id
                                        ? isDark ? 'text-blue-300' : 'text-blue-600'
                                        : isDark ? 'text-gray-400' : 'text-gray-500'
                                    }`}>
                                      {wallet.blockchain}
                                    </span>
                                  </div>
                                </div>
                                {selectedWallet?.id === wallet.id && (
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    isDark ? 'bg-blue-500' : 'bg-blue-500'
                                  }`}>
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {userWallets.length > 1 
                        ? `You can select any of your ${userWallets.length} connected wallets for payments`
                        : activeWallet?.isPrimary 
                          ? "Using your primary wallet from account settings"
                          : "Using your connected wallet for payments"
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Network Selection */}
              <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Globe className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                    <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Payment Network
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNetworkSelection(!showNetworkSelection)}
                    className={`text-xs ${isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
                  >
                    {showNetworkSelection ? "Hide" : "Change"}
                  </Button>
                </div>

                {/* Current Network */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Network:</span>
                  <Badge variant={(() => {
                    const networkConfig = getNetworkConfig(selectedNetwork as UnifiedNetwork)
                    return networkConfig?.isTestnet ? "secondary" : "default"
                  })()}>
                    {(() => {
                      const networkConfig = getNetworkConfig(selectedNetwork as UnifiedNetwork)
                      return networkConfig?.name || selectedNetwork
                    })()}
                  </Badge>
                  <span className="text-xs">
                    ({(() => {
                      const networkConfig = getNetworkConfig(selectedNetwork as UnifiedNetwork)
                      return networkConfig?.isTestnet ? "Testnet" : "Mainnet"
                    })()})
                  </span>
                </div>

                {/* Network Options */}
                {showNetworkSelection && (
                  <div className="mt-4 space-y-2">
                    {(['base-sepolia', 'sei-testnet', 'base'] as Network[]).map((networkKey) => {
                      const networkConfig = getNetworkConfig(networkKey as UnifiedNetwork)
                      if (!networkConfig) return null

                      return (
                        <Button
                          key={networkKey}
                          type="button"
                          variant={selectedNetwork === networkKey ? "default" : "ghost"}
                          onClick={() => {
                            handleNetworkChange(networkKey)
                            setShowNetworkSelection(false)
                          }}
                          className={`w-full h-auto p-3 justify-start ${selectedNetwork === networkKey
                            ? isDark ? "bg-gray-700 text-white" : "bg-gray-900 text-white"
                            : isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className={`w-2 h-2 rounded-full ${networkConfig.isTestnet
                              ? "bg-orange-500"
                              : "bg-green-500"
                              }`} />
                            <div className="text-left">
                              <div className="font-medium text-sm">{networkConfig.name}</div>
                              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                {networkConfig.isTestnet ? "Testnet" : "Mainnet"}
                              </div>
                            </div>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Column - Server Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Server URL */}
              <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Server className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    MCP Server URL
                  </h3>
                  <Badge variant="secondary" className="ml-auto">Required</Badge>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                  Your MCP server&apos;s URL must use the <a
                    href="https://modelcontextprotocol.io/specification/draft/basic/transports#streamable-http"
                    className={`font-semibold underline decoration-2 underline-offset-2 transition-colors ${isDark ? "hover:text-blue-100" : "hover:text-blue-900"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Streamable HTTP transport
                  </a>.
                </p>
                <div className="relative">
                  <Input
                    placeholder="https://your-server.com/mcp?•••••••"
                    value={formData.url}
                    onChange={(e) => handleInputChange("url", e.target.value)}
                    required
                    type="url"
                    className={`h-12 text-base pr-12 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"}`}
                  />
                  {isLoadingTools && (
                    <Loader2
                      className={`absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    />
                  )}
                </div>

                {toolsError && (
                  <div className={`flex items-start gap-3 text-red-500 text-sm p-4 mt-4 rounded-lg ${isDark ? "bg-red-900/20 border border-red-800" : "bg-red-50 border border-red-200"}`}>
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{toolsError}</span>
                  </div>
                )}

                {/* Authentication Toggle */}
                <div className="mt-6">
                  <div className="flex items-center space-x-3 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <Checkbox
                      id="auth-headers"
                      checked={showAuthHeaders}
                      onCheckedChange={(checked) => setShowAuthHeaders(checked === true)}
                    />
                    <label
                      htmlFor="auth-headers"
                      className={`text-sm font-medium flex items-center gap-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      <Lock className="h-4 w-4" />
                      Enable Authentication Headers
                    </label>
                  </div>

                  {showAuthHeaders && (
                    <div className="mt-4">
                      <Textarea
                        placeholder={`Authorization: Bearer your-token
X-API-Key: your-api-key`}
                        value={formData.headers}
                        onChange={(e) => handleInputChange("headers", e.target.value)}
                        rows={3}
                        className={`text-sm ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"}`}
                      />
                      <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Add required headers for server authentication (one per line)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Server Details */}
              <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <Info className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Server Details
                  </h3>
                  <Badge variant="secondary" className="ml-auto">Auto-filled</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Server Name *
                    </label>
                    <Input
                      placeholder="Auto-detected from server"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      required
                      className={`h-11 ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"} ${!tools.length ? "opacity-50" : ""}`}
                      disabled={!tools.length}
                    />
                  </div>

                  <div className="space-y-3 sm:col-span-2">
                    <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Description *
                    </label>
                    <Textarea
                      placeholder="Auto-generated from detected tools"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      required
                      rows={3}
                      className={`${isDark ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"} ${!tools.length ? "opacity-50" : ""}`}
                      disabled={!tools.length}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tools Section */}
          {tools.length > 0 && (
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Detected Tools
                  </h3>
                  <Badge variant="outline" className="ml-2">
                    {tools.length} tool{tools.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMCPTools(formData.url)}
                  className={`${isDark ? "border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Tools
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tools.map((tool) => (
                  <Card
                    key={tool.name}
                    className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} transition-all hover:shadow-lg`}
                  >
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div>
                          <h4 className={`font-medium text-base ${isDark ? "text-gray-200" : "text-gray-800"} mb-2`}>
                            {tool.name}
                          </h4>
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} leading-relaxed line-clamp-3`}>
                            {tool.description}
                          </p>
                        </div>

                        <Separator className={isDark ? "bg-gray-700" : "bg-gray-200"} />

                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Price per use
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tool.price || "0.01"}
                              onChange={(e) => updateToolPrice(tool.name, e.target.value)}
                              className={`w-20 text-sm h-8 ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                  Ready to Register?
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your MCP server will be registered and available for monetized usage
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className={`w-full sm:w-auto min-w-[200px] h-12 text-base font-medium ${isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-900 text-white hover:bg-gray-800"
                  } transition-all duration-200`}
                disabled={!isFormValid || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register Server
                    <ArrowRight className="h-5 w-5 ml-3" />
                  </>
                )}
              </Button>
            </div>

            {submitError && (
              <div className={`flex items-start gap-3 text-red-500 text-sm p-4 mt-4 rounded-lg ${isDark ? "bg-red-900/20 border border-red-800" : "bg-red-50 border border-red-200"}`}>
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{submitError}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={closeAccountModal}
        defaultTab="wallets"
      />
    </div>
  )
}

// Loading fallback component
function RegisterPageLoading() {
  const { isDark } = useTheme()
  
  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <div className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Server className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Register MCP Server
              </h1>
              <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                Loading...
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      </div>
    </div>
  )
}

// Main export with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterPageContent />
    </Suspense>
  )
}
