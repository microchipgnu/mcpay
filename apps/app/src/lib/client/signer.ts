import { type Account, type Chain } from 'viem'
import { createWalletClient, custom, publicActions } from 'viem'
import { base, baseSepolia, avalancheFuji, sei, seiTestnet, polygon, polygonAmoy } from 'viem/chains'

// Create a wallet client that signs using the injected browser provider (e.g., MetaMask, Coinbase Wallet)
// This ensures signing happens via the user's wallet, not a public RPC

function getChainFromNetwork(network: string | undefined): Chain {
  if (!network) {
    throw new Error('Network is required for signer')
  }
  switch (network) {
    case 'base':
      return base
    case 'base-sepolia':
      return baseSepolia
    case 'avalanche-fuji':
      return avalancheFuji
    case 'sei':
      return sei
    case 'sei-testnet':
      return seiTestnet
    case 'polygon':
      return polygon
    case 'polygon-amoy':
      return polygonAmoy
    default:
      throw new Error(`Unsupported network: ${network}`)
  }
}

export function createInjectedSigner(network: string, account: Account) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No injected wallet found. Please install or enable your wallet.')
  }
  const chain = getChainFromNetwork(network)
  return createWalletClient({
    chain,
    transport: custom(window.ethereum),
    account,
  }).extend(publicActions)
}


