"use client"

import { useEffect, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Github, Copy as CopyIcon, Check as CheckIcon, ExternalLink, Loader2 } from "lucide-react"
import { useSession, signIn, signOut } from "@/lib/client/auth"
import { authApi } from "@/lib/client/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useTheme } from "@/components/providers/theme-context"

type UserModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Balances removed as we are no longer fetching per-network balances here


type Wallet = {
  id?: string
  walletAddress?: string
  provider?: string
  walletType?: string
  blockchain?: string
  isPrimary?: boolean
  isActive?: boolean
  createdAt?: string
  networks?: string[]
}

type ApiKey = {
  id: string
  name?: string
  prefix?: string
  start?: string
  enabled?: boolean
  remaining?: number | null
  expiresAt?: string | null
  createdAt?: string
}

function fmtDate(value?: string | null) {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function shortAddress(addr?: string) {
  if (!addr) return "—"
  const a = addr.trim()
  if (a.length <= 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

export function UserAccountPanel({ isActive = true }: { isActive?: boolean }) {
  const { data: session } = useSession()
  const { isDark } = useTheme()

  const [activeTab, setActiveTab] = useState<"wallets" | "developer">("wallets")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeyCreated, setApiKeyCreated] = useState<string>("")
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)


  const loadWallets = useCallback(async () => {
    setWalletsLoading(true)
    setError("")
    try {
      const wallets = await authApi.getWallets() as Wallet[]
      const walletList = Array.isArray(wallets) ? wallets : []
      setWallets(walletList)
    } catch (e) {
      console.error("Failed to load wallets:", e)
      setError(e instanceof Error ? e.message : "Failed to load wallets")
      setWallets([])
    } finally {
      setWalletsLoading(false)
    }
  }, [])

  const loadApiKeys = useCallback(async () => {
    setApiKeysLoading(true)
    try {
      const items = await authApi.getApiKeys() as ApiKey[]
      setApiKeys(Array.isArray(items) ? items : [])
    } catch (e) {
      console.error(e)
    } finally {
      setApiKeysLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isActive) return
    setError("")
    if (session?.user) {
      if (activeTab === "wallets") loadWallets()
      if (activeTab === "developer") loadApiKeys()
    }
  }, [isActive, session?.user, activeTab, loadWallets, loadApiKeys])

  async function handleGitHubSignIn() {
    setLoading(true)
    setError("")
    try {
      await signIn.social({ provider: "github", callbackURL: window.location.href })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with GitHub")
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    setError("")
    try {
      await signOut()
      setWallets([])
      setApiKeys([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign out")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateApiKey() {
    if (!session?.user) return
    try {
      // Generate a descriptive name for the API key
      const prefixes = ['Manual', 'Custom', 'Personal', 'User', 'Dev', 'Test', 'App', 'Client', 'Service', 'Tool']
      const suffixes = ['Key', 'Token', 'Access', 'Auth', 'API', 'Credential', 'Secret', 'Pass', 'Login', 'Auth']
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)]
      const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)]
      const randomNumber = Math.floor(Math.random() * 9999) + 1
      const randomName = `${randomPrefix} ${randomSuffix} ${randomNumber}`
      
      const created = await authApi.createApiKey({ 
        name: randomName,
        prefix: 'mcpay_'
      })
      if (created && created.key) setApiKeyCreated(created.key as string)
      await loadApiKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create API key")
    }
  }

  async function handleToggleKey(id: string, enabled: boolean) {
    try {
      await authApi.updateApiKey(id, !enabled)
      await loadApiKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update API key")
    }
  }

  async function handleDeleteKey(id: string) {
    try {
      await authApi.deleteApiKey(id)
      await loadApiKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete API key")
    }
  }

  async function handleBulkDelete() {
    if (selectedKeys.size === 0) return
    setBulkDeleting(true)
    try {
      const deletePromises = Array.from(selectedKeys).map(id => authApi.deleteApiKey(id))
      await Promise.all(deletePromises)
      setSelectedKeys(new Set())
      await loadApiKeys()
      toast.success(`Deleted ${selectedKeys.size} API key${selectedKeys.size > 1 ? 's' : ''}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete API keys")
    } finally {
      setBulkDeleting(false)
    }
  }

  function handleSelectKey(id: string, checked: boolean) {
    setSelectedKeys(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedKeys(new Set(apiKeys.map(k => k.id)))
    } else {
      setSelectedKeys(new Set())
    }
  }

  async function handleOnramp(address: string) {
    try {
      const res = await authApi.getOnrampUrl(address)
      const url = (res && (res as { url?: string }).url) as string | undefined
      if (url && url.startsWith("http")) window.open(url, "_blank", "noopener")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create onramp URL")
    }
  }


  function handleCopy(addr?: string) {
    if (!addr) return
    navigator.clipboard.writeText(addr)
    setCopiedMap((m) => ({ ...m, [addr]: true }))
    toast.success("Address copied")
    setTimeout(() => {
      setCopiedMap((m) => ({ ...m, [addr!]: false }))
    }, 1500)
  }

  // Removed total and subtitle balance-related labels as balances are no longer fetched

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      {error ? (
        <div className={`mb-3 p-3 rounded-md border flex-shrink-0 ${isDark ? "bg-red-950/50 border-red-800/50" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-md ${isDark ? "bg-red-800/50 text-red-400" : "bg-red-500/10 text-red-600"}`}>
              <div className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Error</h4>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      {!session?.user ? (
        <div className={`p-3 rounded-md border mb-4 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-md ${isDark ? "bg-blue-800/50 text-blue-400" : "bg-blue-500/10 text-blue-600"}`}>
              <Github className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Sign in required</h4>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Please sign in to access your account dashboard.</p>
              <Button onClick={handleGitHubSignIn} disabled={loading} className="gap-2 text-xs h-7">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                {loading ? "Signing in..." : "Sign in with GitHub"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-3 rounded-md border mb-4 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="avatar" className="w-10 h-10 object-cover" />
                ) : (
                  <div className={`w-5 h-5 rounded-full ${isDark ? "bg-gray-500" : "bg-gray-400"}`} />
                )}
              </div>
              <div>
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{session.user.name || "User"}</div>
                <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{session.user.email || ""}</div>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} disabled={loading} className="text-xs h-7">
              Sign out
            </Button>
          </div>
        </div>
      )}

      <div className={`border rounded-md flex-shrink-0 ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
        <div className="flex gap-2 overflow-x-auto p-2">
          {(
            [
              { key: "wallets", label: "Wallet" },
              { key: "developer", label: "Developer" },
            ] as const
          ).map((t) => (
            <Button
              key={t.key}
              size="sm"
              variant={activeTab === t.key ? "default" : "ghost"}
              onClick={() => setActiveTab(t.key)}
              className="text-xs h-7 px-3"
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0">
        {activeTab === "wallets" && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Linked wallets{typeof wallets?.length === 'number' ? ` · ${wallets.length}` : ''}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {walletsLoading ? (
                <div className="h-full overflow-y-auto pr-2">
                  <div className={`rounded-md border divide-y ${isDark ? "border-gray-700 divide-gray-700" : "border-gray-200 divide-gray-200"}`}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-7 w-7 rounded-sm" />
                          <Skeleton className="h-7 w-20 rounded-sm" />
                          <Skeleton className="h-7 w-16 rounded-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : wallets.length === 0 ? (
                <div className={`p-3 rounded-md border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`flex items-center justify-center text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    No wallets linked yet. Link your on-chain wallet from the app.
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-2">
                  <div className={`rounded-md border divide-y ${isDark ? "border-gray-700 divide-gray-700" : "border-gray-200 divide-gray-200"}`}>
                    {[...wallets]
                      .sort((a, b) => (b?.isPrimary ? 1 : 0) - (a?.isPrimary ? 1 : 0) || (new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()))
                      .map((wallet) => (
                      <div key={`${wallet.walletAddress}-${wallet.createdAt}`} className={`flex items-center justify-between gap-3 p-3 transition-all duration-300 ${isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-100"}`}>
                        <div className="flex items-center gap-2">
                          <div className={`font-mono text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {shortAddress(wallet.walletAddress)}
                          </div>
                          {wallet.isPrimary && (
                            <span className={`ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-sm border ${isDark ? "bg-teal-800/50 text-teal-400 border-teal-800/50" : "bg-teal-500/10 text-teal-600 border-teal-500/20"}`}>
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                aria-label="Copy address"
                                size="icon"
                                variant="outline"
                                className="h-7 w-7 rounded-sm"
                                onClick={() => handleCopy(wallet.walletAddress)}
                              >
                                {copiedMap[wallet.walletAddress || ""] ? (
                                  <CheckIcon className="h-3 w-3" />
                                ) : (
                                  <CopyIcon className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy</TooltipContent>
                          </Tooltip>
                          {wallet.walletAddress ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="View in Zerion"
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2"
                                  onClick={() => window.open(`https://app.zerion.io/${wallet.walletAddress}/overview`, "_blank", "noopener")}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" /> View
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Open in Zerion</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {wallet.isPrimary && (
                            <Button
                              aria-label="Fund wallet"
                              size="sm"
                              variant="default"
                              className="text-xs h-7 px-2 bg-teal-600 hover:bg-teal-700 text-white"
                              onClick={() => wallet.walletAddress && handleOnramp(wallet.walletAddress)}
                            >
                              Fund
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "developer" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              {session?.user ? (
                <div className="h-full overflow-y-auto pr-2">
                  <div className="space-y-4 pb-4">
                    {apiKeyCreated ? (
                      <div className={`p-3 rounded-md border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-md ${isDark ? "bg-teal-800/50 text-teal-400" : "bg-teal-500/10 text-teal-600"}`}>
                            <CheckIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <h4 className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>API key created</h4>
                            <div className={`p-2 rounded-md border ${isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-white"}`}>
                              <code className={`text-xs font-mono break-all ${isDark ? "text-white" : "text-gray-900"}`}>{apiKeyCreated}</code>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="text-xs h-7 px-2" onClick={() => {
                                navigator.clipboard.writeText(apiKeyCreated)
                                toast.success("API key copied")
                              }}>Copy</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setApiKeyCreated("")}>Dismiss</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className={`p-3 rounded-md border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Keys inherit default permissions unless specified by the server.</div>
                        <Button size="sm" className="text-xs h-7 px-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreateApiKey}>Create API Key</Button>
                      </div>
                    </div>

                    <div className={`rounded-md border ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                      <div className={`p-3 border-b flex items-center justify-between flex-shrink-0 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Your API Keys</div>
                          {apiKeys.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedKeys.size === apiKeys.length && apiKeys.length > 0}
                                  onCheckedChange={handleSelectAll}
                                />
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Select all
                                </span>
                              </div>
                              {selectedKeys.size > 0 && (
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="text-xs h-7 px-2" 
                                  onClick={handleBulkDelete}
                                  disabled={bulkDeleting}
                                >
                                  {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : `Delete ${selectedKeys.size}`}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={loadApiKeys} disabled={apiKeysLoading}>
                          {apiKeysLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reload"}
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0">
                        {apiKeys.length === 0 ? (
                          <div className={`p-4 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>No API keys yet. Create one above.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className={isDark ? "bg-gray-800/50" : "bg-gray-50"}>
                                <tr>
                                  <th className={`text-left font-medium px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}></th>
                                  <th className={`text-left font-medium px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Name</th>
                                  <th className={`text-left font-medium px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Enabled</th>
                                  <th className={`text-left font-medium px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Created</th>
                                  <th className={`text-right font-medium px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-200"}`}>
                                {apiKeys.map((k) => {
                                  const enabled = k.enabled !== false
                                  return (
                                    <tr key={k.id} className={`transition-all duration-300 ${isDark ? "hover:bg-gray-800/40" : "hover:bg-gray-100"}`}>
                                      <td className="px-3 py-2">
                                        <Checkbox
                                          checked={selectedKeys.has(k.id)}
                                          onCheckedChange={(checked) => handleSelectKey(k.id, checked as boolean)}
                                        />
                                      </td>
                                      <td className={`px-3 py-2 text-xs ${isDark ? "text-white" : "text-gray-900"}`}>{k.name || "—"}</td>
                                      <td className={`px-3 py-2 text-xs ${isDark ? "text-white" : "text-gray-900"}`}>{enabled ? "Yes" : "No"}</td>
                                      <td className={`px-3 py-2 text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{fmtDate(k.createdAt)}</td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="inline-flex gap-2">
                                          <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => handleToggleKey(k.id, enabled)}>
                                            {enabled ? "Disable" : "Enable"}
                                          </Button>
                                          <Button size="sm" variant="destructive" className="text-xs h-7 px-2" onClick={() => handleDeleteKey(k.id)}>
                                            Delete
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-md border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`flex items-center justify-center text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    Sign in to manage API keys.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
    </div>
  )
}

export function UserModal({ open, onOpenChange }: UserModalProps) {
  const { isDark } = useTheme()
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] flex flex-col ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>Your Account</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <UserAccountPanel isActive={open} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserModal


