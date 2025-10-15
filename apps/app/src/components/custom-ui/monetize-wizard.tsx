"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertCircle, Eye, EyeOff, FlaskConical, Loader2, Trash2, Wallet as WalletIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { SupportedEVMNetworks, SupportedSVMNetworks } from "x402/types"

export type MCPToolLite = { name: string; description?: string }

export type MonetizeWizardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serverUrl: string
  tools: MCPToolLite[]
  onCreate: (payload: {
    prices: Record<string, number>
    evmRecipientAddress?: string
    svmRecipientAddress?: string
    networks: string[]
    requireAuth: boolean
    authHeaders: Record<string, string>
    testnet: boolean
  }) => Promise<void>
}

export function MonetizeWizard({ open, onOpenChange, serverUrl, tools, onCreate }: MonetizeWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [isMobile, setIsMobile] = useState(false)
  const [loading, setLoading] = useState(false)

  const [priceByTool, setPriceByTool] = useState<Record<string, number>>(() => Object.fromEntries((tools || []).map(t => [t.name, 0.01])))
  const [evmRecipientAddress, setEvmRecipientAddress] = useState<string>("")
  const [svmRecipientAddress, setSvmRecipientAddress] = useState<string>("")
  const [recipientIsTestnet, setRecipientIsTestnet] = useState(false)
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [requireAuth, setRequireAuth] = useState(false)
  const [authHeaders, setAuthHeaders] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }])
  const [showValues, setShowValues] = useState(true)
  const [bulkHeadersText, setBulkHeadersText] = useState("")
  const [toolsSearch, setToolsSearch] = useState("")
  const [bulkPriceInput, setBulkPriceInput] = useState<string>("")

  useEffect(() => {
    const fn = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768)
    fn();
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0.01])))
  }, [tools])

  const pricesValid = tools.length > 0 && tools.every(t => (priceByTool[t.name] ?? 0) > 0)
  const authHeadersValid = !requireAuth || authHeaders.every(h => (h.key || '').trim() && (h.value || '').trim())

  const filteredTools = useMemo(() => {
    const q = (toolsSearch || "").toLowerCase().trim()
    if (!q) return tools
    return tools.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q)
    )
  }, [tools, toolsSearch])

  const isTestnetNetworkName = (n: string) => /sepolia|devnet|testnet|fuji|holesky|goerli|amoy|mumbai/i.test(n)
  const evmNetworks = SupportedEVMNetworks
  const svmNetworks = SupportedSVMNetworks
  const visibleEvmNetworks = recipientIsTestnet ? evmNetworks.filter(isTestnetNetworkName) : evmNetworks.filter(n => !isTestnetNetworkName(n))
  const visibleSvmNetworks = recipientIsTestnet ? svmNetworks.filter(isTestnetNetworkName) : svmNetworks.filter(n => !isTestnetNetworkName(n))

  const toggleNetwork = (n: string) => {
    setSelectedNetworks(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])
  }

  const selectAllVisible = () => {
    const all = [...visibleEvmNetworks, ...visibleSvmNetworks]
    setSelectedNetworks(all)
  }

  const clearNetworks = () => setSelectedNetworks([])

  useEffect(() => {
    setSelectedNetworks(prev => prev.filter(n => recipientIsTestnet ? isTestnetNetworkName(n) : !isTestnetNetworkName(n)))
  }, [recipientIsTestnet])

  const needsEvm = useMemo(() => selectedNetworks.some(n => evmNetworks.includes(n as typeof evmNetworks[number])), [selectedNetworks, evmNetworks])
  const needsSvm = useMemo(() => selectedNetworks.some(n => svmNetworks.includes(n as typeof svmNetworks[number])), [selectedNetworks, svmNetworks])
  const evmValid = !needsEvm || /^0x[a-fA-F0-9]{40}$/.test((evmRecipientAddress || '').trim())
  const svmValid = !needsSvm || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test((svmRecipientAddress || '').trim())

  const totalSteps = 5
  const currentLabel = step === 1 ? 'Tools' : step === 2 ? 'Pricing' : step === 3 ? 'Auth' : step === 4 ? 'Networks' : 'Addresses'
  const progressPercent = Math.round(((Number(step) - 1) / (totalSteps - 1)) * 100)
  const stepDescription = useMemo(() => {
    switch (step) {
      case 1: return 'Review detected tools and proceed to set pricing.'
      case 2: return 'Set pricing for each tool (e.g., $0.01).'
      case 3: return 'Configure upstream auth headers (optional).'
      case 4: return 'Choose networks.'
      case 5: return needsEvm && needsSvm ? 'Enter EVM and SVM recipient addresses.' : needsEvm ? 'Enter EVM recipient address.' : 'Enter SVM recipient address.'
      default: return ''
    }
  }, [step, needsEvm, needsSvm])

  const Content = (
    <div className={`flex ${isMobile ? 'h-full' : 'h-[560px]'} flex-col`}>
      <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
        {step === 1 && (
          <div className="space-y-3 flex flex-col min-h-0">
            <div className="flex items-center gap-3">
              <div className="ml-auto relative">
                <Input value={toolsSearch} onChange={(e) => setToolsSearch(e.target.value)} placeholder="Search tools" className="w-56 pl-3 bg-background border-border" />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-background p-3">
              {tools.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tools detected.</div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground mb-2">Showing {filteredTools.length} of {tools.length}</div>
                  <ul className="space-y-2">
                    {filteredTools.map((t) => (
                      <li key={t.name} className="flex items-start justify-between gap-4 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{t.name}</div>
                          {t.description && (<div className="text-xs text-muted-foreground truncate">{t.description}</div>)}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded font-mono border text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50">tool</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 flex flex-col min-h-0">
            <div className="text-sm flex items-center gap-2">
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.001"
                min="0"
                value={bulkPriceInput}
                onChange={(e) => setBulkPriceInput(e.target.value)}
                placeholder="Set all to…"
                className="w-40 bg-background border-border"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => {
                const v = Number(bulkPriceInput)
                if (!isFinite(v) || v <= 0) { toast.error('Enter a positive number'); return }
                setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, v])))
              }}>Apply</Button>
              <div className="ml-1 flex items-center gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0.01])))}>$0.01</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0.05])))}>$0.05</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setPriceByTool(Object.fromEntries((tools || []).map(t => [t.name, 0.10])))}>$0.10</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setBulkPriceInput("")}>Clear</Button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto border border-border rounded-md bg-background p-3">
              <div className="space-y-2 pr-1">
                {tools.map((t) => (
                  <div key={t.name} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{t.name}</div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={priceByTool[t.name] ?? 0}
                        onChange={(e) => setPriceByTool((prev) => ({ ...prev, [t.name]: Number(e.target.value) }))}
                        className="w-28 pl-4 bg-background border-border"
                        placeholder="0.01"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Checkbox id="require-auth2" checked={requireAuth} onCheckedChange={(v) => setRequireAuth(Boolean(v))} />
                <Label htmlFor="require-auth2" className="flex items-center gap-1">Require auth headers
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent align="start">Forward these headers to your upstream MCP server.</TooltipContent>
                  </Tooltip>
                </Label>
              </div>
              {requireAuth && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowValues((v) => !v)} className="shrink-0">
                  {showValues ? (<span className="inline-flex items-center gap-1"><EyeOff className="h-4 w-4" /> Hide values</span>) : (<span className="inline-flex items-center gap-1"><Eye className="h-4 w-4" /> Show values</span>)}
                </Button>
              )}
            </div>
            
            {!requireAuth && (
              <div className="border border-border rounded-md bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-800/50">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">No authentication required</h4>
                    <p className="text-xs text-muted-foreground">
                      Your MCP server doesn&apos;t require authentication headers. Our proxy server will forward requests directly to your upstream MCP server without any authentication.
                    </p>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">You can enable authentication later if your upstream server requires:</p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>API key validation</li>
                        <li>Bearer token authentication</li>
                        <li>Custom header forwarding</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {requireAuth && (
              <div className="space-y-4">
                <div className="border border-border rounded-md bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-800/50">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Authentication headers required</h4>
                      <p className="text-xs text-muted-foreground">
                        Configure headers that our proxy server will forward to your upstream MCP server for authentication.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Quick presets:</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAuthHeaders((prev) => [...prev, { key: 'Authorization', value: 'Bearer ' }])} className="text-xs">
                      Authorization: Bearer
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setAuthHeaders((prev) => [...prev, { key: 'x-api-key', value: '' }])} className="text-xs">
                      x-api-key
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="text-xs">Paste headers</Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[360px] max-w-[calc(100vw-6rem)]">
                        <div className="space-y-3">
                          <div className="text-xs text-muted-foreground">Paste lines like &quot;Key: Value&quot; or &quot;Key=Value&quot;.</div>
                          <Textarea 
                            value={bulkHeadersText} 
                            onChange={(e) => setBulkHeadersText(e.target.value)} 
                            placeholder={`Authorization: Bearer sk-xxxx\nx-api-key: abc123`} 
                            className="bg-background border-border text-xs" 
                          />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setBulkHeadersText("")} className="text-xs">Clear</Button>
                            <Button type="button" size="sm" onClick={() => {
                              const lines = (bulkHeadersText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                              const parsed: Array<{ key: string; value: string }> = []
                              for (const line of lines) {
                                const colon = line.indexOf(':')
                                const eq = line.indexOf('=')
                                const idx = colon >= 0 ? colon : eq
                                if (idx < 0) continue
                                const k = line.slice(0, idx).trim()
                                const v = line.slice(idx + 1).trim()
                                if (k) parsed.push({ key: k, value: v })
                              }
                              if (parsed.length > 0) {
                                setAuthHeaders(parsed)
                                setBulkHeadersText("")
                                toast.success('Parsed headers')
                              } else {
                                toast.error('No headers detected')
                              }
                            }} className="text-xs">Parse</Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">Configure headers:</div>
                    <div className="space-y-2">
                      {authHeaders.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2 min-w-0 p-2 rounded-md border border-border bg-background">
                          <Input
                            placeholder="Header name (e.g., Authorization)"
                            value={row.key}
                            onChange={(e) => setAuthHeaders((prev) => prev.map((r, i) => i === idx ? { ...r, key: e.target.value } : r))}
                            className="w-48 bg-background border-border text-xs"
                          />
                          <Input
                            placeholder="Header value"
                            type={showValues ? 'text' : 'password'}
                            value={row.value}
                            onChange={(e) => setAuthHeaders((prev) => prev.map((r, i) => i === idx ? { ...r, value: e.target.value } : r))}
                            className="flex-1 min-w-0 max-w-full bg-background border-border text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setAuthHeaders((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label="Remove header"
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAuthHeaders((prev) => [...prev, { key: '', value: '' }])}
                        className="text-xs"
                      >
                        Add header
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center rounded-md border p-0.5">
                <Button type="button" size="sm" variant={recipientIsTestnet ? 'ghost' : 'secondary'} onClick={() => setRecipientIsTestnet(false)} aria-pressed={!recipientIsTestnet}>Mainnet</Button>
                <Button type="button" size="sm" variant={recipientIsTestnet ? 'secondary' : 'ghost'} onClick={() => setRecipientIsTestnet(true)} aria-pressed={recipientIsTestnet} className="inline-flex items-center gap-1"><FlaskConical className="h-4 w-4" /> Testnet</Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>Select all</Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearNetworks}>Clear</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-border rounded-md bg-background p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">EVM</div>
                {visibleEvmNetworks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No EVM networks for this selection.</div>
                ) : (
                  <ul className="space-y-2">
                    {visibleEvmNetworks.map((n) => (
                      <li key={n} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedNetworks.includes(n)} onCheckedChange={() => toggleNetwork(n)} />
                          <span className="truncate text-foreground">{n}</span>
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono border ${isTestnetNetworkName(n)
                            ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50"
                            : "text-muted-foreground bg-muted border-border"
                          }`}>
                          {isTestnetNetworkName(n) ? "testnet" : "mainnet"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="border border-border rounded-md bg-background p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">SVM</div>
                {visibleSvmNetworks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No SVM networks for this selection.</div>
                ) : (
                  <ul className="space-y-2">
                    {visibleSvmNetworks.map((n) => (
                      <li key={n} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/40 transition-all duration-300">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={selectedNetworks.includes(n)} onCheckedChange={() => toggleNetwork(n)} />
                          <span className="truncate text-foreground">{n}</span>
                        </label>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono border ${isTestnetNetworkName(n)
                            ? "text-teal-700 bg-teal-500/10 border-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:border-teal-800/50"
                            : "text-muted-foreground bg-muted border-border"
                          }`}>
                          {isTestnetNetworkName(n) ? "testnet" : "mainnet"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            {needsEvm && (
              <div className="space-y-2">
                <Label htmlFor="recipient-evm" className="text-sm">EVM recipient address</Label>
                <div className="relative">
                  <WalletIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="recipient-evm" value={evmRecipientAddress} onChange={(e) => setEvmRecipientAddress(e.target.value)} placeholder={recipientIsTestnet ? '0x… (testnet)' : '0x… (mainnet)'} className="pl-8 bg-background border-border" />
                </div>
                {!evmValid ? (
                  <div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Enter a valid EVM address (0x…)</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Used for all selected EVM networks.</div>
                )}
              </div>
            )}
            {needsSvm && (
              <div className="space-y-2">
                <Label htmlFor="recipient-svm" className="text-sm">SVM recipient address</Label>
                <div className="relative">
                  <WalletIcon className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="recipient-svm" value={svmRecipientAddress} onChange={(e) => setSvmRecipientAddress(e.target.value)} placeholder={recipientIsTestnet ? 'Devnet address' : 'Mainnet address'} className="pl-8 bg-background border-border" />
                </div>
                {!svmValid ? (
                  <div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Enter a valid SVM address</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Used for all selected SVM networks.</div>
                )}
              </div>
            )}
            {!needsEvm && !needsSvm && (
              <div className="text-xs text-muted-foreground">No networks selected.</div>
            )}
          </div>
        )}
      </div>

      {/* Actions are rendered in DialogFooter/DrawerFooter */}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh] flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Monetize Server</DrawerTitle>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium">{currentLabel}</div>
                <div className="text-xs text-muted-foreground">Step {step} of {totalSteps}</div>
              </div>
              <div className="text-xs text-muted-foreground">{stepDescription}</div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-auto px-4">{Content}</div>
          <DrawerFooter>
            <div className="flex items-center justify-between w-full gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep((s) => (s > 1 ? (s - 1) as typeof step : s))} 
                disabled={step === 1}
                size="sm"
              >
                Back
              </Button>
              {step < 5 ? (
                <Button 
                  onClick={() => setStep((s) => (s < 5 ? (s + 1) as typeof step : s))} 
                  disabled={(step === 1 && tools.length === 0) || (step === 2 && !pricesValid) || (step === 3 && !authHeadersValid) || (step === 4 && selectedNetworks.length === 0)}
                  size="sm"
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={async () => { setLoading(true); try { await onCreate({ prices: priceByTool, evmRecipientAddress, svmRecipientAddress, networks: selectedNetworks, requireAuth, authHeaders: Object.fromEntries(authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])), testnet: recipientIsTestnet }); onOpenChange(false); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create'); } finally { setLoading(false) } }} 
                  disabled={loading || (needsEvm && !evmValid) || (needsSvm && !svmValid)}
                  size="sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[min(96vw,900px)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{currentLabel}</div>
              <div className="text-xs text-muted-foreground">Step {step} of {totalSteps}</div>
            </div>
            <div className="text-xs text-muted-foreground">{stepDescription}</div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="hidden md:block text-xs text-muted-foreground truncate">{serverUrl}</div>
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">{Content}</div>
        <DialogFooter>
          <div className="flex items-center justify-between w-full gap-3">
            <Button 
              variant="outline" 
              onClick={() => setStep((s) => (s > 1 ? (s - 1) as typeof step : s))} 
              disabled={step === 1}
              size="sm"
            >
              Back
            </Button>
            {step < 5 ? (
              <Button 
                onClick={() => setStep((s) => (s < 5 ? (s + 1) as typeof step : s))} 
                disabled={(step === 1 && tools.length === 0) || (step === 2 && !pricesValid) || (step === 3 && !authHeadersValid) || (step === 4 && selectedNetworks.length === 0)}
                size="sm"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={async () => { setLoading(true); try { await onCreate({ prices: priceByTool, evmRecipientAddress, svmRecipientAddress, networks: selectedNetworks, requireAuth, authHeaders: Object.fromEntries(authHeaders.filter(h => h.key && h.value).map(h => [h.key, h.value])), testnet: recipientIsTestnet }); onOpenChange(false); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to create'); } finally { setLoading(false) } }} 
                disabled={loading || (needsEvm && !evmValid) || (needsSvm && !svmValid)}
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
