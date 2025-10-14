"use client"

import type React from "react"
import { Suspense } from "react"

import { AccountModal } from "@/components/custom-ui/account-modal"
import Footer from "@/components/custom-ui/footer"
import { useAccountModal } from "@/components/hooks/use-account-modal"
import { useTheme } from "@/components/providers/theme-context"
import { usePrimaryWallet, useUser, useUserWallets } from "@/components/providers/user"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSession } from "@/lib/client/auth"
import { api as realApi, mcpDataApi, urlUtils } from "@/lib/client/utils"
import { getTokenInfo, toBaseUnits } from "@/lib/commons"
import { getNetworkConfig, type UnifiedNetwork } from "@/lib/commons/networks"
import { type Network } from "@/types/blockchain"
import { AlertCircle, ArrowRight, ArrowUpRight, BookOpen, CheckCircle, ChevronDown, Copy, Globe, Info, Loader2, Lock, RefreshCw, Server, User, Wallet, Zap, Clipboard, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
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
    // First, try our local API route for inspection
    try {
      const res = await fetch(`/api/inspect-mcp-server?url=${encodeURIComponent(url)}&include=tools`)
      if (res.ok) {
        const data = await res.json() as { ok?: boolean; tools?: Array<{ name: string; description?: string }> }
        if (data?.ok && Array.isArray(data.tools)) {
          return data.tools.map((t) => ({ name: t.name, description: t.description }))
        }
      }
    } catch {}

    // Fallback to real client util if available
    try {
      const tools = await realApi.getMcpTools(url) as unknown
      if (Array.isArray(tools)) {
        return tools as RegisterMCPTool[]
      }
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


// Loading fallback component
function RegisterPageLoading() {
  const { isDark } = useTheme()

  return (
    <div className="bg-background">
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <Server className={`h-8 w-8 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-host font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Register MCP Server
              </h1>
              <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                Loading...
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center h-64">
            <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
        </div>
      </main>


    </div>
  )
}

// New Register Options Page Component
function RegisterOptionsPage() {
  const { isDark } = useTheme()
  const [indexing, setIndexing] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [monetizing, setMonetizing] = useState(false)
  const [monetizeError, setMonetizeError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [urlTouched, setUrlTouched] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [previewTools, setPreviewTools] = useState<RegisterMCPTool[] | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lastMonetizedUrl, setLastMonetizedUrl] = useState<string | null>(null)
  const [clipboardUrlSuggestion, setClipboardUrlSuggestion] = useState<string | null>(null)
  const [clipboardPrompted, setClipboardPrompted] = useState(false)

  const handleAddServer = async () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL')
      return
    }

    try {
      setIndexing(true)
      setIndexError(null)
      const result = await mcpDataApi.runIndex(serverUrl.trim())
      if ('ok' in result && result.ok) {
        toast.success('Server indexed successfully!')
        // Redirect to server page or explorer
        window.location.href = `/servers/${result.serverId}`
      } else if ('error' in result && result.error) {
        toast.error(`Failed to index server: ${result.error}`)
      } else {
        toast.error('Failed to index server')
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setIndexError(errorMessage)
      toast.error(`Failed to index server: ${errorMessage}`)
    } finally {
      setIndexing(false)
    }
  }

  const handleMonetize = async () => {
    if (!serverUrl.trim()) {
      toast.error('Please enter a server URL')
      return
    }

    try {
      setMonetizing(true)
      setMonetizeError(null)
      // Create monetized URL using mcp2 service
      const monetizedUrl = urlUtils.getMcpUrl(serverUrl.trim())
      // Copy to clipboard
      await navigator.clipboard.writeText(monetizedUrl)
      toast.success('Monetized URL copied to clipboard!')
      setLastMonetizedUrl(monetizedUrl)
      // Redirect to success page or show the URL
      window.location.href = `/register/success?monetizedUrl=${encodeURIComponent(monetizedUrl)}`
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error'
      setMonetizeError(errorMessage)
      toast.error(`Failed to create monetization: ${errorMessage}`)
    } finally {
      setMonetizing(false)
    }
  }

  // --- URL validation and preview helpers ---
  const validateServerUrl = (value: string) => {
    try {
      const u = new URL(value)
      if (!/^https?:$/.test(u.protocol)) return { valid: false, error: 'URL must start with http or https' }
      if (!u.hostname) return { valid: false, error: 'URL must include a hostname' }
      return { valid: true as const }
    } catch {
      return { valid: false as const, error: 'Enter a valid URL (e.g., https://example.com/mcp)' }
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcp_register_last_url')
      if (saved) setServerUrl(saved)
    } catch { }
  }, [])

  // Attempt to detect a URL in the clipboard (best-effort)
  useEffect(() => {
    let cancelled = false
    const detectClipboard = async () => {
      if (clipboardPrompted) return
      try {
        const text = await navigator.clipboard.readText()
        const value = (text || '').trim()
        if (!cancelled && value && !serverUrl) {
          const { valid } = validateServerUrl(value)
          if (valid) {
            setClipboardUrlSuggestion(value)
          }
        }
      } catch { }
    }
    detectClipboard()
    return () => { cancelled = true }
  }, [clipboardPrompted, serverUrl])

  // Validate URL and fetch preview on change (debounced)
  useEffect(() => {
    const value = serverUrl.trim()
    if (!value) {
      setUrlValid(false)
      setUrlError(null)
      setPreviewTools(null)
      return
    }
    const id = setTimeout(async () => {
      const { valid, error } = validateServerUrl(value)
      setUrlValid(valid)
      setUrlError(error || null)
      try { localStorage.setItem('mcp_register_last_url', value) } catch { }

      if (valid) {
        setIsPreviewLoading(true)
        setPreviewError(null)
        try {
          const tools = await api.getMcpTools(value)
          setPreviewTools(Array.isArray(tools) ? tools.slice(0, 5) : null)
        } catch (e) {
          setPreviewTools(null)
          setPreviewError(e instanceof Error ? e.message : 'Failed to inspect server')
        } finally {
          setIsPreviewLoading(false)
        }
      } else {
        setPreviewTools(null)
      }
    }, 350)
    return () => clearTimeout(id)
  }, [serverUrl])

  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) setServerUrl(text)
    } catch {
      toast.error('Could not read clipboard')
    }
  }

  const onClear = () => {
    setServerUrl('')
    setUrlTouched(false)
    setUrlValid(false)
    setUrlError(null)
    setPreviewTools(null)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && urlValid && !monetizing) {
      e.preventDefault()
      handleMonetize()
    }
  }

  return (
    <div className="bg-background">
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="text-center mb-10">
            <h1 className={`text-3xl font-semibold font-host mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>Choose your path</h1>
            <p className={`text-base ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Connect your MCP server and start accepting payments instantly.
            </p>
            <div className="mt-3 flex justify-center">
              <Badge variant="secondary" className="text-xs">Step 1 of 3: Connect server</Badge>
            </div>
          </div>

          {/* URL Input Section */}
          <Card className={`border border-border bg-background mb-10`}>
            <CardHeader>
              <div className="flex items-center justify-center gap-2">
                <CardTitle className={`text-xl font-host ${isDark ? "text-white" : "text-gray-900"}`}>Server URL</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="What is an MCP endpoint?" className="inline-flex items-center text-muted-foreground hover:text-foreground">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Provide the HTTP(S) endpoint your MCP server exposes.</TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className={isDark ? "text-gray-400" : "text-gray-600"}>Enter your MCP server URL to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Input
                    id="server-url"
                    type="url"
                    aria-label="Server URL"
                    aria-describedby="server-url-help"
                    placeholder="https://your-mcp-server.com/mcp"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    onBlur={() => setUrlTouched(true)}
                    onKeyDown={onKeyDown}
                    className={`flex-1 pr-9 transition-shadow ${isDark ? "bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-700 focus:shadow-[0_0_0_2px_rgba(0,82,255,0.25)]" : "bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:bg-white focus:shadow-[0_0_0_2px_rgba(0,82,255,0.25)]"}`}
                  />
                  {(serverUrl || urlTouched) && (
                    <div className="absolute inset-y-0 right-2 flex items-center">
                      {isPreviewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : urlValid ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-green-500" aria-label="Valid URL">
                              <CheckCircle className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Valid URL</TooltipContent>
                        </Tooltip>
                      ) : serverUrl ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-red-500" aria-label="Invalid URL">
                              <AlertCircle className="h-4 w-4" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{urlError || 'Enter a valid URL'}</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  )}
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="icon" onClick={onPaste} className={`shrink-0 ${isDark ? 'border-gray-600' : ''}`} aria-label="Paste from clipboard">
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Paste from clipboard</TooltipContent>
                </Tooltip>

                <Button type="button" variant="ghost" size="icon" onClick={onClear} className="shrink-0" aria-label="Clear">
                  Clear
                </Button>
              </div>
              <div id="server-url-help" className={`mt-2 text-sm ${urlTouched && !urlValid && serverUrl ? 'text-red-500' : isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {urlTouched && !urlValid && serverUrl
                  ? (urlError || 'Enter a valid URL')
                  : 'URL must be https and point to your MCP endpoint.'}
              </div>
              {/* Clipboard suggestion */}
              {clipboardUrlSuggestion && !serverUrl && (
                <div className={`mt-2 text-xs flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <span>We detected a URL in your clipboard.</span>
                  <Button type="button" variant="link" size="sm" className="h-6 px-0" onClick={() => { setServerUrl(clipboardUrlSuggestion); setClipboardPrompted(true); }}>
                    Paste it?
                  </Button>
                  <button type="button" className={`underline underline-offset-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} onClick={() => setClipboardPrompted(true)}>Dismiss</button>
                </div>
              )}

              {/* Examples */}
              <div className="mt-2 text-xs">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="link" size="sm" className="h-6 px-0">Examples</Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[320px]">
                    <div className="text-xs">
                      <div className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Sample MCP endpoints:</div>
                      <div className="flex flex-col gap-1">
                        {['https://example.com/mcp', 'https://mcp.myserver.dev/endpoint', 'https://api.site.com/mcp'].map((ex) => (
                          <button key={ex} onClick={() => setServerUrl(ex)} className={`text-left truncate ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} underline underline-offset-2`} type="button">{ex}</button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Preview tools */}
              {(isPreviewLoading || previewTools || previewError) && (
                <div className="mt-3 text-sm">
                  {isPreviewLoading && <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>Inspecting server…</span>}
                  {!isPreviewLoading && previewError && (
                    <span className="text-red-500">{previewError}</span>
                  )}
                  {!isPreviewLoading && previewTools && previewTools.length > 0 && (
                    <div className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                      <span className="font-medium">Detected tools:</span>{' '}
                      {previewTools.map((t) => t.name).join(', ')}{previewTools.length >= 5 ? '…' : ''}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Three Options Grid */}
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Option 1: Monetize */}
              <Card className={`border border-border bg-background transition-all ${urlValid ? 'ring-1 ring-[#0052FF]/30 shadow-sm' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-[#0052FF]/10 rounded-lg ring-1 ring-[#0052FF]/20">
                      <Zap className="h-6 w-6 text-[#0052FF]" />
                    </div>
                    <CardTitle className={`text-xl font-host ${isDark ? "text-white" : "text-gray-900"}`}>Monetize</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>Simplify payments with a zero-code wrapper.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={handleMonetize}
                    disabled={monetizing || !urlValid}
                    className={`w-full transition-all duration-200 ${monetizing || !urlValid ? "opacity-60 cursor-not-allowed" : "bg-[#0052FF] hover:bg-[#0052FF]/90 hover:shadow-lg"} ${monetizing || !urlValid ? 'bg-[#0052FF]' : ''} text-white font-medium`}
                  >
                    {monetizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Get Monetized URL
                      </>
                    )}
                  </Button>
                  {monetizeError && (
                    <p className="text-sm text-red-400 mt-2">{monetizeError}</p>
                  )}
                  {!urlValid && (
                    <p className="text-xs mt-2 text-muted-foreground">Enter a valid server URL to continue.</p>
                  )}
                  {lastMonetizedUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="text-xs font-mono p-2 px-3 rounded-md bg-muted/40 break-all flex-1">{lastMonetizedUrl}</code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(lastMonetizedUrl); toast.success('Copied URL') }}
                      >Copy</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Option 2: Add Server */}
              <Card className={`border border-border bg-background transition-all ${urlValid ? 'ring-1 ring-green-500/30 shadow-sm' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-500/10 rounded-lg ring-1 ring-green-500/20">
                      <Server className="h-6 w-6 text-green-500" />
                    </div>
                    <CardTitle className={`text-xl font-host ${isDark ? "text-white" : "text-gray-900"}`}>Add Server</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>Index your server for discovery and analytics.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    onClick={handleAddServer}
                    disabled={indexing || !urlValid}
                    className={`w-full transition-all duration-200 ${indexing || !urlValid ? "opacity-60 cursor-not-allowed bg-green-600" : "bg-green-600 hover:bg-green-700 hover:shadow-lg"} text-white font-medium`}
                  >
                    {indexing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Indexing...
                      </>
                    ) : (
                      <>
                        <Server className="h-4 w-4 mr-2" />
                        Index Server
                      </>
                    )}
                  </Button>
                  {indexError && (
                    <p className="text-sm text-red-400 mt-2">{indexError}</p>
                  )}
                  {!urlValid && (
                    <p className="text-xs mt-2 text-muted-foreground">Enter a valid server URL to continue.</p>
                  )}
                </CardContent>
              </Card>

              {/* Option 3: Build with SDK */}
              <Card className={`border border-border bg-background transition-all`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${isDark ? "bg-gray-700" : "bg-gray-200"} rounded-lg ring-1 ${isDark ? "ring-gray-600" : "ring-gray-300"}`}>
                      <BookOpen className={`h-6 w-6 ${isDark ? "text-gray-300" : "text-gray-600"}`} />
                    </div>
                    <CardTitle className={`text-xl font-host ${isDark ? "text-white" : "text-gray-900"}`}>Build with SDK</CardTitle>
                  </div>
                  <CardDescription className="text-sm">
                    <span className={isDark ? "text-gray-300" : "text-gray-700"}>Integrate payments directly in code.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    asChild
                    className={`w-full transition-all duration-200 ${isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200 hover:shadow-lg" : "bg-gray-600 hover:bg-gray-700 text-white hover:shadow-lg"} font-medium`}
                  >
                    <a href="https://docs.mcpay.tech" target="_blank" rel="noopener noreferrer">
                      <BookOpen className={`h-4 w-4 mr-2 ${isDark ? "text-gray-300" : "text-gray-100"}`} />
                      View Documentation
                      <ArrowUpRight className={`h-4 w-4 ml-2 ${isDark ? "text-gray-300" : "text-gray-100"}`} />
                    </a>
                  </Button>
                  <div className="mt-2">
                    <Button asChild variant="outline" className="w-full">
                      <a href="https://docs.mcpay.tech/examples" target="_blank" rel="noopener noreferrer">View SDK Examples</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Help Section */}
          <Card className={`border border-border bg-background mt-8`}>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className={`text-base inline-flex items-center justify-center gap-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <Info className="h-4 w-4" />
                  Need help choosing? Check out our{" "}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href="https://docs.mcpay.tech/quickstart"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        quickstart guide
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>Read the step-by-step setup guide</TooltipContent>
                  </Tooltip>
                  {" "}or{" "}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/servers"
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        browse existing servers
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>See indexed MCP servers for inspiration</TooltipContent>
                  </Tooltip>
                  .
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

    </div>
  )
}

// Main export with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageLoading />}>
      <RegisterOptionsPage />
    </Suspense>
  )
}
