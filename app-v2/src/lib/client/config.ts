"use client";

import { metaMask, coinbaseWallet } from 'wagmi/connectors'
import { http, createConfig, createStorage } from 'wagmi'
import { baseSepolia, seiTestnet } from 'wagmi/chains'
 
export const wagmiConfig = createConfig({
  chains: [baseSepolia, seiTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "MCPay.fun",
        url: "https://mcpay.fun",
        iconUrl: "https://mcpay.fun/mcpay-logo.svg",
      },
    }),
    coinbaseWallet({
      appName: "MCPay.fun",
      appLogoUrl: "https://mcpay.fun/mcpay-logo.svg",
      preference: 'all', // Support both EOA and Smart Wallet
    }),
  ], 
  storage: typeof window !== 'undefined' 
    ? createStorage({ storage: localStorage })
    : undefined,
  transports: {
    [baseSepolia.id]: http(),
    [seiTestnet.id]: http(),
  },
})