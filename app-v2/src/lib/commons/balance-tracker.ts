/**
 * Multi-Chain Stablecoin Balance Tracker for MCPay Commons
 * 
 * This library provides a chain-agnostic interface for checking stablecoin balances
 * across multiple blockchain architectures and calculating total fiat value.
 * 
 * ## Supported Stablecoins:
 * - **USDC**: USD Coin (Circle)
 * - **USDT**: Tether USD
 * - **DAI**: MakerDAO Stablecoin
 * - **BUSD**: Binance USD (where available)
 * - **FRAX**: Frax Stablecoin
 * 
 * ## Supported Blockchain Architectures:
 * - **EVM**: Ethereum Virtual Machine compatible chains (using viem)
 * - **Solana**: Solana blockchain (placeholder for @solana/web3.js implementation)
 * - **Near**: Near Protocol (placeholder for near-api-js implementation)
 * 
 * ## Key Features:
 * 
 * 1. **Multi-Stablecoin Support**: Track USDC, USDT, DAI, and other stablecoins
 * 2. **Fiat Value Calculation**: Get USD-denominated balances across all tokens
 * 3. **Price Integration**: Real-time or configured pricing for accurate fiat values
 * 4. **Chain-Agnostic**: Works across EVM, Solana, Near, and other architectures
 * 5. **Aggregated Reporting**: Total fiat balance across all accounts, tokens, and chains
 * 6. **Mainnet/Testnet Separation**: Proper handling of test vs real money
 */

import type {
  BlockchainAddress,
  BlockchainArchitecture,
  MultiChainStablecoinResult,
  PriceProvider,
  StablecoinBalance,
  StablecoinBalanceError,
  StablecoinSymbol
} from '@/types/blockchain';
import { createPublicClient, formatUnits, http, type Address } from 'viem';
import { STABLECOIN_CONFIGS } from './networks';
import {
  getEVMNetworks,
  getMainnetNetworks,
  getNearNetworks,
  getNetworkConfig,
  getSolanaNetworks,
  getSupportedNetworks,
  getTestnetNetworks,
  isTestnetNetwork,
  type NetworkConfig,
  type TokenConfig,
  type UnifiedNetwork
} from './networks';

// =============================================================================
// STABLECOIN CLIENT INTERFACES & IMPLEMENTATIONS
// =============================================================================

// Abstract interface for blockchain clients
export interface StablecoinClient {
  getTokenBalance(
    address: BlockchainAddress, 
    tokenConfig: TokenConfig, 
    chainConfig: NetworkConfig
  ): Promise<bigint>;
}

// EVM client implementation using viem
class EVMStablecoinClient implements StablecoinClient {
  private erc20Abi = [
    {
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;

  async getTokenBalance(
    address: BlockchainAddress, 
    tokenConfig: TokenConfig, 
    chainConfig: NetworkConfig
  ): Promise<bigint> {
    if (chainConfig.architecture !== 'evm' || !tokenConfig.address) {
      throw new Error('Invalid EVM configuration');
    }

    const client = createPublicClient({
      transport: http(chainConfig.rpcUrls[0]),
    });

    const balance = await client.readContract({
      address: tokenConfig.address as Address,
      abi: this.erc20Abi,
      functionName: 'balanceOf',
      args: [address as Address],
    }) as bigint;

    return balance;
  }
}

// Solana client implementation (placeholder - would use @solana/web3.js)
class SolanaStablecoinClient implements StablecoinClient {
  async getTokenBalance(
    address: BlockchainAddress, 
    tokenConfig: TokenConfig, 
    chainConfig: NetworkConfig
  ): Promise<bigint> {
    if (chainConfig.architecture !== 'solana' || !tokenConfig.mint) {
      throw new Error('Invalid Solana configuration');
    }

    // TODO: Implement Solana SPL token balance checking
    // This would use @solana/web3.js and @solana/spl-token
    throw new Error('Solana balance checking not implemented yet');
  }
}

// Near client implementation (placeholder - would use near-api-js)
class NearStablecoinClient implements StablecoinClient {
  async getTokenBalance(
    address: BlockchainAddress, 
    tokenConfig: TokenConfig, 
    chainConfig: NetworkConfig
  ): Promise<bigint> {
    if (chainConfig.architecture !== 'near' || !tokenConfig.contract) {
      throw new Error('Invalid Near configuration');
    }

    // TODO: Implement Near fungible token balance checking
    // This would use near-api-js
    throw new Error('Near balance checking not implemented yet');
  }
}

// Factory to create appropriate client based on chain architecture
function createStablecoinClient(architecture: BlockchainArchitecture): StablecoinClient {
  switch (architecture) {
    case 'evm':
      return new EVMStablecoinClient();
    case 'solana':
      return new SolanaStablecoinClient();
    case 'near':
      return new NearStablecoinClient();
    default:
      throw new Error(`Unsupported blockchain architecture: ${architecture}`);
  }
}

// =============================================================================
// CORE BALANCE CHECKING FUNCTIONS
// =============================================================================

/**
 * Check balance for a single stablecoin on a single chain for a single account
 */
export async function getStablecoinBalanceOnChain(
  address: BlockchainAddress,
  network: UnifiedNetwork,
  stablecoinSymbol: StablecoinSymbol,
  priceProvider: PriceProvider = createSimplePriceProvider()
): Promise<StablecoinBalance | StablecoinBalanceError> {
  const networkConfig = getNetworkConfig(network);
  if (!networkConfig) {
    return {
      address,
      chain: network,
      chainId: 'unknown',
      chainName: 'Unknown',
      architecture: 'evm', // default fallback
      isTestnet: false, // default fallback
      stablecoin: stablecoinSymbol,
      tokenIdentifier: 'unknown',
      error: `Unsupported network: ${network}`,
    };
  }

  // Find the stablecoin token in this network's token registry
  const stablecoinToken = Object.values(networkConfig.tokens).find(
    token => token.symbol === stablecoinSymbol && token.isStablecoin
  );

  if (!stablecoinToken) {
    return {
      address,
      chain: network,
      chainId: networkConfig.chainId,
      chainName: networkConfig.name,
      architecture: networkConfig.architecture,
      isTestnet: networkConfig.isTestnet,
      stablecoin: stablecoinSymbol,
      tokenIdentifier: 'not_found',
      error: `${stablecoinSymbol} not supported on ${networkConfig.name}`,
    };
  }

  const stablecoinConfig = STABLECOIN_CONFIGS[stablecoinSymbol];
  
  try {
    const client = createStablecoinClient(networkConfig.architecture);
    const balance = await client.getTokenBalance(address, stablecoinToken, networkConfig);
    const priceUsd = await priceProvider.getPrice(stablecoinSymbol);

    // Format balance using the stablecoin's decimals
    const formattedBalance = formatUnits(balance, stablecoinConfig.decimals);
    const fiatValue = parseFloat(formattedBalance) * priceUsd;

    // Get the appropriate token identifier based on chain architecture
    let tokenIdentifier: string;
    if (stablecoinToken.address) {
      tokenIdentifier = stablecoinToken.address;
    } else if (stablecoinToken.mint) {
      tokenIdentifier = stablecoinToken.mint;
    } else if (stablecoinToken.contract) {
      tokenIdentifier = stablecoinToken.contract;
    } else {
      tokenIdentifier = 'unknown';
    }

    return {
      address,
      chain: network,
      chainId: networkConfig.chainId,
      chainName: networkConfig.name,
      architecture: networkConfig.architecture,
      isTestnet: networkConfig.isTestnet,
      stablecoin: stablecoinSymbol,
      stablecoinName: stablecoinConfig.name,
      tokenIdentifier,
      balance,
      formattedBalance,
      decimals: stablecoinConfig.decimals,
      priceUsd,
      fiatValue,
    };
  } catch (error) {
    const tokenIdentifier = stablecoinToken.address || stablecoinToken.mint || stablecoinToken.contract || 'unknown';

    return {
      address,
      chain: network,
      chainId: networkConfig.chainId,
      chainName: networkConfig.name,
      architecture: networkConfig.architecture,
      isTestnet: networkConfig.isTestnet,
      stablecoin: stablecoinSymbol,
      tokenIdentifier,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check stablecoin balances for multiple accounts across all supported chains
 */
export async function getStablecoinBalances(
  addresses: BlockchainAddress[],
  stablecoins: StablecoinSymbol[] = ['USDC', 'USDT', 'DAI'],
  priceProvider: PriceProvider = createSimplePriceProvider()
): Promise<MultiChainStablecoinResult> {
  if (!addresses || addresses.length === 0) {
    return createEmptyResult();
  }

  const balances: StablecoinBalance[] = [];
  const errors: StablecoinBalanceError[] = [];

  // Create promises for all address-network-stablecoin combinations
  const promises: Promise<StablecoinBalance | StablecoinBalanceError>[] = [];
  
  for (const address of addresses) {
    for (const network of getSupportedNetworks()) {
      for (const stablecoin of stablecoins) {
        promises.push(getStablecoinBalanceOnChain(address, network, stablecoin, priceProvider));
      }
    }
  }

  // Execute all balance checks in parallel
  const results = await Promise.allSettled(promises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const balanceResult = result.value;
      if ('balance' in balanceResult) {
        balances.push(balanceResult);
      } else {
        errors.push(balanceResult);
      }
    } else {
      console.error('Unexpected promise rejection:', result.reason);
    }
  }

  return aggregateResults(balances, errors, addresses, stablecoins);
}

/**
 * Get stablecoin balances for accounts on specific chains only
 */
export async function getStablecoinBalancesOnChains(
  addresses: BlockchainAddress[],
  networks: UnifiedNetwork[],
  stablecoins: StablecoinSymbol[] = ['USDC', 'USDT', 'DAI'],
  priceProvider: PriceProvider = createSimplePriceProvider()
): Promise<MultiChainStablecoinResult> {
  if (!addresses || addresses.length === 0 || !networks || networks.length === 0) {
    return createEmptyResult();
  }

  const balances: StablecoinBalance[] = [];
  const errors: StablecoinBalanceError[] = [];

  // Create promises for specified address-network-stablecoin combinations only
  const promises: Promise<StablecoinBalance | StablecoinBalanceError>[] = [];
  
  for (const address of addresses) {
    for (const network of networks) {
      if (getNetworkConfig(network)) {
        for (const stablecoin of stablecoins) {
          promises.push(getStablecoinBalanceOnChain(address, network, stablecoin, priceProvider));
        }
      }
    }
  }

  // Execute all balance checks in parallel
  const results = await Promise.allSettled(promises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const balanceResult = result.value;
      if ('balance' in balanceResult) {
        balances.push(balanceResult);
      } else {
        errors.push(balanceResult);
      }
    }
  }

  return aggregateResults(balances, errors, addresses, stablecoins, networks);
}

/**
 * Get mainnet-only stablecoin balances (excludes testnet balances from fiat calculations)
 */
export async function getMainnetStablecoinBalances(
  addresses: BlockchainAddress[],
  stablecoins: StablecoinSymbol[] = ['USDC', 'USDT', 'DAI'],
  priceProvider: PriceProvider = createSimplePriceProvider()
): Promise<MultiChainStablecoinResult> {
  const mainnetNetworks = getMainnetNetworks();
  return getStablecoinBalancesOnChains(addresses, mainnetNetworks, stablecoins, priceProvider);
}

/**
 * Get testnet-only stablecoin balances
 */
export async function getTestnetStablecoinBalances(
  addresses: BlockchainAddress[],
  stablecoins: StablecoinSymbol[] = ['USDC', 'USDT', 'DAI'],
  priceProvider: PriceProvider = createSimplePriceProvider()
): Promise<MultiChainStablecoinResult> {
  const testnetNetworks = getTestnetNetworks();
  return getStablecoinBalancesOnChains(addresses, testnetNetworks, stablecoins, priceProvider);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function createEmptyResult(): MultiChainStablecoinResult {
  return {
    balances: [],
    errors: [],
    totalFiatValue: 0,
    testnetTotalFiatValue: 0,
    mainnetBalances: [],
    testnetBalances: [],
    balancesByChain: {},
    balancesByStablecoin: {},
    mainnetBalancesByChain: {},
    testnetBalancesByChain: {},
    mainnetBalancesByStablecoin: {},
    testnetBalancesByStablecoin: {},
    summary: {
      totalAccounts: 0,
      totalChainsChecked: 0,
      totalStablecoinsChecked: 0,
      successfulChecks: 0,
      failedChecks: 0,
      mainnetChainsChecked: 0,
      testnetChainsChecked: 0,
      mainnetSuccessfulChecks: 0,
      testnetSuccessfulChecks: 0,
    },
  };
}

function aggregateResults(
  balances: StablecoinBalance[],
  errors: StablecoinBalanceError[],
  addresses: BlockchainAddress[],
  stablecoins: StablecoinSymbol[],
  specificNetworks?: UnifiedNetwork[]
): MultiChainStablecoinResult {
  // Separate mainnet and testnet balances
  const mainnetBalances = balances.filter(balance => !balance.isTestnet);
  const testnetBalances = balances.filter(balance => balance.isTestnet);

  // Calculate aggregated results - only mainnet balances count toward real fiat value
  const totalFiatValue = mainnetBalances.reduce((sum, balance) => sum + balance.fiatValue, 0);
  const testnetTotalFiatValue = testnetBalances.reduce((sum, balance) => sum + balance.fiatValue, 0);

  // Group all balances by chain
  const balancesByChain: Partial<Record<UnifiedNetwork, StablecoinBalance[]>> = {};
  const mainnetBalancesByChain: Partial<Record<UnifiedNetwork, StablecoinBalance[]>> = {};
  const testnetBalancesByChain: Partial<Record<UnifiedNetwork, StablecoinBalance[]>> = {};

  for (const balance of balances) {
    const network = balance.chain as UnifiedNetwork;
    if (!balancesByChain[network]) {
      balancesByChain[network] = [];
    }
    balancesByChain[network]!.push(balance);

    if (balance.isTestnet) {
      if (!testnetBalancesByChain[network]) {
        testnetBalancesByChain[network] = [];
      }
      testnetBalancesByChain[network]!.push(balance);
    } else {
      if (!mainnetBalancesByChain[network]) {
        mainnetBalancesByChain[network] = [];
      }
      mainnetBalancesByChain[network]!.push(balance);
    }
  }

  // Group all balances by stablecoin
  const balancesByStablecoin: Partial<Record<StablecoinSymbol, StablecoinBalance[]>> = {};
  const mainnetBalancesByStablecoin: Partial<Record<StablecoinSymbol, StablecoinBalance[]>> = {};
  const testnetBalancesByStablecoin: Partial<Record<StablecoinSymbol, StablecoinBalance[]>> = {};

  for (const balance of balances) {
    if (!balancesByStablecoin[balance.stablecoin]) {
      balancesByStablecoin[balance.stablecoin] = [];
    }
    balancesByStablecoin[balance.stablecoin]!.push(balance);

    if (balance.isTestnet) {
      if (!testnetBalancesByStablecoin[balance.stablecoin]) {
        testnetBalancesByStablecoin[balance.stablecoin] = [];
      }
      testnetBalancesByStablecoin[balance.stablecoin]!.push(balance);
    } else {
      if (!mainnetBalancesByStablecoin[balance.stablecoin]) {
        mainnetBalancesByStablecoin[balance.stablecoin] = [];
      }
      mainnetBalancesByStablecoin[balance.stablecoin]!.push(balance);
    }
  }

  // Count networks by type
  const allNetworks = specificNetworks || getSupportedNetworks();
  const mainnetNetworks = allNetworks.filter(network => !isTestnetNetwork(network));
  const testnetNetworks = allNetworks.filter(network => isTestnetNetwork(network));

  return {
    balances,
    errors,
    totalFiatValue,
    testnetTotalFiatValue,
    mainnetBalances,
    testnetBalances,
    balancesByChain,
    balancesByStablecoin,
    mainnetBalancesByChain,
    testnetBalancesByChain,
    mainnetBalancesByStablecoin,
    testnetBalancesByStablecoin,
    summary: {
      totalAccounts: addresses.length,
      totalChainsChecked: allNetworks.length,
      totalStablecoinsChecked: stablecoins.length,
      successfulChecks: balances.length,
      failedChecks: errors.length,
      mainnetChainsChecked: mainnetNetworks.length,
      testnetChainsChecked: testnetNetworks.length,
      mainnetSuccessfulChecks: mainnetBalances.length,
      testnetSuccessfulChecks: testnetBalances.length,
    },
  };
}

// =============================================================================
// PRICE PROVIDER
// =============================================================================

function createSimplePriceProvider(): PriceProvider {
  return {
    async getPrice(symbol: StablecoinSymbol): Promise<number> {
      const config = STABLECOIN_CONFIGS[symbol];
      return config.isPegged ? (config.pegTarget || 1.0) : 1.0;
    },

    async getPrices(symbols: StablecoinSymbol[]): Promise<Record<StablecoinSymbol, number>> {
      const prices = {} as Record<StablecoinSymbol, number>;
      for (const symbol of symbols) {
        prices[symbol] = await this.getPrice(symbol);
      }
      return prices;
    }
  };
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

export {
  // Price provider
  createSimplePriceProvider as SimplePriceProvider,
  // Network functions re-exported for convenience
  getEVMNetworks, getMainnetNetworks, getNearNetworks, getSolanaNetworks, getTestnetNetworks
};
