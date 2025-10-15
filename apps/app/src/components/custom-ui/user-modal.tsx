"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Github, Copy as CopyIcon, Check as CheckIcon, ExternalLink, Loader2 } from "lucide-react"
import { useSession, signIn, signOut } from "@/lib/client/auth"
import { authApi } from "@/lib/client/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

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

  const [activeTab, setActiveTab] = useState<"wallets" | "developer">("wallets")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({})
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeyCreated, setApiKeyCreated] = useState<string>("")


  async function loadWallets() {
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
  }

  async function loadApiKeys() {
    setApiKeysLoading(true)
    try {
      const items = await authApi.getApiKeys() as ApiKey[]
      setApiKeys(Array.isArray(items) ? items : [])
    } catch (e) {
      console.error(e)
    } finally {
      setApiKeysLoading(false)
    }
  }

  useEffect(() => {
    if (!isActive) return
    setError("")
    if (session?.user) {
      if (activeTab === "wallets") loadWallets()
      if (activeTab === "developer") loadApiKeys()
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !session?.user) return
    if (activeTab === "wallets") loadWallets()
    if (activeTab === "developer") loadApiKeys()
  }, [activeTab, session?.user, isActive])

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
      const created = await authApi.createApiKey()
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

  async function handleOnramp(address: string) {
    try {
      const res = await authApi.getOnrampUrl(address)
      const url = (res && (res as { url?: string }).url) as string | undefined
      if (url && url.startsWith("http")) window.open(url, "_blank", "noopener")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create onramp URL")
    }
  }

  function stringToHslColor(str?: string, s = 65, l = 45) {
    if (!str) return `hsl(0 0% 80%)`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
      hash = hash & hash
    }
    const h = Math.abs(hash) % 360
    return `hsl(${h} ${s}% ${l}%)`
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
        <div className="mb-3 p-3 rounded-md border bg-muted/30 border-border flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-800/50">
              <div className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Error</h4>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      {!session?.user ? (
        <div className="p-3 rounded-md border bg-muted/30 border-border mb-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 dark:bg-blue-800/50">
              <Github className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-medium text-foreground">Sign in required</h4>
              <p className="text-xs text-muted-foreground">Please sign in to access your account dashboard.</p>
              <Button onClick={handleGitHubSignIn} disabled={loading} className="gap-2 text-xs h-7">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Github className="h-3 w-3" />}
                {loading ? "Signing in..." : "Sign in with GitHub"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-md border bg-muted/30 border-border mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="avatar" className="w-10 h-10 object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-foreground/20" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{session.user.name || "User"}</div>
                <div className="text-xs text-muted-foreground">{session.user.email || ""}</div>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut} disabled={loading} className="text-xs h-7">
              Sign out
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-md border-border bg-muted/30 flex-shrink-0">
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
              <div className="text-xs text-muted-foreground">
                Linked wallets{typeof wallets?.length === 'number' ? ` · ${wallets.length}` : ''}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {walletsLoading ? (
                <div className="h-full overflow-y-auto pr-2">
                  <div className="rounded-md border border-border divide-y divide-border">
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
                <div className="p-3 rounded-md border bg-muted/30 border-border">
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
                    No wallets linked yet. Link your on-chain wallet from the app.
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-2">
                  <div className="rounded-md border border-border divide-y divide-border">
                    {[...wallets]
                      .sort((a, b) => (b?.isPrimary ? 1 : 0) - (a?.isPrimary ? 1 : 0) || (new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime()))
                      .map((wallet) => (
                      <div key={`${wallet.walletAddress}-${wallet.createdAt}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-all duration-300">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-medium text-foreground">
                            {shortAddress(wallet.walletAddress)}
                          </div>
                          {wallet.isPrimary && (
                            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-800/50 rounded-sm border border-teal-500/20 dark:border-teal-800/50">
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
                      <div className="p-3 rounded-md border bg-muted/30 border-border">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 dark:bg-teal-800/50">
                            <CheckIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <h4 className="text-sm font-medium text-foreground">API key created</h4>
                            <div className="p-2 rounded-md border border-border bg-background">
                              <code className="text-xs font-mono text-foreground break-all">{apiKeyCreated}</code>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" className="text-xs h-7 px-2" onClick={() => navigator.clipboard.writeText(apiKeyCreated)}>Copy</Button>
                              <Button size="sm" variant="ghost" className="text-xs h-7 px-2" onClick={() => setApiKeyCreated("")}>Dismiss</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="p-3 rounded-md border bg-muted/30 border-border">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">Keys inherit default permissions unless specified by the server.</div>
                        <Button size="sm" className="text-xs h-7 px-2 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleCreateApiKey}>Create API Key</Button>
                      </div>
                    </div>

                    <div className="rounded-md border border-border">
                      <div className="p-3 border-b border-border flex items-center justify-between flex-shrink-0">
                        <div className="text-sm font-medium text-foreground">Your API Keys</div>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={loadApiKeys} disabled={apiKeysLoading}>
                          {apiKeysLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Reload"}
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0">
                        {apiKeys.length === 0 ? (
                          <div className="p-4 text-xs text-muted-foreground">No API keys yet. Create one above.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left font-medium px-3 py-2 text-xs text-muted-foreground">Enabled</th>
                                  <th className="text-left font-medium px-3 py-2 text-xs text-muted-foreground">Created</th>
                                  <th className="text-right font-medium px-3 py-2 text-xs text-muted-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {apiKeys.map((k) => {
                                  const enabled = k.enabled !== false
                                  return (
                                    <tr key={k.id} className="hover:bg-muted/40 transition-all duration-300">
                                      <td className="px-3 py-2 text-xs text-foreground">{enabled ? "Yes" : "No"}</td>
                                      <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(k.createdAt)}</td>
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
                <div className="p-3 rounded-md border bg-muted/30 border-border">
                  <div className="flex items-center justify-center text-xs text-muted-foreground">
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-background border-border">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-foreground">Your Account</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <UserAccountPanel isActive={open} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserModal


