"use client"

import { ConnectButton } from "@/components/custom-ui/connect-button"
import { useTheme } from "@/components/providers/theme-context"
import { useUser, useUserWallets, useWalletBalances } from "@/components/providers/user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogHeader
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { signIn, signOut, useSession } from "@/lib/client/auth"
import { openExplorer } from "@/lib/client/blockscout"
import { api } from "@/lib/client/utils"
import { ApiKey } from "@/types/mcp"
import { AccountModalProps, BalancesByChain, ChainBalance } from "@/types/ui"
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Github,
  Loader2,
  LogOut,
  Plus,
  Settings,
  Star,
  Trash2,
  TrendingUp,
  User,
  Wallet
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useAccount, useDisconnect } from "wagmi"

export function AccountModal({ isOpen, onClose, defaultTab = 'funds' }: AccountModalProps) {
  const { isDark } = useTheme()
  const { data: session, isPending: sessionLoading } = useSession()
  const { address: connectedWallet, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // Use the UserProvider for wallet data and actions
  const {
    addWallet,
    setPrimaryWallet,
    removeWallet
  } = useUser()
  const userWallets = useUserWallets()
  const {
    mainnet: mainnetBalancesByChain,
    testnet: testnetBalancesByChain,
    totalMainnet: totalFiatValue,
    totalTestnet: testnetTotalFiatValue,
    summary: balanceSummary
  } = useWalletBalances()

  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // State for Developer tab
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false)
  const [newApiKeyPermissions, setNewApiKeyPermissions] = useState<string[]>(['read', 'write', 'execute'])
  const [showNewApiKeyForm, setShowNewApiKeyForm] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null)

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])



  const handleGitHubSignIn = async () => {
    setIsAuthenticating(true)
    setIsLoading(true)
    setError("")

    try {
      await signIn.social({
        provider: "github",
        callbackURL: window.location.href
      })
      // Keep loading state active - it will be cleared when session loads
      // Don't set isLoading to false here as we want to show loading during redirect
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to sign in with GitHub")
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }

  // Clear authenticating state when session is loaded or on session loading completion
  useEffect(() => {
    if (session?.user && isAuthenticating) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
    // Also clear if session loading completes without a user (error case)
    if (!sessionLoading && isAuthenticating && !session?.user) {
      setIsAuthenticating(false)
      setIsLoading(false)
    }
  }, [session, sessionLoading, isAuthenticating])

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      if (isConnected) {
        disconnect()
      }
      // Provider will automatically handle clearing wallet data on sign out
    } catch (error) {
      console.error('Failed to sign out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectWallet = async () => {
    if (!session?.user?.id || !connectedWallet) return

    setIsLoading(true)
    try {
      await addWallet({
        walletAddress: connectedWallet,
        blockchain: 'ethereum',
        walletType: 'external',
        provider: 'metamask',
        isPrimary: userWallets.length === 0,
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetPrimaryWallet = async (walletId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      await setPrimaryWallet(walletId)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to set primary wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveWallet = async (walletId: string, isPrimary: boolean) => {
    if (!session?.user?.id) return

    // Confirm removal, especially for primary wallets
    const confirmMessage = isPrimary
      ? "Are you sure you want to remove your primary wallet? This will affect your account access."
      : "Are you sure you want to remove this wallet?"

    if (!confirm(confirmMessage)) return

    setIsLoading(true)
    try {
      await removeWallet(walletId)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to remove wallet")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBuyCrypto = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await api.createOnrampUrl(session.user.id, {
        redirectUrl: window.location.href,
        network: "base",
        amount: 5,
        asset: 'USDC',
        currency: 'USD',
      })
      if (response && typeof response === 'object' && 'onrampUrl' in response && response.onrampUrl) {
        const onrampUrl = response.onrampUrl as string
        // Open Coinbase Onramp in a new window
        window.open(onrampUrl, '_blank')
        toast.success("Redirecting to Coinbase to buy crypto...")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create buy crypto URL")
      toast.error("Failed to open buy crypto flow")
    } finally {
      setIsLoading(false)
    }
  }

  // API Key Management Functions
  const loadApiKeys = async () => {
    if (!session?.user?.id) return

    setIsLoadingApiKeys(true)
    try {
      const keys = await api.getUserApiKeys(session.user.id)
      setApiKeys(keys as ApiKey[])
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load API keys")
    } finally {
      setIsLoadingApiKeys(false)
    }
  }

  // Generate random API key name
  const generateApiKeyName = () => {
    const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Smart', 'Fast', 'Smooth', 'Sharp', 'Bold', 'Cool']
    const nouns = ['Key', 'Access', 'Token', 'Gate', 'Bridge', 'Link', 'Port', 'Pass', 'Code', 'Lock']
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const number = Math.floor(Math.random() * 999) + 1
    return `${adjective}${noun}${number}`
  }

  const handleCreateApiKey = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const response = await api.createApiKey(session.user.id, {
        name: generateApiKeyName(),
        permissions: newApiKeyPermissions
      })

      if (response && typeof response === 'object' && 'apiKey' in response) {
        setCreatedApiKey(response.apiKey as string)
        setNewApiKeyPermissions(['read', 'write', 'execute'])
        setShowNewApiKeyForm(false)
        await loadApiKeys()
        toast.success("API key created successfully!")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevokeApiKey = async (keyId: string, keyName: string) => {
    if (!session?.user?.id) return

    if (!confirm(`Are you sure you want to revoke the API key "${keyName}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      await api.revokeApiKey(session.user.id, keyId)
      await loadApiKeys()
      toast.success("API key revoked successfully")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to revoke API key")
    } finally {
      setIsLoading(false)
    }
  }

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'developer') {
      loadApiKeys()
    }
  }, [activeTab, session?.user?.id])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }



  // Helper function to get friendly chain display names
  const getChainDisplayName = (chainKey: string, chainName: string): string => {
    const chainMap: { [key: string]: string } = {
      'base': 'Base',
      'baseSepolia': 'Base Sepolia',
      'avalanche': 'Avalanche',
      'avalancheFuji': 'Avalanche Fuji',
      'iotex': 'IoTeX',
      'seiTestnet': 'Sei Testnet',
      'ethereum': 'Ethereum',
      'polygon': 'Polygon',
    }

    return chainMap[chainKey] || chainName || chainKey
  }

  // Helper function to format balance numbers nicely
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0.00'
    if (balance < 0.01) return '< 0.01'
    if (balance < 1) return balance.toFixed(4).replace(/\.?0+$/, '')
    if (balance < 1000) return balance.toFixed(2).replace(/\.?0+$/, '')
    if (balance < 1000000) return (balance / 1000).toFixed(1).replace(/\.?0+$/, '') + 'K'
    return (balance / 1000000).toFixed(1).replace(/\.?0+$/, '') + 'M'
  }

  // Helper function to transform chain balance data into ChainBalance format
  const transformChainData = (balancesByChain: BalancesByChain): ChainBalance[] => {
    const result: ChainBalance[] = []

    Object.entries(balancesByChain).forEach(([chainKey, balances]) => {
      if (!balances || balances.length === 0) return

      // Get friendly chain name
      const chainName = getChainDisplayName(chainKey, balances[0]?.chainName)

      // Group tokens by stablecoin type and sum balances across all addresses
      const tokenGroups: { [symbol: string]: { balance: number; value: number; addresses: Set<string> } } = {}

      balances.forEach(balance => {
        if (!tokenGroups[balance.stablecoin]) {
          tokenGroups[balance.stablecoin] = { balance: 0, value: 0, addresses: new Set() }
        }
        tokenGroups[balance.stablecoin].balance += parseFloat(balance.formattedBalance)
        tokenGroups[balance.stablecoin].value += balance.fiatValue
        tokenGroups[balance.stablecoin].addresses.add(balance.tokenIdentifier)
      })

      // Calculate total balance for this chain
      const totalBalanceUsd = Object.values(tokenGroups).reduce((sum, group) => sum + group.value, 0)

      // Only include chains with actual balances > $0.001
      if (totalBalanceUsd > 0.001) {
        const tokens = Object.entries(tokenGroups)
          .map(([symbol, group]) => ({
            symbol,
            balance: group.balance.toString(),
            balanceUsd: group.value,
            address: Array.from(group.addresses)[0] // Use first address as reference
          }))
          .filter(token => token.balanceUsd > 0.001) // Only include tokens with meaningful value
          .sort((a, b) => b.balanceUsd - a.balanceUsd) // Sort by value, highest first

        if (tokens.length > 0) {
          result.push({
            chain: chainName,
            network: chainKey,
            balance: totalBalanceUsd.toString(),
            balanceUsd: totalBalanceUsd,
            tokens
          })
        }
      }
    })

    // Sort chains by balance value, highest first
    return result.sort((a, b) => b.balanceUsd - a.balanceUsd)
  }

  // Helper function to get filtered chains based on current view
  const getFilteredChains = () => {
    const mainnetChains = transformChainData(mainnetBalancesByChain)
    const testnetChains = transformChainData(testnetBalancesByChain)

    return {
      chains: [...mainnetChains, ...testnetChains],
      total: totalFiatValue + testnetTotalFiatValue
    }
  }

  // GitHub Sign In Component
  const GitHubSignIn = () => (
    <div className="flex flex-col justify-center min-h-[400px] space-y-5 p-1">
      <div className="text-center">
        <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${isDark ? "bg-gray-800/50" : "bg-gray-50"
          }`}>
          <Github className={`h-6 w-6 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
        </div>
        <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          Sign in to MCPay
        </h2>
        <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Connect with your GitHub account
        </p>
      </div>

      {error && (
        <div className={`p-3 rounded-lg border ${isDark ? "bg-red-950/50 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-700"
          }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleGitHubSignIn}
        disabled={isLoading || isAuthenticating}
        className="w-full h-11 text-[15px] font-medium"
        size="lg"
      >
        {isLoading || isAuthenticating ? (
          <Loader2 className="w-4 h-4 mr-3 animate-spin" />
        ) : (
          <Github className="h-4 w-4 mr-3" />
        )}
        {isLoading || isAuthenticating ? "Signing you in..." : "Continue with GitHub"}
      </Button>

      <div className={`text-center text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </div>
    </div>
  )

  // Authenticated User Interface
  const AuthenticatedInterface = () => (
    <div className="flex flex-col h-full">
      {/* User Header */}
      <div className="flex items-center justify-between px-1 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-800/50" : "bg-gray-50"
            }`}>
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <User className={`h-5 w-5 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
            )}
          </div>
          <div>
            <h3 className={`font-medium text-[15px] ${isDark ? "text-white" : "text-gray-900"}`}>
              {session?.user?.name || "User"}
            </h3>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              {session?.user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          disabled={isLoading || isAuthenticating}
          className={`h-8 w-8 p-0 ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-800" : "hover:bg-gray-100"}`}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className={`h-px mb-4 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />

      {/* Main Content Tabs */}
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'funds' | 'wallets' | 'settings' | 'developer')} className="w-full flex flex-col h-full">
          <TabsList className={`grid w-full grid-cols-4 h-9 mb-4 ${isDark ? "bg-gray-800/50" : "bg-gray-100"}`}>
            <TabsTrigger value="funds" className="text-sm">
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />
              Funds
            </TabsTrigger>
            <TabsTrigger value="wallets" className="text-sm">
              <Wallet className="h-3.5 w-3.5 mr-1.5" />
              Wallets
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="developer" className="text-sm">
              <Code className="h-3.5 w-3.5 mr-1.5" />
              Developer
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="funds" className="flex-1 flex flex-col">
            <div className="space-y-4">
              {/* Your Funds Section */}
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                      Your Funds
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleBuyCrypto}
                      disabled={isLoading || isAuthenticating || userWallets.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs px-3"
                      title="Buy cryptocurrency for your wallets"
                    >
                      <CreditCard className="h-3 w-3 mr-1.5" />
                      Fund Account
                    </Button>
                    {(balanceSummary.hasMainnetBalances || balanceSummary.hasTestnetBalances) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="h-8 text-xs px-3"
                      >
                        {showDetails ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                        Details
                      </Button>
                    )}
                  </div>
                </div>

                {/* Main Balance Display */}
                {balanceSummary.hasMainnetBalances ? (
                  <div className="space-y-2 mb-4">
                    <div className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                      ${formatBalance(totalFiatValue)}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className={`text-sm ${isDark ? "text-green-400" : "text-green-600"}`}>
                        Live on {transformChainData(mainnetBalancesByChain).length} network{transformChainData(mainnetBalancesByChain).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className={`text-3xl font-bold ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                      $0.00
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        No real funds yet
                      </span>
                    </div>
                  </div>
                )}

                {/* Test Balance */}
                {balanceSummary.hasTestnetBalances && (
                  <div className={`rounded-lg border p-3 mb-4 ${isDark ? "bg-orange-900/20 border-orange-800/30" : "bg-orange-50 border-orange-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <div>
                          <p className={`font-medium text-sm ${isDark ? "text-orange-300" : "text-orange-800"}`}>
                            Test Balance
                          </p>
                          <p className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            Development funds
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${isDark ? "text-orange-300" : "text-orange-700"}`}>
                          ${formatBalance(testnetTotalFiatValue)}
                        </div>
                        <div className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                          {transformChainData(testnetBalancesByChain).length} testnet{transformChainData(testnetBalancesByChain).length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}



                {/* Wallet Count Footer */}
                <div className={`pt-3 border-t ${isDark ? "border-gray-700/50" : "border-gray-200/50"}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                      {userWallets.length} wallet{userWallets.length !== 1 ? 's' : ''} connected
                    </span>
                    <div className="flex items-center gap-3">
                      {balanceSummary.hasMainnetBalances && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          <span className={`text-xs ${isDark ? "text-green-400" : "text-green-600"}`}>
                            LIVE
                          </span>
                        </div>
                      )}
                      {balanceSummary.hasTestnetBalances && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          <span className={`text-xs ${isDark ? "text-orange-400" : "text-orange-600"}`}>
                            TEST
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>




                {/* Collapsible Chain Details */}
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleContent>
                    {getFilteredChains().chains.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        <h5 className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"} mb-3`}>
                          Balance by Network
                        </h5>

                        <div className="space-y-2">
                          {getFilteredChains().chains.map((chain, index) => {
                            // More comprehensive testnet detection
                            const isTestnet = chain.network.toLowerCase().includes('sepolia') ||
                              chain.network.toLowerCase().includes('fuji') ||
                              chain.network.toLowerCase().includes('testnet') ||
                              chain.network.toLowerCase().includes('test') ||
                              chain.network.toLowerCase().includes('goerli') ||
                              chain.network.toLowerCase().includes('mumbai')
                            const isMainnet = !isTestnet

                            return (
                              <div
                                key={`${chain.chain}-${chain.network}-${index}`}
                                className={`rounded-lg border p-3 ${isDark ? "bg-gray-800/30 border-gray-700/50" : "bg-white border-gray-200"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-green-500' : 'bg-orange-500'}`} />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <h6 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"} truncate`}>
                                          {chain.chain}
                                        </h6>
                                        <Badge variant="secondary" className="text-xs">
                                          {isMainnet ? 'LIVE' : 'TEST'}
                                        </Badge>
                                      </div>
                                      {chain.tokens && chain.tokens.length > 0 && (
                                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                          {chain.tokens.length} token{chain.tokens.length !== 1 ? 's' : ''}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                                      ${formatBalance(chain.balanceUsd)}
                                    </div>
                                  </div>
                                </div>

                                {/* Token breakdown */}
                                {chain.tokens && chain.tokens.length > 0 && (
                                  <div className={`mt-3 pt-3 border-t ${isDark ? "border-gray-700/30" : "border-gray-200/50"}`}>
                                    <div className="space-y-1">
                                      {chain.tokens.slice(0, 3).map((token, tokenIndex) => (
                                        <div key={tokenIndex} className="flex items-center justify-between">
                                          <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                            {formatBalance(parseFloat(token.balance))} {token.symbol}
                                          </span>
                                          <span className={`text-xs font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                            ${formatBalance(token.balanceUsd)}
                                          </span>
                                        </div>
                                      ))}
                                      {chain.tokens.length > 3 && (
                                        <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                                          +{chain.tokens.length - 3} more token{chain.tokens.length - 3 !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 mt-4">
                        <Wallet className={`h-6 w-6 mx-auto mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          No balances found
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                          Connect wallets with funds to see them here
                        </p>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  Connected Wallets
                </h4>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Manage your blockchain wallets
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && !userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
                  <Button
                    size="sm"
                    onClick={handleConnectWallet}
                    disabled={isLoading || isAuthenticating}
                    className="h-8 text-xs px-3"
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Link Wallet
                  </Button>
                )}
              </div>
            </div>

            {/* Helper text for testnet */}
            {balanceSummary.hasTestnetBalances && (
              <div className={`text-xs px-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                💡 For test tokens, use faucets like{" "}
                <a
                  href="https://faucet.circle.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 underline"
                >
                  Circle faucet
                </a>
              </div>
            )}

            {/* User's Linked Wallets - Show First */}
            {userWallets.length > 0 && (
              <div className="space-y-3">
                {userWallets.map((wallet) => (
                  <div key={wallet.id} className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Wallet className="h-4 w-4" />
                          {wallet.isPrimary && (
                            <Star className="h-2.5 w-2.5 text-yellow-500 absolute -top-0.5 -right-0.5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {wallet.walletAddress.slice(0, 6)}...{wallet.walletAddress.slice(-4)}
                            </p>
                            {wallet.isPrimary && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">Primary</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {wallet.walletType}
                            </Badge>
                            {wallet.provider && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {wallet.provider}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(wallet.walletAddress)}
                          className="h-7 w-7 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!wallet.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryWallet(wallet.id)}
                            disabled={isLoading || isAuthenticating}
                            className="h-7 px-2 text-xs"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Primary
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveWallet(wallet.id, wallet.isPrimary)}
                          disabled={isLoading || isAuthenticating}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Connected Wallet (if not linked to account) */}
            {isConnected && !userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
              <div className={`border border-dashed rounded-lg p-4 ${isDark ? "border-gray-700 bg-gray-800/30" : "border-gray-300 bg-gray-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        Connected Wallet
                      </p>
                      <p className={`text-xs font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {connectedWallet?.slice(0, 6)}...{connectedWallet?.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">Not Linked</Badge>
                </div>
              </div>
            )}

            {/* Native Wallet Connection Component - Collapsible */}
            <Collapsible>
              <div className={`rounded-lg border ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-4 h-auto"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"
                        }`}>
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                          Native Wallet
                        </h4>
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          Connect MetaMask, Coinbase Wallet, etc.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isConnected && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className={`h-px mb-4 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />

                    {!isConnected ? (
                      <div className="text-center py-4">
                        <Wallet className={`h-6 w-6 mx-auto mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                        <p className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                          No native wallet connected
                        </p>
                        <ConnectButton />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <div>
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              Connected
                            </p>
                            <p className={`text-xs font-mono ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {connectedWallet?.slice(0, 6)}...{connectedWallet?.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!userWallets.find(w => w.walletAddress.toLowerCase() === connectedWallet?.toLowerCase()) && (
                            <Button
                              size="sm"
                              onClick={handleConnectWallet}
                              disabled={isLoading || isAuthenticating}
                              className="h-7 text-xs px-2"
                            >
                              Link
                            </Button>
                          )}
                          <ConnectButton />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="flex-1 flex flex-col">
            <div className="space-y-3">
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    Profile Information
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Name
                    </label>
                    <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {session?.user?.name || "Not set"}
                    </p>
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Email
                    </label>
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                        {session?.user?.email?.slice(0, 20)}...
                      </p>
                      {session?.user?.emailVerified ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-orange-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4" />
                  <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    Account Settings
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                        Email Verification
                      </p>
                      <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        {session?.user?.emailVerified ? "Your email is verified" : "Please verify your email"}
                      </p>
                    </div>
                    {session?.user?.emailVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Button variant="outline" size="sm" className="h-7 text-xs px-3">
                        Verify
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Developer Tab */}
          <TabsContent value="developer" className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  API Keys
                </h4>
                <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Manage your API keys for programmatic access
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowNewApiKeyForm(true)}
                disabled={isLoading || isLoadingApiKeys}
                className="h-8 text-xs px-3"
              >
                <Plus className="h-3 w-3 mr-1.5" />
                New Key
              </Button>
            </div>

            {/* Show created API key (one-time display) */}
            {createdApiKey && (
              <div className={`rounded-lg border p-4 ${isDark ? "bg-green-900/20 border-green-800/30" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <h5 className={`font-medium text-sm ${isDark ? "text-green-300" : "text-green-800"}`}>
                    API Key Created
                  </h5>
                </div>
                <p className={`text-xs mb-3 ${isDark ? "text-green-400" : "text-green-600"}`}>
                  Copy this key now - it will not be shown again!
                </p>
                <div className="flex items-center gap-2">
                  <code className={`flex-1 p-2 rounded text-xs font-mono ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                    {createdApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      copyToClipboard(createdApiKey)
                      setCreatedApiKey(null)
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* New API Key Form */}
            {showNewApiKeyForm && (
              <div className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-gray-50/50 border-gray-200"}`}>
                <h5 className={`font-medium text-sm mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Create New API Key
                </h5>
                <div className="space-y-3">
                  <div>
                    <Label className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                      Permissions
                    </Label>
                    <div className="space-y-2">
                      {[
                        { id: 'read', label: 'Read', description: 'View servers, tools, and analytics' },
                        { id: 'write', label: 'Write', description: 'Create and modify resources' },
                        { id: 'execute', label: 'Execute', description: 'Run tools and make payments' },
                        { id: 'admin', label: 'Admin', description: 'Full administrative access' }
                      ].map((permission) => (
                        <div key={permission.id} className="flex items-start gap-3">
                          <Checkbox
                            id={permission.id}
                            checked={newApiKeyPermissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewApiKeyPermissions([...newApiKeyPermissions, permission.id])
                              } else {
                                setNewApiKeyPermissions(newApiKeyPermissions.filter(p => p !== permission.id))
                              }
                            }}
                          />
                          <div>
                            <Label htmlFor={permission.id} className={`text-sm font-medium cursor-pointer ${isDark ? "text-white" : "text-gray-900"}`}>
                              {permission.label}
                            </Label>
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              {permission.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {newApiKeyPermissions.length === 0 && (
                      <p className={`text-xs text-red-500 mt-1`}>
                        At least one permission must be selected.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateApiKey}
                      disabled={newApiKeyPermissions.length === 0 || isLoading}
                      className="h-8 text-xs px-3"
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNewApiKeyForm(false)
                        setNewApiKeyPermissions(['read', 'write', 'execute'])
                      }}
                      className="h-8 text-xs px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* API Keys List */}
            {isLoadingApiKeys ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className={`rounded-lg border p-4 ${isDark ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Code className="h-4 w-4" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {key.name}
                            </p>
                            {key.permissions && (
                              <div className="flex gap-1">
                                {key.permissions.map((permission: string) => (
                                  <Badge key={permission} variant="secondary" className="text-xs px-1.5 py-0">
                                    {permission}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Created: {new Date(key.createdAt).toLocaleDateString()}
                            </p>
                            {key.lastUsedAt && (
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                              </p>
                            )}
                            {key.expiresAt && (
                              <p className={`text-xs ${new Date(key.expiresAt) < new Date()
                                ? 'text-red-500'
                                : isDark ? "text-gray-400" : "text-gray-600"
                                }`}>
                                Expires: {new Date(key.expiresAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeApiKey(key.id, key.name)}
                        disabled={isLoading}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Code className={`h-8 w-8 mx-auto mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  No API keys yet
                </p>
                <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  Create an API key to access MCPay programmatically
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )

  const LoadingSpinner = ({ message }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-3">
      <Loader2 className="h-6 w-6 animate-spin" />
      {message && (
        <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {message}
        </p>
      )}
    </div>
  )

  const ModalHeader = ({ Component }: { Component: React.ComponentType<{ children: React.ReactNode }> }) => (
    <Component>
      <div className="text-lg font-semibold">
        {session?.user ? "Account" : "Sign In"}
      </div>
    </Component>
  )

  // Show loading during session loading or authentication flow
  if (sessionLoading || isAuthenticating) {
    const loadingMessage = isAuthenticating
      ? "Signing you in..."
      : sessionLoading
        ? "Loading your account..."
        : undefined

    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className={`h-[65vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
            <LoadingSpinner message={loadingMessage} />
          </DrawerContent>
        </Drawer>
      )
    }
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-md flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          <LoadingSpinner message={loadingMessage} />
        </DialogContent>
      </Dialog>
    )
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className={`h-[65vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
          <ModalHeader Component={DrawerHeader} />
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {session?.user ? <AuthenticatedInterface /> : <GitHubSignIn />}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg h-[70vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : ""}`}>
        <ModalHeader Component={DialogHeader} />
        <div className="flex-1 overflow-y-auto px-1">
          {session?.user ? <AuthenticatedInterface /> : <GitHubSignIn />}
        </div>
      </DialogContent>
    </Dialog>
  )
}