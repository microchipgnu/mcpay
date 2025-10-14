"use client"

import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Github, Loader2 } from "lucide-react"
import { useSession, signIn, signOut } from "@/lib/client/auth"
import { authApi } from "@/lib/client/utils"

type UserModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type NetworkBalance = {
  network: string
  native?: { balanceFormatted: string; nativeSymbol: string } | null
  usdc?: { balanceFormatted: string; tokenSymbol: string } | null
}

type BalanceData = {
  native?: { balanceFormatted: string; nativeSymbol: string } | null
  usdc?: { balanceFormatted: string; tokenSymbol: string } | null
}


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

  const [walletsData, setWalletsData] = useState<{wallet: Wallet, balances?: NetworkBalance[]}[]>([])
  const [walletsLoading, setWalletsLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeyCreated, setApiKeyCreated] = useState<string>("")


  async function loadWalletsWithBalances() {
    setWalletsLoading(true)
    setError("")
    try {
      const wallets = await authApi.getWallets() as Wallet[]
      const walletList = Array.isArray(wallets) ? wallets : []

      if (walletList.length === 0) {
        setWalletsData([])
        return
      }

      // For each wallet, load balances for multiple networks
      const walletsWithBalances = await Promise.all(
        walletList.map(async (wallet) => {
          try {
            // Get supported networks for this wallet type/blockchain
            const networks = ["base", "polygon"]

            // Load balances for each network
            const balancePromises = networks.map(async (network) => {
              try {
                const balanceData = await authApi.getBalance(wallet.walletAddress!, network) as BalanceData
                return {
                  network,
                  native: null,
                  usdc: balanceData.usdc
                } as NetworkBalance
              } catch (e) {
                // If balance fails for a network, return empty balance for that network
                return {
                  network,
                  native: null,
                  usdc: null
                } as NetworkBalance
              }
            })

            const balances = await Promise.all(balancePromises)

            return {
              wallet,
              balances: balances.filter(b => b.usdc) // Only include networks with USDC balances
            }
          } catch (e) {
            console.error(`Failed to load balances for wallet ${wallet.walletAddress}:`, e)
            return { wallet, balances: [] }
          }
        })
      )

      setWalletsData(walletsWithBalances)
    } catch (e) {
      console.error("Failed to load wallets:", e)
      setError(e instanceof Error ? e.message : "Failed to load wallets")
      setWalletsData([])
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
      if (activeTab === "wallets") loadWalletsWithBalances()
      if (activeTab === "developer") loadApiKeys()
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !session?.user) return
    if (activeTab === "wallets") loadWalletsWithBalances()
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
      setWalletsData([])
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

  const totalLabel = useMemo(() => {
    if (!walletsData || walletsData.length === 0) return "$0.00"

    let totalUSD = 0
    let primaryBalance: string | null = null
    let primarySymbol = ""

    walletsData.forEach(({ balances }) => {
      if (balances) {
        balances.forEach(balance => {
          if (balance.usdc) {
            totalUSD += parseFloat(balance.usdc.balanceFormatted || "0")
            if (!primaryBalance) {
              primaryBalance = balance.usdc.balanceFormatted
              primarySymbol = balance.usdc.tokenSymbol
            }
          } else if (balance.native && !primaryBalance) {
            primaryBalance = balance.native.balanceFormatted
            primarySymbol = balance.native.nativeSymbol
          }
        })
      }
    })

    if (primaryBalance) {
      return `${primaryBalance} ${primarySymbol}`
    }
    return "$0.00"
  }, [walletsData])

  const subtitleLabel = useMemo(() => {
    if (!walletsData || walletsData.length === 0) return "No wallets linked yet. Link your on-chain wallet from the app."

    const primaryWallet = walletsData.find(({ wallet }) => wallet.isPrimary)?.wallet
    if (primaryWallet) {
      const networks = primaryWallet.networks?.length || 1
      const networkText = networks > 1 ? `${networks} networks` : (primaryWallet.blockchain?.toUpperCase() || "NETWORK")
      return `${networkText} · ${shortAddress(primaryWallet.walletAddress)}`
    }
    return "No primary wallet set"
  }, [walletsData])

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      {error ? (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 flex-shrink-0">{error}</div>
      ) : null}

      {!session?.user ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Please sign in to access your account dashboard.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleGitHubSignIn} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              {loading ? "Signing you in..." : "Sign in with GitHub"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
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
              <div className="text-sm font-semibold">{session.user.name || "User"}</div>
              <div className="text-xs text-muted-foreground">{session.user.email || ""}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSignOut} disabled={loading}>
              Sign out
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-2 bg-muted/30 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto">
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
              className="px-3"
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
              <div className="font-medium"></div>
              <Button size="sm" variant="outline" onClick={loadWalletsWithBalances} disabled={walletsLoading}>
                {walletsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reload"}
              </Button>
            </div>

            <div className="flex-1 min-h-0">
              {walletsData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No wallets linked yet. Link your on-chain wallet from the app.
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-2">
                  <div className="space-y-4 pb-4">
                    {walletsData.map(({ wallet, balances }) => (
                      <div key={`${wallet.walletAddress}-${wallet.createdAt}`} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            <div className="font-medium">
                              {shortAddress(wallet.walletAddress)}
                              {wallet.isPrimary && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                                  Primary
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigator.clipboard.writeText(wallet.walletAddress || "")}
                            >
                              Copy
                            </Button>
                            {wallet.isPrimary && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => wallet.walletAddress && handleOnramp(wallet.walletAddress)}
                              >
                                Fund
                              </Button>
                            )}
                          </div>
                        </div>

                        {balances && balances.length > 0 ? (
                          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {balances.map((balance) => (
                              <div key={balance.network} className="rounded-lg border bg-card p-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                  {balance.network}
                                </div>
                                <div className="space-y-2">
                                  {balance.native && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">Native</span>
                                      <span className="text-sm font-medium">
                                        {balance.native.balanceFormatted} {balance.native.nativeSymbol}
                                      </span>
                                    </div>
                                  )}
                                  {balance.usdc && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-muted-foreground">USDC</span>
                                      <span className="text-sm font-medium">
                                        {balance.usdc.balanceFormatted} {balance.usdc.tokenSymbol}
                                      </span>
                                    </div>
                                  )}
                                  {!balance.native && !balance.usdc && (
                                    <div className="text-sm text-muted-foreground">No balances</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-4">
                            Loading balances...
                          </div>
                        )}
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
                      <div className="rounded-md border bg-green-50 text-green-800 p-3 text-sm">
                        <div className="font-medium">API key created</div>
                        <div className="mt-1 break-all"><code>{apiKeyCreated}</code></div>
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" onClick={() => navigator.clipboard.writeText(apiKeyCreated)}>Copy</Button>
                          <Button size="sm" variant="ghost" onClick={() => setApiKeyCreated("")}>Dismiss</Button>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground">Keys inherit default permissions unless specified by the server.</div>
                        <Button size="sm" onClick={handleCreateApiKey}>Create API Key</Button>
                      </div>
                    </div>

                    <div className="rounded-lg border">
                      <div className="p-3 border-b flex items-center justify-between flex-shrink-0">
                        <div className="font-medium">Your API Keys</div>
                        <Button size="sm" variant="outline" onClick={loadApiKeys} disabled={apiKeysLoading}>
                          {apiKeysLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reload"}
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0">
                        {apiKeys.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No API keys yet. Create one above.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left font-medium px-3 py-2">Enabled</th>
                                  <th className="text-left font-medium px-3 py-2">Created</th>
                                  <th className="text-right font-medium px-3 py-2">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {apiKeys.map((k) => {
                                  const enabled = k.enabled !== false
                                  return (
                                    <tr key={k.id}>
                                      <td className="px-3 py-2">{enabled ? "Yes" : "No"}</td>
                                      <td className="px-3 py-2">{fmtDate(k.createdAt)}</td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="inline-flex gap-2">
                                          <Button size="sm" variant="outline" onClick={() => handleToggleKey(k.id, enabled)}>
                                            {enabled ? "Disable" : "Enable"}
                                          </Button>
                                          <Button size="sm" variant="destructive" onClick={() => handleDeleteKey(k.id)}>
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
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sign in to manage API keys.
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Your Account</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden">
          <UserAccountPanel isActive={open} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default UserModal


