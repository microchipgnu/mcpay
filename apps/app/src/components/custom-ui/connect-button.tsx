"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, type Connector } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getNetworkConfig, type UnifiedNetwork } from '@/lib/commons/networks'
import type { Network } from '@/types/blockchain'
import { Loader2, Zap, AlertTriangle } from 'lucide-react'

const supportedChains: Network[] = ['base-sepolia', 'sei-testnet', 'base']

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Determine current network based on chain ID
  const currentNetwork = useMemo(() => {
    if (!chainId) return null
    
    // Check supported networks for matching chain ID
    for (const network of supportedChains) {
      const networkConfig = getNetworkConfig(network as UnifiedNetwork)
      if (networkConfig && networkConfig.chainId === chainId) {
        return network
      }
    }
    return null
  }, [chainId])

  // Check if we're on the right network
  const isOnSupportedNetwork = currentNetwork !== null

  const availableConnectors = useMemo(() => {
    return connectors.filter(connector => connector.name !== 'Coinbase Wallet SDK')
  }, [connectors])

  const switchToNetwork = useCallback(async (targetNetwork: Network) => {
    if (!switchChain) return
    
    const networkConfig = getNetworkConfig(targetNetwork as UnifiedNetwork)
    if (!networkConfig || typeof networkConfig.chainId !== 'number') return

    try {
      setConnectionError(null)
      switchChain({ 
        chainId: networkConfig.chainId,
        addEthereumChainParameter: {
          chainName: networkConfig.name,
          rpcUrls: networkConfig.rpcUrls,
          blockExplorerUrls: networkConfig.blockExplorerUrls,
          nativeCurrency: {
            name: networkConfig.nativeCurrency.name,
            symbol: networkConfig.nativeCurrency.symbol,
            decimals: networkConfig.nativeCurrency.decimals,
          },
        }
      })
    } catch (error) {
      console.error('Failed to switch network:', error)
      const networkName = networkConfig?.name || targetNetwork
      setConnectionError(`Failed to switch to ${networkName} network`)
    }
  }, [switchChain])

  const handleConnect = useCallback(async (connector: Connector) => {
    try {
      setIsConnecting(true)
      setConnectionError(null)
      connect({ connector })
    } catch (error) {
      console.error('Connection failed:', error)
      setConnectionError('Connection failed. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setConnectionError(null)
  }, [disconnect])

  // Clear error after some time
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => setConnectionError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [connectionError])

  if (!isConnected) {
    return (
      <div className="space-y-3">
        {connectionError && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
            {connectionError}
          </div>
        )}
        
        <div className="space-y-2">
          {availableConnectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-11 text-[15px] font-medium"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Connect {connector.name}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Show network selection if connected but not on supported network
  if (!isOnSupportedNetwork) {
    return (
      <div className="space-y-3">
        <div className="text-center space-y-3">
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {connector?.name} • {currentNetwork ? (() => {
                const networkConfig = getNetworkConfig(currentNetwork as UnifiedNetwork)
                return networkConfig?.name || 'Unknown Network'
              })() : 'Unknown Network'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Please switch to a supported network:
          </div>
          
          <div className="space-y-2">
            {supportedChains.map((network) => {
              const networkConfig = getNetworkConfig(network as UnifiedNetwork)
              if (!networkConfig) return null
              
              return (
                <Button
                  key={network}
                  onClick={() => switchToNetwork(network)}
                  variant="outline"
                  className="w-full h-10 text-sm"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {networkConfig.name}
                </Button>
              )
            })}
          </div>
        </div>
        
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          className="w-full text-sm text-gray-500"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {connectionError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
          {connectionError}
        </div>
      )}
      
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {connector?.name}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {(() => {
              const networkConfig = getNetworkConfig(currentNetwork as UnifiedNetwork)
              return networkConfig?.name || 'Unknown'
            })()}
          </Badge>
        </div>
        
        <div className="text-sm font-mono text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        
        <div className="text-xs text-gray-500">
          Switch to: {supportedChains.map(n => {
            const networkConfig = getNetworkConfig(n as UnifiedNetwork)
            return networkConfig?.name || n
          }).join(', ')}
        </div>
      </div>
      
      <Button
        onClick={handleDisconnect}
        variant="outline"
        className="w-full h-10"
      >
        Disconnect
      </Button>
    </div>
  )
}
