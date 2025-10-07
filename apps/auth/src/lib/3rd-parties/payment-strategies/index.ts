/**
 * Payment Signing Strategies for MCPay.fun
 * 
 * This module provides auto-signing capabilities for authenticated users using
 * their managed wallets (CDP, and future providers). The system attempts to
 * sign payments automatically and falls back gracefully if signing fails.
 * 
 * Strategy Pattern:
 * - Each signing strategy implements the PaymentSigningStrategy interface
 * - Strategies are tried in priority order
 * - Only fail if ALL strategies fail
 * 
 * Future-proofing:
 * - Easy to add new signing providers (Privy, Magic, etc.)
 * - Modular design allows for provider-specific logic
 * - Graceful fallback between strategies
 */

import type { PaymentRequirements } from "x402/types";
import { isTest } from "../../../env.js";
import { CDPSigningStrategy } from "./cdp-strategy.js";
import { getConfig } from "./config.js";
import { TestingSigningStrategy } from "./testing-strategy.js";


// Type definitions
export interface PaymentSigningContext {
    user: {
        id: string;
        email?: string;
        name?: string;
        displayName?: string;
    };
    paymentRequirements: PaymentRequirements[];
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

// NOTE: Authentication detection has been moved to the MCP route handler
// to avoid duplication and ensure consistent user resolution across the system

// Enhanced logging function that respects configuration
function logWithLevel(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) {
    const config = getConfig();
    const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
    
    if (logLevels[level] >= logLevels[config.logging.level]) {
        const prefix = `[PaymentSigning]`;
        const logFn = console[level] || console.log;
        if (data) {
            logFn(`${prefix} ${message}`, data);
        } else {
            logFn(`${prefix} ${message}`);
        }
    }
}

// Main auto-signing function with enhanced error handling and configuration
export async function attemptAutoSign(
    paymentRequirements: PaymentRequirements[],
    user?: PaymentSigningContext['user'],
): Promise<PaymentSigningResult> {
    const config = getConfig();    
    
    // Check if auto-signing is enabled
    if (!config.enabled) {
        logWithLevel('info', 'Auto-signing is disabled via configuration');
        return {
            success: false,
            error: 'Auto-signing disabled'
        };
    }
    
    logWithLevel('info', `Attempting auto-sign for tool payment`);
    
    // Set up timeout for the entire auto-signing process
    const timeoutPromise = new Promise<PaymentSigningResult>((_, reject) => {
        setTimeout(() => reject(new Error('Auto-signing timeout')), config.timeoutMs);
    });
    
    try {
        const signingPromise = performAutoSigning(user, paymentRequirements);
        return await Promise.race([signingPromise, timeoutPromise]);
    } catch (error) {
        logWithLevel('error', 'Auto-signing failed with error', error);
        
        // Handle different fallback behaviors
        switch (config.fallbackBehavior) {
            case 'fail':
                return {
                    success: false,
                    error: `Auto-signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                };
            case 'log_only':
                logWithLevel('warn', 'Auto-signing failed, but continuing due to log_only mode');
                return {
                    success: false,
                    error: 'Auto-signing failed (log_only mode)'
                };
            case 'continue':
            default:
                logWithLevel('info', 'Auto-signing failed, falling back to manual payment');
                return {
                    success: false,
                    error: 'Auto-signing failed, manual payment required'
                };
        }
    }
}

// Internal function to perform the actual auto-signing logic
async function performAutoSigning(
    user: PaymentSigningContext['user'] | undefined,
    paymentRequirements: PaymentRequirements[]
): Promise<PaymentSigningResult> {
    const config = getConfig();    

    if(!user){
        logWithLevel('info', 'User not provided, skipping auto-sign');
        return {
            success: false,
            error: 'User not provided'
        };
    }
    
    
    const context: PaymentSigningContext = {
        user: user,
        paymentRequirements
    };
    
    // Get available strategies and sort by priority
    const strategies = await getSigningStrategies();
    const sortedStrategies = strategies.sort((a, b) => b.priority - a.priority);
    
    logWithLevel('info', `Found ${sortedStrategies.length} signing strategies`);
    
    if (sortedStrategies.length === 0) {
        logWithLevel('warn', 'No signing strategies available');
        return {
            success: false,
            error: 'No signing strategies available'
        };
    }
    
    // Try each strategy in order with retry logic
    for (const strategy of sortedStrategies) {
        for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
            try {
                logWithLevel('debug', `Checking strategy: ${strategy.name} (attempt ${attempt}/${config.maxRetries})`);
                
                const canSign = await strategy.canSign(context);
                if (!canSign) {
                    logWithLevel('debug', `Strategy ${strategy.name} cannot sign, skipping`);
                    break; // Skip to next strategy, don't retry
                }
                
                logWithLevel('info', `Attempting to sign with strategy: ${strategy.name}`);
                const result = await strategy.signPayment(context);
                
                if (result.success) {
                    if (config.logging.logSuccessfulSigning) {
                        logWithLevel('info', `Successfully signed with strategy: ${strategy.name}`, {
                            walletAddress: result.walletAddress
                        });
                    }
                    return {
                        ...result,
                        strategy: strategy.name
                    };
                } else {
                    if (config.logging.logFailedAttempts) {
                        logWithLevel('warn', `Strategy ${strategy.name} failed (attempt ${attempt}): ${result.error}`);
                    }
                    
                    // If it's the last attempt, don't retry
                    if (attempt >= config.maxRetries) {
                        break;
                    }
                    
                    // Wait a bit before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            } catch (error) {
                logWithLevel('error', `Strategy ${strategy.name} threw error (attempt ${attempt}):`, error);
                
                // If it's the last attempt, don't retry
                if (attempt >= config.maxRetries) {
                    break;
                }
                
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
    
    logWithLevel('warn', 'All signing strategies failed after retries');
    return {
        success: false,
        error: `All ${sortedStrategies.length} signing strategies failed after ${config.maxRetries} attempts each`
    };
}

// Get available signing strategies
async function getSigningStrategies(): Promise<PaymentSigningStrategy[]> {
    const strategies: PaymentSigningStrategy[] = [];
    
    // In test environment, only expose the Testing strategy
    if (isTest()) {
        try {
            strategies.push(new TestingSigningStrategy());
            console.log('[PaymentSigning] Testing strategy loaded successfully (test env)');
        } catch (error) {
            console.warn('[PaymentSigning] Testing strategy not available:', error);
        }
        console.log(`[PaymentSigning] Loaded ${strategies.length} signing strategies`);
        return strategies;
    }

    try {
        strategies.push(new CDPSigningStrategy());
        console.log('[PaymentSigning] CDP strategy loaded successfully');
    } catch (error) {
        console.warn('[PaymentSigning] CDP strategy not available:', error);
    }
    

    // TODO: Add future strategies here
    // try {
    //     const { PrivySigningStrategy } = await import('./privy-strategy.js');
    //     strategies.push(new PrivySigningStrategy());
    // } catch (error) {
    //     console.warn('[PaymentSigning] Privy strategy not available:', error);
    // }
    
    console.log(`[PaymentSigning] Loaded ${strategies.length} signing strategies`);
    return strategies;
}

const paymentStrategies = {
    attemptAutoSign
};

export default paymentStrategies; 