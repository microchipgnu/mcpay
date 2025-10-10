import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { apiKey, mcp, oAuthProxy } from "better-auth/plugins";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../../auth-schema.js";
import env, { getDatabaseUrl, getGitHubConfig, getTrustedOrigins, isTest } from "../env.js";
import { CDPWalletMetadata } from "./3rd-parties/cdp/types.js";
import { txOperations } from "./db/actions.js";

dotenv.config();

const TRUSTED_ORIGINS = getTrustedOrigins();

// Enable fetch connection cache to support transactional flows over Neon HTTP
neonConfig.fetchConnectionCache = true;
const sql = neon(getDatabaseUrl());
export const db = drizzle(sql, { schema });

export const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
        provider: "pg"
    }),
    trustedOrigins: TRUSTED_ORIGINS,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
        }
    },
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
        },
    },
    plugins: [
        apiKey({
            enableSessionForAPIKeys: true,
            enableMetadata: true,
            rateLimit: {
                enabled: false,
            }
        }),
        mcp({
            loginPage: "/connect",
        })
    ],
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
        //   const newSession = ctx.context.newSession;
    
        //   // Only proceed if we have a new session (successful authentication)
        //   if (!newSession?.user?.id) {
        //     return;
        //   }
    
        //   const user = newSession.user;
    
        //   // Determine if this is likely a new user based on creation timestamp
        //   const userCreatedAt = new Date(user.createdAt);
        //   const now = new Date();
        //   const timeSinceCreation = now.getTime() - userCreatedAt.getTime();
        //   const isRecentlyCreated = timeSinceCreation < 60000; // Less than 1 minute old
    
        //   // Log user info for debugging
        //   console.log(`[AUTH HOOK] Processing authentication for user ${user.id}:`, {
        //     email: user.email,
        //     name: user.name,
        //     createdAt: user.createdAt,
        //     timeSinceCreation: `${Math.round(timeSinceCreation / 1000)}s`,
        //     isRecentlyCreated,
        //     sessionId: newSession.session.id
        //   });

        const user = ctx.context.session?.user
    
          setImmediate(async () => {
            try {

                if (!user) {
                    return;
                }
                const isRecentlyCreated = true
    
              if (isTest()) {
                console.log(`[AUTH HOOK] Skipping CDP wallet creation for test user ${user.id} due to isTest()`);
                return;
              }
    
    
              console.log(`[AUTH HOOK] Attempting CDP wallet creation for user ${user.id}`);
    
              const result = await txOperations.autoCreateCDPWalletForUser(user.id, {
                email: user.email || undefined,
                name: user.name || undefined,
                displayName: user.displayName || undefined,
              }, {
                createSmartAccount: false,
              })();
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
              // Error details for debugging but don't break auth flow
              if (error instanceof Error) {
                console.error(`[AUTH HOOK] Error details: ${error.message}`);
              }
            }
          });
        }),
      },
})