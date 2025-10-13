import type { Address, Chain, HttpTransport } from 'viem';
import { createPublicClient, http, formatUnits } from 'viem';
import { getNetworkConfig, type UnifiedNetwork, getTokenConfig, getUSDCAddress } from './3rd-parties/cdp/wallet/networks.js';

export type BalanceResult = {
  address: Address;
  network: UnifiedNetwork;
  chainId: number | string;
  nativeSymbol: string;
  balanceWei: bigint;
  balanceFormatted: string;
  decimals: number;
};

export type TokenBalanceResult = {
  address: Address;
  network: UnifiedNetwork;
  chainId: number | string;
  tokenAddress: Address;
  tokenSymbol: string;
  tokenName: string;
  decimals: number;
  balance: bigint;
  balanceFormatted: string;
};

// Minimal ERC20 ABI for balanceOf/decimals/symbol/name
const ERC20_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

function getEvmClient(network: UnifiedNetwork) {
  const cfg = getNetworkConfig(network);
  if (!cfg) throw new Error(`Unknown network: ${network}`);
  if (cfg.architecture !== 'evm') throw new Error(`Network ${network} is not EVM`);

  const rpcUrl = cfg.rpcUrls[0];
  const transport: HttpTransport = http(rpcUrl);

  // viem Chain minimal object
  const chain: Chain = {
    id: Number(cfg.chainId),
    name: cfg.name,
    nativeCurrency: cfg.nativeCurrency,
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  } as unknown as Chain;

  return { cfg, client: createPublicClient({ chain, transport }) } as const;
}

export async function getNativeBalance(address: Address, network: UnifiedNetwork): Promise<BalanceResult> {
  const { cfg, client } = getEvmClient(network);
  const balanceWei = await client.getBalance({ address });
  const decimals = cfg.nativeCurrency.decimals;
  const balanceFormatted = formatUnits(balanceWei, decimals);
  return {
    address,
    network,
    chainId: cfg.chainId,
    nativeSymbol: cfg.nativeCurrency.symbol,
    balanceWei,
    balanceFormatted,
    decimals,
  };
}

export async function getTokenBalance(address: Address, tokenAddress: Address, network: UnifiedNetwork): Promise<TokenBalanceResult> {
  const { cfg, client } = getEvmClient(network);

  const [rawBalance, tokenDecimals, tokenSymbol, tokenName] = await Promise.all([
    client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] }),
    client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'decimals' }),
    client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'symbol' }),
    client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: 'name' }),
  ]);

  const balanceFormatted = formatUnits(rawBalance as bigint, Number(tokenDecimals));

  return {
    address,
    network,
    chainId: cfg.chainId,
    tokenAddress,
    tokenSymbol: String(tokenSymbol),
    tokenName: String(tokenName),
    decimals: Number(tokenDecimals),
    balance: rawBalance as bigint,
    balanceFormatted,
  };
}

export async function getUSDCBalance(address: Address, network: UnifiedNetwork): Promise<TokenBalanceResult | null> {
  const usdc = getUSDCAddress(network);
  if (!usdc) return null;

  // Prefer network registry-decimals if present to avoid extra calls
  const tokenCfg = getTokenConfig(network, usdc);
  if (tokenCfg) {
    const { cfg, client } = getEvmClient(network);
    const rawBalance = await client.readContract({ address: usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [address] });
    const decimals = tokenCfg.decimals;
    const balanceFormatted = formatUnits(rawBalance as bigint, decimals);
    return {
      address,
      network,
      chainId: cfg.chainId,
      tokenAddress: usdc,
      tokenSymbol: tokenCfg.symbol,
      tokenName: tokenCfg.name,
      decimals,
      balance: rawBalance as bigint,
      balanceFormatted,
    };
  }

  // Fallback: query token metadata on-chain
  return getTokenBalance(address, usdc, network);
}

export type AnyBalance = BalanceResult | TokenBalanceResult;

export async function getBalancesSummary(address: Address, network: UnifiedNetwork) {
  const [native, usdc] = await Promise.all([
    getNativeBalance(address, network),
    getUSDCBalance(address, network),
  ]);
  return { native, usdc } as const;
}


