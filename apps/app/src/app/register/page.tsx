"use client"

import type React from "react"
import { Suspense } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { mcpDataApi, api as realApi, urlUtils } from "@/lib/client/utils"
import { usePrimaryWallet } from "@/components/providers/user"
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types"
import { type Network } from "@/types/blockchain"
import { AlertCircle, ArrowUpRight, CheckCircle, Clipboard, Info, Loader2, Server, Trash2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { MonetizeWizard } from "@/components/custom-ui/monetize-wizard"





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


// Create a thin wrapper around the real API with graceful mock fallbacks
const api = {
  async registerServer(_data: {
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
    } catch { }

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
  return (
    <div className="bg-background">
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-md bg-muted/30 border border-border">
              <Server className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-host font-extrabold text-foreground">
                Register MCP Server
              </h1>
              <p className="text-base text-muted-foreground mt-1">
                Loading...
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    </div>
  )
}

// New Register Options Page Component
function RegisterOptionsPage() {
  const [indexing, setIndexing] = useState(false)
  const [indexError, setIndexError] = useState<string | null>(null)
  const [monetizing, setMonetizing] = useState(false)
  const [monetizeError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [urlTouched, setUrlTouched] = useState(false)
  const [urlValid, setUrlValid] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [previewTools, setPreviewTools] = useState<RegisterMCPTool[] | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [lastMonetizedUrl] = useState<string | null>(null)
  const [clipboardUrlSuggestion, setClipboardUrlSuggestion] = useState<string | null>(null)
  const [clipboardPrompted, setClipboardPrompted] = useState(false)

  // Monetize wizard state
  const [monetizeOpen, setMonetizeOpen] = useState(false)
  const [monetizeTools, setMonetizeTools] = useState<RegisterMCPTool[]>([])
  const [priceByTool, setPriceByTool] = useState<Record<string, number>>({})
  const [evmRecipientAddress, setEvmRecipientAddress] = useState<string>("")
  const [svmRecipientAddress, setSvmRecipientAddress] = useState<string>("")
  const [recipientIsTestnet, setRecipientIsTestnet] = useState<boolean>(false)
  const [requireAuth, setRequireAuth] = useState<boolean>(false)
  const [authHeaders, setAuthHeaders] = useState<Array<{ key: string; value: string }>>([{ key: '', value: '' }])
  const primaryWallet = usePrimaryWallet()
  const selectedWalletAddress = primaryWallet?.walletAddress || ""
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  
  // Auth configuration state
  const [authConfigOpen, setAuthConfigOpen] = useState(false)
  const [authConfigLoading, setAuthConfigLoading] = useState(false)

  const validateEvm = (addr: string): boolean => /^0x[a-fA-F0-9]{40}$/.test((addr || '').trim())
  const validateSvm = (addr: string): boolean => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((addr || '').trim())


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
    if (!urlValid) {
      toast.error('Enter a valid server URL')
      return
    }
    
    // First try to inspect without auth
    try {
      const res = await fetch(`/api/inspect-mcp-server?url=${encodeURIComponent(serverUrl.trim())}&include=tools,prompts`)
      const data = await res.json().catch(() => ({}))
      const tools = Array.isArray(data?.tools) ? (data.tools as RegisterMCPTool[]) : []
      
      if (tools.length > 0) {
        // Server doesn't require auth, proceed directly to monetize wizard
        setMonetizeTools(tools)
        const defaults: Record<string, number> = {}
        for (const t of tools) defaults[t.name] = 0.01
        setPriceByTool(defaults)
        setMonetizeOpen(true)
      } else {
        // No tools found, likely requires auth - show auth config dialog
        setAuthConfigOpen(true)
      }
    } catch {
      // On error, show auth config dialog
      setAuthConfigOpen(true)
    }
  }

  const handleAuthConfigSubmit = async () => {
    if (!serverUrl.trim()) return
    
    setAuthConfigLoading(true)
    try {
      const authHeadersObj = Object.fromEntries(
        authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])
      )
      
      const authHeadersParam = Object.keys(authHeadersObj).length > 0 
        ? encodeURIComponent(JSON.stringify(authHeadersObj))
        : ''
      
      const url = `/api/inspect-mcp-server?url=${encodeURIComponent(serverUrl.trim())}&include=tools,prompts${
        authHeadersParam ? `&authHeaders=${authHeadersParam}` : ''
      }`
      
      const res = await fetch(url)
      const data = await res.json().catch(() => ({}))
      const tools = Array.isArray(data?.tools) ? (data.tools as RegisterMCPTool[]) : []
      
      setMonetizeTools(tools)
      const defaults: Record<string, number> = {}
      for (const t of tools) defaults[t.name] = 0.01
      setPriceByTool(defaults)
      
      // Set requireAuth to true since we're using auth headers
      setRequireAuth(true)
      
      setAuthConfigOpen(false)
      
      // Small delay to ensure state updates before opening wizard
      setTimeout(() => {
        setMonetizeOpen(true)
      }, 100)
      
      if (tools.length === 0) {
        toast.warning('No tools found. Check your authentication headers.')
      }
    } catch {
      toast.error('Failed to inspect server with authentication')
    } finally {
      setAuthConfigLoading(false)
    }
  }

  const createMonetizedEndpointWithData = async (data: {
    prices: Record<string, number>
    evmRecipientAddress?: string
    svmRecipientAddress?: string
    networks: string[]
    requireAuth: boolean
    authHeaders: Record<string, string>
    testnet: boolean
  }) => {
    if (!serverUrl.trim()) return
    const includesEvm = data.networks.some(n => (SupportedEVMNetworks as readonly string[]).includes(n))
    const includesSvm = data.networks.some(n => (SupportedSVMNetworks as readonly string[]).includes(n))
    if (includesEvm && !validateEvm(data.evmRecipientAddress || selectedWalletAddress)) {
      toast.error('Enter a valid EVM address (0x…)')
      return
    }
    if (includesSvm && !validateSvm(data.svmRecipientAddress || '')) {
      toast.error('Enter a valid SVM address')
      return
    }
    try {
      setMonetizing(true)
      const rnd = Math.random().toString(36).slice(2, 10)
      const id = `srv_${rnd}`
      const formatPrice = (value: number): string => {
        if (!Number.isFinite(value) || value < 0) return '$0'
        const rounded = Math.round(value * 1e6) / 1e6
        let s = String(rounded)
        if (s.includes('.')) s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
        return `$${s}`
      }
      const body = {
        id,
        mcpOrigin: serverUrl.trim(),
        recipient: {
          ...(includesEvm ? { evm: { address: (data.evmRecipientAddress || selectedWalletAddress), isTestnet: data.testnet } } : {}),
          ...(includesSvm ? { svm: { address: data.svmRecipientAddress, isTestnet: data.testnet } } : {}),
        },
        tools: monetizeTools.map((t) => ({ name: t.name, pricing: formatPrice(data.prices[t.name] ?? 0.01) })),
        requireAuth: data.requireAuth,
        authHeaders: data.requireAuth ? data.authHeaders : {},
        metadata: { createdAt: new Date().toISOString(), source: 'app:register', networks: data.networks },
      }
      const resp = await fetch(`${urlUtils.getMcp2Url()}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error || `Failed to register: ${resp.status}`)
      }
      const endpoint = `${urlUtils.getMcp2Url()}/mcp?id=${encodeURIComponent(id)}`
      try {
        await navigator.clipboard.writeText(endpoint)
        toast.success('Monetized endpoint copied to clipboard!')
      } catch { }
      try {
        const result = await mcpDataApi.runIndex(endpoint)
        if ('ok' in result && result.ok && result.serverId) {
          toast.success('Server indexed successfully!')
          window.location.href = `/servers/${result.serverId}`
          return
        }
      } catch { }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed to create endpoint: ${msg}`)
    } finally {
      setMonetizing(false)
    }
  }

  const createMonetizedEndpoint = async () => {
    if (!serverUrl.trim()) return
    const includesEvm = selectedNetworks.some(n => (SupportedEVMNetworks as readonly string[]).includes(n))
    const includesSvm = selectedNetworks.some(n => (SupportedSVMNetworks as readonly string[]).includes(n))
    if (includesEvm && !validateEvm(evmRecipientAddress || selectedWalletAddress)) {
      toast.error('Enter a valid EVM address (0x…)')
      return
    }
    if (includesSvm && !validateSvm(svmRecipientAddress)) {
      toast.error('Enter a valid SVM address')
      return
    }
    try {
      setMonetizing(true)
      const rnd = Math.random().toString(36).slice(2, 10)
      const id = `srv_${rnd}`
      const authHeadersRecord: Record<string, string> = {}
      for (const row of authHeaders) {
        const k = (row.key || '').trim()
        const v = row.value || ''
        if (k && v) authHeadersRecord[k] = v
      }
      const formatPrice = (value: number): string => {
        if (!Number.isFinite(value) || value < 0) return '$0'
        const rounded = Math.round(value * 1e6) / 1e6
        let s = String(rounded)
        if (s.includes('.')) s = s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
        return `$${s}`
      }
      const body = {
        id,
        mcpOrigin: serverUrl.trim(),
        recipient: {
          ...(includesEvm ? { evm: { address: (evmRecipientAddress || selectedWalletAddress), isTestnet: recipientIsTestnet } } : {}),
          ...(includesSvm ? { svm: { address: svmRecipientAddress, isTestnet: recipientIsTestnet } } : {}),
        },
        tools: monetizeTools.map((t) => ({ name: t.name, pricing: formatPrice(priceByTool[t.name] ?? 0.01) })),
        requireAuth: requireAuth === true,
        authHeaders: requireAuth ? authHeadersRecord : {},
        metadata: { createdAt: new Date().toISOString(), source: 'app:register', networks: selectedNetworks },
      }
      const resp = await fetch(`${urlUtils.getMcp2Url()}/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { error?: string }
        throw new Error(err?.error || `Failed to register: ${resp.status}`)
      }
      const endpoint = `${urlUtils.getMcp2Url()}/mcp?id=${encodeURIComponent(id)}`
      try {
        await navigator.clipboard.writeText(endpoint)
        toast.success('Monetized endpoint copied to clipboard!')
      } catch { }
      try {
        const result = await mcpDataApi.runIndex(endpoint)
        if ('ok' in result && result.ok && result.serverId) {
          toast.success('Server indexed successfully!')
          window.location.href = `/servers/${result.serverId}`
          return
        }
      } catch { }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      toast.error(`Failed to create endpoint: ${msg}`)
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
          <div className="max-w-6xl px-4 md:px-6 mx-auto mb-10">
            <h2 className="text-3xl font-semibold font-host text-foreground">Register</h2>
            <p className="text-base text-muted-foreground">
              Connect your MCP server and start accepting payments instantly.
            </p>
          </div>


          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            {/* URL Input Section */}
            <Card className="border border-border bg-background mb-10">
              <CardHeader>
                <div className="flex gap-2">
                  <CardTitle className="text-xl font-host text-foreground">Server URL</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" aria-label="What is an MCP endpoint?" className="inline-flex items-center text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Provide the HTTP(S) endpoint your MCP server exposes.</TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription className="text-muted-foreground">
                  Enter your MCP server URL to get started
                </CardDescription>
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
                      className="flex-1 pr-9 transition-shadow bg-background border-border text-foreground placeholder:text-muted-foreground focus:bg-background focus:shadow-[0_0_0_2px_rgba(0,82,255,0.25)]"
                    />
                    {(serverUrl || urlTouched) && (
                      <div className="absolute inset-y-0 right-2 flex items-center">
                        {isPreviewLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : urlValid ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-teal-600 dark:text-teal-400" aria-label="Valid URL">
                                <CheckCircle className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Valid URL</TooltipContent>
                          </Tooltip>
                        ) : serverUrl ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-red-600 dark:text-red-400" aria-label="Invalid URL">
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
                      <Button type="button" variant="outline" size="icon" onClick={onPaste} className="shrink-0 border-border" aria-label="Paste from clipboard">
                        <Clipboard className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Paste from clipboard</TooltipContent>
                  </Tooltip>

                  <Button type="button" variant="ghost" size="icon" onClick={onClear} className="shrink-0" aria-label="Clear">
                    Clear
                  </Button>
                </div>
                {/* Clipboard suggestion */}
                {clipboardUrlSuggestion && !serverUrl && (
                  <div className="mt-2 text-xs flex items-center gap-2 text-muted-foreground">
                    <span>We detected a URL in your clipboard.</span>
                    <Button type="button" variant="link" size="sm" className="h-6 px-0" onClick={() => { setServerUrl(clipboardUrlSuggestion); setClipboardPrompted(true); }}>
                      Paste it?
                    </Button>
                    <button type="button" className="underline underline-offset-2 text-muted-foreground" onClick={() => setClipboardPrompted(true)}>Dismiss</button>
                  </div>
                )}

                {/* Preview tools */}
                {(isPreviewLoading || previewTools || previewError) && (
                  <div className="mt-3 text-sm">
                    {isPreviewLoading && <span className="text-muted-foreground">Inspecting server…</span>}
                    {!isPreviewLoading && previewError && (
                      <span className="text-red-600 dark:text-red-400">{previewError}</span>
                    )}
                    {!isPreviewLoading && previewTools && previewTools.length > 0 && (
                      <div className="text-foreground">
                        <span className="font-medium">Detected tools:</span>{' '}
                        {previewTools.map((t) => t.name).join(', ')}{previewTools.length >= 5 ? '…' : ''}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monetize Wizard */}
            <MonetizeWizard
              open={monetizeOpen}
              onOpenChange={(open) => setMonetizeOpen(open)}
              serverUrl={serverUrl}
              tools={monetizeTools}
              initialAuthHeaders={authHeaders}
              initialRequireAuth={requireAuth}
              onCreate={async ({ prices, evmRecipientAddress: evmAddr, svmRecipientAddress: svmAddr, networks, requireAuth, authHeaders, testnet }) => {
                setPriceByTool(prices)
                setEvmRecipientAddress(evmAddr || '')
                setSvmRecipientAddress(svmAddr || '')
                setSelectedNetworks(networks)
                setRequireAuth(requireAuth)
                setAuthHeaders(Object.entries(authHeaders).map(([key, value]) => ({ key, value })))
                setRecipientIsTestnet(testnet)
                await createMonetizedEndpointWithData({ prices, evmRecipientAddress: evmAddr, svmRecipientAddress: svmAddr, networks, requireAuth, authHeaders, testnet })
              }}
            />

            {/* Dynamic Options Based on URL Input */}
            {urlValid ? (
              /* Server Options - Show when URL is valid */
              <div className="rounded-md border border-border bg-muted/30 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Monetize */}
                  <Card className="h-full flex flex-col border border-border bg-background transition-all shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-host text-foreground">Monetize</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        <span className="text-muted-foreground">Wrap your server with zero-code payments.</span>
                        <span className="text-foreground font-semibold block mt-1">
                          <span className="text-teal-600 dark:text-teal-400">Perfect for existing servers</span>
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 mt-auto">
                      <Button
                        onClick={handleMonetize}
                        disabled={monetizing}
                        className="w-full transition-all duration-200 font-medium bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg"
                      >
                        {monetizing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Get Monetized URL
                          </>
                        )}
                      </Button>
                      {monetizeError && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{monetizeError}</p>
                      )}
                      {lastMonetizedUrl && (
                        <div className="mt-3 flex items-center gap-2">
                          <code className="text-xs font-mono p-2 px-3 rounded-md bg-muted/40 border border-border break-all flex-1 text-foreground">{lastMonetizedUrl}</code>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(lastMonetizedUrl); toast.success('Copied URL') }}
                          >Copy</Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Option 2: Index Server */}
                  <Card className="h-full flex flex-col border border-border bg-background transition-all shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-host text-foreground">Index Server</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        <span className="text-muted-foreground">Add to discovery and analytics.</span>
                        <span className="text-foreground font-semibold block mt-1">
                          <span className="text-teal-600 dark:text-teal-400">For x402-enabled servers</span>
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 mt-auto">
                      <Button
                        onClick={handleAddServer}
                        disabled={indexing}
                        className="w-full transition-all duration-200 font-medium bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg"
                      >
                        {indexing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Indexing...
                          </>
                        ) : (
                          <>
                            Index Server
                          </>
                        )}
                      </Button>
                      {indexError && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{indexError}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* SDK Suggestions - Show when no URL or invalid URL */
              <div className="rounded-md border border-border bg-muted/30 p-4 md:p-6">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-foreground mb-2">Don&apos;t have a server yet?</h3>
                  <p className="text-sm text-muted-foreground">Build one with our SDK and integrate payments directly</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SDK Documentation */}
                  <Card className="h-full flex flex-col border border-border bg-background transition-all">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-host text-foreground">Documentation</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        <span className="text-muted-foreground">Learn how to build MCP servers with payments.</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 mt-auto">
                      <Button
                        asChild
                        className="w-full transition-all duration-200 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg font-medium"
                      >
                        <a href="https://docs.mcpay.tech" target="_blank" rel="noopener noreferrer">
                          View Documentation
                          <ArrowUpRight className="h-4 w-4 ml-2 text-white" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>

                  {/* SDK Examples */}
                  <Card className="h-full flex flex-col border border-border bg-background transition-all">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl font-host text-foreground">Examples</CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        <span className="text-muted-foreground">Ready-to-use code samples and templates.</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 mt-auto">
                      <Button
                        asChild
                        className="w-full transition-all duration-200 bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg font-medium"
                      >
                        <a href="https://docs.mcpay.tech/examples" target="_blank" rel="noopener noreferrer">
                          View Examples
                          <ArrowUpRight className="h-4 w-4 ml-2 text-white" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Help Section */}
            <Card className="border border-border bg-background mt-8">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-base inline-flex items-center justify-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" />
                    Need help choosing? Check out our{" "}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href="https://docs.mcpay.tech/quickstart"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 underline"
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
                          className="text-teal-600 hover:text-teal-700 underline"
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
        </div>
      </main>

      {/* Auth Configuration Dialog */}
      <Dialog open={authConfigOpen} onOpenChange={setAuthConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              This MCP server requires authentication. Please provide the necessary headers to access its tools.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium">Authentication Headers</div>
              <div className="space-y-2">
                {authHeaders.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Header name (e.g., Authorization)"
                      value={header.key}
                      onChange={(e) => setAuthHeaders(prev => 
                        prev.map((h, i) => i === index ? { ...h, key: e.target.value } : h)
                      )}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => setAuthHeaders(prev => 
                        prev.map((h, i) => i === index ? { ...h, value: e.target.value } : h)
                      )}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAuthHeaders(prev => prev.filter((_, i) => i !== index))}
                      disabled={authHeaders.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAuthHeaders(prev => [...prev, { key: '', value: '' }])}
                className="w-full"
              >
                Add Header
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Common headers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><code>Authorization: Bearer YOUR_API_KEY</code></li>
                <li><code>x-api-key: YOUR_API_KEY</code></li>
                <li><code>X-API-Key: YOUR_API_KEY</code></li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthConfigOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAuthConfigSubmit}
              disabled={authConfigLoading || authHeaders.every(h => !h.key || !h.value)}
            >
              {authConfigLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect & Continue'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
