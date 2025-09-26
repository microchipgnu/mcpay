/**
 * Testing Signing Strategy
 *
 * Mimics the CDP strategy but signs using a local/private-key backed account.
 * Intended for NODE_ENV === 'test'.
 *
 * - Uses FACILITATOR_EVM_PRIVATE_KEY if present, otherwise falls back to a
 *   known anvil/hardhat test private key for convenience in tests.
 * - Supports EVM test networks that we map to viem chains.
 */

import env from "@/lib/gateway/env";
import { getConfig } from "@/lib/gateway/payment-strategies/config";
import type {
  PaymentSigningContext,
  PaymentSigningResult,
  PaymentSigningStrategy,
} from "@/lib/gateway/payment-strategies";
import { x402Version } from "@/lib/gateway/payments";
import type { UnifiedNetwork } from "@/lib/commons/networks";
import { createWalletClient, http } from "viem";
import { base, baseSepolia, seiTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPaymentHeader, type ExtendedPaymentRequirements } from "@/types/x402";

export class TestingSigningStrategy implements PaymentSigningStrategy {
  name = "Testing";
  priority: number;

  constructor() {
    const cfg = getConfig();
    this.priority = cfg.strategies.test.priority ?? 100;
  }

  async canSign(context: PaymentSigningContext): Promise<boolean> {
    try {
      if (!context.user?.id) return false;

      const network = context.toolCall.payment.network as UnifiedNetwork;
      // Support EVM test networks that we have chain mappings for
      const supported = this.getViemChainOrNull(network) !== null;
      if (!supported) {
        console.log(`[Testing Strategy] Network ${network} not supported`);
        return false;
      }

      // We can sign if we have any private key source available
      const pk = this.resolvePrivateKey();
      const can = Boolean(pk);
      console.log(`[Testing Strategy] Can sign: ${can}`);
      return can;
    } catch (err) {
      console.error("[Testing Strategy] canSign error:", err);
      return false;
    }
  }

  async signPayment(context: PaymentSigningContext): Promise<PaymentSigningResult> {
    try {
      if (!context.user?.id) {
        return { success: false, error: "No user ID provided" };
      }

      const network = context.toolCall.payment.network as UnifiedNetwork;
      const paymentRequirement = context.paymentRequirements[0];
      if (!paymentRequirement) {
        return { success: false, error: "No payment requirements provided" };
      }

      const viemChain = this.getViemChainOrNull(network);
      if (!viemChain) {
        return { success: false, error: `Unsupported network: ${network}` };
      }

      const privateKey = this.resolvePrivateKey();
      if (!privateKey) {
        return { success: false, error: "No private key available for testing strategy" };
      }

      const account = privateKeyToAccount(privateKey);

      const walletClient = createWalletClient({
        account,
        transport: http(),
        chain: viemChain,
      });

      const signedPayment = await createPaymentHeader(
        walletClient.account,
        x402Version,
        paymentRequirement as ExtendedPaymentRequirements
      );

      console.log(`[Testing Strategy] Signed payment`, signedPayment);
      return {
        success: true,
        signedPaymentHeader: signedPayment,
        walletAddress: account.address,
      };
    } catch (error) {
      console.error("[Testing Strategy] signPayment error:", error);
      return {
        success: false,
        error: `Testing strategy signing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private resolvePrivateKey(): `0x${string}` | null {
    const cfg = getConfig();

    // 1) Architecture-level EVM default
    const fromArch = cfg.strategies.test.evm?.privateKey as `0x${string}` | undefined;
    if (fromArch && fromArch.startsWith("0x") && fromArch.length === 66) return fromArch;
    
    return null;
  }

  private getViemChainOrNull(network: UnifiedNetwork) {
    switch (network) {
      case "base":
        return base;
      case "base-sepolia":
        return baseSepolia;
      case "sei-testnet":
        return seiTestnet;
      default:
        return null;
    }
  }
}

export default TestingSigningStrategy;


