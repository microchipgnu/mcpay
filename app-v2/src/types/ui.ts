export type AccountModalTab = 'funds' | 'wallets' | 'settings' | 'developer'

export interface AccountModalProps {
    isOpen: boolean
    onClose: () => void
    defaultTab?: AccountModalTab
}

export interface ChainBalance {
    chain: string
    network: string
    balance: string
    balanceUsd: number
    tokens: Array<{
        symbol: string
        balance: string
        balanceUsd: number
        address?: string
    }>
}

export interface BalancesByChain {
    [chainName: string]: Array<{
        address: string
        chain: string
        chainId: number
        chainName: string
        architecture: string
        isTestnet: boolean
        stablecoin: string
        stablecoinName: string
        tokenIdentifier: string
        balance: string
        formattedBalance: string
        decimals: number
        priceUsd: number
        fiatValue: number
    }>
}