/**
 * Inferred Input Types for Database Actions
 * 
 * This module creates TypeScript types by inferring them directly
 * from the txOperations methods defined in @/lib/gateway/db/actions.ts
 */

import type { txOperations } from '@/lib/gateway/db/actions';

// =============================================================================
// INFERRED INPUT TYPES FROM TXOPERATIONS
// =============================================================================

// Helper type to extract the first parameter of a function
type FirstParameter<T> = T extends (arg: infer P) => unknown ? P : never;

// Helper type to extract input type from txOperations method
type TxOperationInput<T extends keyof typeof txOperations> = 
  FirstParameter<typeof txOperations[T]>;

// =============================================================================
// SERVER OPERATION INPUT TYPES
// =============================================================================

export type CreateServerInput = TxOperationInput<'createServer'>;
export type UpdateServerInput = TxOperationInput<'updateServer'>;
export type UpdateServerFromPingInput = TxOperationInput<'updateServerFromPing'>;
export type CreateServerForAuthenticatedUserInput = TxOperationInput<'createServerForAuthenticatedUser'>;

// =============================================================================
// TOOL OPERATION INPUT TYPES  
// =============================================================================

export type CreateToolInput = TxOperationInput<'createTool'>;
export type UpdateToolInput = TxOperationInput<'updateTool'>;

// =============================================================================
// USER OPERATION INPUT TYPES
// =============================================================================

export type CreateUserInput = TxOperationInput<'createUser'>;

// =============================================================================
// WALLET OPERATION INPUT TYPES
// =============================================================================

export type AddWalletToUserInput = TxOperationInput<'addWalletToUser'>;
export type CreateManagedWalletInput = TxOperationInput<'createManagedWallet'>;
export type CreateCDPManagedWalletInput = TxOperationInput<'createCDPManagedWallet'>;
export type AutoCreateCDPWalletForUserInput = TxOperationInput<'autoCreateCDPWalletForUser'>;
export type UpdateWalletMetadataInput = TxOperationInput<'updateWalletMetadata'>;
export type UpdateCDPWalletMetadataInput = TxOperationInput<'updateCDPWalletMetadata'>;

// =============================================================================
// SESSION OPERATION INPUT TYPES
// =============================================================================

export type CreateSessionInput = TxOperationInput<'createSession'>;

// =============================================================================
// ACCOUNT OPERATION INPUT TYPES (OAuth)
// =============================================================================

export type CreateAccountInput = TxOperationInput<'createAccount'>;

// =============================================================================
// VERIFICATION OPERATION INPUT TYPES
// =============================================================================

export type CreateVerificationInput = TxOperationInput<'createVerification'>;

// =============================================================================
// PAYMENT OPERATION INPUT TYPES
// =============================================================================

export type CreatePaymentInput = TxOperationInput<'createPayment'>;

// =============================================================================
// API KEY OPERATION INPUT TYPES
// =============================================================================

export type CreateApiKeyInput = TxOperationInput<'createApiKey'>;

// =============================================================================
// TOOL USAGE OPERATION INPUT TYPES
// =============================================================================

export type RecordToolUsageInput = TxOperationInput<'recordToolUsage'>;

// =============================================================================
// PROOF OPERATION INPUT TYPES
// =============================================================================

export type CreateProofInput = TxOperationInput<'createProof'>;

// =============================================================================
// WEBHOOK OPERATION INPUT TYPES
// =============================================================================

export type CreateWebhookInput = TxOperationInput<'createWebhook'>;

// =============================================================================
// ANALYTICS OPERATION INPUT TYPES
// =============================================================================

export type GetProofStatsInput = TxOperationInput<'getProofStats'>;
export type ListProofsInput = TxOperationInput<'listProofs'>;

// =============================================================================
// ADDITIONAL OPERATION INPUT TYPES
// =============================================================================

export type AssignOwnershipInput = TxOperationInput<'assignOwnership'>;

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Get all available txOperation method names
export type TxOperationMethods = keyof typeof txOperations;

// Generic type to get input for any txOperation method
export type GetTxOperationInput<T extends TxOperationMethods> = TxOperationInput<T>;

// Union type of all possible input types
export type AnyTxOperationInput = {
  [K in TxOperationMethods]: TxOperationInput<K>
}[TxOperationMethods];

// =============================================================================
// EXAMPLES OF USAGE
// =============================================================================

/*
// Usage examples:

// 1. Use specific inferred types:
const createServerData: CreateServerInput = {
  serverId: "server-123",
  mcpOrigin: "https://example.com",
  receiverAddress: "0x123..."
  // TypeScript will enforce the exact shape from txOperations.createServer
};

// 2. Use generic helper type:
type CreateUserData = GetTxOperationInput<'createUser'>;

// 3. In function signatures:
async function handleCreateServer(data: CreateServerInput) {
  return await withTransaction(txOperations.createServer(data));
}

// 4. For action handlers that accept various operation types:
type ActionHandler<T extends TxOperationMethods> = (
  data: GetTxOperationInput<T>
) => Promise<any>;

const createServerAction: ActionHandler<'createServer'> = async (data) => {
  // data is automatically typed as CreateServerInput
  return await withTransaction(txOperations.createServer(data));
};
*/ 