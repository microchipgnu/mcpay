/**
 * Coinbase Developer Platform (CDP) Integration for MCPay.fun
 * 
 * This module provides integration with Coinbase's CDP to create and manage 
 * managed wallets for users. CDP provides secure key management in a Trusted 
 * Execution Environment (TEE) so you don't need to handle private keys.
 * 
 * ## Features:
 * - Create managed EVM accounts across multiple networks
 * - Support for smart accounts with gas sponsorship 
 * - Network-scoped account management
 * - Automatic integration with Base Paymaster for gasless transactions
 * - Support for Base, Ethereum, Polygon, and Arbitrum networks
 * 
 * ## Setup:
 * 
 * 1. Create a CDP API Key at https://portal.cdp.coinbase.com/
 * 2. Set environment variables:
 *    - CDP_API_KEY_NAME="your-api-key-name"
 *    - CDP_API_KEY_PRIVATE_KEY="your-api-key-private-key"  
 *    - CDP_PROJECT_ID="your-project-id"
 * 
 * 3. Install the CDP SDK (already included in package.json):
 *    pnpm install @coinbase/cdp-sdk
 * 
 * ## Usage:
 * 
 * ### Creating a managed wallet:
 * ```typescript
 * const result = await createCDPAccount({
 *   accountName: 'user-wallet-123',
 *   network: 'base-sepolia',
 *   createSmartAccount: true
 * });
 * ```
 * 
 * ### API Endpoints:
 * - POST /api/users/:userId/wallets/cdp - Create CDP wallet
 * - GET /api/users/:userId/wallets/cdp - List user's CDP wallets  
 * - POST /api/users/:userId/wallets/cdp/:accountId/faucet - Request testnet funds
 * - GET /api/users/:userId/wallets/cdp/:accountId/balances - Get balances
 * 
 * ## Smart Accounts:
 * Smart accounts support:
 * - Gas sponsorship (free transactions on Base/Base Sepolia)
 * - Transaction batching
 * - Custom spending policies
 * 
 * ## Security:
 * - Private keys are managed by CDP in AWS Nitro Enclave TEE
 * - No private key material is exposed to your application
 * - Single wallet secret manages all accounts
 * 
 * @see https://docs.cdp.coinbase.com/wallet-api/v2/
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { randomUUID } from "node:crypto";

import { 
  type CreateCDPWalletOptions, 
  type CDPWalletResult, 
  type CDPAccountInfo, 
  type CDPNetwork, 
  type CDPNetworkSmartAccount 
} from "../types.js";
import { 
  getCDPNetworks, 
  getCDPNetworkName, 
  getNetworkConfig,
  isTestnetNetwork 
} from "./networks.js";
import env from "../../../../env.js";

// CDP Client singleton
let cdpClient: CdpClient | null = null;

// Initialize CDP Client
export function initializeCDP(): CdpClient {
    if (!cdpClient) {       
        try {
            cdpClient = new CdpClient({
                apiKeyId: env.CDP_API_KEY,
                apiKeySecret: env.CDP_API_SECRET,
                walletSecret: env.CDP_WALLET_SECRET
            });
            console.log("[CDP] Client initialized successfully");
        } catch (error) {
            console.error("[CDP] Failed to initialize client:", error);
            throw error;
        }
    }
    return cdpClient;
}

// Get CDP Client instance
export function getCDPClient(): CdpClient {
    if (!cdpClient) {
        return initializeCDP();
    }
    return cdpClient;
}

/**
 * Create a new CDP managed account
 */
export async function createCDPAccount(options: CreateCDPWalletOptions = {}): Promise<CDPWalletResult> {
    console.log("[CDP] Starting createCDPAccount with options:", options);
    
    const cdp = getCDPClient();
    console.log("[CDP] Got CDP client");
    
    const accountName = options.accountName || `mcpay-account-${randomUUID()}`;
    const network = options.network || "base-sepolia";
    
    // Validate network is supported by CDP
    const cdpNetworks = getCDPNetworks();
    if (!cdpNetworks.includes(network)) {
        throw new Error(`Network ${network} is not supported by CDP. Supported networks: ${cdpNetworks.join(', ')}`);
    }
    
    console.log("[CDP] Account details:", { accountName, network });
    
    try {
        // Create the main account
        console.log("[CDP] Creating main account...");
        const account = await cdp.evm.getOrCreateAccount({
            name: accountName,
        });
        console.log("[CDP] Main account created successfully");
        
        // Get the wallet address
        const walletAddress = account.address;
        console.log("[CDP] Main account address:", walletAddress);
        
        const accountInfo: CDPAccountInfo = {
            accountId: accountName, // Use the account name as the ID
            walletAddress,
            network,
            isSmartAccount: false,
            accountName,
        };
        
        const result: CDPWalletResult = {
            account: accountInfo,
        };
        
        // Create smart account if requested and network supports it
        if (options.createSmartAccount && supportsSmartAccounts(network)) {
            console.log("[CDP] Creating smart account...");
            try {
                // Ensure smart account name doesn't exceed 36 characters
                const smartAccountName = accountName.length > 30 
                    ? `${accountName.slice(0, 30)}-smart`
                    : `${accountName}-smart`;
                const smartAccount = await cdp.evm.getOrCreateSmartAccount({
                    name: smartAccountName,
                    owner: account,
                });
                console.log("[CDP] Smart account created successfully");
                
                const smartAccountInfo: CDPAccountInfo = {
                    accountId: `${accountName}-smart`,
                    walletAddress: smartAccount.address,
                    network,
                    isSmartAccount: true,
                    ownerAccountId: accountName,
                    accountName: `${accountName}-smart`,
                };
                
                result.smartAccount = smartAccountInfo;
                console.log("[CDP] Smart account address:", smartAccount.address);
            } catch (smartAccountError) {
                console.warn('[CDP] Failed to create smart account:', smartAccountError);
                // Continue without smart account
            }
        } else if (options.createSmartAccount && !supportsSmartAccounts(network)) {
            console.warn(`[CDP] Smart accounts not supported on network: ${network}`);
        }
        
        console.log("[CDP] Account creation completed successfully");
        return result;
    } catch (error) {
        console.error('[CDP] Failed to create CDP account:', error);
        console.error('[CDP] Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw new Error(`Failed to create CDP account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Create a smart account from an existing CDP account name
 */
export async function createCDPSmartAccount(
    ownerAccountName: string, 
    network: CDPNetwork = "base-sepolia",
    smartAccountName?: string
): Promise<CDPAccountInfo> {
    const cdp = getCDPClient();
    
    // Check if network supports smart accounts
    if (!supportsSmartAccounts(network)) {
        throw new Error(`Smart accounts are not supported on network: ${network}`);
    }
    
    try {
        // Get the existing owner account
        const ownerAccount = await cdp.evm.getOrCreateAccount({
            name: ownerAccountName,
        });
        
        // Create smart account with proper name length validation
        const smartAccountNameToUse = smartAccountName || `smart-${ownerAccountName}-${randomUUID()}`;
        // Ensure smart account name doesn't exceed 36 characters
        const truncatedName = smartAccountNameToUse.length > 36 
            ? smartAccountNameToUse.slice(0, 36)
            : smartAccountNameToUse;
        const smartAccount = await cdp.evm.getOrCreateSmartAccount({
            name: truncatedName,
            owner: ownerAccount,
        });
        
        return {
            accountId: smartAccountNameToUse,
            walletAddress: smartAccount.address,
            network,
            isSmartAccount: true,
            ownerAccountId: ownerAccountName,
            accountName: smartAccountNameToUse,
        };
    } catch (error) {
        console.error('Failed to create CDP smart account:', error);
        throw new Error(`Failed to create CDP smart account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get an existing CDP account by name
 */
export async function getCDPAccount(accountName: string, network: CDPNetwork = "base-sepolia") {
    const cdp = getCDPClient();
    
    try {
        console.log(`Getting CDP account ${accountName} for network ${network}`);
        const account = await cdp.evm.getOrCreateAccount({
            name: accountName,
        });
        
        return account;
    } catch (error) {
        console.error('Failed to get CDP account:', error);
        throw new Error(`Failed to get CDP account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get an existing CDP smart account by name
 */
export async function getCDPSmartAccount(smartAccountName: string, ownerAccountName: string, network: CDPNetwork = "base-sepolia") {
    const cdp = getCDPClient();
    
    try {
        console.log(`Getting CDP smart account ${smartAccountName} (owner: ${ownerAccountName}) for network ${network}`);
        // Get owner account first
        const ownerAccount = await cdp.evm.getOrCreateAccount({
            name: ownerAccountName,
        });
        
        const smartAccount = await cdp.evm.getOrCreateSmartAccount({
            name: smartAccountName,
            owner: ownerAccount,
        });
        
        return smartAccount;
    } catch (error) {
        console.error('Failed to get CDP smart account:', error);
        throw new Error(`Failed to get CDP smart account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get network-scoped account instance
 */
export async function getNetworkScopedAccount(accountName: string, network: CDPNetwork) {
    const account = await getCDPAccount(accountName, network);
    const cdpNetworkName = getCDPNetworkName(network);
    if (!cdpNetworkName) {
        throw new Error(`CDP network name not found for ${network}`);
    }
    // CDP SDK expects specific network names - use them directly
    return await account.useNetwork(cdpNetworkName as CDPNetwork);
}

/**
 * Get network-scoped smart account instance
 */
export async function getNetworkScopedSmartAccount(smartAccountName: string, ownerAccountName: string, network: CDPNetworkSmartAccount) {
    const smartAccount = await getCDPSmartAccount(smartAccountName, ownerAccountName, network);
    const cdpNetworkName = getCDPNetworkName(network);
    if (!cdpNetworkName) {
        throw new Error(`CDP network name not found for ${network}`);
    }
    return await smartAccount.useNetwork(cdpNetworkName as CDPNetworkSmartAccount);
}

/**
 * Request faucet funds for testnet accounts
 * Note: Implementation depends on CDP SDK version and available methods
 */
export async function requestFaucetFunds(
    accountName: string, 
    network: CDPNetwork,
    token: "eth" | "usdc" = "eth"
): Promise<void> {
    // Only allow faucet requests on testnets
    if (!isTestnetNetwork(network)) {
        throw new Error(`Faucet requests are only available on testnets. Network: ${network}`);
    }
    
    try {
        // Implementation will depend on actual CDP SDK methods available
        // This is a placeholder that should be updated based on the specific SDK version
        console.log(`Requesting ${token} faucet for account ${accountName} on ${network}`);
        throw new Error("Faucet functionality needs to be implemented based on your CDP SDK version");
    } catch (error) {
        console.error('Failed to request faucet funds:', error);
        throw new Error(`Failed to request faucet funds: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Get token balances for an account
 * Note: Implementation depends on CDP SDK version and available methods
 */
export async function getAccountBalances(accountName: string, network: CDPNetwork, isSmartAccount = false, ownerAccountName?: string) {
    try {
        // Implementation will depend on actual CDP SDK methods available
        // This is a placeholder that should be updated based on the specific SDK version
        console.log(`Getting balances for account ${accountName} on ${network}, isSmartAccount: ${isSmartAccount}, ownerAccount: ${ownerAccountName || 'none'}`);
        return {}; // Return empty object as placeholder
    } catch (error) {
        console.error('Failed to get account balances:', error);
        throw new Error(`Failed to get account balances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Send a transaction from a regular account
 * Note: Implementation depends on CDP SDK version and available methods
 */
export async function sendTransaction(
    accountName: string,
    network: CDPNetwork,
    transaction: {
        to: string;
        value?: bigint;
        data?: string;
    }
) {
    try {
        // Implementation will depend on actual CDP SDK methods available
        // This is a placeholder that should be updated based on the specific SDK version
        console.log(`Sending transaction from ${accountName} on ${network} to ${transaction.to}`);
        throw new Error("Transaction functionality needs to be implemented based on your CDP SDK version");
    } catch (error) {
        console.error('Failed to send transaction:', error);
        throw new Error(`Failed to send transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Send a user operation from a smart account (with automatic gas sponsorship)
 * Note: Implementation depends on CDP SDK version and available methods
 */
export async function sendUserOperation(
    smartAccountName: string,
    ownerAccountName: string,
    network: CDPNetwork,
    calls: Array<{
        to: string;
        value?: bigint;
        data?: string;
    }>
) {
    try {
        // Implementation will depend on actual CDP SDK methods available
        // This is a placeholder that should be updated based on the specific SDK version
        console.log(`Sending user operation from ${smartAccountName} (owner: ${ownerAccountName}) on ${network} with ${calls.length} calls`);
        throw new Error("User operation functionality needs to be implemented based on your CDP SDK version");
    } catch (error) {
        console.error('Failed to send user operation:', error);
        throw new Error(`Failed to send user operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Check if a network supports smart accounts
 */
export function supportsSmartAccounts(network: CDPNetwork): network is CDPNetworkSmartAccount {
    const smartAccountNetworks: CDPNetworkSmartAccount[] = [
        "base",
        "base-sepolia", 
        "ethereum",
        "ethereum-sepolia",
        "polygon",
        "arbitrum"
    ];
    return smartAccountNetworks.includes(network as CDPNetworkSmartAccount);
}

/**
 * Validate if a network is supported by CDP
 */
export function isSupportedCDPNetwork(network: string): network is CDPNetwork {
    const cdpNetworks = getCDPNetworks();
    return cdpNetworks.includes(network as CDPNetwork);
}

/**
 * Check if a network is a testnet (supports faucet)
 */
export function isTestnet(network: CDPNetwork): boolean {
    return isTestnetNetwork(network);
}

/**
 * Get the native token symbol for a network
 */
export function getNativeTokenSymbol(network: CDPNetwork): string {
    const networkConfig = getNetworkConfig(network);
    return networkConfig?.nativeCurrency.symbol || 'ETH';
}

/**
 * Export CDP utilities
 */
export const CDP = {
    // Client management
    initialize: initializeCDP,
    getClient: getCDPClient,
    
    // Account management
    createAccount: createCDPAccount,
    createSmartAccount: createCDPSmartAccount,
    getAccount: getCDPAccount,
    getSmartAccount: getCDPSmartAccount,
    getNetworkScopedAccount,
    getNetworkScopedSmartAccount,
    
    // Wallet operations
    requestFaucet: requestFaucetFunds,
    getBalances: getAccountBalances,
    sendTransaction,
    sendUserOperation,
    
    // Utilities
    isSupportedNetwork: isSupportedCDPNetwork,
    supportsSmartAccounts,
    isTestnet,
    getNativeTokenSymbol,
};

export default CDP;
