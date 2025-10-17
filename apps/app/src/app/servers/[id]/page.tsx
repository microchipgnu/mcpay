"use client"

import { AboutSection } from "@/components/custom-ui/about-section"
import { ConnectPanel } from "@/components/custom-ui/connect-panel"
import { ServerDetailsCard } from "@/components/custom-ui/server-details-card"
import { ServerHeader } from "@/components/custom-ui/server-header"
import { TokenIcon } from "@/components/custom-ui/token-icon"
import { ToolExecutionModal, type ToolFromMcpServerWithStats } from "@/components/custom-ui/tool-execution-modal"
import { ToolsAccordion } from "@/components/custom-ui/tools-accordion"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { mcpDataApi, urlUtils } from "@/lib/client/utils"
import { isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  RefreshCcw,
  XCircle
} from "lucide-react"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

type ServerDetail = {
  serverId: string
  origin: string
  originRaw?: string
  status?: string
  lastSeenAt?: string
  indexedAt?: string
  info: { name?: string; description?: string; icon?: string }
  tools: Array<Record<string, unknown>>
  summary: { lastActivity?: string; totalTools: number; totalRequests: number; totalPayments: number }
  dailyAnalytics: Array<{ date: string; totalRequests: number }>
  recentPayments: Array<{ 
    id: string; 
    createdAt: string; 
    status: 'completed' | 'failed'; 
    network?: string; 
    transactionHash?: string;
    amountFormatted?: string;
    currency?: string;
  }>
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ""
  return new Date(dateString).toLocaleString()
}

const formatRelative = (dateString?: string) => {
  if (!dateString) return ""
  const ms = Date.now() - new Date(dateString).getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// Compact relative time like the explorer (secs/mins/hrs/days)
function formatRelativeShort(iso?: string, now = Date.now()) {
  if (!iso) return ""
  const diffMs = new Date(iso).getTime() - now
  const abs = Math.abs(diffMs)
  const sec = Math.round(abs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const month = Math.round(day / 30)
  const year = Math.round(day / 365)

  const value =
    sec < 60 ? { n: Math.max(1, sec), u: "secs" } :
      min < 60 ? { n: min, u: "mins" } :
        hr < 24 ? { n: hr, u: "hrs" } :
          day < 30 ? { n: day, u: "days" } :
            month < 12 ? { n: month, u: "mos" } :
              { n: year, u: "yrs" }

  return `${value.n} ${value.u} ${diffMs <= 0 ? "ago" : "from now"}`
}

const truncateHash = (h: string, left = 6, right = 7) =>
  h && h.length > left + right + 3 ? `${h.slice(0, left)}...${h.slice(-right)}` : h

function safeTxUrl(network?: string, hash?: string) {
  if (!network || !hash) return undefined
  if (isNetworkSupported(network)) {
    return getExplorerUrl(hash, network as UnifiedNetwork, 'tx')
  }
  return `https://etherscan.io/tx/${hash}`
}


export default function ServerPage() {
  const params = useParams()
  const serverId = params.id as string
  const { isDark } = useTheme()

  const [data, setData] = useState<ServerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [showToolModal, setShowToolModal] = useState(false)
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [isToolsCardExpanded, setIsToolsCardExpanded] = useState(true)
  const [showAllTools, setShowAllTools] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await mcpDataApi.getServerById(serverId)
        if (!mounted) return
        setData(res as ServerDetail)
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'Failed to load server')
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    if (serverId) load()
    return () => { mounted = false }
  }, [serverId])

  const handleRefresh = async () => {
    if (!data?.origin) {
      toast.error('Missing server origin')
      return
    }
    try {
      setReindexing(true)
      const res = await mcpDataApi.runIndex(data.origin)
      if ('ok' in res && (res as { ok?: boolean }).ok) {
        toast.success('Re-index triggered')
      } else if ('error' in res && typeof (res as { error?: string }).error === 'string') {
        toast.error(String((res as { error?: string }).error))
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to trigger re-index')
    } finally {
      setReindexing(false)
    }
  }

  const proxyUrl = useMemo(() => {
    if (!data?.origin) return ""
    try {
      return urlUtils.getMcpUrl(data.origin)
    } catch {
      return ""
    }
  }, [data?.origin])

  const openToolModal = (tool: Record<string, unknown>) => {
    const normalized: ToolFromMcpServerWithStats = {
      id: String(tool.id ?? tool.name ?? 'tool'),
      name: String(tool.name ?? 'tool'),
      description: String((tool as { description?: string })?.description ?? ''),
      inputSchema: ((tool as { inputSchema?: unknown })?.inputSchema ?? (tool as { parameters?: { jsonSchema?: unknown } })?.parameters?.jsonSchema ?? {}) as unknown as ReturnType<typeof JSON.parse>,
      pricing: Array.isArray((tool as { pricing?: unknown })?.pricing) ? (tool as { pricing?: unknown[] }).pricing as unknown[] as ToolFromMcpServerWithStats['pricing'] : undefined,
      isMonetized: Boolean((tool as { isMonetized?: boolean })?.isMonetized),
    }
    setSelectedTool(normalized)
    setShowToolModal(true)
  }

  function InstallationSidebar() {
    if (!data) return null
    
    const server = {
      id: data.serverId,
      displayName: data.info?.name || data.origin,
      baseUrl: proxyUrl || data.origin,
      oauthSupported: true
    }
    
    return (
      <ConnectPanel 
        server={server}
        initialAuthMode="oauth"
      />
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading server...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center py-16">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
            <h3 className="text-lg font-medium mb-2">Failed to load server</h3>
            <p className={isDark ? "text-gray-400" : "text-gray-600"}>{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => location.reload()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"}`}>
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">

            <div className="mb-2">
              <ServerHeader
                name={data.info?.name || data.origin}
                description={data.info?.description}
                onExplore={() => {
                  // Scroll to tools
                  const el = document.getElementById('tools-section')
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              />
            </div>


            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} mb-6`}>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-semibold">{data.summary.totalRequests.toLocaleString()}</div>
                  <div className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{data.summary.totalTools}</div>
                  <div className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>Tools</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{data.summary.totalPayments}</div>
                  <div className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>Payments</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>{formatRelative(data.summary.lastActivity)}</span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">{formatDate(data.summary.lastActivity)}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className={`text-[10px] ${isDark ? "text-gray-400" : "text-gray-600"}`}>Last Activity</div>
              </div>
            </div>

            <div className="mb-6">
              <AboutSection text={data.info?.description || ''} />
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <Card id="tools-section" className={`lg:col-span-2 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Tools ({data.summary.totalTools})</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsToolsCardExpanded(!isToolsCardExpanded)}
                      className="h-8 w-8 p-0"
                    >
                      {isToolsCardExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                {isToolsCardExpanded && (
                  <CardContent>
                    {(() => {
                      const allTools = (data.tools || []).map((t, idx) => ({
                        id: (t?.id as string) || (t?.name as string) || `tool-${idx}`,
                        name: (t?.name as string) || `tool-${idx}`,
                        description: (t?.description as string) || '',
                        inputSchema: ((t as { inputSchema?: unknown; parameters?: { jsonSchema?: unknown } })?.inputSchema || (t as { parameters?: { jsonSchema?: unknown } })?.parameters?.jsonSchema || {}) as Record<string, unknown>,
                        pricing: Array.isArray((t as { pricing?: unknown[] })?.pricing) ? (t as { pricing?: unknown[] }).pricing as Array<{ label?: string; amount?: number; currency?: string; active?: boolean }> : [],
                        isMonetized: Array.isArray((t as { pricing?: Array<{ active?: boolean }> })?.pricing) && ((t as { pricing?: Array<{ active?: boolean }> }).pricing || []).some((p) => p?.active === true),
                      }))
                      
                      const toolsToShow = showAllTools ? allTools : allTools.slice(0, 5)
                      const hasMoreTools = allTools.length > 5
                      
                      return (
                        <div>
                          <ToolsAccordion
                            tools={toolsToShow}
                            onTry={(tool) => openToolModal(tool as unknown as Record<string, unknown>)}
                          />
                          {hasMoreTools && !showAllTools && (
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllTools(true)}
                                className="text-xs"
                              >
                                Show {allTools.length - 5} more tools
                              </Button>
                            </div>
                          )}
                          {hasMoreTools && showAllTools && (
                            <div className="mt-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllTools(false)}
                                className="text-xs"
                              >
                                Show less
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </CardContent>
                )}
              </Card>

              <div className="lg:col-span-1 space-y-4">
                <InstallationSidebar />
                <ServerDetailsCard
                  details={{
                    deploymentRef: data.indexedAt ? `indexed ${formatRelative(data.indexedAt)}` : undefined,
                    license: (data as unknown as { info?: { license?: string } })?.info?.license,
                    isLocal: /localhost|127\.0\.0\.1/.test(data.origin),
                    publishedAt: (data as unknown as { info?: { publishedAt?: string } })?.info?.publishedAt,
                    repo: (data as unknown as { info?: { repo?: string } })?.info?.repo,
                    homepage: (data as unknown as { info?: { homepage?: string } })?.info?.homepage,
                  }}
                  onRefresh={handleRefresh}
                  isRefreshing={reindexing}
                />
              </div>
            </div>

            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} mt-6 overflow-hidden`}>
              <CardHeader>
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-teal-500"></div>
                    Recent Payments
                    {data.recentPayments && data.recentPayments.length > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full">
                        {data.recentPayments.length}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Latest payment transactions from tool usage with verified token information
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-0">
                            <TableHead className="w-[50px] pl-6 pr-2">Status</TableHead>
                            <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Date</TableHead>
                            <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Amount</TableHead>
                            <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-left whitespace-nowrap bg-muted/30">Network</TableHead>
                            <TableHead className="px-4 sm:px-6 py-4 text-xs font-medium uppercase tracking-wide text-muted-foreground text-right whitespace-nowrap bg-muted/30 pr-6">Transaction</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i} className="hover:bg-muted/30 transition-all duration-200">
                              <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                              </TableCell>
                              <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                                <div className="space-y-2">
                                  <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                                  <div className="h-3 w-20 bg-muted animate-pulse rounded"></div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                                <div className="flex items-center gap-3">
                                  <div className="h-5 w-5 rounded-full bg-muted animate-pulse"></div>
                                  <div className="space-y-1">
                                    <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                                    <div className="h-3 w-8 bg-muted animate-pulse rounded"></div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-muted animate-pulse"></div>
                                  <div className="h-6 w-16 bg-muted animate-pulse rounded-full"></div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 sm:px-6 py-4 border-b border-border/50 align-middle text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
                                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse"></div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (() => {
                  // Aligned with minimal-explorer.tsx
                  const th = "px-1 sm:px-2 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap"
                  const td = "px-1 sm:px-2 py-3.5 border-t border-border align-middle"

                  const onCopy = async (text?: string, message = "Copied") => {
                    if (!text) return
                    try {
                      await navigator.clipboard.writeText(text)
                      toast.success(message)
                    } catch {
                      toast.error("Could not copy")
                    }
                  }

                  return (
                    <div className="overflow-x-auto">
                      <div className="min-w-[800px]">
                        <Table>
                          {(data.recentPayments && data.recentPayments.length > 0) && (
                            <TableHeader>
                              <TableRow className="border-b border-border">
                                <TableHead className="w-[40px] pr-1 sr-only">Status</TableHead>
                                <TableHead className={`${th} font-mono`}>Method</TableHead>
                                <TableHead className={`${th} font-mono`}>Amount</TableHead>
                                <TableHead className={`${th} font-mono`}>Network</TableHead>
                                <TableHead className={`${th} font-mono`}>Date</TableHead>
                                <TableHead className={`${th} font-mono text-right`}></TableHead>
                              </TableRow>
                            </TableHeader>
                          )}
                          <TableBody>
                            {(data.recentPayments || []).map((p) => {
                              const txUrl = safeTxUrl(p.network, p.transactionHash)
                              const fullDate = formatDate(p.createdAt)
                              const rel = formatRelativeShort(p.createdAt)

                              return (
                                <TableRow key={p.id} className="hover:bg-muted/40">
                                  {/* Status indicator */}
                                  <TableCell className={`${td} w-[40px] pr-1`}>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div
                                            className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300"
                                            aria-label={p.status}
                                          >
                                            <CheckCircle2 className="h-4 w-4" />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>{p.status === 'completed' ? 'Success' : p.status === 'failed' ? 'Failed' : 'Pending'}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Method */}
                                  <TableCell className={`${td}`}>
                                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">
                                      tool_call
                                    </span>
                                  </TableCell>

                                  {/* Amount */}
                                  <TableCell className={`${td} font-mono`}>
                                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                                      {p.currency && <TokenIcon currencyOrAddress={p.currency} network={p.network} size={16} />}
                                      <span className="text-foreground">{p.amountFormatted || '—'}</span>
                                    </div>
                                  </TableCell>

                                  {/* Network */}
                                  <TableCell className={`${td} font-mono text-xs sm:text-sm text-muted-foreground`}>
                                    <span className="font-mono text-sm border border-foreground-muted px-2 py-0.5 rounded text-foreground-muted">
                                      {p.network || 'Unknown'}
                                    </span>
                                  </TableCell>

                                  {/* Date */}
                                  <TableCell className={`${td} text-[0.95rem] sm:text-sm text-muted-foreground pr-1`}>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger className="cursor-default">
                                          {rel}
                                        </TooltipTrigger>
                                        <TooltipContent>{fullDate}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>

                                  {/* Transaction */}
                                  <TableCell className={`${td} text-right`}>
                                    {p.transactionHash ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              asChild
                                              size="icon"
                                              variant="ghost"
                                              className="group h-7 w-7 rounded-sm"
                                            >
                                              <a
                                                href={txUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <ArrowUpRight className="size-5 stroke-[2] text-muted-foreground/80 group-hover:text-foreground transition-all duration-300" />
                                              </a>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>View Transaction</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}

                            {(!data.recentPayments || data.recentPayments.length === 0) && (
                              <TableRow>
                                <TableCell colSpan={7} className="px-6 py-12 text-center">
                                  <div className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                    <p className="text-sm">No recent payments</p>
                                    <p className="text-xs mt-1">Payments will appear here once tools are used with monetization enabled</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
      
      {/* Bottom spacing */}
      <div className="h-16"></div>
      {showToolModal && selectedTool && (
        <ToolExecutionModal
          isOpen={showToolModal}
          onClose={() => { setShowToolModal(false); setSelectedTool(null) }}
          tool={selectedTool}
          serverId={data.serverId}
          url={data.originRaw}
        />
      )}
    </div>
  )
}