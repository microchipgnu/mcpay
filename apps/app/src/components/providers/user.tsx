"use client"

import { useSession } from "@/lib/client/auth"
import { api, authApi } from "@/lib/client/utils"
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import type { UserWallet } from "@/types/wallet"
import type { UnifiedNetwork } from "@/lib/commons/networks"

// Lightweight random id generator used when backend id is missing
function cryptoRandomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)
      return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
    }
  } catch {}
  return `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// Define the shape of wallet data with balances
export interface UserWalletData {
  wallets: UserWallet[]
  totalFiatValue: number
  testnetTotalFiatValue: number
  summary: {
    hasMainnetBalances: boolean
    hasTestnetBalances: boolean
    mainnetValueUsd: number
    testnetValueUsd: number
  }
  mainnetBalancesByChain: Partial<Record<UnifiedNetwork, unknown[]>>
  testnetBalancesByChain: Partial<Record<UnifiedNetwork, unknown[]>>
}

// Define the context interface
interface UserContextValue {
  // Wallet data
  walletData: UserWalletData | null
  
  // Loading states
  isLoading: boolean
  isRefreshing: boolean
  
  // Error state
  error: string | null
  
  // Actions
  refreshWallets: () => Promise<void>
  addWallet: (walletData: {
    walletAddress: string
    blockchain: string
    walletType: 'external' | 'managed' | 'custodial'
    provider?: string
    isPrimary?: boolean
    walletMetadata?: Record<string, unknown>
  }) => Promise<void>
  setPrimaryWallet: (walletId: string) => Promise<void>
  removeWallet: (walletId: string) => Promise<void>
  
  // Utility functions
  getPrimaryWallet: () => UserWallet | null
  hasWallets: () => boolean
  getTotalValue: () => number
}

// Default empty state
const defaultWalletData: UserWalletData = {
  wallets: [],
  totalFiatValue: 0,
  testnetTotalFiatValue: 0,
  summary: {
    hasMainnetBalances: false,
    hasTestnetBalances: false,
    mainnetValueUsd: 0,
    testnetValueUsd: 0
  },
  mainnetBalancesByChain: {} as Partial<Record<UnifiedNetwork, unknown[]>>,
  testnetBalancesByChain: {} as Partial<Record<UnifiedNetwork, unknown[]>>
}

// Create the context
const UserContext = createContext<UserContextValue | undefined>(undefined)

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const userId = session?.user?.id
  
  // State
  const [walletData, setWalletData] = useState<UserWalletData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user wallets with balance information
  const loadWallets = useCallback(async (_includeTestnet = true, isRefresh = false) => {
    if (!userId) {
      setWalletData(null)
      return
    }

    // Set appropriate loading state
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    
    setError(null)

    try {
      const raw = await authApi.getWallets()
      const items = Array.isArray(raw) ? raw : []

      const wallets: UserWallet[] = items.map((w: Record<string, unknown>) => {
        const walletAddress: string = String((w?.walletAddress as string) || (w?.address as string) || "")
        const createdAt: string = String((w?.createdAt as string) || new Date().toISOString())
        const updatedAt: string = String((w?.updatedAt as string) || createdAt)
        return {
          id: String((w?.id as string) || walletAddress || cryptoRandomId()),
          userId: String(userId),
          walletAddress,
          blockchain: String((w?.blockchain as string) || "ethereum"),
          walletType: ((w?.walletType as string) || 'external') as 'external' | 'managed' | 'custodial',
          provider: w?.provider as string | undefined,
          isPrimary: Boolean(w?.isPrimary as boolean | undefined),
          isActive: (w?.isActive as boolean | undefined) === false ? false : true,
          walletMetadata: (w?.walletMetadata as Record<string, unknown> | undefined) || undefined,
          createdAt,
          updatedAt,
        }
      })

      setWalletData({
        wallets,
        totalFiatValue: 0,
        testnetTotalFiatValue: 0,
        summary: {
          hasMainnetBalances: false,
          hasTestnetBalances: false,
          mainnetValueUsd: 0,
          testnetValueUsd: 0,
        },
        mainnetBalancesByChain: {} as Partial<Record<UnifiedNetwork, unknown[]>>,
        testnetBalancesByChain: {} as Partial<Record<UnifiedNetwork, unknown[]>>,
      })
    } catch (error) {
      console.error('Failed to load user wallets:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load wallet data'
      setError(errorMessage)
      
      // Reset to default state on error
      setWalletData(defaultWalletData)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId])

  // Refresh wallets function
  const refreshWallets = useCallback(async () => {
    await loadWallets(true, true) // includeTestnet=true, isRefresh=true
  }, [loadWallets])

  // Add wallet function
  const addWallet = useCallback(async (walletInfo: {
    walletAddress: string
    blockchain: string
    walletType: 'external' | 'managed' | 'custodial'
    provider?: string
    isPrimary?: boolean
    walletMetadata?: Record<string, unknown>
  }) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setError(null)
    
    try {
      await api.addWalletToUser(userId, walletInfo)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add wallet'
      setError(errorMessage)
      throw error
    }
  }, [userId, refreshWallets])

  // Set primary wallet function
  const setPrimaryWallet = useCallback(async (walletId: string) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setError(null)

    try {
      await api.setWalletAsPrimary(userId, walletId)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set primary wallet'
      setError(errorMessage)
      throw error
    }
  }, [userId, refreshWallets])

  // Remove wallet function
  const removeWallet = useCallback(async (walletId: string) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    setError(null)

    try {
      await api.removeWallet(userId, walletId)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove wallet'
      setError(errorMessage)
      throw error
    }
  }, [userId, refreshWallets])

  // Utility function to get primary wallet
  const getPrimaryWallet = useCallback((): UserWallet | null => {
    return walletData?.wallets.find(wallet => wallet.isPrimary) || null
  }, [walletData?.wallets])

  // Utility function to check if user has wallets
  const hasWallets = useCallback((): boolean => {
    return (walletData?.wallets.length || 0) > 0
  }, [walletData?.wallets])

  // Utility function to get total wallet value
  const getTotalValue = useCallback((): number => {
    return (walletData?.totalFiatValue || 0) + (walletData?.testnetTotalFiatValue || 0)
  }, [walletData?.totalFiatValue, walletData?.testnetTotalFiatValue])

  // Load wallets when user session changes
  useEffect(() => {
    if (userId) {
      loadWallets(true, false) // includeTestnet=true, isRefresh=false (initial load)
    } else {
      setWalletData(null)
      setError(null)
    }
  }, [userId, loadWallets])

  // Context value
  const contextValue: UserContextValue = {
    // Data
    walletData,
    
    // Loading states
    isLoading,
    isRefreshing,
    
    // Error state
    error,
    
    // Actions
    refreshWallets,
    addWallet,
    setPrimaryWallet,
    removeWallet,
    
    // Utilities
    getPrimaryWallet,
    hasWallets,
    getTotalValue
  }

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  )
}

// Hook to use the user context
export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

// Convenience hooks for specific data
export function useUserWallets() {
  const { walletData } = useUser()
  return walletData?.wallets || []
}

export function usePrimaryWallet() {
  const { getPrimaryWallet } = useUser()
  return getPrimaryWallet()
}

export function useWalletBalances() {
  const { walletData } = useUser()
  return {
    mainnet: walletData?.mainnetBalancesByChain || {},
    testnet: walletData?.testnetBalancesByChain || {},
    totalMainnet: walletData?.totalFiatValue || 0,
    totalTestnet: walletData?.testnetTotalFiatValue || 0,
    total: (walletData?.totalFiatValue || 0) + (walletData?.testnetTotalFiatValue || 0),
    summary: walletData?.summary || {
      hasMainnetBalances: false,
      hasTestnetBalances: false,
      mainnetValueUsd: 0,
      testnetValueUsd: 0
    }
  }
}
