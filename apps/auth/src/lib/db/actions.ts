import { and, desc, eq } from "drizzle-orm";
import * as schema from "../../../auth-schema.js";
import { userWallets } from "../../../auth-schema.js";
import { db } from "../auth.js";
import { createCDPAccount } from "../3rd-parties/cdp/wallet/index.js";
import type { CDPNetwork } from "../3rd-parties/cdp/types.js";
import { randomUUID } from "node:crypto";

export type Wallet = Omit<typeof userWallets.$inferSelect, 'walletMetadata'> & { walletMetadata: unknown }

// Reusable operations (no transactions)
export const txOperations = {
  // List active Coinbase CDP wallets for a user
  getCDPWalletsByUser: async (userId: string) => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.userId as any, userId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .orderBy(
        desc(schema.userWallets.isPrimary as any) as any,
        desc(schema.userWallets.createdAt as any) as any,
      );

    return rows as unknown as Wallet[];
  },
  
  // Check if user already has any active CDP wallets
  userHasCDPWallets: async (userId: string) => {
    const rows = await db
      .select({ id: schema.userWallets.id })
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.userId as any, userId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .limit(1);
    return rows.length > 0;
  },

  // Create and store a CDP managed wallet record for a user
  createCDPManagedWallet: (
    userId: string,
    data: {
      walletAddress: string;
      accountId: string;
      accountName: string;
      network: string;
      isSmartAccount?: boolean;
      ownerAccountId?: string;
      isPrimary?: boolean;
    }
  ) => async () => {
    const blockchain = data.network.includes("base") ? "base" : "ethereum";
    const architecture = "evm";

    const walletMetadata = {
      cdpAccountId: data.accountId,
      cdpAccountName: data.accountName,
      cdpNetwork: data.network,
      isSmartAccount: data.isSmartAccount || false,
      ownerAccountId: data.ownerAccountId,
      provider: "coinbase-cdp",
      type: "managed",
      createdByService: true,
      managedBy: "coinbase-cdp",
      gasSponsored: !!data.isSmartAccount && (data.network === "base" || data.network === "base-sepolia"),
    } as Record<string, unknown>;

    const inserted = await db
      .insert(schema.userWallets)
      .values({
        id: randomUUID(),
        userId,
        walletAddress: data.walletAddress,
        walletType: "managed",
        provider: "coinbase-cdp",
        blockchain,
        architecture,
        isPrimary: data.isPrimary ?? false,
        isActive: true,
        walletMetadata: walletMetadata as any,
        externalWalletId: data.accountId,
        externalUserId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const row = inserted?.[0];
    if (!row) return null;

    return { ...row, walletMetadata } as Wallet;
  },

  // Find a user's CDP wallet by external CDP account id
  getCDPWalletByAccountId: (accountId: string) => async () => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(
        and(
          eq(schema.userWallets.externalWalletId as any, accountId) as any,
          eq(schema.userWallets.provider as any, "coinbase-cdp") as any,
          eq(schema.userWallets.isActive as any, true) as any,
        ) as any
      )
      .limit(1);

    const row = rows?.[0];
    if (!row) return null;

    return row as unknown as Wallet;
  },

  // Merge and update CDP wallet metadata
  updateCDPWalletMetadata: (
    walletId: string,
    metadata: {
      cdpAccountName?: string;
      cdpNetwork?: string;
      lastUsedAt?: Date;
      balanceCache?: Record<string, unknown>;
      transactionHistory?: Record<string, unknown>[];
    }
  ) => async () => {
    const rows = await db
      .select()
      .from(schema.userWallets)
      .where(eq(schema.userWallets.id as any, walletId) as any)
      .limit(1);

    const wallet = rows?.[0];
    if (!wallet || wallet.provider !== "coinbase-cdp") {
      throw new Error("CDP wallet not found");
    }

    const existing: Record<string, unknown> = (wallet.walletMetadata && typeof wallet.walletMetadata === "object")
      ? (wallet.walletMetadata as Record<string, unknown>)
      : {};

    const updatedMetadata = {
      ...existing,
      ...metadata,
      lastUpdated: new Date().toISOString(),
    } as Record<string, unknown>;

    const updated = await db
      .update(schema.userWallets)
      .set({
        walletMetadata: updatedMetadata as any,
        updatedAt: new Date(),
        ...(metadata.lastUsedAt ? { lastUsedAt: metadata.lastUsedAt } : {}),
      })
      .where(eq(schema.userWallets.id as any, walletId) as any)
      .returning();

    return updated?.[0] ?? null;
  },

  // Auto-create CDP wallet(s) for a user if none exist
  autoCreateCDPWalletForUser: (
    userId: string,
    userInfo: { email?: string; name?: string; displayName?: string },
    options?: { createSmartAccount?: boolean; network?: CDPNetwork }
  ) => async () => {
    console.log(`[DEBUG] Starting CDP wallet auto-creation for user ${userId}`);

    const createSmartAccount = options?.createSmartAccount ?? false;
    const network = (options?.network ?? "base-sepolia") as CDPNetwork;

    console.log(`[DEBUG] Options - createSmartAccount: ${createSmartAccount}, network: ${network}`);

    try {
      const hasCDPWallets = await txOperations.userHasCDPWallets(userId);
      if (hasCDPWallets) {
        console.log(`User ${userId} already has CDP wallets, skipping auto-creation`);
        return null;
      }

      const timestamp = Date.now().toString().slice(-8);
      const safeNameSource = userInfo.displayName
        ? userInfo.displayName.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 10)
        : userId.slice(0, 8);
      const accountName = `mcpay-${safeNameSource}-${timestamp}`;

      console.log(`[DEBUG] Auto-creating CDP wallet for user ${userId} with account name: ${accountName}`);

      const hasAgain = await txOperations.userHasCDPWallets(userId);
      if (hasAgain) {
        console.log(`User ${userId} already has CDP wallets (race condition), skipping`);
        return null;
      }

      console.log(`[DEBUG] Calling createCDPAccount...`);
      const cdpResult = await createCDPAccount({
        accountName,
        network,
        createSmartAccount,
      });
      console.log(`[DEBUG] CDP account creation result:`, cdpResult);

      const wallets: Wallet[] = [];

      const existingPrimary = await db
        .select({ id: schema.userWallets.id })
        .from(schema.userWallets)
        .where(
          and(
            eq(schema.userWallets.userId as any, userId) as any,
            eq(schema.userWallets.isPrimary as any, true) as any,
            eq(schema.userWallets.isActive as any, true) as any,
          ) as any
        )
        .limit(1);

      const makePrimary = existingPrimary.length === 0;

      const mainWallet = await txOperations.createCDPManagedWallet(userId, {
        walletAddress: cdpResult.account.walletAddress,
        accountId: cdpResult.account.accountId,
        accountName: cdpResult.account.accountName || cdpResult.account.accountId,
        network: cdpResult.account.network,
        isSmartAccount: false,
        isPrimary: makePrimary,
      })();
      if (mainWallet) wallets.push(mainWallet);

      if (cdpResult.smartAccount) {
        const smartWallet = await txOperations.createCDPManagedWallet(userId, {
          walletAddress: cdpResult.smartAccount.walletAddress,
          accountId: cdpResult.smartAccount.accountId,
          accountName: cdpResult.smartAccount.accountName || cdpResult.smartAccount.accountId,
          network: cdpResult.smartAccount.network,
          isSmartAccount: true,
          ownerAccountId: cdpResult.account.accountId,
          isPrimary: false,
        })();
        if (smartWallet) wallets.push(smartWallet);
      }

      console.log(`[DEBUG] Successfully created ${wallets.length} CDP wallets for user ${userId}`);
      return { cdpResult, wallets, accountName };
    } catch (error) {
      console.error(`[ERROR] Failed to auto-create CDP wallet for user ${userId}:`, error);
      console.error(`[ERROR] Error details:`, {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  },
};