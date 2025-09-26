import db from "@/lib/gateway/db";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import * as schema from "@/lib/gateway/db/schema";
import { getGitHubConfig, isTest } from "@/lib/gateway/env";
import { CDPWalletMetadata } from "@/types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { randomUUID } from "crypto";
import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { seiTestnet } from "viem/chains";

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
      scope: ["user:email", "repo", "read:org"],
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

          // TODO: remove this. This is experimental to fund accounts on Sei.
          if (process.env.EXPERIMENTAL_SEI_FAUCET_ADDRESS && process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY) {
            try {
              console.log(`[SEI FAUCET] Starting USDC funding process for user ${user.id}`);
              
              const faucetAccount = privateKeyToAccount(process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY as `0x${string}`);
              const publicClient = createPublicClient({
                chain: seiTestnet,
                transport: http(),
              });
              
              const walletClient = createWalletClient({
                chain: seiTestnet,
                transport: http(),
                account: faucetAccount,
              });

              // Get the user's wallet address - either from new creation result or existing wallets
              let userWallet: { walletAddress: string; isPrimary?: boolean } | undefined;
              
              if (result) {
                // New user - get wallet from creation result
                userWallet = result.wallets.find(w => w.isPrimary);
              } else {
                // Existing user - get existing wallets from database
                const existingWallets = await withTransaction(async (tx) => {
                  return await txOperations.getCDPWalletsByUser(user.id)(tx);
                });
                
                // Find the primary wallet or first active wallet
                const primaryWallet = existingWallets.find(w => w.isPrimary && w.isActive);
                const firstActiveWallet = existingWallets.find(w => w.isActive);
                const wallet = primaryWallet || firstActiveWallet;
                
                if (wallet) {
                  userWallet = {
                    walletAddress: wallet.walletAddress,
                    isPrimary: wallet.isPrimary,
                  };
                }
              }

              if (!userWallet?.walletAddress) {
                console.log(`[SEI FAUCET] No wallet found for user ${user.id}`);
                return;
              }

              const userAddress = userWallet.walletAddress as `0x${string}`;
              console.log(`[SEI FAUCET] User wallet address: ${userAddress}`);

              // USDC contract address on SEI testnet (from networks config)
              const USDC_ADDRESS = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED' as const;
              const USDC_DECIMALS = 6;
              const FUNDING_AMOUNT = '0.5'; // 0.1 USDC

              // Check user's USDC balance
              const userUSDCBalance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: [
                  {
                    name: 'balanceOf',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'account', type: 'address' }],
                    outputs: [{ name: '', type: 'uint256' }],
                  },
                ] as const,
                functionName: 'balanceOf',
                args: [userAddress],
              });

              console.log(`[SEI FAUCET] User USDC balance: ${userUSDCBalance.toString()}`);

              // Only fund if user has 0 USDC balance
              if (userUSDCBalance === BigInt(0)) {
                console.log(`[SEI FAUCET] User has no USDC, funding with ${FUNDING_AMOUNT} USDC`);

                // Check faucet USDC balance
                const faucetUSDCBalance = await publicClient.readContract({
                  address: USDC_ADDRESS,
                  abi: [
                    {
                      name: 'balanceOf',
                      type: 'function',
                      stateMutability: 'view',
                      inputs: [{ name: 'account', type: 'address' }],
                      outputs: [{ name: '', type: 'uint256' }],
                    },
                  ] as const,
                  functionName: 'balanceOf',
                  args: [faucetAccount.address],
                });

                const fundingAmountBigInt = parseUnits(FUNDING_AMOUNT, USDC_DECIMALS);
                
                if (faucetUSDCBalance < fundingAmountBigInt) {
                  console.error(`[SEI FAUCET] Insufficient faucet USDC balance. Required: ${fundingAmountBigInt}, Available: ${faucetUSDCBalance}`);
                  return;
                }

                // Transfer USDC to user
                const transferHash = await walletClient.writeContract({
                  address: USDC_ADDRESS,
                  abi: [
                    {
                      name: 'transfer',
                      type: 'function',
                      stateMutability: 'nonpayable',
                      inputs: [
                        { name: 'to', type: 'address' },
                        { name: 'amount', type: 'uint256' },
                      ],
                      outputs: [{ name: '', type: 'bool' }],
                    },
                  ] as const,
                  functionName: 'transfer',
                  args: [userAddress, fundingAmountBigInt],
                });

                console.log(`[SEI FAUCET] USDC transfer initiated. Transaction hash: ${transferHash}`);

                // Wait for transaction confirmation
                const receipt = await publicClient.waitForTransactionReceipt({
                  hash: transferHash,
                });

                if (receipt.status === 'success') {
                  console.log(`[SEI FAUCET] Successfully funded user ${user.id} with ${FUNDING_AMOUNT} USDC on SEI testnet`);
                } else {
                  console.error(`[SEI FAUCET] USDC transfer failed for user ${user.id}. Transaction: ${transferHash}`);
                }
              } else {
                console.log(`[SEI FAUCET] User ${user.id} already has USDC balance: ${userUSDCBalance.toString()}, skipping funding`);
              }
            } catch (error) {
              console.error(`[SEI FAUCET] Error funding user ${user.id} with USDC:`, error);
            }
          }

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

