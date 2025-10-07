import { getCDPNetworks, type UnifiedNetwork } from "../cdp/wallet/networks.js";
import { createSignerFromViemAccount } from "mcpay/utils";
import { getCDPAccount } from "../cdp/wallet/index.js";
import { txOperations, Wallet, withTransaction } from "../../db/actions.js";
import type { PaymentSigningContext, PaymentSigningResult, PaymentSigningStrategy } from "./index.js";
import { x402Version } from "../x402.js";
import { type CDPNetwork, type CDPWalletMetadata } from "../cdp/types.js";
import { createPaymentHeader } from "x402/client";
import { PaymentRequirements } from "x402/types";
export type { Wallet } from "../../db/actions.js";

export class CDPSigningStrategy implements PaymentSigningStrategy {
    name = "CDP";
    priority = 100; // High priority - prefer managed wallets

    async canSign(context: PaymentSigningContext): Promise<boolean> {
        try {
            if (!context.user?.id) {
                return false;
            }

            const paymentRequirements = context.paymentRequirements
            const network = paymentRequirements[0].network as CDPNetwork;

            const cdpWallets = await withTransaction(async (tx) => {
                return await txOperations.getCDPWalletsByUser(context.user!.id)(tx);
            });
            const compatibleWallets = cdpWallets.filter(wallet => {
                const walletNetwork = (wallet.walletMetadata as unknown as CDPWalletMetadata)?.cdpNetwork;
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

            const paymentRequirements = context.paymentRequirements
            const network = paymentRequirements[0].network as CDPNetwork;
            if (!paymentRequirements) {
                return {
                    success: false,
                    error: 'No payment requirements provided'
                };
            }

            const pickedPaymentRequirement = paymentRequirements.find(requirement => requirement.network === network);
            if (!pickedPaymentRequirement) {
                return {
                    success: false,
                    error: `No payment requirement found for network: ${network}`
                };
            }

            const cdpWallets = await withTransaction(async (tx) => {
                return await txOperations.getCDPWalletsByUser(context.user!.id)(tx);
            });
            
            const compatibleWallets = cdpWallets.filter(wallet => {
                const walletNetwork = (wallet.walletMetadata as unknown as CDPWalletMetadata)?.cdpNetwork;
                return this.isNetworkCompatible(walletNetwork, network) && wallet.isActive;
            });

            if (compatibleWallets.length === 0) {
                return {
                    success: false,
                    error: `No active CDP wallets found for network: ${network}`
                };
            }

            // Prefer smart accounts (gas-sponsored) over regular accounts
            const smartWallets = compatibleWallets.filter(w => (w.walletMetadata as unknown as CDPWalletMetadata)?.isSmartAccount);
            const regularWallets = compatibleWallets.filter(w => !(w.walletMetadata as unknown as CDPWalletMetadata)?.isSmartAccount);

            const walletsToTry = [...smartWallets, ...regularWallets];

            console.log(`[CDP Strategy] Found ${smartWallets.length} smart wallets and ${regularWallets.length} regular wallets`);

            // Try each wallet until one succeeds
            for (const wallet of walletsToTry) {
                try {
                    console.log(`[CDP Strategy] Trying to sign with wallet: ${wallet.walletAddress}`);
                    const result = await this.signWithCDPWallet(wallet, pickedPaymentRequirement, network);

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
        paymentRequirements: PaymentRequirements,
        network: CDPNetwork
    ): Promise<PaymentSigningResult> {
        try {
            const walletMetadata = wallet.walletMetadata as unknown as CDPWalletMetadata;
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

            const signer = createSignerFromViemAccount(network, cdpAccount)
            
            const signedPayment = await createPaymentHeader(signer, x402Version, paymentRequirements);

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