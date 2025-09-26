/**
 * Unified Network Registry for MCPay
 * 
 * This module serves as the single source of truth for all network configurations,
 * token addresses, and blockchain metadata across MCPay. It consolidates data from
 * x402, commons, payment strategies, and other modules.
 * 
 * Key Features:
 * - Unified network type system using kebab-case names
 * - Consistent token address registry with proper casing
 * - Chain ID mappings and RPC configurations
 * - Explorer URL configurations
 * - Native currency definitions
 * - Payment facilitator configurations
 * - CDP network mappings
 */

import type { Address } from 'viem';
import type { StablecoinSymbol, StablecoinConfig } from '@/types/blockchain';

// =============================================================================
// CORE NETWORK TYPES
// =============================================================================

export type UnifiedNetwork = 
  | 'base-sepolia' 
  | 'base' 
  | 'sei-testnet'
  | 'avalanche-fuji' 
  | 'avalanche' 
  | 'iotex'
  | 'ethereum'
  | 'ethereum-sepolia'
  | 'polygon'
  | 'arbitrum'
  | 'solana-mainnet'
  | 'solana-devnet'
  | 'near-mainnet'
  | 'near-testnet';

export type EVMNetwork = Extract<UnifiedNetwork, 
  | 'base-sepolia' 
  | 'base' 
  | 'sei-testnet'
  | 'avalanche-fuji' 
  | 'avalanche' 
  | 'iotex'
  | 'ethereum'
  | 'ethereum-sepolia'
  | 'polygon'
  | 'arbitrum'>;

export type SolanaNetwork = Extract<UnifiedNetwork, 'solana-mainnet' | 'solana-devnet'>;
export type NearNetwork = Extract<UnifiedNetwork, 'near-mainnet' | 'near-testnet'>;

export type BlockchainArchitecture = 'evm' | 'solana' | 'near';

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  address?: Address; // EVM token address
  mint?: string; // Solana mint address
  contract?: string; // Near contract address
  isNative?: boolean;
  isStablecoin?: boolean;
  coingeckoId?: string;
  logoUri?: string;
  verified: boolean;
  verificationSource?: string;
}

export interface NetworkConfig {
  // Basic network info
  name: string;
  chainId: number | string;
  architecture: BlockchainArchitecture;
  isTestnet: boolean;
  
  // Native currency
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  
  // Network infrastructure
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrl?: string;
  
  // Token registry for this network
  tokens: Record<string, TokenConfig>;
  
  // Payment system integration
  facilitatorUrl?: string;
  
  // CDP integration
  cdpSupported: boolean;
  cdpNetworkName?: string; // CDP's internal network name
  
  // x402 integration
  x402Supported: boolean;

  isSupported: boolean;
}

// =============================================================================
// STABLECOIN CONFIGURATIONS
// =============================================================================

export const STABLECOIN_CONFIGS: Record<StablecoinSymbol, StablecoinConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
    isPegged: true,
    pegTarget: 1.0,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    coingeckoId: 'tether',
    isPegged: true,
    pegTarget: 1.0,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    coingeckoId: 'dai',
    isPegged: true,
    pegTarget: 1.0,
  },
  BUSD: {
    symbol: 'BUSD',
    name: 'Binance USD',
    decimals: 18,
    coingeckoId: 'binance-usd',
    isPegged: true,
    pegTarget: 1.0,
  },
  FRAX: {
    symbol: 'FRAX',
    name: 'Frax',
    decimals: 18,
    coingeckoId: 'frax',
    isPegged: false,
    pegTarget: 1.0,
  },
  TUSD: {
    symbol: 'TUSD',
    name: 'TrueUSD',
    decimals: 18,
    coingeckoId: 'true-usd',
    isPegged: true,
    pegTarget: 1.0,
  },
  USDP: {
    symbol: 'USDP',
    name: 'Pax Dollar',
    decimals: 18,
    coingeckoId: 'paxos-standard',
    isPegged: true,
    pegTarget: 1.0,
  },
};

// =============================================================================
// NETWORK CONFIGURATIONS
// =============================================================================

export const UNIFIED_NETWORKS: Record<UnifiedNetwork, NetworkConfig> = {
  // BASE SEPOLIA (TESTNET)
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    architecture: 'evm',
    isTestnet: true,
    isSupported: true,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org'],
    iconUrl: '/networks/base.svg',
    cdpSupported: true,
    cdpNetworkName: 'base-sepolia',
    x402Supported: true,
    tokens: {
      // Native ETH
      '0x0000000000000000000000000000000000000000': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'ethereum',
        logoUri: '/tokens/eth.svg',
        verified: true,
        verificationSource: 'Base Network Official',
      },
      // USDC (Circle Official)
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'Circle Official Documentation',
      },
      // USDT 
      '0x036cec1a199234fc02f72d29e596a58034100694': {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        address: '0x036cec1a199234fc02f72d29e596a58034100694',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'tether',
        logoUri: '/tokens/usdt.svg',
        verified: true,
        verificationSource: 'Community Verified',
      },
      // DAI
      '0xf59d77573c53e81809c7d9eb7d83be9f4f412c4c': {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        address: '0xf59d77573c53e81809c7d9eb7d83be9f4f412c4c',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'dai',
        logoUri: '/tokens/dai.svg',
        verified: true,
        verificationSource: 'Community Verified',
      },
    },
  },

  // BASE MAINNET
  'base': {
    name: 'Base',
    chainId: 8453,
    architecture: 'evm',
    isTestnet: false,
    isSupported: true,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    iconUrl: '/networks/base.svg',
    cdpSupported: true,
    cdpNetworkName: 'base',
    x402Supported: true,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'ethereum',
        logoUri: '/tokens/eth.svg',
        verified: true,
        verificationSource: 'Base Network Official',
      },
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'Circle Official Documentation',
      },
      '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2': {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'tether',
        logoUri: '/tokens/usdt.svg',
        verified: true,
        verificationSource: 'Tether Official',
      },
      '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'dai',
        logoUri: '/tokens/dai.svg',
        verified: true,
        verificationSource: 'MakerDAO Official',
      },
    },
  },

  // SEI TESTNET
  'sei-testnet': {
    name: 'Sei Testnet',
    chainId: 1328,
    architecture: 'evm',
    isTestnet: true,
    isSupported: true,
    nativeCurrency: {
      name: 'Sei',
      symbol: 'SEI',
      decimals: 18,
    },
    rpcUrls: ['https://evm-rpc-testnet.sei-apis.com'],
    blockExplorerUrls: ['https://seitrace.com'],
    iconUrl: '/networks/sei.svg',
    cdpSupported: true,
    x402Supported: true,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'SEI',
        name: 'Sei',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'sei-network',
        logoUri: '/tokens/sei.svg',
        verified: true,
        verificationSource: 'Sei Protocol Official',
      },
      '0x4fCF1784B31630811181f670Aea7A7bEF803eaED': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0x4fCF1784B31630811181f670Aea7A7bEF803eaED',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'User Verified',
      },
    },
  },

  // AVALANCHE FUJI TESTNET
  'avalanche-fuji': {
    name: 'Avalanche Fuji',
    chainId: 43113,
    architecture: 'evm',
    isTestnet: true,
    isSupported: false,
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io'],
    iconUrl: '/networks/avalanche.svg',
    cdpSupported: false,
    x402Supported: true,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'avalanche-2',
        logoUri: '/tokens/avax.svg',
        verified: true,
        verificationSource: 'Avalanche Official',
      },
      '0x5425890298aed601595a70AB815c96711a31Bc65': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0x5425890298aed601595a70AB815c96711a31Bc65',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'Circle Official',
      },
    },
  },

  // AVALANCHE MAINNET
  'avalanche': {
    name: 'Avalanche',
    chainId: 43114,
    architecture: 'evm',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://snowtrace.io'],
    iconUrl: '/networks/avalanche.svg',
    cdpSupported: false,
    x402Supported: true,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'AVAX',
        name: 'Avalanche',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'avalanche-2',
        logoUri: '/tokens/avax.svg',
        verified: true,
        verificationSource: 'Avalanche Official',
      },
      '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'Circle Official',
      },
      '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7': {
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'tether',
        logoUri: '/tokens/usdt.svg',
        verified: true,
        verificationSource: 'Tether Official',
      },
      '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70': {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        address: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'dai',
        logoUri: '/tokens/dai.svg',
        verified: true,
        verificationSource: 'MakerDAO Official',
      },
    },
  },

  // IOTEX MAINNET
  'iotex': {
    name: 'IoTeX',
    chainId: 4689,
    architecture: 'evm',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'IoTeX',
      symbol: 'IOTX',
      decimals: 18,
    },
    rpcUrls: ['https://babel-api.mainnet.iotex.io'],
    blockExplorerUrls: ['https://iotexscan.io'],
    iconUrl: '/networks/iotex.svg',
    cdpSupported: false,
    x402Supported: true,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'IOTX',
        name: 'IoTeX',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'iotex',
        logoUri: '/tokens/iotx.svg',
        verified: true,
        verificationSource: 'IoTeX Official',
      },
      '0xcdf79194c6c285077a58da47641d4dbe51f63542': {
        symbol: 'USDC',
        name: 'Bridged USDC',
        decimals: 6,
        address: '0xcdf79194c6c285077a58da47641d4dbe51f63542',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'IoTeX Bridge Official',
      },
    },
  },

  // ETHEREUM MAINNET
  'ethereum': {
    name: 'Ethereum',
    chainId: 1,
    architecture: 'evm',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://eth.llamarpc.com'],
    blockExplorerUrls: ['https://etherscan.io'],
    iconUrl: '/networks/ethereum.svg',
    cdpSupported: true,
    cdpNetworkName: 'ethereum',
    x402Supported: false,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'ethereum',
        logoUri: '/tokens/eth.svg',
        verified: true,
        verificationSource: 'Ethereum Foundation',
      },
    },
  },

  // ETHEREUM SEPOLIA TESTNET
  'ethereum-sepolia': { 
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    architecture: 'evm',
    isTestnet: true,
    isSupported: false,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    iconUrl: '/networks/ethereum.svg',
    cdpSupported: true,
    cdpNetworkName: 'ethereum-sepolia',
    x402Supported: false,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'ethereum',
        logoUri: '/tokens/eth.svg',
        verified: true,
        verificationSource: 'Ethereum Foundation',
      },
    },
  },

  // POLYGON MAINNET
  'polygon': {
    name: 'Polygon',
    chainId: 137,
    architecture: 'evm',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://polygonscan.com'],
    iconUrl: '/networks/polygon.svg',
    cdpSupported: true,
    cdpNetworkName: 'polygon',
    x402Supported: false,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'MATIC',
        name: 'Polygon',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'matic-network',
        logoUri: '/tokens/matic.svg',
        verified: true,
        verificationSource: 'Polygon Official',
      },
    },
  },

  // ARBITRUM MAINNET
  'arbitrum': { 
    name: 'Arbitrum One',
    chainId: 42161,
    architecture: 'evm',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io'],
    iconUrl: '/networks/arbitrum.svg',
    cdpSupported: true,
    cdpNetworkName: 'arbitrum',
    x402Supported: false,
    tokens: {
      '0x0000000000000000000000000000000000000000': {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'ethereum',
        logoUri: '/tokens/eth.svg',
        verified: true,
        verificationSource: 'Arbitrum Official',
      },
    },
  },

  // SOLANA MAINNET
  'solana-mainnet': {
    name: 'Solana Mainnet',
    chainId: 'mainnet-beta',
    architecture: 'solana',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: ['https://api.mainnet-beta.solana.com'],
    blockExplorerUrls: ['https://explorer.solana.com'],
    iconUrl: '/networks/solana.svg',
    cdpSupported: false,
    x402Supported: false,
    tokens: {
      'So11111111111111111111111111111111111111112': {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'solana',
        logoUri: '/tokens/sol.svg',
        verified: true,
        verificationSource: 'Solana Foundation',
      },
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        isNative: false,
        isStablecoin: true,
        coingeckoId: 'usd-coin',
        logoUri: '/tokens/usdc.svg',
        verified: true,
        verificationSource: 'Circle Official',
      },
    },
  },

  // SOLANA DEVNET
  'solana-devnet': {
    name: 'Solana Devnet',
    chainId: 'devnet',
    architecture: 'solana',
    isTestnet: true,
    isSupported: false,
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
    },
    rpcUrls: ['https://api.devnet.solana.com'],
    blockExplorerUrls: ['https://explorer.solana.com?cluster=devnet'],
    iconUrl: '/networks/solana.svg',
    cdpSupported: false,
    x402Supported: false,
    tokens: {
      'So11111111111111111111111111111111111111112': {
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'solana',
        logoUri: '/tokens/sol.svg',
        verified: true,
        verificationSource: 'Solana Foundation',
      },
    },
  },

  // NEAR MAINNET
  'near-mainnet': { 
    name: 'NEAR Mainnet',
    chainId: 'mainnet',
    architecture: 'near',
    isTestnet: false,
    isSupported: false,
    nativeCurrency: {
      name: 'NEAR',
      symbol: 'NEAR',
      decimals: 24,
    },
    rpcUrls: ['https://rpc.mainnet.near.org'],
    blockExplorerUrls: ['https://explorer.near.org'],
    iconUrl: '/networks/near.svg',
    cdpSupported: false,
    x402Supported: false,
    tokens: {
      'near': {
        symbol: 'NEAR',
        name: 'NEAR',
        decimals: 24,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'near',
        logoUri: '/tokens/near.svg',
        verified: true,
        verificationSource: 'NEAR Protocol',
      },
    },
  },

  // NEAR TESTNET
  'near-testnet': {
    name: 'NEAR Testnet',
    chainId: 'testnet',
    architecture: 'near',
    isTestnet: true,
    isSupported: false,
    nativeCurrency: {
      name: 'NEAR',
      symbol: 'NEAR',
      decimals: 24,
    },
    rpcUrls: ['https://rpc.testnet.near.org'],
    blockExplorerUrls: ['https://explorer.testnet.near.org'],
    iconUrl: '/networks/near.svg',
    cdpSupported: false,
    x402Supported: false,
    tokens: {
      'near': {
        symbol: 'NEAR',
        name: 'NEAR',
        decimals: 24,
        isNative: true,
        isStablecoin: false,
        coingeckoId: 'near',
        logoUri: '/tokens/near.svg',
        verified: true,
        verificationSource: 'NEAR Protocol',
      },
    },
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get network configuration by network key
 */
export function getNetworkConfig(network: UnifiedNetwork): NetworkConfig | undefined {
  return UNIFIED_NETWORKS[network];
}

/**
 * Get all supported networks
 */
export function getSupportedNetworks(): UnifiedNetwork[] {
  return Object.keys(UNIFIED_NETWORKS) as UnifiedNetwork[];
}

/**
 * Get EVM networks only
 */
export function getEVMNetworks(): EVMNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].architecture === 'evm'
  ) as EVMNetwork[];
}

/**
 * Get Solana networks only
 */
export function getSolanaNetworks(): SolanaNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].architecture === 'solana'
  ) as SolanaNetwork[];
}

/**
 * Get Near networks only
 */
export function getNearNetworks(): NearNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].architecture === 'near'
  ) as NearNetwork[];
}

/**
 * Get mainnet networks only
 */
export function getMainnetNetworks(): UnifiedNetwork[] {
  return getSupportedNetworks().filter(network => 
    !UNIFIED_NETWORKS[network].isTestnet
  );
}

/**
 * Get testnet networks only
 */
export function getTestnetNetworks(): UnifiedNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].isTestnet
  );
}

/**
 * Get network by chain ID
 */
export function getNetworkByChainId(chainId: number | string): UnifiedNetwork | undefined {
  for (const [network, config] of Object.entries(UNIFIED_NETWORKS)) {
    if (config.chainId === chainId) {
      return network as UnifiedNetwork;
    }
  }
  return undefined;
}

/**
 * Get token configuration by address and network
 */
export function getTokenConfig(network: UnifiedNetwork, tokenId: string): TokenConfig | undefined {
  const networkConfig = UNIFIED_NETWORKS[network];
  if (!networkConfig) return undefined;
  
  // Normalize token ID for lookup (lowercase for EVM addresses)
  const normalizedTokenId = networkConfig.architecture === 'evm' 
    ? tokenId.toLowerCase() 
    : tokenId;
  
  return networkConfig.tokens[normalizedTokenId];
}

/**
 * Get all tokens for a network
 */
export function getNetworkTokens(network: UnifiedNetwork): TokenConfig[] {
  const networkConfig = UNIFIED_NETWORKS[network];
  if (!networkConfig) return [];
  
  return Object.values(networkConfig.tokens);
}

/**
 * Get stablecoins for a network
 */
export function getNetworkStablecoins(network: UnifiedNetwork): TokenConfig[] {
  return getNetworkTokens(network).filter(token => token.isStablecoin);
}

/**
 * Get networks that support x402 payments
 */
export function getX402Networks(): UnifiedNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].x402Supported
  );
}

/**
 * Get networks that support CDP
 */
export function getCDPNetworks(): UnifiedNetwork[] {
  return getSupportedNetworks().filter(network => 
    UNIFIED_NETWORKS[network].cdpSupported
  );
}

/**
 * Check if a network is supported
 */
export function isNetworkSupported(network: string): network is UnifiedNetwork {
  return network in UNIFIED_NETWORKS;
}

/**
 * Check if a network is testnet
 */
export function isTestnetNetwork(network: UnifiedNetwork): boolean {
  return UNIFIED_NETWORKS[network]?.isTestnet || false;
}

/**
 * Get facilitator URL for a network
 */
export function getFacilitatorUrl(network: UnifiedNetwork): string | undefined {
  return UNIFIED_NETWORKS[network]?.facilitatorUrl;
}

/**
 * Get CDP network name for a network
 */
export function getCDPNetworkName(network: UnifiedNetwork): string | undefined {
  return UNIFIED_NETWORKS[network]?.cdpNetworkName;
}

// =============================================================================
// LEGACY COMPATIBILITY MAPPINGS
// =============================================================================

/**
 * Map from old camelCase names to new kebab-case names
 */
export const LEGACY_NETWORK_MAPPING: Record<string, UnifiedNetwork> = {
  'baseSepolia': 'base-sepolia',
  'seiTestnet': 'sei-testnet',
  'avalancheFuji': 'avalanche-fuji',
  'solanaMainnet': 'solana-mainnet',
  'solanaDevnet': 'solana-devnet',
  'nearMainnet': 'near-mainnet',
  'nearTestnet': 'near-testnet',
  'ethereumSepolia': 'ethereum-sepolia',
};

/**
 * Convert legacy network name to unified network name
 */
export function normalizeLegacyNetwork(legacyNetwork: string): UnifiedNetwork | undefined {
  // Check if it's already a unified network name
  if (isNetworkSupported(legacyNetwork)) {
    return legacyNetwork;
  }
  
  // Check legacy mapping
  return LEGACY_NETWORK_MAPPING[legacyNetwork];
}

// =============================================================================
// X402 COMPATIBILITY
// =============================================================================

/**
 * Map UnifiedNetwork to x402 SupportedNetwork format
 */
export function toX402Network(network: UnifiedNetwork): string {
  return network; // They now use the same format
}

/**
 * Map x402 SupportedNetwork to UnifiedNetwork format
 */
export function fromX402Network(x402Network: string): UnifiedNetwork | undefined {
  return isNetworkSupported(x402Network) ? x402Network : undefined;
}

/**
 * Get USDC address for a network (x402 compatibility)
 */
export function getUSDCAddress(network: UnifiedNetwork): Address | undefined {
  const networkConfig = UNIFIED_NETWORKS[network];
  if (!networkConfig) return undefined;
  
  // Find USDC token in network tokens
  for (const token of Object.values(networkConfig.tokens)) {
    if (token.symbol === 'USDC' && token.address) {
      return token.address as Address;
    }
  }
  return undefined;
}

// =============================================================================
// CHAIN ID MAPPINGS
// =============================================================================

/**
 * Create chain ID to network mapping
 */
export const CHAIN_ID_TO_NETWORK = Object.fromEntries(
  Object.entries(UNIFIED_NETWORKS).map(([network, config]) => [
    config.chainId,
    network as UnifiedNetwork
  ])
) as Record<number | string, UnifiedNetwork>;

/**
 * Create network to chain ID mapping
 */
export const NETWORK_TO_CHAIN_ID = Object.fromEntries(
  Object.entries(UNIFIED_NETWORKS).map(([network, config]) => [
    network,
    config.chainId
  ])
) as Record<UnifiedNetwork, number | string>;

// =============================================================================
// BLOCKCHAIN ARCHITECTURE UTILITIES
// =============================================================================

/**
 * Mapping of blockchain names to their architectures
 */
export const BLOCKCHAIN_TO_ARCHITECTURE: Record<string, BlockchainArchitecture> = {
  // EVM blockchains
  'ethereum': 'evm',
  'base': 'evm',
  'polygon': 'evm',
  'arbitrum': 'evm',
  'optimism': 'evm',
  'avalanche': 'evm',
  'iotex': 'evm',
  'sei': 'evm',
  
  // Solana
  'solana': 'solana',
  
  // Near
  'near': 'near',
  
  // Add aliases for consistency
  'eth': 'evm',
  'matic': 'evm',
  'arb': 'evm',
  'op': 'evm',
  'avax': 'evm',
  'sol': 'solana',
};

/**
 * Get blockchain architecture for a given blockchain name
 */
export function getBlockchainArchitecture(blockchain: string | null | undefined): BlockchainArchitecture {
  if (!blockchain) {
    return 'evm'; // Default to EVM
  }
  
  const normalizedBlockchain = blockchain.toLowerCase().trim();
  
  if (BLOCKCHAIN_TO_ARCHITECTURE[normalizedBlockchain]) {
    return BLOCKCHAIN_TO_ARCHITECTURE[normalizedBlockchain];
  }
  
  // Default to EVM for unknown blockchains
  console.warn(`Unknown blockchain "${blockchain}", defaulting to EVM architecture`);
  return 'evm';
}

/**
 * Get list of blockchains for a given architecture
 */
export function getBlockchainsForArchitecture(architecture: BlockchainArchitecture): string[] {
  return Object.entries(BLOCKCHAIN_TO_ARCHITECTURE)
    .filter(([, arch]) => arch === architecture)
    .map(([blockchain]) => blockchain);
}

/**
 * Check if a blockchain is supported
 */
export function isSupportedBlockchain(blockchain: string): boolean {
  if (!blockchain) return false;
  return Boolean(BLOCKCHAIN_TO_ARCHITECTURE[blockchain.toLowerCase().trim()]);
}

/**
 * Get the native token symbol for a blockchain
 */
export function getNativeTokenSymbol(blockchain: string): string {
  const architecture = getBlockchainArchitecture(blockchain);
  
  switch (architecture) {
    case 'evm':
      // Most EVM chains use ETH as native token
      if (blockchain.toLowerCase().includes('polygon') || blockchain.toLowerCase().includes('matic')) {
        return 'MATIC';
      }
      if (blockchain.toLowerCase().includes('avalanche') || blockchain.toLowerCase().includes('avax')) {
        return 'AVAX';
      }
      return 'ETH';
    case 'solana':
      return 'SOL';
    case 'near':
      return 'NEAR';
    default:
      return 'ETH';
  }
} 