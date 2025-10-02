"use client"

import { useSession } from "@/lib/client/auth"
import { api } from "@/lib/client/utils"
import type { UserWallet } from "@/types/wallet"
import type { BalancesByChain } from "@/types/ui"
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"

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
  mainnetBalancesByChain: BalancesByChain
  testnetBalancesByChain: BalancesByChain
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
  mainnetBalancesByChain: {},
  testnetBalancesByChain: {}
}

// Create the context
const UserContext = createContext<UserContextValue | undefined>(undefined)

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  
  // State
  const [walletData, setWalletData] = useState<UserWalletData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user wallets with balance information
  const loadWallets = useCallback(async (includeTestnet = true, isRefresh = false) => {
    if (!session?.user?.id) {
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
      const response = await api.getUserWalletsWithBalances(session.user.id, includeTestnet)
      
      const {
        wallets = [],
        totalFiatValue = '0',
        testnetTotalFiatValue = '0',
        summary = {
          hasMainnetBalances: false,
          hasTestnetBalances: false,
          mainnetValueUsd: 0,
          testnetValueUsd: 0
        },
        mainnetBalancesByChain = {},
        testnetBalancesByChain = {}
      } = response as {
        wallets: UserWallet[]
        totalFiatValue: string
        testnetTotalFiatValue: string
        summary: {
          hasMainnetBalances: boolean
          hasTestnetBalances: boolean
          mainnetValueUsd: number
          testnetValueUsd: number
        }
        mainnetBalancesByChain: BalancesByChain
        testnetBalancesByChain: BalancesByChain
      }

      setWalletData({
        wallets,
        totalFiatValue: parseFloat(totalFiatValue),
        testnetTotalFiatValue: parseFloat(testnetTotalFiatValue),
        summary,
        mainnetBalancesByChain,
        testnetBalancesByChain
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
  }, [session?.user?.id])

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
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }

    setError(null)
    
    try {
      await api.addWalletToUser(session.user.id, walletInfo)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add wallet'
      setError(errorMessage)
      throw error
    }
  }, [session?.user?.id, refreshWallets])

  // Set primary wallet function
  const setPrimaryWallet = useCallback(async (walletId: string) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }

    setError(null)

    try {
      await api.setWalletAsPrimary(session.user.id, walletId)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set primary wallet'
      setError(errorMessage)
      throw error
    }
  }, [session?.user?.id, refreshWallets])

  // Remove wallet function
  const removeWallet = useCallback(async (walletId: string) => {
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }

    setError(null)

    try {
      await api.removeWallet(session.user.id, walletId)
      await refreshWallets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove wallet'
      setError(errorMessage)
      throw error
    }
  }, [session?.user?.id, refreshWallets])

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
    if (session?.user?.id) {
      loadWallets(true, false) // includeTestnet=true, isRefresh=false (initial load)
    } else {
      setWalletData(null)
      setError(null)
    }
  }, [session?.user?.id, loadWallets])

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
