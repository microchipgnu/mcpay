/**
 * Coinbase CDP Signing Strategy
 * 
 * This strategy attempts to auto-sign payments using the user's CDP managed wallets.
 * It prefers smart accounts (gas-sponsored) over regular accounts when available.
 * 
 * Requirements:
 * - User must be authenticated
 * - User must have active CDP wallets
 * - CDP wallet must support the target network
 * - CDP SDK must be properly configured
 */

import { getCDPNetworks, type UnifiedNetwork } from "@/lib/commons/networks";
import { createSignerFromViemAccount } from "mcpay/utils";
import { getCDPAccount } from "@/lib/gateway/3rd-parties/cdp";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import type { PaymentSigningContext, PaymentSigningResult, PaymentSigningStrategy } from "@/lib/gateway/payment-strategies/index";
import { x402Version } from "@/lib/gateway/x402";
import { type CDPNetwork, type CDPWalletMetadata, type Wallet } from "@/types";
import { toAccount } from "viem/accounts";
import { createPaymentHeader } from "x402/client";
import { PaymentRequirements } from "x402/types";

export class CDPSigningStrategy implements PaymentSigningStrategy {
    name = "CDP";
    priority = 100; // High priority - prefer managed wallets

    async canSign(context: PaymentSigningContext): Promise<boolean> {
        try {
            if (!context.user?.id) {
                return false;
            }

            // Check if network is supported by CDP
            const network = context.toolCall.payment.network as UnifiedNetwork;
            const cdpNetworks = getCDPNetworks();

            if (!cdpNetworks.includes(network)) {
                console.log(`[CDP Strategy] Network ${network} not supported by CDP`);
                return false;
            }

            console.log(`[CDP Strategy] Network ${network} supported by CDP`);

            // Check if user has CDP wallets for this network
            const cdpWallets = await withTransaction(async (tx) => {
                return await txOperations.getCDPWalletsByUser(context.user!.id)(tx);
            });

            console.log(`[CDP Strategy] Found ${cdpWallets.length} CDP wallets for user ${context.user!.id}`);

            const compatibleWallets = cdpWallets.filter(wallet => {
                const walletNetwork = (wallet.walletMetadata as CDPWalletMetadata)?.cdpNetwork;
                // Check if wallet network is compatible with target network
                return walletNetwork === network || this.isNetworkCompatible(walletNetwork, network);
            });

            console.log(`[CDP Strategy] Found ${compatibleWallets.length} compatible wallets for user ${context.user!.id}`);

            const canSign = compatibleWallets.length > 0;
            console.log(`[CDP Strategy] Can sign: ${canSign} (found ${compatibleWallets.length} compatible wallets)`);
            return canSign;
        } catch (error) {
            console.error('[CDP Strategy] Error checking if can sign:', error);
            return false;
        }
    }

    async signPayment(context: PaymentSigningContext): Promise<PaymentSigningResult> {
        try {
            if (!context.user?.id) {
                return {
                    success: false,
                    error: 'No user ID provided'
                };
            }

            const network = context.toolCall.payment.network as CDPNetwork;
            const paymentRequirement = context.paymentRequirements[0];

            if (!paymentRequirement) {
                return {
                    success: false,
                    error: 'No payment requirements provided'
                };
            }

            console.log(`[CDP Strategy] Attempting to sign payment for network: ${network}`);

            // Get user's CDP wallets for this network
            const cdpWallets = await withTransaction(async (tx) => {
                return await txOperations.getCDPWalletsByUser(context.user!.id)(tx);
            });

            const compatibleWallets = cdpWallets.filter(wallet => {
                const walletNetwork = (wallet.walletMetadata as CDPWalletMetadata)?.cdpNetwork;
                return this.isNetworkCompatible(walletNetwork, network) && wallet.isActive;
            });

            if (compatibleWallets.length === 0) {
                return {
                    success: false,
                    error: `No active CDP wallets found for network: ${network}`
                };
            }

            // Prefer smart accounts (gas-sponsored) over regular accounts
            const smartWallets = compatibleWallets.filter(w => (w.walletMetadata as CDPWalletMetadata)?.isSmartAccount);
            const regularWallets = compatibleWallets.filter(w => !(w.walletMetadata as CDPWalletMetadata)?.isSmartAccount);

            const walletsToTry = [...smartWallets, ...regularWallets];

            console.log(`[CDP Strategy] Found ${smartWallets.length} smart wallets and ${regularWallets.length} regular wallets`);

            // Try each wallet until one succeeds
            for (const wallet of walletsToTry) {
                try {
                    console.log(`[CDP Strategy] Trying to sign with wallet: ${wallet.walletAddress}`);
                    const result = await this.signWithCDPWallet(wallet, paymentRequirement, network);

                    if (result.success) {
                        console.log(`[CDP Strategy] Successfully signed with wallet: ${wallet.walletAddress}`);
                        return {
                            ...result,
                            walletAddress: wallet.walletAddress
                        };
                    } else {
                        console.log(`[CDP Strategy] Failed to sign with wallet ${wallet.walletAddress}: ${result.error}`);
                    }
                } catch (walletError) {
                    console.error(`[CDP Strategy] Error signing with wallet ${wallet.walletAddress}:`, walletError);
                }
            }

            return {
                success: false,
                error: `Failed to sign with any of ${walletsToTry.length} available CDP wallets`
            };

        } catch (error) {
            console.error('[CDP Strategy] Error during payment signing:', error);
            return {
                success: false,
                error: `CDP signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private isNetworkCompatible(walletNetwork: string | undefined, targetNetwork: UnifiedNetwork): boolean {
        if (!walletNetwork) return false;

        // Direct match
        if (walletNetwork === targetNetwork) return true;

        // CDP networks that might be stored in different formats
        const cdpNetworks = getCDPNetworks();
        return cdpNetworks.includes(walletNetwork as CDPNetwork) && cdpNetworks.includes(targetNetwork);
    }

    private async signWithCDPWallet(
        wallet: Wallet,
        paymentRequirement: PaymentRequirements,
        network: CDPNetwork
    ): Promise<PaymentSigningResult> {
        try {
            const walletMetadata = wallet.walletMetadata as CDPWalletMetadata;
            const isSmartAccount = walletMetadata?.isSmartAccount || false;
            const accountId = wallet.externalWalletId; // CDP account ID

            if (!accountId) {
                return {
                    success: false,
                    error: 'No CDP account ID found'
                };
            }

            console.log(`[CDP Strategy] Getting CDP account: ${accountId} (smart: ${isSmartAccount})`);

            // Get the CDP account instance
            const cdpAccount = await getCDPAccount(accountId, network);

            const signer = createSignerFromViemAccount(network, toAccount(cdpAccount))
            
            const signedPayment = await createPaymentHeader(signer, x402Version, paymentRequirement);

            console.log(`[CDP Strategy] Signed payment:`, JSON.stringify(signedPayment, null, 2));
            console.log(`[CDP Strategy] Encoded payment:`, signedPayment);

            return {
                success: true,
                signedPaymentHeader: signedPayment
            };

        } catch (error) {
            console.error('[CDP Strategy] Error in signWithCDPWallet:', error);
            return {
                success: false,
                error: `CDP wallet signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
} 