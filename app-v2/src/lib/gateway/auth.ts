import db from "@/lib/gateway/db";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import * as schema from "@/lib/gateway/db/schema";
import { getGitHubConfig, isTest } from "@/lib/gateway/env";
import { CDPWalletMetadata } from "@/types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { randomUUID } from "crypto";
import { oAuthProxy } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users: schema.users,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: getGitHubConfig().clientId,
      clientSecret: getGitHubConfig().clientSecret,
      scope: ["user:email", "repo"],
      redirectURI: "https://mcpay.tech/api/auth/callback/github"
    }
  },
  user: {
    additionalFields: {
      walletAddress: {
        type: "string",
        required: false,
      },
      displayName: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
    },
    modelName: "users", // Use the "users" table name
  },
  plugins: [
    oAuthProxy(),
  ],
  // Generate UUID for user IDs instead of default string IDss
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
    // crossSubDomainCookies: {
    //   enabled: true,
    //   domain: "http://localhost:3232",
    // },
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true // New browser standards for foreign cookies
    }
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession;

      // Only proceed if we have a new session (successful authentication)
      if (!newSession?.user?.id) {
        return;
      }

      const user = newSession.user;

      // Determine if this is likely a new user based on creation timestamp
      const userCreatedAt = new Date(user.createdAt);
      const now = new Date();
      const timeSinceCreation = now.getTime() - userCreatedAt.getTime();
      const isRecentlyCreated = timeSinceCreation < 60000; // Less than 1 minute old

      // Log user info for debugging
      console.log(`[AUTH HOOK] Processing authentication for user ${user.id}:`, {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        timeSinceCreation: `${Math.round(timeSinceCreation / 1000)}s`,
        isRecentlyCreated,
        sessionId: newSession.session.id
      });

      setImmediate(async () => {
        try {

          if (isTest()) {
            console.log(`[AUTH HOOK] Skipping CDP wallet creation for test user ${user.id} due to isTest()`);
            return;
          }


          console.log(`[AUTH HOOK] Attempting CDP wallet creation for user ${user.id}`);

          const result = await withTransaction(async (tx) => {
            return await txOperations.autoCreateCDPWalletForUser(user.id, {
              email: user.email || undefined,
              name: user.name || undefined,
              displayName: user.displayName || undefined,
            }, {
              createSmartAccount: false, // Create smart account for gas sponsorship
            })(tx);
          });
          // Removed experimental SEI faucet funding block

          if (result) {
            const userType = isRecentlyCreated ? "new user" : "existing user";
            console.log(`[AUTH HOOK] Successfully created CDP wallets for ${userType} ${user.id}:`, {
              accountName: result.accountName,
              walletsCreated: result.wallets.length,
              hasSmartAccount: !!result.cdpResult.smartAccount,
              primaryWallet: result.wallets.find(w => w.isPrimary)?.walletAddress,
              smartWallet: result.wallets.find(w => {
                const metadata = w.walletMetadata as CDPWalletMetadata;
                return metadata?.isSmartAccount;
              })?.walletAddress
            });
          } else {
            console.log(`[AUTH HOOK] User ${user.id} already has CDP wallets, no action needed`);
          }
        } catch (error) {
          console.error(`[AUTH HOOK] Failed to create CDP wallet for user ${user.id}:`, error);
          // Error details for debugging but don't break auth flow
          if (error instanceof Error) {
            console.error(`[AUTH HOOK] Error details: ${error.message}`);
          }
        }
      });
    }),
  },
});

