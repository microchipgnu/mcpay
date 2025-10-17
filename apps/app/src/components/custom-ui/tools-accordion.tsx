"use client"

import { useMemo, useState } from "react"
import { useTheme } from "@/components/providers/theme-context"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TokenIcon } from "@/components/custom-ui/token-icon"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Copy, ChevronDown, ChevronRight } from "lucide-react"
import { toast } from "sonner"

export type ToolListItem = {
  id: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  pricing?: Array<{ label?: string; amount?: number; currency?: string; active?: boolean }>
  isMonetized?: boolean
  // X402 payment annotations
  paymentHint?: boolean
  paymentPriceUSD?: number
  paymentNetworks?: Array<{
    network: string
    recipient: string
    maxAmountRequired: string
    asset: { address: string; symbol?: string; decimals?: number }
    type: 'evm' | 'svm'
  }>
  paymentVersion?: number
}

type ToolsAccordionProps = {
  tools: ToolListItem[]
  onTry: (tool: ToolListItem) => void
}

export function ToolsAccordion({ tools, onTry }: ToolsAccordionProps) {
  const { isDark } = useTheme()
  const [query, setQuery] = useState("")
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set())
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tools
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    )
  }, [query, tools])

  return (
    <div>
      <div className="mb-3">
        <Input
          placeholder="Search tools"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={isDark ? "bg-gray-800 border-gray-700" : ""}
        />
      </div>
      <Accordion type="single" collapsible>
        {filtered.map((t) => (
          <AccordionItem key={t.id} value={t.id}>
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="w-full flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  {!!t.description && (
                    <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {(() => {
                        const isExpanded = expandedDescriptions.has(t.id)
                        const maxLength = 120
                        const shouldTruncate = t.description.length > maxLength
                        
                        if (!shouldTruncate || isExpanded) {
                          return t.description
                        }
                        
                        return t.description.slice(0, maxLength) + "…"
                      })()}
                      {t.description.length > 120 && (
                        <div className="mt-1">
                          <Button 
                            variant="link" 
                            className="px-0 text-xs" 
                            onClick={(e) => {
                              e.stopPropagation()
                              const newExpanded = new Set(expandedDescriptions)
                              if (expandedDescriptions.has(t.id)) {
                                newExpanded.delete(t.id)
                              } else {
                                newExpanded.add(t.id)
                              }
                              setExpandedDescriptions(newExpanded)
                            }}
                          >
                            {expandedDescriptions.has(t.id) ? "View less" : "View more"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {t.paymentHint && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400 dark:bg-teal-800/50 dark:border-teal-800/50">
                        ${t.paymentPriceUSD || 'Paid'}
                      </Badge>
                      {t.paymentNetworks && t.paymentNetworks.length > 0 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-5 cursor-help">
                                Multiple
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs text-muted-foreground">
                                {t.paymentNetworks.map(n => n.network).join(', ')}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                  {t.isMonetized && !t.paymentHint && <Badge variant="outline" className="text-xs">Paid</Badge>}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation()
                      onTry(t)
                    }} 
                    className="text-xs ml-2"
                  >
                    Try
                  </Button>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="text-xs font-medium text-foreground">Input Properties</div>
                <div className="rounded-md border bg-muted/30 border-border p-3">
                  {t.inputSchema && typeof t.inputSchema === 'object' && t.inputSchema.properties ? (
                    <div className="space-y-2">
                      {Object.entries(t.inputSchema.properties).map(([key, value]: [string, Record<string, unknown>]) => (
                        <div key={key} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-foreground">{key}</span>
                            {Array.isArray(t.inputSchema?.required) && t.inputSchema.required.includes(key) && (
                              <span className="text-[10px] text-red-500">*</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string') ? value.type : 'any'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No parameters</div>
                  )}
                </div>
              </div>
              {/* Payment Information */}
              {t.paymentHint && t.paymentNetworks && t.paymentNetworks.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-foreground">Payment Networks</div>
                  <div className="p-3 rounded-md border bg-muted/30 border-border">
                    <div className="text-xs font-medium text-foreground mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-4">
                          {t.paymentNetworks.length} network{t.paymentNetworks.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Version: {t.paymentVersion || 'N/A'}
                      </div>
                    </div>
                  
                  {/* Payment Summary */}
                  <div className="mb-3 p-2 rounded border bg-blue-500/10 border-blue-500/20">
                    <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">Payment Summary</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 space-y-0.5">
                      <div>USD Price: ${t.paymentPriceUSD || 'N/A'}</div>
                      <div>Networks: {t.paymentNetworks.map(n => n.network).join(', ')}</div>
                      <div>Types: {[...new Set(t.paymentNetworks.map(n => n.type))].join(', ').toUpperCase()}</div>
                      <div>Tokens: {[...new Set(t.paymentNetworks.map(n => n.asset.symbol || 'Unknown'))].join(', ')}</div>
                    </div>
                  </div>

                  {/* Collapsible Network Details */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newExpanded = new Set(expandedPayments)
                        if (newExpanded.has(t.id)) {
                          newExpanded.delete(t.id)
                        } else {
                          newExpanded.add(t.id)
                        }
                        setExpandedPayments(newExpanded)
                      }}
                      className="w-full justify-between p-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span>Network Details</span>
                      {expandedPayments.has(t.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    
                    {expandedPayments.has(t.id) && (
                      <div className="space-y-3">
                        {t.paymentNetworks.map((network, idx) => {
                          const amount = network.maxAmountRequired;
                          const symbol = network.asset.symbol || 'tokens';
                          const decimals = network.asset.decimals || 6;
                          const formattedAmount = (Number(amount) / Math.pow(10, decimals)).toFixed(decimals);
                          
                          return (
                            <div key={idx} className="p-2 rounded border bg-background border-border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] px-1.5 py-0.5 h-4 ${
                                      network.type === 'evm' 
                                        ? "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:bg-purple-800/50 dark:border-purple-800/50"
                                        : "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400 dark:bg-orange-800/50 dark:border-orange-800/50"
                                    }`}
                                  >
                                    {network.type.toUpperCase()}
                                  </Badge>
                                  <span className="font-mono text-xs text-foreground">
                                    {network.network}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TokenIcon 
                                    currencyOrAddress={network.asset.address} 
                                    network={network.network} 
                                    size={14} 
                                  />
                                  <span className="font-mono text-xs text-foreground">
                                    {formattedAmount} {symbol}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    To: {network.recipient.slice(0, 8)}...{network.recipient.slice(-6)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      navigator.clipboard.writeText(network.recipient)
                                      toast.success('Recipient address copied')
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    Asset: {network.asset.address.slice(0, 8)}...{network.asset.address.slice(-6)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      navigator.clipboard.writeText(network.asset.address)
                                      toast.success('Asset address copied')
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Atomic: {network.maxAmountRequired} units
                                </div>
                                {network.asset.decimals && (
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    Decimals: {network.asset.decimals}
                                  </div>
                                )}
                                {t.paymentPriceUSD && (
                                  <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                                    USD: ${t.paymentPriceUSD}
                                  </div>
                                )}
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Formatted: {formattedAmount} {symbol}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                  {Array.isArray(t.pricing) && t.pricing.length > 0 && (
                    <span>
                      Pricing: {t.pricing.filter(p => p.active !== false).map((p) => `${p.label || "tier"}${p.amount ? ` - ${p.amount} ${p.currency || "USD"}` : ""}`).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
        {filtered.length === 0 && (
          <div className={`text-sm px-3 py-6 text-center ${isDark ? "text-gray-400" : "text-gray-600"}`}>No tools found</div>
        )}
      </Accordion>
    </div>
  )
}

export default ToolsAccordion


