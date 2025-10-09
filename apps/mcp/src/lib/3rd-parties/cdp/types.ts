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

export type WalletProvider = 'coinbase-cdp' | 'privy' | 'metamask' | 'unknown';
export type WalletType = 'external' | 'managed' | 'custodial';

// Interface for CDP wallet metadata
export interface CDPWalletMetadata {
    isSmartAccount?: boolean;
    ownerAccountId?: string;
    cdpNetwork?: CDPNetwork;
    cdpAccountId?: string;
    cdpAccountName?: string;
    provider?: string;
    type?: string;
    createdByService?: boolean;
    managedBy?: string;
    gasSponsored?: boolean;
    balanceCache?: Record<string, unknown>;
    lastUpdated?: string;
    [key: string]: unknown;
}

// Interface for execution headers stored in database
export interface ExecutionHeaders {
    headers: string[];
}

export interface EthereumProvider {
    isMetaMask?: boolean
    isCoinbaseWallet?: boolean
    isPorto?: boolean
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

export interface WalletWindow {
    ethereum?: EthereumProvider
    coinbaseWalletExtension?: unknown
    porto?: unknown
}

export interface UserWallet {
    id: string;
    userId: string;
    walletAddress: string;
    blockchain: string; // 'ethereum', 'solana', 'near', etc.
    walletType: 'external' | 'managed' | 'custodial';
    provider?: string; // 'metamask', 'coinbase-cdp', 'privy', etc.
    isPrimary: boolean;
    isActive: boolean;
    walletMetadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface EnhancedUser {
    id: string;
    // Legacy wallet field (for backward compatibility)
    walletAddress?: string;
    // Traditional auth fields
    name?: string;
    email?: string;
    emailVerified?: boolean;
    image?: string;
    // Display fields
    displayName?: string;
    avatarUrl?: string;
    // Timestamps
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
    // Associated wallets
    wallets?: UserWallet[];
}

export interface WalletRegistrationInfo {
    blockchain: string;
    network: string;
    walletType: 'external' | 'managed' | 'custodial';
    provider?: string;
    primaryWallet: boolean;
}

export interface EnhancedServerRegistration {
    mcpOrigin: string;
    receiverAddress: string;
    name?: string;
    description?: string;
    requireAuth?: boolean;
    authHeaders?: Record<string, unknown>;
    tools?: Array<{
        name: string;
        payment?: {
            maxAmountRequired: string; // Base units as string for precision
            asset: string;
            network: string;
            description?: string;
            payTo: string;
            resource: string;
        };
    }>;
    walletInfo?: WalletRegistrationInfo;
    metadata?: Record<string, unknown>;
}

// Use unified network system for CDP networks
export type CDPNetwork = Extract<UnifiedNetwork, 
    | "base"
    | "base-sepolia" 
    | "ethereum"
    | "ethereum-sepolia"
    | "polygon"
    | "arbitrum"
    | "sei-testnet">;

// CDP smart account networks (subset of EVM networks that support smart accounts)
export type CDPNetworkSmartAccount = Extract<EVMNetwork,
    | "base"
    | "base-sepolia"
    | "ethereum"
    | "ethereum-sepolia"
    | "polygon"
    | "arbitrum">;

// CDP Account information
export interface CDPAccountInfo {
    accountId: string;
    walletAddress: string;
    network: CDPNetwork;
    isSmartAccount: boolean;
    smartAccountAddress?: string;
    ownerAccountId?: string;
    accountName?: string;
}

// CDP Wallet creation options
export interface CreateCDPWalletOptions {
    accountName?: string;
    network?: CDPNetwork;
    createSmartAccount?: boolean;
    ownerAccountId?: string;
}

// Result of CDP wallet creation
export interface CDPWalletResult {
    account: CDPAccountInfo;
    smartAccount?: CDPAccountInfo;
}

export interface OnrampAddress {
    address: string;
    blockchains: string[];
}

export interface OnrampSessionTokenRequest {
    addresses: OnrampAddress[];
    assets?: string[];
}

export interface OnrampSessionTokenResponse {
    token: string;
    channel_id: string;
}

export interface OnrampUrlOptions {
    sessionToken: string;
    defaultAsset?: string;
    defaultNetwork?: string;
    presetFiatAmount?: number;
    presetCryptoAmount?: number;
    fiatCurrency?: string;
    defaultPaymentMethod?: string;
    defaultExperience?: 'send' | 'buy';
    partnerUserId?: string;
    redirectUrl?: string;
}


// // Interface for CDP wallet metadata structure
// interface CDPWalletMetadata {
//     cdpAccountId?: string;
//     cdpAccountName?: string;
//     cdpNetwork?: string;
//     isSmartAccount?: boolean;
//     ownerAccountId?: string;
//     provider?: string;
//     type?: string;
//     gasSponsored?: boolean;
//     [key: string]: unknown; // Allow additional properties
//   }
