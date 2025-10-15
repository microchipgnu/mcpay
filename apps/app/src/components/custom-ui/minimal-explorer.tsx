"use client"

import { TokenIcon } from "@/components/custom-ui/token-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { mcpDataApi } from "@/lib/client/utils"
import { isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import { ArrowUpRight, CheckCircle2 } from "lucide-react"
import { easeOut } from "motion"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

/* ---------------- Types used by UI ---------------- */
type PaymentStatus = "success" | "pending" | "failed"
type ExplorerRow = {
  id: string
  status: PaymentStatus
  serverId?: string
  serverName?: string
  tool?: string
  amountFormatted: string
  currency?: string
  network: string
  user: string
  timestamp: string
  txHash: string
}

/* Only 5 rows for landing page */
const LIMIT = 5

/* ---------------- Helpers ---------------- */
/* relative time with short units (secs, mins, hrs, days…) */
function formatRelativeShort(iso: string, now = Date.now()) {
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

function safeTxUrl(network: string, hash: string) {
  if (isNetworkSupported(network)) {
    return getExplorerUrl(hash, network as UnifiedNetwork, 'tx')
  }
  return `https://etherscan.io/tx/${hash}`
}

export default function MinimalExplorer() {
  const [rows, setRows] = useState<ExplorerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prefersReduced = useReducedMotion()

  const stats = {
    activeServers: 100,
    totalTools: 2000,
    totalRequests: 2300,
  }

  /* fetch latest 5 transactions */
  useEffect(() => {
    let alive = true
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const { stats } = await mcpDataApi.getExplorer(LIMIT, 0)
        const mapped = stats
          .map((s) => {
            const pr = s.payment?.metadata?.paymentResponse as
              | { payer?: string; network?: string; success?: boolean; transaction?: string }
              | undefined
            const preq = s.payment?.metadata?.paymentRequest as
              | { network?: string; payload?: { authorization?: { value?: string } } }
              | undefined

            // Prefer response if exists, otherwise use request to render pending
            const network = (pr?.network || preq?.network || '-') as string
            const txHash = pr?.transaction || ''
            const status: PaymentStatus = pr
              ? (pr.success ? 'success' : 'failed')
              : (s.payment?.paymentRequested ? 'pending' : 'failed')

            return {
              id: s.id,
              status,
              serverId: s.serverId,
              serverName: s.serverName,
              tool: s.method,
              amountFormatted: (() => {
                // 6 decimals: value is a stringified integer, e.g., "100000" => "0.1"
                const raw = preq?.payload?.authorization?.value
                if (!raw || isNaN(Number(raw))) return ''
                // Always divide by 1e6 and show up to 6 decimals (remove trailing zeros)
                return (Number(raw) / 1e6).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 6,
                })
              })(),
              currency: pr ? "USDC" : undefined,
              network,
              user: pr?.payer || '',
              timestamp: s.ts,
              txHash,
            } as ExplorerRow
          })
          .filter(Boolean) as ExplorerRow[]

        if (!alive) return
        setRows(mapped)
      } catch (e) {
        if (!alive) return
        setError(e instanceof Error ? e.message : "Failed to load data")
        setRows([])
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [])

  /* Header/cell padding matching original explorer */
  const th = "px-2 sm:px-3 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap"
  const td = "px-2 sm:px-3 py-3.5 border-t border-border align-middle"

  // Motion variants for stats
  const fadeUp: Variants = useMemo(
    () => ({
      hidden: { opacity: 0, y: prefersReduced ? 0 : 8 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: prefersReduced ? 0 : 0.4, ease: easeOut },
      },
    }),
    [prefersReduced]
  )

  const container: Variants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: prefersReduced ? 0 : 0.06,
        },
      },
    }),
    [prefersReduced]
  )

  const isStatsLoading = false

  const Stat = ({
    label,
    value,
    loading,
  }: {
    label: string
    value: string | number | null
    loading?: boolean
  }) => (
    <motion.div variants={fadeUp} layout>
      <Card className="border bg-background rounded-md p-0 gap-0">
        <CardContent className="px-6 py-6">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {label}
          </div>
          <AnimatePresence initial={false} mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0, y: prefersReduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: prefersReduced ? 0 : -4 }}
                transition={{ duration: prefersReduced ? 0 : 0.2, ease: easeOut }}
                layout
              >
                <Skeleton className="h-7 w-16" />
              </motion.div>
            ) : (
              <motion.div
                key="value"
                initial={{
                  opacity: 0,
                  y: prefersReduced ? 0 : 4,
                  filter: "blur(6px)",
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  y: prefersReduced ? 0 : -4,
                  filter: "blur(6px)",
                }}
                transition={{ duration: prefersReduced ? 0 : 0.25, ease: easeOut }}
                layout
              >
                <div className="text-2xl font-medium font-mono tracking-tight">
                  {value ?? "—"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )

  if (error) {
    return (
      <div className="max-w-6xl px-4 md:px-6 mx-auto">
        <h2 className="text-3xl font-semibold font-host mb-6">Recent Transactions</h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Unable to load recent transactions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl px-4 md:px-6 mx-auto">
      <h2 className="text-3xl font-semibold font-host mb-10">Stats & Latest Transactions</h2>
      
      {/* <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <Stat label="Live Servers" value={stats.activeServers ?? 0} loading={isStatsLoading} />
        <Stat label="Tools" value={stats.totalTools ?? 0} loading={isStatsLoading} />
        <Stat label="Transactions" value={stats.totalRequests ?? 0} loading={isStatsLoading} />
      </motion.div> */}

      {/* Responsive table container with tighter spacing */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="w-[40px] pr-1 sr-only">Status</TableHead>
                <TableHead className={`${th} font-mono`}>Server</TableHead>
                <TableHead className={`${th} font-mono`}>Method</TableHead>
                <TableHead className={`${th} font-mono`}>Amount</TableHead>
                <TableHead className={`${th} font-mono`}>Network</TableHead>
                <TableHead className={`${th} font-mono`}>Date</TableHead>
                    <TableHead className={`${th} font-mono text-right`}></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading
                ? Array.from({ length: LIMIT }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    {[...Array(7)].map((__, j) => (
                      <TableCell key={j} className={td}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
                : rows.map((r) => {
                  const txUrl = safeTxUrl(r.network, r.txHash)
                  const fullDate = new Date(r.timestamp).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  const rel = formatRelativeShort(r.timestamp)

                  return (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      {/* Status indicator */}
                      <TableCell className={`${td} w-[40px] pr-1`}>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300"
                                aria-label={r.status}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>{r.status === 'success' ? 'Success' : r.status === 'pending' ? 'Pending' : 'Failed'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Server */}
                      <TableCell className={`${td}`}>
                        {r.serverName && r.serverId ? (
                          <Link
                            href={`/servers/${r.serverId}`}
                            className="text-[0.95rem] text-foreground/80 hover:text-teal-600 hover:underline hover:decoration-dotted underline-offset-2 whitespace-nowrap transition-all duration-300"
                          >
                            {r.serverName}
                          </Link>
                        ) : (
                          <span className="text-[0.95rem] text-muted-foreground italic">Unknown</span>
                        )}
                      </TableCell>

                      {/* Tool */}
                      <TableCell className={`${td}`}>
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">
                          {r.tool}
                        </span>
                      </TableCell>

                      {/* Amount + currency with token icon */}
                      <TableCell className={`${td} font-mono`}>
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          {r.currency && <TokenIcon currencyOrAddress={r.currency} network={r.network} size={16} />}
                          <span className="text-foreground">{r.amountFormatted}</span>
                        </div>
                      </TableCell>

                      {/* Network */}
                      <TableCell className={`${td} font-mono text-xs sm:text-sm text-muted-foreground`}>
                        <span className="font-mono text-sm border border-foreground-muted px-2 py-0.5 rounded text-foreground-muted">
                          {r.network}
                        </span>
                      </TableCell>

                      {/* Date: relative, tooltip shows full */}
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

                      {/* Transaction: only show button if transaction hash exists */}
                      <TableCell className={`${td} text-right`}>
                        {r.txHash ? (
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
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="text-center mt-6">
        <Link href="/explorer">
          <Button variant="ghostCustom" className="min-w-[240px]">
            EXPLORER
          </Button>
        </Link>
      </div>
    </div>
  )
}
