import { type Network } from '@/types/blockchain'
import { getNetworkConfig, type UnifiedNetwork } from '@/lib/commons/networks'
import type { Connector } from 'wagmi'

// Wallet verification types
export interface WalletVerification {
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface WalletConnectionState {
  isConnected: boolean;
  address?: string;
  network?: Network;
  connector?: Connector;
}

// Connector type detection
export function isMetaMaskConnector(connector: Connector): boolean {
  return connector.name.toLowerCase().includes('metamask') || 
         connector.id.toLowerCase().includes('metamask')
}

export function isCoinbaseWalletConnector(connector: Connector): boolean {
  return connector.name.toLowerCase().includes('coinbase') || 
         connector.id.toLowerCase().includes('coinbase')
}

export function isPortoConnector(connector: Connector): boolean {
  return connector.name.toLowerCase().includes('porto') || 
         connector.id.toLowerCase().includes('porto')
}

// Network switching utilities
export async function switchToNetwork(network: Network): Promise<boolean> {
  try {
    const networkConfig = getNetworkConfig(network as UnifiedNetwork)
    if (!networkConfig || typeof networkConfig.chainId !== 'number') {
      console.error(`Network configuration not found for ${network}`)
      return false
    }

    if (typeof window === 'undefined' || !window.ethereum) {
      console.error('Ethereum provider not found')
      return false
    }

    const chainIdHex = `0x${networkConfig.chainId.toString(16)}`

    try {
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      })
      return true
    } catch (switchError: unknown) {
      // If the network is not added, try to add it
      const typedError = switchError as { code?: number };
      if (typedError.code === 4902 || typedError.code === -32603) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: networkConfig.name,
              rpcUrls: networkConfig.rpcUrls,
              blockExplorerUrls: networkConfig.blockExplorerUrls,
              nativeCurrency: {
                name: networkConfig.nativeCurrency.name,
                symbol: networkConfig.nativeCurrency.symbol,
                decimals: networkConfig.nativeCurrency.decimals,
              },
            }],
          })
          return true
        } catch (addError) {
          console.error('Error adding network:', addError)
          return false
        }
      } else {
        console.error('Error switching network:', switchError)
        return false
      }
    }
  } catch (error) {
    console.error('Error in switchToNetwork:', error)
    return false
  }
}

// Wallet verification
export function verifyWalletConnection(
  isConnected: boolean,
  address?: string,
  network?: Network
): WalletVerification {
  const warnings: string[] = []
  const errors: string[] = []

  if (!isConnected) {
    errors.push('Wallet not connected')
    return { isValid: false, warnings, errors }
  }

  if (!address) {
    errors.push('No wallet address found')
    return { isValid: false, warnings, errors }
  }

  if (!address.startsWith('0x') || address.length !== 42) {
    errors.push('Invalid address format')
    return { isValid: false, warnings, errors }
  }

  if (network) {
    const networkConfig = getNetworkConfig(network as UnifiedNetwork)
    if (!networkConfig) {
      warnings.push(`Unknown network: ${network}`)
    } else if (networkConfig.isTestnet) {
      warnings.push('Connected to testnet - funds have no real value')
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  }
}

// Network preference utilities
export function getPreferredNetwork(): Network {
  // Default to base-sepolia for testnet development
  return 'base-sepolia'
}

export function getSupportedNetworks(): Network[] {
  return ['base-sepolia', 'sei-testnet']
}

export function isNetworkSupported(network: string): network is Network {
  return getSupportedNetworks().includes(network as Network)
}

export function getNetworkDisplayName(network: Network): string {
  const networkConfig = getNetworkConfig(network as UnifiedNetwork)
  return networkConfig?.name || network
}

export function isTestnetNetwork(network: Network): boolean {
  const networkConfig = getNetworkConfig(network as UnifiedNetwork)
  return networkConfig?.isTestnet || false
}

// Enhanced network detection with fallback
export function detectNetworkFromChainId(chainId: number): Network | null {
  const supportedNetworks = getSupportedNetworks()
  
  for (const network of supportedNetworks) {
    const networkConfig = getNetworkConfig(network as UnifiedNetwork)
    if (networkConfig && networkConfig.chainId === chainId) {
      return network
    }
  }
  
  return null
}

// Validation helpers
export function validateNetworkForPreferredChain(
  currentNetwork: Network | undefined,
  preferredNetwork: Network
): { isValid: boolean; shouldSwitch: boolean; message?: string } {
  if (!currentNetwork) {
    return {
      isValid: false,
      shouldSwitch: true,
      message: `Please connect to ${getNetworkDisplayName(preferredNetwork)}`
    }
  }

  if (currentNetwork !== preferredNetwork) {
    return {
      isValid: false,
      shouldSwitch: true,
      message: `Please switch to ${getNetworkDisplayName(preferredNetwork)} network`
    }
  }

  return { isValid: true, shouldSwitch: false }
}

// Error handling utilities
export function getWalletErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Common error messages
    if (error.message.includes('User rejected')) {
      return 'Transaction was rejected by user'
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction'
    }
    if (error.message.includes('network')) {
      return 'Network error - please try again'
    }
    return error.message
  }
  
  return 'An unknown error occurred'
}

// Connection state helpers
export function createConnectionState(
  isConnected: boolean,
  address?: string,
  network?: Network,
  connector?: Connector
): WalletConnectionState {
  return {
    isConnected,
    address,
    network,
    connector
  }
} 