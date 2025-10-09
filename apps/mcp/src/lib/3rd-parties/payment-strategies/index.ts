/**
 * Simple Payment Signing Strategies for MCPay.fun
 *
 * This module signs a single payment requirement using the first available
 * compatible strategy. Keep it minimal and predictable.
 */

import type { PaymentRequirements } from "x402/types";
import { CDPSigningStrategy } from "./cdp-strategy.js";

export interface PaymentSigningContext {
    user: {
        id: string;
    };
    paymentRequirement: PaymentRequirements;
}

export interface PaymentSigningResult {
    success: boolean;
    signedPaymentHeader?: string;
    error?: string;
    strategy?: string;
    walletAddress?: string;
}

export interface PaymentSigningStrategy {
    name: string;
    priority: number;
    canSign(context: PaymentSigningContext): Promise<boolean>;
    signPayment(context: PaymentSigningContext): Promise<PaymentSigningResult>;
}

export async function attemptSignPayment(
    paymentRequirement: PaymentRequirements,
    user?: PaymentSigningContext['user']
): Promise<PaymentSigningResult> {
    if (!user) {
        return { success: false, error: 'User not provided' };
    }
    if (!paymentRequirement) {
        return { success: false, error: 'Payment requirement not provided' };
    }

    const context: PaymentSigningContext = { user, paymentRequirement };
    const strategies = await getSigningStrategies();
    const sorted = strategies.sort((a, b) => b.priority - a.priority);

    for (const strategy of sorted) {
        try {
            const can = await strategy.canSign(context);
            if (!can) continue;
            const result = await strategy.signPayment(context);
            if (result.success) {
                return { ...result, strategy: strategy.name };
            }
        } catch (err) {
            // Move on to next strategy
            console.warn(`[PaymentSigning] Strategy ${strategy.name} error:`, err);
        }
    }

    return { success: false, error: 'No strategy could sign the payment' };
}

// Backwards-compatible shim: take first entry when array is provided
export async function attemptAutoSign(
    paymentRequirements: PaymentRequirements[],
    user?: PaymentSigningContext['user']
): Promise<PaymentSigningResult> {
    const first = Array.isArray(paymentRequirements) && paymentRequirements.length > 0
        ? paymentRequirements[0]
        : undefined;
    return attemptSignPayment(first as PaymentRequirements, user);
}

async function getSigningStrategies(): Promise<PaymentSigningStrategy[]> {
    const strategies: PaymentSigningStrategy[] = [];
    try {
        strategies.push(new CDPSigningStrategy());
    } catch (error) {
        console.warn('[PaymentSigning] CDP strategy not available:', error);
    }
    return strategies;
}

const paymentStrategies = { attemptSignPayment, attemptAutoSign };

export default paymentStrategies;