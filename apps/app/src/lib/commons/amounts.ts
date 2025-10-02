/**
 * Token Amount Conversion Utilities for MCPay Commons
 * 
 * This module provides precise amount conversion utilities for handling token amounts
 * across different decimal places without floating point precision issues.
 * 
 * Database Integration:
 * - Database stores amounts as NUMERIC(38,0) + token_decimals
 * - API uses string-based amounts for precision
 * - BigInt arithmetic for all calculations
 * 
 * Key Features:
 * - BigInt-based precise arithmetic
 * - Conversion between human-readable amounts and base units
 * - Support for different token decimals
 * - Database NUMERIC integration
 * - Validation and error handling
 * - Type-safe amount operations
 * - Multi-currency revenue tracking
 */

import type { FormatAmountOptions, DbAmountRecord, RevenueByCurrency } from '@/types/blockchain';

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class AmountConversionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'AmountConversionError';
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

function validateDecimalString(amount: string): void {
  if (!amount || typeof amount !== 'string') {
    throw new AmountConversionError('Amount must be a non-empty string');
  }
  
  // Allow negative numbers, integers, and decimals
  const decimalRegex = /^-?\d+\.?\d*$/;
  if (!decimalRegex.test(amount)) {
    throw new AmountConversionError(`Invalid decimal format: ${amount}`);
  }
  
  // Check for leading zeros (except for "0" and "0.x")
  if (amount.match(/^-?0\d+/)) {
    throw new AmountConversionError(`Invalid leading zeros: ${amount}`);
  }
}

function validateDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) {
    throw new AmountConversionError(`Invalid decimals: ${decimals}. Must be integer between 0 and 77`);
  }
}

export function validateBaseAmount(amount: string): boolean {
  if (!amount || typeof amount !== 'string') {
    throw new AmountConversionError('Amount must be a non-empty string');
  }
  
  // Allow negative numbers
  const regex = /^-?\d+$/;
  if (!regex.test(amount)) {
    throw new AmountConversionError(`Invalid base amount format: ${amount}`);
  }
  
  try {
    BigInt(amount); // This will throw if the string is not a valid integer
    return true;
  } catch (error) {
    throw new AmountConversionError(`Invalid base amount: ${amount}`, error);
  }
}

// =============================================================================
// CORE CONVERSION FUNCTIONS
// =============================================================================

/**
 * Converts a human-readable amount to base units (atomic units)
 * 
 * @param amount - Human-readable amount as string (e.g., "0.1", "1.5")
 * @param decimals - Number of decimal places for the token (e.g., 6 for USDC, 18 for ETH)
 * @returns Base units as string (e.g., "100000" for 0.1 USDC)
 */
export function toBaseUnits(amount: string, decimals: number): string {
  validateDecimalString(amount);
  validateDecimals(decimals);
  
  try {
    // Handle negative numbers
    const isNegative = amount.startsWith('-');
    const absoluteAmount = isNegative ? amount.slice(1) : amount;
    
    // Split into integer and decimal parts
    const [integerPart = '0', decimalPart = ''] = absoluteAmount.split('.');
    
    // Validate decimal part length
    if (decimalPart.length > decimals) {
      throw new AmountConversionError(
        `Too many decimal places: ${decimalPart.length} > ${decimals}`
      );
    }
    
    // Pad decimal part to match required decimals
    const paddedDecimalPart = decimalPart.padEnd(decimals, '0');
    
    // Combine integer and decimal parts
    const fullIntegerString = integerPart + paddedDecimalPart;
    
    // Convert to BigInt and back to string to remove leading zeros
    const result = BigInt(fullIntegerString).toString();
    
    return isNegative ? `-${result}` : result;
  } catch (error) {
    if (error instanceof AmountConversionError) {
      throw error;
    }
    throw new AmountConversionError(
      `Failed to convert ${amount} to base units with ${decimals} decimals`,
      error
    );
  }
}

/**
 * Converts base units (atomic units) to human-readable amount
 * 
 * @param baseAmount - Base units as string (e.g., "100000")
 * @param decimals - Number of decimal places for the token
 * @returns Human-readable amount as string (e.g., "0.1")
 */
export function fromBaseUnits(baseAmount: string, decimals: number): string {
  if (!baseAmount || typeof baseAmount !== 'string') {
    throw new AmountConversionError('Base amount must be a non-empty string');
  }
  
  validateDecimals(decimals);
  
  try {
    // Handle negative numbers
    const isNegative = baseAmount.startsWith('-');
    const absoluteAmount = isNegative ? baseAmount.slice(1) : baseAmount;
    
    // Validate base amount is a valid integer
    if (!/^\d+$/.test(absoluteAmount)) {
      throw new AmountConversionError(`Invalid base amount format: ${baseAmount}`);
    }
    
    // Convert to BigInt for validation
    const bigIntAmount = BigInt(absoluteAmount);
    const amountString = bigIntAmount.toString(); // This removes leading zeros
    
    if (decimals === 0) {
      return isNegative ? `-${amountString}` : amountString;
    }
    
    // Pad with leading zeros if necessary
    const paddedAmount = amountString.padStart(decimals + 1, '0');
    
    // Split into integer and decimal parts
    const integerPart = paddedAmount.slice(0, -decimals) || '0';
    const decimalPart = paddedAmount.slice(-decimals);
    
    // Remove trailing zeros from decimal part
    const trimmedDecimalPart = decimalPart.replace(/0+$/, '');
    
    // Construct result
    const result = trimmedDecimalPart 
      ? `${integerPart}.${trimmedDecimalPart}`
      : integerPart;
    
    return isNegative ? `-${result}` : result;
  } catch (error) {
    if (error instanceof AmountConversionError) {
      throw error;
    }
    throw new AmountConversionError(
      `Failed to convert ${baseAmount} from base units with ${decimals} decimals`,
      error
    );
  }
}

// =============================================================================
// FORMATTING FUNCTIONS
// =============================================================================

/**
 * Formats a base unit amount for display
 * 
 * @param baseAmount - Base units as string
 * @param decimals - Number of decimal places for the token
 * @param options - Formatting options
 * @returns Formatted amount string
 */
export function formatAmount(
  baseAmount: string,
  decimals: number,
  options: FormatAmountOptions = {}
): string {
  const {
    symbol,
    precision,
    compact = false,
    minDecimals = 0,
    showSymbol = true
  } = options;
  
  try {
    // Convert to human-readable amount
    const readableAmount = fromBaseUnits(baseAmount, decimals);
    const numAmount = parseFloat(readableAmount);
    
    // Apply precision if specified
    let formatted = readableAmount;
    if (precision !== undefined) {
      formatted = numAmount.toFixed(precision);
    } else if (minDecimals > 0) {
      const currentDecimals = (readableAmount.split('.')[1] || '').length;
      if (currentDecimals < minDecimals) {
        formatted = numAmount.toFixed(minDecimals);
      }
    }
    
    // Remove trailing zeros unless minDecimals requires them
    if (precision === undefined) {
      formatted = formatted.replace(/\.?0+$/, '');
    }
    
    // Apply compact notation for large numbers
    if (compact && Math.abs(numAmount) >= 1000) {
      const suffixes = ['', 'K', 'M', 'B', 'T'];
      const tier = Math.floor(Math.log10(Math.abs(numAmount)) / 3);
      if (tier > 0 && tier < suffixes.length) {
        const scale = Math.pow(10, tier * 3);
        const scaled = numAmount / scale;
        formatted = scaled.toFixed(1).replace(/\.0$/, '') + suffixes[tier];
      }
    }
    
    // Add symbol if requested
    if (showSymbol && symbol) {
      return `${formatted} ${symbol}`;
    }
    
    return formatted;
  } catch (error) {
    if (error instanceof AmountConversionError) {
      throw error;
    }
    throw new AmountConversionError(
      `Failed to format amount ${baseAmount} with ${decimals} decimals`,
      error
    );
  }
}

// =============================================================================
// ARITHMETIC OPERATIONS
// =============================================================================

/**
 * Adds two amounts in base units
 */
export function addAmounts(amount1: string, amount2: string): string {
  try {
    const bigInt1 = BigInt(amount1);
    const bigInt2 = BigInt(amount2);
    return (bigInt1 + bigInt2).toString();
  } catch (error) {
    throw new AmountConversionError(
      `Failed to add amounts ${amount1} + ${amount2}`,
      error
    );
  }
}

/**
 * Subtracts two amounts in base units
 */
export function subtractAmounts(amount1: string, amount2: string): string {
  try {
    const bigInt1 = BigInt(amount1);
    const bigInt2 = BigInt(amount2);
    return (bigInt1 - bigInt2).toString();
  } catch (error) {
    throw new AmountConversionError(
      `Failed to subtract amounts ${amount1} - ${amount2}`,
      error
    );
  }
}

/**
 * Compares two amounts in base units
 * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
 */
export function compareAmounts(amount1: string, amount2: string): number {
  try {
    const bigInt1 = BigInt(amount1);
    const bigInt2 = BigInt(amount2);
    
    if (bigInt1 < bigInt2) return -1;
    if (bigInt1 > bigInt2) return 1;
    return 0;
  } catch (error) {
    throw new AmountConversionError(
      `Failed to compare amounts ${amount1} and ${amount2}`,
      error
    );
  }
}

/**
 * Checks if an amount is zero
 */
export function isZeroAmount(amount: string): boolean {
  try {
    return BigInt(amount) === BigInt(0);
  } catch (error) {
    throw new AmountConversionError(`Failed to check if amount ${amount} is zero`, error);
  }
}

// =============================================================================
// USER INPUT PARSING
// =============================================================================

/**
 * Safely parses a user input amount and converts to base units
 * Handles various input formats and provides clear error messages
 */
export function parseUserAmount(input: string, decimals: number): string {
  if (!input || typeof input !== 'string') {
    throw new AmountConversionError('Please enter an amount');
  }
  
  // Trim whitespace
  const trimmed = input.trim();
  
  // Remove common prefixes/suffixes
  let cleaned = trimmed;
  if (cleaned.startsWith('$')) {
    cleaned = cleaned.slice(1);
  }
  
  // Convert comma separators to dots for international users
  cleaned = cleaned.replace(/,/g, '.');
  
  // Validate and convert
  return toBaseUnits(cleaned, decimals);
}

// =============================================================================
// DATABASE INTEGRATION
// =============================================================================

/**
 * Converts a human-readable amount to database format
 */
export function toDbAmount(humanAmount: string, decimals: number): DbAmountRecord {
  return {
    amount_raw: toBaseUnits(humanAmount, decimals),
    token_decimals: decimals
  };
}

/**
 * Converts database amount record to human-readable amount
 */
export function fromDbAmount(amountRaw: string | number, tokenDecimals: number): string {
  const baseUnits = typeof amountRaw === 'number' ? amountRaw.toString() : amountRaw;
  return fromBaseUnits(baseUnits, tokenDecimals);
}

/**
 * Formats a database amount record for display
 */
export function formatDbAmount(
  amountRaw: string | number,
  tokenDecimals: number,
  options: FormatAmountOptions = {}
): string {
  const baseUnits = typeof amountRaw === 'number' ? amountRaw.toString() : amountRaw;
  return formatAmount(baseUnits, tokenDecimals, options);
}

/**
 * Validates a database amount record
 */
export function validateDbAmount(record: DbAmountRecord): boolean {
  validateBaseAmount(record.amount_raw);
  validateDecimals(record.token_decimals);
  return true;
}

/**
 * Aggregates multiple database amounts (same currency only)
 */
export function aggregateDbAmounts(amounts: DbAmountRecord[]): DbAmountRecord {
  if (amounts.length === 0) {
    throw new AmountConversionError('Cannot aggregate empty array of amounts');
  }
  
  const firstDecimals = amounts[0].token_decimals;
  
  // Validate all amounts have same decimals
  for (const amount of amounts) {
    if (amount.token_decimals !== firstDecimals) {
      throw new AmountConversionError(
        `Cannot aggregate amounts with different decimals: ${firstDecimals} vs ${amount.token_decimals}`
      );
    }
    validateDbAmount(amount);
  }
  
  // Sum all amounts
  let total = BigInt(0);
  for (const amount of amounts) {
    total += BigInt(amount.amount_raw);
  }
  
  return {
    amount_raw: total.toString(),
    token_decimals: firstDecimals
  };
}

// =============================================================================
// MULTI-CURRENCY REVENUE OPERATIONS
// =============================================================================

/**
 * Create a currency key for revenue tracking
 */
export function createCurrencyKey(currency: string, decimals: number): string {
  return `${currency}-${decimals}`;
}

/**
 * Parse a currency key back to currency and decimals
 */
export function parseCurrencyKey(key: string): { currency: string; decimals: number } {
  const parts = key.split('-');
  if (parts.length !== 2) {
    throw new AmountConversionError(`Invalid currency key format: ${key}. Expected format: CURRENCY-DECIMALS`);
  }
  const decimals = parseInt(parts[1], 10);
  if (isNaN(decimals)) {
    throw new AmountConversionError(`Invalid decimals in currency key: ${key}`);
  }
  return { currency: parts[0], decimals };
}

/**
 * Add revenue to a multi-currency revenue object
 */
export function addRevenueToCurrency(
  existingRevenue: RevenueByCurrency | null | undefined,
  currency: string,
  decimals: number,
  amountRaw: string
): RevenueByCurrency {
  const revenue = existingRevenue || {};
  const key = createCurrencyKey(currency, decimals);
  const existingAmount = revenue[key] || '0';
  const newAmount = addAmounts(existingAmount, amountRaw);
  
  return {
    ...revenue,
    [key]: newAmount
  };
}

/**
 * Merge multiple multi-currency revenue objects
 */
export function mergeRevenueByCurrency(
  ...revenues: (RevenueByCurrency | null | undefined)[]
): RevenueByCurrency {
  const result: RevenueByCurrency = {};
  
  for (const revenue of revenues) {
    if (!revenue) continue;
    
    for (const [key, amount] of Object.entries(revenue)) {
      const existingAmount = result[key] || '0';
      result[key] = addAmounts(existingAmount, amount);
    }
  }
  
  return result;
}

/**
 * Format multi-currency revenue for display
 */
export function formatRevenueByCurrency(
  revenue: RevenueByCurrency | null | undefined,
  options?: {
    maxCurrencies?: number;
    showZeroAmounts?: boolean;
  }
): Array<{ currency: string; amount: string; formattedAmount: string }> {
  if (!revenue) return [];
  
  const { maxCurrencies = 10, showZeroAmounts = false } = options || {};
  
  const formatted = Object.entries(revenue)
    .map(([key, amountRaw]) => {
      const { currency, decimals } = parseCurrencyKey(key);
      const amount = fromBaseUnits(amountRaw, decimals);
      const formattedAmount = formatAmount(amountRaw, decimals, {
        showSymbol: true,
        symbol: currency
      });
      
      return { currency, amount, formattedAmount };
    })
    .filter(item => showZeroAmounts || parseFloat(item.amount) > 0)
    .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
    .slice(0, maxCurrencies);
  
  return formatted;
}

/**
 * Get total revenue for a specific currency
 */
export function getRevenueByCurrency(
  revenue: RevenueByCurrency | null | undefined,
  currency: string,
  decimals: number
): string {
  if (!revenue) return '0';
  const key = createCurrencyKey(currency, decimals);
  return revenue[key] || '0';
}

/**
 * Check if revenue object has any non-zero amounts
 */
export function hasRevenue(revenue: RevenueByCurrency | null | undefined): boolean {
  if (!revenue) return false;
  return Object.values(revenue).some(amount => parseFloat(amount) > 0);
} 