"use client"

import { ConnectPanel } from "@/components/custom-ui/connect-panel"
import { TransactionLink } from "@/components/custom-ui/explorer-link"
import { ToolExecutionModal } from "@/components/custom-ui/tool-execution-modal"
import { useTheme } from "@/components/providers/theme-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ServerHeader } from "@/components/custom-ui/server-header"
import { AboutSection } from "@/components/custom-ui/about-section"
import { ToolsAccordion, type ToolListItem } from "@/components/custom-ui/tools-accordion"
import { ServerDetailsCard } from "@/components/custom-ui/server-details-card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { mcpDataApi, urlUtils } from "@/lib/client/utils"
import type { Network } from "@/types/blockchain"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Hammer,
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
  recentPayments: Array<{ id: string; createdAt: string; status: 'completed' | 'failed'; network?: string; transactionHash?: string }>
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

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const color = status === 'ok' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-gray-400'
  const text = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {text}
    </span>
  )
}

function Sparkline({ values, width = 96, height = 28, stroke = '#60a5fa' }: { values: number[]; width?: number; height?: number; stroke?: string }) {
  const pts = values.length ? values : [0]
  const max = Math.max(...pts)
  const min = Math.min(...pts)
  const range = Math.max(1, max - min)
  const step = pts.length > 1 ? width / (pts.length - 1) : width
  const d = pts
    .map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-80">
      <path d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
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
  const [selectedTool, setSelectedTool] = useState<Record<string, unknown> | null>(null)

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
      if ((res as any)?.ok) {
        toast.success('Re-index triggered')
      } else if ((res as any)?.error) {
        toast.error(String((res as any).error))
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
    setSelectedTool(tool)
    setShowToolModal(true)
  }

  function InstallationSidebar() {
    return (
      <ConnectPanel url={proxyUrl} originRaw={data?.originRaw} />
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-2">
          <ServerHeader
            name={data.info?.name || data.origin}
            description={data.info?.description}
            totalTools={data.summary.totalTools}
            isRemote={!/localhost|127\.0\.0\.1/.test(data.origin)}
            hasRepo={Boolean((data as any)?.info?.repo)}
            onExplore={() => {
              // Scroll to tools
              const el = document.getElementById('tools-section')
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />
        </div>

        <div className="flex items-center gap-2 mb-6">
          <StatusBadge status={data.status} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={reindexing}>
                  {reindexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Trigger a fresh re-index in the background</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Requests</p>
                  <div className="text-base font-bold mt-0.5">{data.summary.totalRequests.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkline values={(data.dailyAnalytics || []).slice(0, 14).reverse().map(d => d.totalRequests)} />
                  <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Tools</p>
                  <div className="text-base font-bold mt-0.5">{data.summary.totalTools}</div>
                </div>
                <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Hammer className="h-3.5 w-3.5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Payments</p>
                  <div className="text-base font-bold mt-0.5">{data.summary.totalPayments}</div>
                </div>
                <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Last Activity</p>
                  <div className="text-base font-bold mt-0.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatRelative(data.summary.lastActivity)}</span>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{formatDate(data.summary.lastActivity)}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Clock className="h-3.5 w-3.5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <AboutSection text={data.info?.description || ''} />
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <Card id="tools-section" className={`lg:col-span-2 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
            <CardHeader>
              <CardTitle className="text-base">Tools ({data.summary.totalTools})</CardTitle>
              <CardDescription>From last inspection</CardDescription>
            </CardHeader>
            <CardContent>
              <ToolsAccordion
                tools={(data.tools || []).map((t, idx) => ({
                  id: (t?.id as string) || (t?.name as string) || `tool-${idx}`,
                  name: (t?.name as string) || `tool-${idx}`,
                  description: (t?.description as string) || '',
                  inputSchema: (t as any)?.inputSchema || (t as any)?.parameters?.jsonSchema || {},
                  pricing: (t as any)?.pricing || [],
                  isMonetized: Array.isArray((t as any)?.pricing) && ((t as any).pricing as any[]).some((p: any) => p?.active === true),
                }))}
                onTry={(tool) => openToolModal(tool as unknown as Record<string, unknown>)}
              />
            </CardContent>
          </Card>

          <div className="lg:col-span-1 space-y-4">
            <InstallationSidebar />
            <ServerDetailsCard
              details={{
                deploymentRef: data.indexedAt ? `indexed ${formatRelative(data.indexedAt)}` : undefined,
                license: (data as any)?.info?.license,
                isLocal: /localhost|127\.0\.0\.1/.test(data.origin),
                publishedAt: (data as any)?.info?.publishedAt,
                repo: (data as any)?.info?.repo,
                homepage: (data as any)?.info?.homepage,
              }}
            />
          </div>
        </div>

        <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} mt-6`}>
          <CardHeader>
            <CardTitle className="text-base">Recent Payments</CardTitle>
            <CardDescription>Latest payment transactions from tool usage with verified token information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data.recentPayments || []).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${p.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                          {p.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {p.status}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(p.createdAt)}</TableCell>
                      <TableCell className="text-sm">{p.network || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {p.transactionHash && p.network ? (
                          <TransactionLink txHash={p.transactionHash} network={p.network as Network} variant="button" showCopyButton={true} className="text-xs" />
                        ) : (
                          <span className="font-mono break-all">{p.transactionHash || '-'}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data.recentPayments || data.recentPayments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <span className={isDark ? "text-gray-400" : "text-gray-600"}>No recent payments</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {showToolModal && selectedTool && (
        <ToolExecutionModal
          isOpen={showToolModal}
          onClose={() => { setShowToolModal(false); setSelectedTool(null) }}
          tool={selectedTool as any}
          serverId={data.serverId}
          url={data.originRaw}
        />
      )}
    </div>
  )
}