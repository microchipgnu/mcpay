/**
 * Token Registry Module for MCPay Commons
 * 
 * This module provides token lookup functions using the unified network registry.
 * All token and network configurations now come from the centralized networks.ts module.
 * 
 * Data verified from official sources:
 * - Circle (USDC): https://developers.circle.com/stablecoins/usdc-contract-addresses
 * - Ethplorer: https://ethplorer.io/
 * - BaseScan: https://basescan.org/
 * - CoinGecko API: https://docs.coingecko.com/
 */

import type { Network, NetworkInfo, TokenInfo } from '@/types/blockchain';
import { formatAmount, toBaseUnits } from './amounts';
import {
  type TokenConfig,
  UNIFIED_NETWORKS,
  getNetworkConfig,
  getNetworkTokens,
  getSupportedNetworks,
  getNetworkByChainId as getUnifiedNetworkByChainId
} from './networks';

// =============================================================================
// LEGACY COMPATIBILITY EXPORTS
// =============================================================================

/**
 * Get network info from unified registry for backwards compatibility
 */
export const NETWORKS: Record<Network, NetworkInfo> = Object.fromEntries(
  getSupportedNetworks().map(network => {
    const config = getNetworkConfig(network);
    if (!config) return [network, undefined];
    
    return [network, {
      name: config.name,
      chainId: config.chainId as number,
      nativeCurrency: config.nativeCurrency,
      rpcUrls: config.rpcUrls,
      blockExplorerUrls: config.blockExplorerUrls,
      iconUrl: config.iconUrl,
      isTestnet: config.isTestnet,
    }];
  }).filter(([, info]) => info !== undefined)
) as Record<Network, NetworkInfo>;

/**
 * Convert unified TokenConfig to legacy TokenInfo format
 */
function convertToTokenInfo(tokenConfig: TokenConfig, network: Network): TokenInfo {
  const networkConfig = getNetworkConfig(network);
  if (!networkConfig) {
    throw new Error(`Network configuration not found for ${network}`);
  }

  const isNative = Boolean(tokenConfig.isNative);
  const isStablecoin = Boolean(tokenConfig.isStablecoin);

  return {
    // Core token data
    symbol: tokenConfig.symbol,
    name: tokenConfig.name,
    decimals: tokenConfig.decimals,
    isNative,
    isStablecoin,
    verified: tokenConfig.verified,
    verificationSource: tokenConfig.verificationSource,
    
    // Legacy specific fields
    network,
    chainId: networkConfig.chainId as number,
    category: isStablecoin ? 'stablecoin' : (isNative ? 'utility' : 'utility'),
    logoUri: tokenConfig.logoUri,
    coingeckoId: tokenConfig.coingeckoId,
    
    // Default metadata for legacy compatibility
    tags: [
      ...(isNative ? ['native', 'gas'] : []),
      ...(isStablecoin ? ['stablecoin', 'payments'] : []),
      ...(networkConfig.isTestnet ? ['testnet'] : ['mainnet']),
    ],
    description: `${tokenConfig.name} on ${networkConfig.name}${networkConfig.isTestnet ? ' (testnet)' : ''}`,
    popularityScore: isStablecoin ? 95 : (isNative ? 100 : 50),
    liquidityTier: 'high' as const,
    recommendedForPayments: isStablecoin || isNative,
  };
}

/**
 * Create token registry from unified network configurations
 */
export const TOKEN_REGISTRY: Record<Network, Record<string, TokenInfo>> = Object.fromEntries(
  getSupportedNetworks().map(network => {
    const tokens = getNetworkTokens(network);
    const tokenEntries = Object.entries(UNIFIED_NETWORKS[network].tokens).map(([tokenId, tokenConfig]) => {
      try {
        const tokenInfo = convertToTokenInfo(tokenConfig, network);
        return [tokenId.toLowerCase(), tokenInfo];
      } catch (error) {
        console.warn(`Failed to convert token ${tokenId} on ${network}:`, error);
        return null;
      }
    }).filter(Boolean) as [string, TokenInfo][];
    
    return [network, Object.fromEntries(tokenEntries)];
  })
) as Record<Network, Record<string, TokenInfo>>;

// =============================================================================
// TOKEN LOOKUP FUNCTIONS
// =============================================================================

/**
 * Get token info by address and network (primary search function)
 */
export const getTokenInfo = (address: string, network: Network): TokenInfo | undefined => {
  const normalizedAddress = address.toLowerCase();
  return TOKEN_REGISTRY[network]?.[normalizedAddress];
};

/**
 * Search tokens across all networks by address
 */
export const getTokenInfoByAddress = (address: string): TokenInfo[] => {
  const normalizedAddress = address.toLowerCase();
  const results: TokenInfo[] = [];

  for (const network of Object.keys(TOKEN_REGISTRY) as Network[]) {
    const token = TOKEN_REGISTRY[network][normalizedAddress];
    if (token) {
      results.push(token);
    }
  }

  return results;
};

/**
 * Get all tokens for a specific network
 */
export const getTokensByNetwork = (network: Network): TokenInfo[] => {
  return Object.values(TOKEN_REGISTRY[network] || {});
};

/**
 * Get all verified tokens only
 */
export const getVerifiedTokens = (): TokenInfo[] => {
  const allTokens: TokenInfo[] = [];
  
  for (const network of Object.keys(TOKEN_REGISTRY) as Network[]) {
    allTokens.push(...Object.values(TOKEN_REGISTRY[network]));
  }

  return allTokens.filter(token => token.verified);
};

/**
 * Get all supported networks
 */
export { getSupportedNetworks };

/**
 * Get recommended tokens for payments on a network
 */
export const getRecommendedPaymentTokens = (network: Network): TokenInfo[] => {
  return getTokensByNetwork(network)
    .filter(token => token.recommendedForPayments)
    .sort((a, b) => b.popularityScore - a.popularityScore);
};

/**
 * Get stablecoins for a network
 */
export const getStablecoins = (network: Network): TokenInfo[] => {
  return getTokensByNetwork(network)
    .filter(token => token.isStablecoin)
    .sort((a, b) => b.popularityScore - a.popularityScore);
};

/**
 * Search tokens by symbol across networks
 */
export const getTokensBySymbol = (symbol: string): TokenInfo[] => {
  const results: TokenInfo[] = [];
  const upperSymbol = symbol.toUpperCase();

  for (const network of Object.keys(TOKEN_REGISTRY) as Network[]) {
    for (const token of Object.values(TOKEN_REGISTRY[network])) {
      if (token.symbol.toUpperCase() === upperSymbol) {
        results.push(token);
      }
    }
  }

  return results.sort((a, b) => b.popularityScore - a.popularityScore);
}

/**
 * Search tokens by name (fuzzy search)
 */
export const searchTokensByName = (query: string): TokenInfo[] => {
  const results: TokenInfo[] = [];
  const lowerQuery = query.toLowerCase();

  for (const network of Object.keys(TOKEN_REGISTRY) as Network[]) {
    for (const token of Object.values(TOKEN_REGISTRY[network])) {
      if (
        token.name.toLowerCase().includes(lowerQuery) ||
        token.symbol.toLowerCase().includes(lowerQuery) ||
        token.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      ) {
        results.push(token);
      }
    }
  }

  return results
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 20);
};

/**
 * Get network info by network key
 */
export const getNetworkInfo = (network: Network): NetworkInfo | undefined => {
  return NETWORKS[network];
};

/**
 * Get network by chain ID (legacy compatibility)
 */
export const getNetworkByChainId = (chainId: number): Network | undefined => {
  const network = getUnifiedNetworkByChainId(chainId);
  return network as Network | undefined;
};

/**
 * Check if an address is a valid token on a network
 */
export const isValidToken = (address: string, network: Network): boolean => {
  return getTokenInfo(address, network) !== undefined;
};

/**
 * Format token amount with proper decimals using precise arithmetic
 */
export const formatTokenAmount = (
  amount: string | number | bigint,
  tokenAddress: string,
  network: Network,
  options: {
    showSymbol?: boolean;
    precision?: number;
    compact?: boolean;
  } = {}
): string => {
  const token = getTokenInfo(tokenAddress, network);
  if (!token) return amount.toString();

  const { showSymbol = true, precision, compact = false } = options;
  
  try {
    // Convert amount to base units string
    let baseUnits: string;
    if (typeof amount === 'bigint') {
      baseUnits = amount.toString();
    } else if (typeof amount === 'number') {
      // If it's already a human-readable number, convert to base units first
      baseUnits = toBaseUnits(amount.toString(), token.decimals);
    } else {
      // Assume it's already base units as string
      baseUnits = amount;
    }
    
    // Determine precision
    const finalPrecision = precision ?? (token.isStablecoin ? 2 : 4);
    
    // Use our precise formatting function
    return formatAmount(baseUnits, token.decimals, {
      symbol: showSymbol ? token.symbol : undefined,
      precision: finalPrecision,
      compact,
      showSymbol
    });
    
  } catch (error) {
    // Fallback to simple string representation if formatting fails
    console.warn('Failed to format token amount:', error);
    const fallback = amount.toString();
    return showSymbol ? `${fallback} ${token.symbol}` : fallback;
  }
};

/**
 * Get token address for native currency (0x0000...)
 */
export const getNativeTokenAddress = (): string => {
  return '0x0000000000000000000000000000000000000000';
};

/**
 * Check if address is native token
 */
export const isNativeToken = (address: string): boolean => {
  return address.toLowerCase() === getNativeTokenAddress();
};

/**
 * Get popular tokens across all networks
 */
export const getPopularTokens = (limit: number = 10): TokenInfo[] => {
  const allTokens: TokenInfo[] = [];
  
  for (const network of Object.keys(TOKEN_REGISTRY) as Network[]) {
    allTokens.push(...Object.values(TOKEN_REGISTRY[network]));
  }

  return allTokens
    .filter(token => token.recommendedForPayments)
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, limit);
};

/**
 * Validate token address format
 */
export const isValidTokenAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Get token verification status
 */
export const getTokenVerification = (address: string, network: Network): {
  verified: boolean;
  source?: string;
} => {
  const token = getTokenInfo(address, network);
  return {
    verified: token?.verified || false,
    source: token?.verificationSource,
  };
};

// =============================================================================
// CONVENIENCE RE-EXPORTS FROM NETWORKS
// =============================================================================

export {
  getMainnetNetworks, getNetworkConfig, getNetworkStablecoins, getNetworkTokens, getTestnetNetworks, getTokenConfig, isNetworkSupported
} from './networks';

// =============================================================================
// EXPORTS
// =============================================================================

export { TOKEN_REGISTRY as default };
