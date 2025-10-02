/**
 * MCPay Commons Library
 * 
 * A unified library containing all common token operations, amount handling,
 * and blockchain configurations for both frontend and backend usage.
 * 
 * This library consolidates:
 * - Token registry and metadata
 * - Amount conversion and arithmetic utilities  
 * - Unified network and blockchain configurations
 * - Multi-chain stablecoin tracking
 * - Type definitions and utility functions
 */

// =============================================================================
// AMOUNT UTILITIES EXPORTS
// =============================================================================

export {

  // Arithmetic operations
  addAmounts, addRevenueToCurrency, aggregateDbAmounts,
  // Error class
  AmountConversionError, compareAmounts,
  // Multi-currency revenue operations
  createCurrencyKey, formatAmount, formatDbAmount, formatRevenueByCurrency, fromBaseUnits, fromDbAmount, getRevenueByCurrency,
  hasRevenue, isZeroAmount, mergeRevenueByCurrency, parseCurrencyKey,
  // User input parsing
  parseUserAmount, subtractAmounts,
  // Core conversion functions
  toBaseUnits,
  // Database integration
  toDbAmount,
  // Validation
  validateBaseAmount, validateDbAmount
} from './amounts';

// =============================================================================
// NETWORK AND TOKEN REGISTRY EXPORTS (UNIFIED SYSTEM)
// =============================================================================

export {

  // Architecture utilities (from unified networks system)
  BLOCKCHAIN_TO_ARCHITECTURE,
  // Chain ID mappings
  CHAIN_ID_TO_NETWORK, fromX402Network, getBlockchainArchitecture,
  getBlockchainsForArchitecture, getCDPNetworkName, getCDPNetworks,
  // Network filtering functions
  getEVMNetworks, getFacilitatorUrl, getMainnetNetworks, getNativeTokenSymbol, getNearNetworks, getNetworkByChainId,
  // Network configuration functions
  getNetworkConfig, getNetworkStablecoins, getNetworkTokens, getSolanaNetworks, getSupportedNetworks, getTestnetNetworks, getTokenConfig, getUSDCAddress,
  // CDP and payment network utilities
  getX402Networks,
  // Network validation and utilities
  isNetworkSupported, isSupportedBlockchain, isTestnetNetwork,
  // Legacy compatibility
  LEGACY_NETWORK_MAPPING, NETWORK_TO_CHAIN_ID, normalizeLegacyNetwork,
  toX402Network, UNIFIED_NETWORKS, type NetworkConfig,
  type TokenConfig,
  // Core unified network types and data
  type UnifiedNetwork
} from './networks';

// =============================================================================
// BALANCE TRACKER EXPORTS
// =============================================================================

export {
  getMainnetStablecoinBalances, getStablecoinBalanceOnChain,
  getStablecoinBalances,
  getStablecoinBalancesOnChains, getTestnetStablecoinBalances,
  // Balance checking functions
  type StablecoinClient
} from './balance-tracker';

// =============================================================================
// STABLECOIN CONFIGURATIONS (from unified networks)
// =============================================================================

export {
  STABLECOIN_CONFIGS
} from './networks';

// =============================================================================
// TOKEN REGISTRY EXPORTS (LEGACY COMPATIBILITY)
// =============================================================================

export {

  // Token formatting
  formatTokenAmount,

  // Address utilities
  getNativeTokenAddress, getNetworkByChainId as getNetworkByChainIdLegacy,
  // Network utilities (legacy)
  getNetworkInfo, getPopularTokens, getRecommendedPaymentTokens,
  getStablecoins,
  // Search and lookup functions
  getTokenInfo,
  getTokenInfoByAddress,
  getTokensByNetwork, getTokensBySymbol, getTokenVerification, getVerifiedTokens, isNativeToken, isValidToken, isValidTokenAddress, NETWORKS, searchTokensByName,
  // Legacy token registry
  TOKEN_REGISTRY
} from './tokens';

// =============================================================================
// CONSTANTS & ENUMS
// =============================================================================

export { COMMON_DECIMALS } from '@/types/blockchain';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

/**
 * Re-export the most commonly used functions for easier access
 */

// Amount operations (most common)
export {
  fromBaseUnits as convertFromBaseUnits, toBaseUnits as convertToBaseUnits, formatAmount as formatTokenValue
} from './amounts';

// Network operations (most common) - use unified system
export {
  getNetworkConfig as findNetwork,
  getNetworkStablecoins as findStablecoins, getEVMNetworks as getEvmNetworks, isTestnetNetwork as isTestnet
} from './networks';

// Balance tracking (most common)
export {
  getStablecoinBalances as checkBalances,
  getMainnetStablecoinBalances as checkMainnetBalances,
  getTestnetStablecoinBalances as checkTestnetBalances
} from './balance-tracker';

// =============================================================================
// UTILITY AGGREGATIONS
// =============================================================================

// Import the specific functions we need for utility functions
import type { Network } from '@/types/blockchain';
import { COMMON_DECIMALS } from '@/types/blockchain';
import {
  formatAmount,
  fromBaseUnits,
  toBaseUnits,
  validateBaseAmount
} from './amounts';
import {
  getNetworkConfig,
  isNetworkSupported as isUnifiedNetworkSupported,
  UNIFIED_NETWORKS
} from './networks';
import {
  formatTokenAmount,
  getNetworkInfo,
  getRecommendedPaymentTokens,
  getStablecoins,
  getSupportedNetworks,
  getTokenInfo,
  isValidToken,
  NETWORKS,
  TOKEN_REGISTRY
} from './tokens';


/**
 * Get complete token information including network config
 */
export function getCompleteTokenInfo(address: string, network: Network) {
  const token = getTokenInfo(address, network);
  const networkInfo = getNetworkInfo(network);
  
  return token && networkInfo ? {
    token,
    network: networkInfo,
    isTestnet: networkInfo.isTestnet,
    chainId: networkInfo.chainId,
  } : null;
}

/**
 * Get all payment-ready tokens across all networks
 */
export function getAllPaymentTokens() {
  const networks = getSupportedNetworks();
  const paymentTokens = [];
  
  for (const network of networks) {
    paymentTokens.push(...getRecommendedPaymentTokens(network));
  }
  
  return paymentTokens.sort((a, b) => b.popularityScore - a.popularityScore);
}

/**
 * Get all stablecoins across all networks
 */
export function getAllStablecoins() {
  const networks = getSupportedNetworks();
  const stablecoins = [];
  
  for (const network of networks) {
    stablecoins.push(...getStablecoins(network));
  }
  
  return stablecoins.sort((a, b) => b.popularityScore - a.popularityScore);
}

/**
 * Format amount with automatic token detection
 */
export function smartFormatAmount(
  amount: string,
  tokenAddress: string,
  network: Network,
  options?: {
    showSymbol?: boolean;
    precision?: number;
    compact?: boolean;
  }
) {
  const token = getTokenInfo(tokenAddress, network);
  if (!token) {
    return amount;
  }
  
  return formatTokenAmount(amount, tokenAddress, network, options);
}

// =============================================================================
// VERSION & METADATA
// =============================================================================

export const COMMONS_VERSION = '2.0.0';
export const COMMONS_NAME = 'MCPay Commons';

// Re-export main modules for direct access if needed
import * as Amounts from './amounts';
import * as Networks from './networks';
import * as Tokens from './tokens';

import * as Types from '@/types/blockchain';
import * as BalanceTracker from './balance-tracker';

export { Amounts, BalanceTracker, Networks, Tokens, Types };

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Default export with organized namespaces
 */
export default {
  version: COMMONS_VERSION,
  name: COMMONS_NAME,
  
  // Primary modules (unified system)
  amounts: Amounts,
  networks: Networks,
  balanceTracker: BalanceTracker,
  types: Types,
  
  // Legacy modules (deprecated)
  tokens: Tokens,
  
  // Quick access to most common functions
  convert: {
    toBaseUnits,
    fromBaseUnits,
    formatAmount,
  },
  
  find: {
    network: getNetworkConfig,
    token: getTokenInfo,
    stablecoins: getStablecoins,
  },
  
  validate: {
    amount: validateBaseAmount,
    token: isValidToken,
    network: isUnifiedNetworkSupported,
  },
  
  // Balance tracking shortcuts
  balances: {
    check: BalanceTracker.getStablecoinBalances,
    checkMainnet: BalanceTracker.getMainnetStablecoinBalances,
    checkTestnet: BalanceTracker.getTestnetStablecoinBalances,
    checkOnChains: BalanceTracker.getStablecoinBalancesOnChains,
  },
  
  // Constants
  constants: {
    COMMON_DECIMALS,
    UNIFIED_NETWORKS,

    TOKEN_REGISTRY,
    NETWORKS,
  },
};
