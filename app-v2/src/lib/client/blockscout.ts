/**
 * Multi-chain blockchain explorer utilities
 * Supports different explorers for each network using the unified network registry
 */

import { 
  type UnifiedNetwork, 
  getNetworkConfig, 
  getSupportedNetworks,
  isNetworkSupported 
} from '@/lib/commons/networks'

/**
 * Get the appropriate explorer URL for a network
 */
export const getExplorerBaseUrl = (network: UnifiedNetwork): string => {
  const networkConfig = getNetworkConfig(network)
  if (!networkConfig || !networkConfig.blockExplorerUrls.length) {
    throw new Error(`No explorer configured for network: ${network}`)
  }
  return networkConfig.blockExplorerUrls[0]
}

/**
 * Generate an explorer URL for an address or transaction on any supported network
 */
export const getExplorerUrl = (
  hash: string, 
  network: UnifiedNetwork, 
  type: 'address' | 'tx' = 'address'
): string => {
  const baseUrl = getExplorerBaseUrl(network)

  if (network === 'sei-testnet') {
    return type === 'address' 
      ? `${baseUrl}/address/${hash}?chain=atlantic-2`
      : `${baseUrl}/tx/${hash}?chain=atlantic-2`
  }
  
  // Standard explorer URL structure for most chains
  return type === 'address' 
    ? `${baseUrl}/address/${hash}`
    : `${baseUrl}/tx/${hash}`
}

/**
 * Open explorer in a new tab for any supported network
 */
export const openExplorer = (
  hash: string, 
  network: UnifiedNetwork, 
  type: 'address' | 'tx' = 'address'
): void => {
  try {
    const url = getExplorerUrl(hash, network, type)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    console.error('Failed to open explorer:', error)
  }
}

/**
 * Copy explorer URL to clipboard for any supported network
 */
export const copyExplorerUrl = async (
  hash: string, 
  network: UnifiedNetwork, 
  type: 'address' | 'tx' = 'address'
): Promise<boolean> => {
  try {
    const url = getExplorerUrl(hash, network, type)
    await navigator.clipboard.writeText(url)
    return true
  } catch (error) {
    console.error('Failed to copy explorer URL to clipboard:', error)
    return false
  }
}

/**
 * Get explorer name for a network
 */
export const getExplorerName = (network: UnifiedNetwork): string => {
  const networkConfig = getNetworkConfig(network)
  if (!networkConfig) {
    return 'Explorer'
  }

  // Extract explorer name from URL
  const explorerUrl = networkConfig.blockExplorerUrls[0]
  if (explorerUrl.includes('basescan')) {
    return explorerUrl.includes('sepolia') ? 'BaseScan Sepolia' : 'BaseScan'
  }
  if (explorerUrl.includes('seitrace')) {
    return 'SeiTrace'
  }
  if (explorerUrl.includes('snowtrace')) {
    return explorerUrl.includes('testnet') ? 'SnowTrace Testnet' : 'SnowTrace'
  }
  if (explorerUrl.includes('etherscan')) {
    return explorerUrl.includes('sepolia') ? 'Etherscan Sepolia' : 'Etherscan'
  }
  if (explorerUrl.includes('polygonscan')) {
    return 'PolygonScan'
  }
  if (explorerUrl.includes('arbiscan')) {
    return 'Arbiscan'
  }
  if (explorerUrl.includes('explorer.solana')) {
    return 'Solana Explorer'
  }
  if (explorerUrl.includes('explorer.near')) {
    return 'NEAR Explorer'
  }
  
  // Generic fallback
  return `${networkConfig.name} Explorer`
}

/**
 * Check if a network has an explorer configured
 */
export const hasExplorer = (network: UnifiedNetwork): boolean => {
  try {
    getExplorerBaseUrl(network)
    return true
  } catch {
    return false
  }
}

/**
 * Get all supported explorer networks
 */
export const getSupportedExplorerNetworks = (): UnifiedNetwork[] => {
  return getSupportedNetworks().filter(network => hasExplorer(network))
}

/**
 * Validate network and get explorer info
 */
export const getExplorerInfo = (network: string) => {
  if (!isNetworkSupported(network)) {
    throw new Error(`Unsupported network: ${network}`)
  }
  
  const unifiedNetwork = network as UnifiedNetwork
  const networkConfig = getNetworkConfig(unifiedNetwork)
  
  if (!networkConfig) {
    throw new Error(`Network configuration not found: ${network}`)
  }
  
  return {
    network: unifiedNetwork,
    name: getExplorerName(unifiedNetwork),
    baseUrl: getExplorerBaseUrl(unifiedNetwork),
    hasExplorer: hasExplorer(unifiedNetwork),
    isTestnet: networkConfig.isTestnet,
  }
}

// Legacy compatibility - maintain old function names for existing code
export const getBlockscoutUrl = (hash: string, type: 'address' | 'tx' = 'address'): string => {
  return getExplorerUrl(hash, 'base-sepolia', type)
}

export const openBlockscout = (hash: string, type: 'address' | 'tx' = 'address'): void => {
  openExplorer(hash, 'base-sepolia', type)
}

export const copyBlockscoutUrl = async (hash: string, type: 'address' | 'tx' = 'address'): Promise<void> => {
  const success = await copyExplorerUrl(hash, 'base-sepolia', type)
  if (!success) {
    throw new Error('Failed to copy URL to clipboard')
  }
} 