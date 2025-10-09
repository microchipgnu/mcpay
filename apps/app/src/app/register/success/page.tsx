"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Server, Calendar, User, Globe, ExternalLink, ChevronDown, ChevronRight, Shield, Database, Hash, AlertCircle, Home, Plus, Eye, Wrench, DollarSign, Zap } from "lucide-react"
import { useTheme } from "@/components/providers/theme-context"
import { openBlockscout } from "@/lib/client/blockscout"
import { api } from "@/lib/client/utils"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ServerRegistrationData, ServerRegistrationMetadata } from "@/types/mcp"
import { PricingEntry } from "@/types"
import { 
  formatTokenAmount,
  fromBaseUnits,
  getTokenInfo,
} from "@/lib/commons"
import { type Network } from "@/types/blockchain"
import Image from "next/image"



// Enhanced token display with verification badge
const TokenDisplay = ({
  currency,
  network,
  amount
}: {
  currency: string
  network: string
  amount?: string | number
}) => {
  const tokenInfo = getTokenInfo(currency, network as Network)

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

// Enhanced formatCurrency function using token registry
const formatCurrency = (amount: string | number, currency: string, network?: string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  // Handle undefined or null currency
  if (!currency) {
    return `${num.toFixed(6)} Unknown`
  }

  // If we have network info, try to get token info from registry
  if (network) {
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
  }

  // Fallback: check if it's a token address and show abbreviated
  if (currency.startsWith('0x') && currency.length === 42) {
    return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
  }

  // Simple currency display
  return `${num.toFixed(6)} ${currency}`
}

function RegisterSuccessContent() {
  const { isDark } = useTheme()
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [registrationData, setRegistrationData] = useState<ServerRegistrationData | null>(null)
  const [dataError, setDataError] = useState<string>("")
  const searchParams = useSearchParams()

    // Load registration data from server ID
  useEffect(() => {
    const fetchRegistrationData = async () => {
      try {
        const serverIdParam = searchParams.get('serverId')
        
        if (serverIdParam) {
          // Fetch data from API using server ID
          const data = await api.getServerRegistration(serverIdParam)
          setRegistrationData(data)
        } else {
          // No server ID provided
          setDataError("No server ID found in URL. Please register a server first.")
        }
      } catch (error) {
        console.error("Failed to load registration data:", error)
        
        // Handle different error types
        if (error instanceof Error) {
          if (error.message.includes('403') || error.message.includes('Forbidden')) {
            setDataError("You can only view registration details for servers you created. Please sign in with the correct account.")
          } else if (error.message.includes('404')) {
            setDataError("Server registration not found. The server may have been deleted or the ID is incorrect.")
          } else {
            setDataError("Failed to load registration data. Please try again or contact support.")
          }
        } else {
          setDataError("Failed to load registration data. Please try again or contact support.")
        }
      }
    }

    fetchRegistrationData()
  }, [searchParams])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  // Extract hostname from URL for display
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  // Don't render anything until we have data or show error
  if (!registrationData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
        <div className={`p-8 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'} backdrop-blur-sm max-w-md w-full`}>
          <div className="text-center">
            {dataError ? (
              <>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <AlertCircle className={`h-8 w-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Registration Not Found
                </h3>
                                 <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
                   {dataError}
                 </p>
                 <div className="space-y-3">
                   {dataError.includes("sign in") ? (
                     <>
                       <Link href="/register">
                         <Button className="w-full">
                           <User className="h-4 w-4 mr-2" />
                           Sign In to Account
                         </Button>
                       </Link>
                       <Link href="/register">
                         <Button variant="outline" className="w-full">
                           Register New Server
                         </Button>
                       </Link>
                     </>
                   ) : (
                     <Link href="/register">
                       <Button className="w-full">
                         Register New Server
                       </Button>
                     </Link>
                   )}
                 </div>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading registration data...</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      {/* Header Section */}
      <div className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Header */}
          <div className="text-center space-y-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isDark ? "bg-green-500/20" : "bg-green-50"} mb-2`}>
              <CheckCircle className={`h-10 w-10 ${isDark ? "text-green-400" : "text-green-600"}`} />
            </div>
            
            <div className="space-y-3">
              <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Registration Successful!
              </h1>
              <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"} max-w-3xl mx-auto`}>
                Your MCP server <a  className="font-semibold text-blue-600">{registrationData.name}</a> has been registered successfully and is now available on the platform.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {(registrationData.metadata as ServerRegistrationMetadata)?.toolsCount || 0}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Total Tools
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className="text-2xl font-bold text-green-600">
                  {(registrationData.metadata as ServerRegistrationMetadata)?.monetizedToolsCount || 0}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Monetized
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className={`text-2xl font-bold ${registrationData.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                  {registrationData.status.toUpperCase()}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Status
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Server Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-6">
                <Server className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Server Information
                </h2>
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Server Name
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                    {registrationData.name}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    MCP Origin
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center justify-between gap-2`}>
                    <span className={`text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                      {getHostname(registrationData.mcpOrigin)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(registrationData.mcpOrigin, '_blank')}
                      className={`p-1 h-auto flex-shrink-0 ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                      title="Open MCP URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Receiver Address
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center justify-between gap-2`}>
                    <span className={`text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                      {registrationData.receiverAddress}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openBlockscout(registrationData.receiverAddress)}
                      className={`p-1 h-auto flex-shrink-0 ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                      title="View on Blockscout"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Configuration */}
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-6">
                <Shield className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Configuration
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Registration Date
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Calendar className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {formatDate(registrationData.createdAt)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Authentication
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Shield className={`h-4 w-4 ${registrationData.requireAuth ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {registrationData.requireAuth ? 'Required' : 'Not Required'}
                    </span>
                    <Badge variant={registrationData.requireAuth ? "default" : "secondary"} className="ml-auto">
                      {registrationData.requireAuth ? 'Secure' : 'Open'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Registration Source
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Globe className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {registrationData.metadata.registeredFromUI ? 'Web Interface' : 'API'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Database className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Description
              </h2>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed`}>
              {registrationData.description}
            </div>
          </div>

          {/* Tools Information */}
          {registrationData.tools && registrationData.tools.length > 0 ? (
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Registered Tools
                  </h2>
                  <Badge variant="outline" className="ml-2">
                    {registrationData.tools.length} tool{registrationData.tools.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {(registrationData.metadata as ServerRegistrationMetadata)?.monetizedToolsCount || 0} monetized
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registrationData.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className={`p-5 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} transition-all hover:shadow-md`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            <h3 className={`font-medium text-base ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                              {tool.name}
                            </h3>
                          </div>
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} leading-relaxed`}>
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      
                      <Separator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
                      
                      {/* Payment Information */}
                      {('pricing' in tool) && tool.pricing && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              Price per use
                            </span>
                            <TokenDisplay
                              currency={(tool.pricing as PricingEntry[])?.[0]?.assetAddress || '0x0000000000000000000000000000000000000000'}
                              network={(tool.pricing as PricingEntry[])?.[0]?.network || 'base-sepolia'}
                              amount={(() => {
                                const paymentInfo = tool.pricing as PricingEntry[] | undefined;
                                const rawAmount = paymentInfo?.[0]?.maxAmountRequiredRaw;
                                const network = paymentInfo?.[0]?.network || 'base-sepolia';
                                const currency = paymentInfo?.[0]?.assetAddress || '0x0000000000000000000000000000000000000000';
                                // Get token info to determine decimals
                                const tokenInfo = getTokenInfo(currency, network as Network);
                                const decimals = tokenInfo?.decimals || 6; // Default to 6 for USDC
                                
                                // Convert from base units to human-readable amount
                                if (rawAmount !== null && rawAmount !== undefined) {
                                  try {
                                    // Raw amount should be a string
                                    const rawAmountStr = String(rawAmount);
                                    const converted = fromBaseUnits(rawAmountStr, decimals);
                                    return converted;
                                  } catch (error) {
                                    console.error('Error converting amount:', error);
                                    return '0';
                                  }
                                }
                                
                                console.log('No raw amount found, returning 0');
                                return '0';
                              })()}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Network
                              </span>
                              <Badge variant="outline" className="text-xs py-0 px-2">
                                {(tool.pricing as PricingEntry)?.network || 'base-sepolia'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tools Summary */}
              <div className={`mt-6 p-4 rounded-lg ${isDark ? "bg-gray-800/50 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${isDark ? "text-blue-200" : "text-blue-900"} mb-1`}>
                      Tools Ready for Use
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                      All {registrationData.tools.length} tools are now registered and available for monetized usage. 
                      Users will be charged the specified amount when they invoke each tool through your MCP server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Zap className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  No Tools Detected
                </h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                This server doesn&apos;t have any tools registered yet. Tools will appear here once they are added to your MCP server.
              </p>
            </div>
          )}

          {/* Technical Details - Collapsible */}
          <div className={`rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="p-6">
              <button
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className={`flex items-center justify-between w-full text-left group p-4 -m-4 rounded-lg transition-all duration-200 hover:${isDark ? "bg-gray-800/50" : "bg-gray-50"} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <Database className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                      Technical Details
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Server IDs, timestamps, and metadata
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} group-hover:${isDark ? "text-gray-300" : "text-gray-700"} transition-colors duration-200`}>
                    {isDetailsExpanded ? "Hide" : "Show"}
                  </span>
                  <div className={`p-2 rounded-full transition-all duration-200 group-hover:${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                    {isDetailsExpanded ? (
                      <ChevronDown className={`h-4 w-4 transition-all duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                    ) : (
                      <ChevronRight className={`h-4 w-4 transition-all duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <div className={`overflow-hidden transition-all duration-500 ease-out ${
              isDetailsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            }`}>
              <div className={`px-6 pb-6 transition-all duration-300 ${isDetailsExpanded ? "translate-y-0" : "-translate-y-2"}`}>
                <Separator className={`mb-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Hash className="h-4 w-4" />
                        Registration ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.id}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Server className="h-4 w-4" />
                        Server ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.serverId}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <User className="h-4 w-4" />
                        Creator ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.creatorId}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {formatDate(registrationData.updatedAt)}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Calendar className="h-4 w-4" />
                        Metadata Timestamp
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {formatDate((registrationData.metadata as ServerRegistrationMetadata)?.timestamp || registrationData.createdAt)}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                        Full MCP Origin URL
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.mcpOrigin}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                  What&apos;s Next?
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your server is ready to use. View details, register more servers, or return home.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
                <Link href={`/servers/${registrationData.serverId}`} className="sm:w-auto w-full">
                  <Button className="w-full h-11 font-medium">
                    <Eye className="h-4 w-4 mr-2" />
                    View Server Details
                  </Button>
                </Link>
                <Link href="/register" className="sm:w-auto w-full">
                  <Button variant="outline" className="w-full h-11 font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    Register Another
                  </Button>
                </Link>
                <Link href="/" className="sm:w-auto w-full">
                  <Button variant="outline" className="w-full h-11 font-medium">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  const { isDark } = useTheme()
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <div className={`p-8 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'} backdrop-blur-sm`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterSuccessContent />
    </Suspense>
  )
}
