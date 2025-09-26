/**
 * Payment Strategy Configuration
 * 
 * This module provides configuration options for the auto-signing system.
 * It allows for easy customization of behavior without code changes.
 */

import env, { isTest } from "@/lib/gateway/env";
import { getCDPNetworks, type UnifiedNetwork } from "@/lib/commons/networks";

export interface PaymentStrategyConfig {
    enabled: boolean;
    fallbackBehavior: 'fail' | 'continue' | 'log_only';
    maxRetries: number;
    timeoutMs: number;
    strategies: {
        cdp: {
            enabled: boolean;
            priority: number;
            preferSmartAccounts: boolean;
            networks: UnifiedNetwork[];
            maxWalletsToTry: number;
        };
        privy: {
            enabled: boolean;
            priority: number;
            networks: UnifiedNetwork[];
        };
        magic: {
            enabled: boolean;
            priority: number;
            networks: UnifiedNetwork[];
        };
        test: {
            enabled: boolean;
            priority: number;
            networks: UnifiedNetwork[];
            // Architecture-level defaults for tests
            evm?: {
                privateKey?: `0x${string}`;
                address?: `0x${string}`;
            };
            solana?: {
                secretKey?: string;
                address?: string;
            };
            near?: {
                privateKey?: string;
                address?: string;
            };
        }
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        logSuccessfulSigning: boolean;
        logFailedAttempts: boolean;
        logAuthenticationDetails: boolean;
    };
}

// Default configuration
export const DEFAULT_CONFIG: PaymentStrategyConfig = {
    enabled: true,
    fallbackBehavior: 'continue', // Continue to manual payment if auto-signing fails
    maxRetries: 3,
    timeoutMs: 30000, // 30 seconds
    strategies: {
        cdp: {
            enabled: !isTest(),
            priority: 100,
            preferSmartAccounts: true,
            networks: getCDPNetworks(), // Use unified network system
            maxWalletsToTry: 5
        },
        test: {
            enabled: isTest(),
            priority: 1000,
            networks: ['base-sepolia', 'sei-testnet'] as UnifiedNetwork[],
        },
        privy: {
            enabled: false, // Not implemented yet
            priority: 80,
            networks: ['ethereum', 'polygon', 'arbitrum'] as UnifiedNetwork[]
        },
        magic: {
            enabled: false, // Not implemented yet
            priority: 70,
            networks: ['ethereum', 'polygon'] as UnifiedNetwork[]
        }
    },
    logging: {
        level: 'info',
        logSuccessfulSigning: true,
        logFailedAttempts: true,
        logAuthenticationDetails: false // Don't log sensitive auth details by default
    }
};

// Get configuration from environment variables with fallbacks
export function getPaymentStrategyConfig(): PaymentStrategyConfig {
    const config = { ...DEFAULT_CONFIG };
    
    // Allow overriding via environment variables
    if (typeof env.PAYMENT_STRATEGY_ENABLED === 'boolean') {
        config.enabled = env.PAYMENT_STRATEGY_ENABLED;
    }
    
    if (env.PAYMENT_STRATEGY_FALLBACK) {
        const fallback = env.PAYMENT_STRATEGY_FALLBACK as PaymentStrategyConfig['fallbackBehavior'];
        if (['fail', 'continue', 'log_only'].includes(fallback)) {
            config.fallbackBehavior = fallback;
        }
    }
    
    if (env.PAYMENT_STRATEGY_MAX_RETRIES) {
        const maxRetries = env.PAYMENT_STRATEGY_MAX_RETRIES;
        if (maxRetries > 0 && maxRetries <= 10) {
            config.maxRetries = maxRetries;
        }
    }
    
    if (env.PAYMENT_STRATEGY_TIMEOUT_MS) {
        const timeoutMs = env.PAYMENT_STRATEGY_TIMEOUT_MS;
        if (timeoutMs > 0 && timeoutMs <= 120000) { // Max 2 minutes
            config.timeoutMs = timeoutMs;
        }
    }
    
    // In test env, force only testing strategy and disable others
    if (isTest()) {
        config.strategies.cdp.enabled = false;
        config.strategies.privy.enabled = false;
        config.strategies.magic.enabled = false;
        config.strategies.test.enabled = true;
        config.fallbackBehavior = 'fail';
        config.maxRetries = 1;

        // Architecture-level defaults (EVM + Solana/NEAR)
        config.strategies.test.evm = {
            privateKey: (env.TEST_EVM_PRIVATE_KEY as `0x${string}` | undefined) ?? undefined,
            address: env.TEST_EVM_ADDRESS as `0x${string}` | undefined,
        };
        config.strategies.test.solana = {
            secretKey: env.TEST_SOLANA_SECRET_KEY,
            address: env.TEST_SOLANA_ADDRESS,
        };
        config.strategies.test.near = {
            privateKey: env.TEST_NEAR_PRIVATE_KEY,
            address: env.TEST_NEAR_ADDRESS,
        };
    } else {
        // CDP specific configuration
        if (typeof env.CDP_STRATEGY_ENABLED === 'boolean') {
            config.strategies.cdp.enabled = env.CDP_STRATEGY_ENABLED;
        }
    }
    
    if (env.CDP_STRATEGY_PRIORITY) {
        const priority = env.CDP_STRATEGY_PRIORITY;
        if (priority >= 0 && priority <= 1000) {
            config.strategies.cdp.priority = priority;
        }
    }
    
    if (env.CDP_PREFER_SMART_ACCOUNTS) {
        config.strategies.cdp.preferSmartAccounts = env.CDP_PREFER_SMART_ACCOUNTS;
    }
    
    // Logging configuration
    if (env.PAYMENT_STRATEGY_LOG_LEVEL) {
        const level = env.PAYMENT_STRATEGY_LOG_LEVEL as PaymentStrategyConfig['logging']['level'];
        if (['debug', 'info', 'warn', 'error'].includes(level)) {
            config.logging.level = level;
        }
    }
    
    if (env.PAYMENT_STRATEGY_LOG_AUTH_DETAILS) {
        config.logging.logAuthenticationDetails = true;
    }
    
    return config;
}

// Configuration validation
export function validateConfig(config: PaymentStrategyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.maxRetries < 0 || config.maxRetries > 10) {
        errors.push('maxRetries must be between 0 and 10');
    }
    
    if (config.timeoutMs < 1000 || config.timeoutMs > 300000) {
        errors.push('timeoutMs must be between 1000 and 300000 (1 second to 5 minutes)');
    }
    
    // Validate strategy priorities
    const enabledStrategies = Object.values(config.strategies).filter(s => s.enabled);
    const priorities = enabledStrategies.map(s => s.priority);
    if (new Set(priorities).size !== priorities.length) {
        errors.push('Strategy priorities must be unique');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Get singleton config instance
let configInstance: PaymentStrategyConfig | null = null;

export function getConfig(): PaymentStrategyConfig {
    if (!configInstance) {
        configInstance = getPaymentStrategyConfig();
        
        // Validate configuration
        const validation = validateConfig(configInstance);
        if (!validation.valid) {
            console.warn('[PaymentStrategy] Configuration validation failed:', validation.errors);
            // Use default config if validation fails
            configInstance = DEFAULT_CONFIG;
        }
    }
    
    return configInstance;
}

// Reset config instance (useful for testing)
export function resetConfig(): void {
    configInstance = null;
} 