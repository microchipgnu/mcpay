"use client"

import { AnalyticsChart } from "@/components/custom-ui/analytics-chart"
import { TransactionLink } from "@/components/custom-ui/explorer-link"
import { IntegrationTab } from "@/components/custom-ui/integration-tab"
import { ToolExecutionModal } from "@/components/custom-ui/tool-execution-modal"
import { useTheme } from "@/components/providers/theme-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerName, openExplorer } from "@/lib/client/blockscout"
import { api, urlUtils } from "@/lib/client/utils"
import {
  formatTokenAmount,
  fromBaseUnits,
  getTokenInfo,
} from "@/lib/commons"
// Add missing imports from amounts utilities
import { RevenueDetail } from "@/lib/gateway/db/schema"
import { PricingEntry } from "@/types"
import { type Network } from "@/types/blockchain"
import { type DailyServerAnalytics, type McpServerWithStats, type ServerSummaryAnalytics, type ToolFromMcpServerWithStats } from "@/types/mcp"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Loader2,
  Play,
  RefreshCcw,
  Shield,
  Users,
  Wrench,
  XCircle
} from "lucide-react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function ServerDashboard() {
  const params = useParams()
  const serverId = params.id as string
  const [serverData, setServerData] = useState<McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [showToolModal, setShowToolModal] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [openTooltips, setOpenTooltips] = useState<Record<string, boolean>>({})
  const [showAllPricing, setShowAllPricing] = useState(false)
  const { isDark } = useTheme()

  // Initialize tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs = ['overview', 'integration', 'tools', 'analytics']
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Don't add hash for default tab to keep URLs clean
    if (value === 'overview') {
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      window.history.replaceState(null, '', `#${value}`)
    }
  }

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await api.getServer(serverId)
        setServerData(data as McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics })
      } catch (err) {
        console.error('Error fetching server data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch server data')
      } finally {
        setLoading(false)
      }
    }

    if (serverId) {
      fetchServerData()
    }
  }, [serverId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleToolExecution = (tool: ToolFromMcpServerWithStats) => {
    setSelectedTool(tool)
    setShowToolModal(true)
  }

  // Handle tooltip open/close
  const handleTooltipOpenChange = (toolId: string, open: boolean) => {
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: open
    }))
  }

  const toggleTooltip = (toolId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }))
  }

  // Helper function to safely convert to number
  const safeNumber = (value: unknown): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to get active pricing entries
  const getActivePricing = (pricing: PricingEntry[] | null): PricingEntry[] => {
    if (!pricing || !Array.isArray(pricing)) return []
    return pricing.filter(p => p.active === true)
  }

  // Helper function to calculate total revenue from revenueDetails array
  const calculateTotalRevenue = (revenueDetails: RevenueDetail[] | null): number => {
    if (!revenueDetails || !Array.isArray(revenueDetails)) {
      return 0
    }

    return revenueDetails.reduce((total, detail) => {
      if (detail && detail.amount_raw && detail.decimals !== undefined &&
        typeof detail.amount_raw === 'string' && detail.amount_raw.trim() !== '') {
        try {
          const humanAmount = safeNumber(fromBaseUnits(detail.amount_raw, detail.decimals))
          return total + humanAmount
        } catch (error) {
          console.error('Error converting revenue amount:', error)
          return total
        }
      }
      return total
    }, 0)
  }

  // Helper function to format the primary revenue amount for display
  const formatPrimaryRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    if (!revenueDetails || !Array.isArray(revenueDetails) || revenueDetails.length === 0) {
      return "0.00"
    }

    // Get the first revenue detail for primary display
    const primaryDetail = revenueDetails[0]
    if (primaryDetail && primaryDetail.amount_raw && primaryDetail.decimals !== undefined &&
      typeof primaryDetail.amount_raw === 'string' && primaryDetail.amount_raw.trim() !== '') {
      try {
        const humanAmount = fromBaseUnits(primaryDetail.amount_raw, primaryDetail.decimals)
        return safeNumber(humanAmount).toFixed(2)
      } catch (error) {
        console.error('Error formatting primary revenue:', error)
        return "0.00"
      }
    }

    return "0.00"
  }

  // Helper function to format daily analytics revenue
  const formatDailyRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    const total = calculateTotalRevenue(revenueDetails)
    return total.toFixed(2)
  }

  // Enhanced formatCurrency function using token registry
  const formatCurrency = (amount: string | number, currency: string, network?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount

    // Handle undefined or null currency
    if (!currency) {
      return `${num.toFixed(6)} Unknown`
    }

    // If we have network info, try to get token info from registry
    if (network) {
      try {
        const tokenInfo = getTokenInfo(currency, network as Network)
        if (tokenInfo) {
          // Use formatTokenAmount for precise formatting
          // Since we already have human-readable amounts, pass them directly
          return formatTokenAmount(num, currency, network as Network, {
            showSymbol: true,
            precision: tokenInfo.isStablecoin ? 2 : 4,
            compact: num >= 1000
          });
        }
      } catch (error) {
        console.error('Error getting token info:', error)
        // Fall through to fallback
      }
    }

    // Fallback: check if it's a token address and show abbreviated
    if (currency.startsWith('0x') && currency.length === 42) {
      return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
    }

    // Simple currency display
    return `${num.toFixed(6)} ${currency}`
  }

  // Enhanced token display with verification badge
  const TokenDisplay = ({
    currency,
    network,
    amount
  }: {
    currency?: string
    network?: string
    amount?: string | number
  }) => {
    // Safety checks for required parameters
    if (!currency || !network) {
      return (
        <span className={isDark ? "text-gray-400" : "text-gray-500"}>
          {amount ? `${amount} Unknown` : 'Unknown'}
        </span>
      )
    }

    let tokenInfo = null
    try {
      tokenInfo = getTokenInfo(currency, network as Network)
    } catch (error) {
      console.error('Error getting token info in TokenDisplay:', error)
    }

    return (
      <div className="flex items-center gap-2">
        {/* Token Logo */}
        {tokenInfo?.logoUri && (
          <div className="w-5 h-5 rounded-full overflow-hidden">
            <Image
              src={tokenInfo.logoUri}
              alt={tokenInfo.symbol}
              width={20}
              height={20}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Amount and Symbol */}
        <div className="flex items-center gap-1">
          {amount && (
            <span className="font-medium">
              {formatCurrency(amount, currency, network)}
            </span>
          )}
          {!amount && tokenInfo && (
            <span className="font-medium">{tokenInfo.symbol}</span>
          )}
          {!amount && !tokenInfo && (
            <span className="font-mono text-xs">
              {currency && currency.startsWith('0x') ? `${currency.slice(0, 6)}...` : currency || 'Unknown'}
            </span>
          )}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading server dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <h3 className="text-lg font-medium mb-2">Failed to load server</h3>
              <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className={isDark ? "bg-gray-700 text-white hover:bg-gray-600" : ""}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!serverData) return null

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{serverData.name}</h1>
              <p className={`text-sm max-w-xl ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {serverData.description}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Created: {formatDate(serverData?.createdAt ? (typeof serverData.createdAt === 'string' ? serverData.createdAt : serverData.createdAt.toISOString()) : '')}
            </span>
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Last Activity: {formatDate(serverData.summaryAnalytics.lastActivity || '')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full grid-cols-4 mb-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Total Revenue
                      </p>
                      <div className="text-base font-bold mt-0.5">${formatPrimaryRevenue(serverData.summaryAnalytics.revenueDetails)}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {serverData.summaryAnalytics.totalPayments || 0} payments
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Total Usage
                      </p>
                      <div className="text-base font-bold mt-0.5">{(serverData.stats.totalUsage || 0).toLocaleString()}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {safeNumber(serverData.summaryAnalytics.avgResponseTime).toFixed(0)}ms avg
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Activity className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Unique Users
                      </p>
                      <div className="text-base font-bold mt-0.5">{serverData.stats.activeUsers || 0}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        Active users
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Tools
                      </p>
                      <div className="text-base font-bold mt-0.5">{serverData.summaryAnalytics.totalTools || 0}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {serverData.summaryAnalytics.monetizedTools || 0} monetized
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Wrench className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Server Connection */}
            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Connection & Owner</CardTitle>
                <CardDescription>Essential information for connecting to and trusting this server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* MCP Connection URL */}
                <div>
                  <label className={`text-sm font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    MCP Connection URL
                  </label>
                  <div className="flex items-start gap-2">
                    <code className={`flex-1 text-sm p-3 rounded-md font-mono break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
                      }`}>
                      {urlUtils.getMcpUrl(serverData.serverId, true)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        copyToClipboard(urlUtils.getMcpUrl(serverData.serverId, true))
                        toast.success("MCP URL copied to clipboard")
                      }}
                      title="Copy MCP URL"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Payment Address */}
                <div>
                  <label className={`text-sm font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Payment Address
                  </label>
                  <div className="flex items-start gap-2">
                    <code className={`flex-1 text-sm p-3 rounded-md font-mono break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`}>
                      {serverData.receiverAddress}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        copyToClipboard(serverData.receiverAddress)
                        toast.success("Address copied to clipboard")
                      }}
                      title="Copy address"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Owner & Server ID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Server Owner
                    </label>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                        {serverData.creator?.avatarUrl || serverData.creator?.image ? (
                          <Image
                            src={serverData.creator?.avatarUrl || serverData.creator?.image || ''}
                            alt={serverData.creator.displayName || serverData.creator.name || ''}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{serverData.creator?.displayName || serverData.creator?.name || ''}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Server ID
                    </label>
                    <code className={`text-sm font-mono block p-3 rounded-md break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
                      }`}>
                      {serverData.serverId}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Tab */}
          <TabsContent value="integration" className="space-y-6">
            <IntegrationTab serverData={serverData} onTabChange={handleTabChange} />
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Tools ({serverData.summaryAnalytics.totalTools})
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {serverData.summaryAnalytics.monetizedTools || 0} monetized • {(serverData.summaryAnalytics.totalTools || 0) - (serverData.summaryAnalytics.monetizedTools || 0)} free • Hover or click &quot;Paid&quot; badges to see pricing details
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllPricing(!showAllPricing)}
                    className={`${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {showAllPricing ? 'Hide' : 'Show'} All Pricing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Tool</TableHead>
                        <TableHead>Type</TableHead>
                        {showAllPricing && <TableHead>Pricing Details</TableHead>}
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Verification</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serverData.tools || []).map((tool) => (
                        <TableRow key={tool.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium text-sm">{tool.name}</div>
                              <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.description.length > 60 ? `${tool.description.substring(0, 60)}...` : tool.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                const isPaid = activePricing.length > 0
                                
                                if (isPaid && activePricing[0]) {
                                  return (
                                    <Tooltip 
                                      open={openTooltips[tool.id] || false}
                                      onOpenChange={(open) => handleTooltipOpenChange(tool.id, open)}
                                    >
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs cursor-pointer select-none ${isDark ? "bg-gray-600 text-gray-200 hover:bg-gray-500" : "hover:bg-gray-200"}`}
                                          onClick={(e) => toggleTooltip(tool.id, e)}
                                        >
                                          Paid
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent 
                                        side="right" 
                                        className={`max-w-xs p-3 ${
                                          isDark 
                                            ? "bg-gray-800 border-gray-700 text-gray-100" 
                                            : "bg-white border-gray-200 text-gray-900"
                                        }`}
                                      >
                                        <div className="space-y-2">
                                          <div className={`text-xs font-medium ${
                                            isDark ? "text-gray-300" : "text-gray-600"
                                          }`}>
                                            {activePricing.length === 1 ? 'Pricing' : `Pricing (${activePricing.length} options)`}
                                          </div>
                                          <div className="space-y-1.5">
                                            {activePricing.map((pricing, index) => (
                                              <div 
                                                key={index}
                                                className={`flex items-center justify-between py-1.5 px-2 rounded ${
                                                  isDark ? "bg-gray-700/50" : "bg-gray-50"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <TokenDisplay
                                                    currency={pricing?.assetAddress}
                                                    network={pricing?.network}
                                                    amount={pricing?.maxAmountRequiredRaw && typeof pricing.maxAmountRequiredRaw === 'string' && pricing.maxAmountRequiredRaw.trim() !== ''
                                                      ? fromBaseUnits(pricing.maxAmountRequiredRaw, pricing.tokenDecimals || 0)
                                                      : '0'}
                                                  />
                                                </div>
                                                <Badge 
                                                  variant="outline" 
                                                  className={`text-xs ml-2 shrink-0 ${
                                                    isDark 
                                                      ? "border-gray-600 text-gray-300 bg-gray-800" 
                                                      : "border-gray-300 text-gray-600 bg-white"
                                                  }`}
                                                >
                                                  {pricing.network}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                } else {
                                  return (
                                    <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                      Free
                                    </Badge>
                                  )
                                }
                              })()}
                            </TooltipProvider>
                          </TableCell>
                          {showAllPricing && (
                            <TableCell className="w-[120px]">
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                if (activePricing.length > 0) {
                                  // Get unique prices and show them compactly
                                  const uniquePrices = [...new Set(activePricing.map(p => 
                                    p?.maxAmountRequiredRaw && typeof p.maxAmountRequiredRaw === 'string' && p.maxAmountRequiredRaw.trim() !== ''
                                      ? fromBaseUnits(p.maxAmountRequiredRaw, p.tokenDecimals || 0)
                                      : '0'
                                  ))]
                                  
                                  return (
                                    <div className="text-sm font-medium">
                                      {uniquePrices.length === 1 ? (
                                        <span>{formatCurrency(uniquePrices[0], activePricing[0]?.assetAddress || '', activePricing[0]?.network)}</span>
                                      ) : (
                                        <div className="space-y-0.5">
                                          {uniquePrices.slice(0, 3).map((price, index) => (
                                            <div key={index} className="text-xs">
                                              {formatCurrency(price, activePricing.find(p => 
                                                fromBaseUnits(p.maxAmountRequiredRaw || '0', p.tokenDecimals || 0) === price
                                              )?.assetAddress || '', activePricing[0]?.network)}
                                            </div>
                                          ))}
                                          {uniquePrices.length > 3 && (
                                            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                              +{uniquePrices.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      Free
                                    </div>
                                  )
                                }
                              })()}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm">
                              <div>{tool.totalUsage || 0} uses</div>
                              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.totalPayments || 0} payments
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(tool.totalProofs || 0) > 0 ? (
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <div className={`flex items-center gap-1 ${(tool.consistentProofs || 0) > 0 ? "text-green-500" : "text-red-500"
                                  }`}>
                                  {(tool.consistentProofs || 0) > 0 ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  <span>
                                    {tool.consistentProofs || 0}/{tool.totalProofs || 0}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                No proofs
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToolExecution(tool)}
                              className={`text-xs ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Try
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics & Payments Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Chart */}
            <AnalyticsChart 
              dailyAnalytics={serverData.dailyAnalytics || []} 
              isDark={isDark} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Recent Proofs
                    </div>
                    <div>
                      <Badge variant="outline" className={`ml-6 text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                        Powered by <a href="https://www.vlayer.xyz/" target="_blank" rel="noopener noreferrer" className="inline-block ml-1 hover:opacity-80 transition-opacity">
                          <Image src="/vlayer-logo.svg" alt="vLayer" width={60} height={20} className="inline" />
                        </a>
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(serverData.proofs || []).length > 0 ? (
                      (serverData.proofs || []).slice(0, 5).map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {proof.isConsistent ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{proof.tool.name}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                <button
                                  onClick={() => openExplorer(proof.user?.walletAddress || '', 'base-sepolia')}
                                  className={`hover:underline ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                                  title={`View address on ${getExplorerName('base-sepolia')}`}
                                >
                                  {proof.user?.displayName || proof.user?.walletAddress || ''}
                                </button>
                                {" • "}
                                {formatDate(typeof proof.createdAt === 'string' ? proof.createdAt : proof.createdAt.toISOString())}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {(safeNumber(proof.confidenceScore) * 100).toFixed(1)}%
                            </p>
                            {proof.webProofPresentation && (
                              <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                Web Proof
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No proofs yet</p>
                        <p className="text-xs mt-1">Proofs will appear here when users verify this server&apos;s tools</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Recent Payments
                </CardTitle>
                <CardDescription>
                  Latest payment transactions from tool usage with verified token information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead className="text-right">Transaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serverData.tools || [])
                        .flatMap(tool => (tool.payments || []))
                        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                        .slice(0, 10).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="w-[60px]">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${payment.status === 'completed'
                                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                                }`}>
                                {payment.status === 'completed' ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <TokenDisplay
                                currency={payment?.currency}
                                network={payment?.network}
                                amount={payment?.amountRaw && typeof payment.amountRaw === 'string' && payment.amountRaw.trim() !== ''
                                  ? fromBaseUnits(payment.amountRaw, payment.tokenDecimals || 0)
                                  : '0'}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {payment.user?.avatarUrl || payment.user?.image ? (
                                  <Image 
                                    src={payment.user.avatarUrl || payment.user.image || ''} 
                                    alt={payment.user.displayName || payment.user.name || ''} 
                                    width={20} 
                                    height={20} 
                                    className="rounded-full" 
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700" />
                                )}
                                {payment.user?.displayName || payment.user?.name || "No name"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{formatDate(payment.createdAt ? (typeof payment.createdAt === 'string' ? payment.createdAt : payment.createdAt.toISOString()) : '')}</div>
                              {payment.settledAt && (
                                <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Settled: {formatDate(typeof payment.settledAt === 'string' ? payment.settledAt : payment.settledAt.toISOString())}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment?.network ? (
                                <>
                                  <Badge variant="outline" className="text-xs w-fit mb-1">
                                    {payment.network}
                                  </Badge>
                                  <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {getExplorerName(payment.network as Network)}
                                  </div>
                                </>
                              ) : (
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Unknown network
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {payment?.transactionHash && payment?.network ? (
                                <TransactionLink
                                  txHash={payment.transactionHash}
                                  network={payment.network as Network}
                                  variant="button"
                                  showCopyButton={true}
                                  className="text-xs"
                                />
                              ) : (
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                  {payment?.transactionHash ? 'Unknown network' : 'Pending'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Tool Execution Modal */}
        {serverData && (
          <ToolExecutionModal
            isOpen={showToolModal}
            onClose={() => {
              setShowToolModal(false)
              setSelectedTool(null)
            }}
            tool={selectedTool}
            serverId={serverData.serverId}
          />
        )}
      </div>
    </div>
  )
}