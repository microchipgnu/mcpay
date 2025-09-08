import type { Step } from "./types";
import { auth } from "@/lib/gateway/auth";
import { extractApiKey, hashApiKey } from "@/lib/gateway/auth-utils";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import type { UserWithWallet } from "@/types";
import { tryParseJson } from "./utils";

async function getOrCreateUser(walletAddress: string, provider = "unknown"): Promise<UserWithWallet | null> {
    if (!walletAddress || typeof walletAddress !== "string") return null;
    return await withTransaction(async (tx) => {
        const walletRecord = await txOperations.getWalletByAddress(walletAddress)(tx);
        if (walletRecord?.user) {
            await txOperations.updateUserLastLogin(walletRecord.user.id)(tx);
            await txOperations.updateWalletMetadata(walletRecord.id, { lastUsedAt: new Date() })(tx);
            return { ...walletRecord.user, walletAddress: walletRecord.walletAddress } as UserWithWallet;
        }
        let user = await txOperations.getUserByWalletAddress(walletAddress)(tx);
        if (user) {
            await txOperations.migrateLegacyWallet(user.id)(tx);
            await txOperations.updateUserLastLogin(user.id)(tx);
            return user as UserWithWallet;
        }
        let blockchain = "ethereum";
        if (walletAddress.length === 44 && !walletAddress.startsWith("0x")) blockchain = "solana";
        else if (walletAddress.endsWith(".near") || walletAddress.length === 64) blockchain = "near";
        user = await txOperations.createUser({
            walletAddress,
            displayName: `User_${walletAddress.substring(0, 8)}`,
            walletType: "external",
            walletProvider: provider,
            blockchain,
        })(tx);
        return user as UserWithWallet;
    });
}

export const authResolutionStep: Step = async (ctx) => {
    try {
        const url = new URL(ctx.req.url);
        const searchParams = url.searchParams;
        let bodyParams: Record<string, unknown> | undefined = undefined;
        try {
            const json = await tryParseJson(ctx.req);
            if (json && typeof json === 'object') bodyParams = json as Record<string, unknown>;
        } catch {}

        const apiKey = extractApiKey({ headers: ctx.req.headers, searchParams, bodyParams });
        if (apiKey) {
            try {
                const keyHash = hashApiKey(apiKey);
                const apiKeyResult = await withTransaction(async (tx) => {
                    return await txOperations.validateApiKey(keyHash)(tx);
                });
                if (apiKeyResult?.user) {
                    const userWallets = await withTransaction(async (tx) => {
                        return await txOperations.getUserWallets(apiKeyResult.user.id, true)(tx);
                    });
                    const primaryWallet = userWallets.find(w => w.isPrimary) || userWallets[0];
                    if (primaryWallet) {
                        const fullUser = await withTransaction(async (tx) => {
                            return await txOperations.getUserById(apiKeyResult.user!.id)(tx);
                        });
                        if (fullUser) {
                            ctx.user = { ...fullUser, walletAddress: primaryWallet.walletAddress } as UserWithWallet;
                            ctx.authMethod = 'api_key';
                            return ctx;
                        }
                    } else {
                        const fullUser = await withTransaction(async (tx) => {
                            return await txOperations.getUserById(apiKeyResult.user!.id)(tx);
                        });
                        if (fullUser) {
                            ctx.user = { ...fullUser, walletAddress: null } as UserWithWallet;
                            ctx.authMethod = 'api_key';
                            return ctx;
                        }
                    }
                }
            } catch {}
        }

        // Session
        try {
            const authResult = await auth.api.getSession({ headers: ctx.req.headers });
            if (authResult?.session && authResult?.user) {
                const userWallets = await withTransaction(async (tx) => {
                    return await txOperations.getUserWallets(authResult.user.id, true)(tx);
                });
                const primaryWallet = userWallets.find(w => w.isPrimary) || userWallets[0];
                if (primaryWallet) {
                    const fullUser = await withTransaction(async (tx) => {
                        return await txOperations.getUserById(authResult.user.id)(tx);
                    });
                    if (fullUser) {
                        ctx.user = { ...fullUser, walletAddress: primaryWallet.walletAddress } as UserWithWallet;
                        ctx.authMethod = 'session';
                        return ctx;
                    }
                } else {
                    const fullUser = await withTransaction(async (tx) => {
                        return await txOperations.getUserById(authResult.user.id)(tx);
                    });
                    if (fullUser) {
                        ctx.user = { ...fullUser, walletAddress: null } as UserWithWallet;
                        ctx.authMethod = 'session';
                        return ctx;
                    }
                }
            }
        } catch {}

        // Wallet header
        const walletAddress = ctx.req.headers.get("X-Wallet-Address");
        if (walletAddress) {
            const user = await getOrCreateUser(walletAddress);
            if (user) {
                ctx.user = user;
                ctx.authMethod = 'wallet_header';
                return ctx;
            }
        }

        // None
        ctx.user = null;
        ctx.authMethod = 'none';
        return ctx;
    } catch {
        ctx.user = null;
        ctx.authMethod = 'none';
        return ctx;
    }
};

export default authResolutionStep;


