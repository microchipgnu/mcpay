// Individual pricing entry within the payment data
export interface PricingEntry {
    id: string; 
    maxAmountRequiredRaw: string;         // Base units as string
    tokenDecimals: number;    // Token decimals
    network: string;          // Network identifier
    assetAddress: string; // Contract address if applicable
    active: boolean;          // Whether this pricing is active
    createdAt: string;        // ISO timestamp
    updatedAt: string;        // ISO timestamp
}

// Define tool call type for better type safety
export type ToolCall = {
    name: string;
    args: Record<string, unknown>;
    isPaid: boolean;
    pricing?: PricingEntry[] | null; 
    id?: string;
    toolId?: string;
    serverId?: string;
    payTo?: string;
};

// Helper functions for working with enhanced pricing structure

/**
 * Extract active pricing from payment data
 */
export function getActivePricing(pricing: PricingEntry[] | null): PricingEntry | null {
    if (!pricing || !Array.isArray(pricing)) {
        return null;
    }
    return pricing.find(p => p.active === true) || null;
}

/**
 * Check if payment has active pricing
 */
export function hasActivePricing(pricing: PricingEntry[] | null): boolean {
    return getActivePricing(pricing) !== null;
}

// Explorer/latest payments API types
export type PaymentListItem = {
    id: string;
    status: 'success' | 'pending' | 'failed';
    serverId?: string;
    serverName?: string;
    tool?: string;
    amountRaw: string;
    tokenDecimals: number;
    currency: string;
    network: string;
    user: string;
    timestamp: string;
    txHash: string;
};

export interface LatestPaymentsResponse {
    items: PaymentListItem[];
    total: number;
}