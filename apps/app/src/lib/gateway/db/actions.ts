/**
 * Database Actions for MCPay.fun
 * 
 * This module contains all database operations, including:
 * - User and wallet management (multi-blockchain support)
 * - MCP server and tool operations
 * - Payment and usage tracking  
 * - Analytics and proof verification
 * - CDP (Coinbase Developer Platform) managed wallet integration
 * 
 * ## CDP Auto-Creation:
 * - `userHasCDPWallets()` - Check if user has CDP wallets
 * - `autoCreateCDPWalletForUser()` - Auto-create CDP wallet with smart account
 * - `createCDPManagedWallet()` - Store CDP wallet in database
 * - `getCDPWalletsByUser()` - Get user's CDP wallets
 * - `getCDPWalletByAccountId()` - Find CDP wallet by account ID
 * - `updateCDPWalletMetadata()` - Update CDP wallet metadata
 * 
 * The auto-creation system ensures every user gets a managed wallet with:
 * - Regular account for general transactions
 * - Smart account with gas sponsorship on Base networks
 * - Secure key management via CDP's TEE infrastructure
 */

import {
    getBlockchainArchitecture
} from '@/lib/commons';
import { type BlockchainArchitecture } from '@/types/blockchain';

import { createCDPAccount } from '@/lib/gateway/3rd-parties/cdp';
import db from "@/lib/gateway/db";
import {
    account,
    apiKeys,
    mcpServers,
    mcpTools,
    payments,
    proofs,
    serverOwnership,
    session,
    // toolPricing table removed - using enhanced pricing operations instead
    toolUsage,
    users,
    userWallets,
    verification,
    webhooks
} from "@/lib/gateway/db/schema";
import { PricingEntry } from '@/types/payments';
import { type CDPNetwork } from '@/types/wallet';
import { and, avg, count, desc, eq, exists, gte, isNull, lt, or, sql, sum } from "drizzle-orm";

// Define proper transaction type
export type TransactionType = Parameters<Parameters<typeof db['transaction']>[0]>[0];


// Enhanced transaction helper with better typing
export const withTransaction = async <T>(callback: (tx: TransactionType) => Promise<T>): Promise<T> => {
    return await db.transaction(async (tx) => {
        return await callback(tx);
    });
};

// Reusable transaction operations
export const txOperations = {
    // MCP Servers
    createServer: (data: {
        serverId: string;
        mcpOrigin: string;
        creatorId?: string;
        receiverAddress: string;
        requireAuth?: boolean;
        authHeaders?: Record<string, unknown>;
        description?: string;
        name?: string;
        metadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const server = await tx.insert(mcpServers).values({
            serverId: data.serverId,
            name: data.name,
            mcpOrigin: data.mcpOrigin,
            creatorId: data.creatorId,
            receiverAddress: data.receiverAddress,
            requireAuth: data.requireAuth,
            authHeaders: data.authHeaders,
            description: data.description,
            metadata: data.metadata,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!server[0]) throw new Error("Failed to create server");
        return server[0];
    },

    deleteServer: (serverId: string) => async (tx: TransactionType) => {
        await tx.delete(mcpServers).where(eq(mcpServers.serverId, serverId));
    },

    // Upsert server by origin - truly atomic operation using Drizzle's onConflictDoUpdate
    upsertServerByOrigin: (data: {
        serverId: string;
        mcpOrigin: string;
        creatorId: string;
        receiverAddress: string;
        requireAuth?: boolean;
        authHeaders?: Record<string, unknown>;
        description?: string;
        name?: string;
        metadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const now = new Date();
        
        // Atomic upsert: insert if not exists, update if exists (but only if same owner)
        const result = await tx.insert(mcpServers)
            .values({
                serverId: data.serverId,
                name: data.name,
                mcpOrigin: data.mcpOrigin,
                creatorId: data.creatorId,
                receiverAddress: data.receiverAddress,
                requireAuth: data.requireAuth,
                authHeaders: data.authHeaders,
                description: data.description,
                metadata: data.metadata,
                createdAt: now,
                updatedAt: now
            })
            .onConflictDoUpdate({
                target: mcpServers.mcpOrigin,
                // Only update if the creator is the same (ownership check)
                where: eq(mcpServers.creatorId, data.creatorId),
                set: {
                    name: data.name,
                    description: data.description,
                    receiverAddress: data.receiverAddress,
                    requireAuth: data.requireAuth,
                    authHeaders: data.authHeaders,
                    metadata: data.metadata,
                    updatedAt: now
                    // Note: we don't update serverId, mcpOrigin, creatorId, or createdAt
                }
            })
            .returning();

        // Check if the operation succeeded
        if (result.length === 0) {
            // This can happen if conflict occurred but ownership check failed
            // Fetch the existing server to provide a proper error message
            const existingServer = await tx.query.mcpServers.findFirst({
                where: eq(mcpServers.mcpOrigin, data.mcpOrigin),
                columns: { creatorId: true }
            });

            if (existingServer && existingServer.creatorId !== data.creatorId) {
                throw new Error('Server already exists and is owned by another user');
            }

            throw new Error('Failed to upsert server - unknown error');
        }

        // Determine if this was an insert (new) or update (existing)
        // If createdAt equals updatedAt, it was an insert; otherwise it was an update
        const server = result[0];
        const isNew = server.createdAt.getTime() === server.updatedAt.getTime();

        return {
            server,
            isNew
        };
    },

    updateServer: (serverId: string, data: {
        name?: string;
        description?: string;
        requireAuth?: boolean;
        authHeaders?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
        status?: string;
    }) => async (tx: TransactionType) => {
        const server = await tx.update(mcpServers)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(mcpServers.id, serverId))
            .returning();

        if (!server[0]) throw new Error(`Server with ID ${serverId} not found`);
        return server[0];
    },

    updateServerFromPing: (serverId: string, data: {
        name?: string;
        description?: string;
        metadata?: Record<string, unknown>;
        toolsData: Array<{
            name: string;
            description: string;
            inputSchema: Record<string, unknown>;
            pricing?: PricingEntry[];
        }>;
    }) => async (tx: TransactionType) => {
        // Update server metadata
        const server = await tx.update(mcpServers)
            .set({
                name: data.name,
                description: data.description,
                metadata: {
                    ...data.metadata,
                    lastPing: new Date().toISOString(),
                    toolsCount: data.toolsData.length,
                    monetizedToolsCount: data.toolsData.filter(t => t.pricing).length
                },
                updatedAt: new Date()
            })
            .where(eq(mcpServers.id, serverId))
            .returning();

        if (!server[0]) throw new Error(`Server with ID ${serverId} not found`);

        // Get existing tools for this server
        const existingTools = await tx.query.mcpTools.findMany({
            where: eq(mcpTools.serverId, serverId),
        });

        // Track which tools are still present on the server
        const currentToolNames = new Set(data.toolsData.map(tool => tool.name));
        const processedToolIds = new Set<string>();

        // Update or create tools
        const toolResults = [];
        for (const toolData of data.toolsData) {
            const existingTool = existingTools.find(t => t.name === toolData.name);
            
            if (existingTool) {
                // Mark this tool as processed
                processedToolIds.add(existingTool.id);
                
                const existingPricing = (existingTool.pricing as PricingEntry[]) || [];

                // Authoritative pricing update from ping: replace prior pricing with incoming pricing.
                // This ensures removed networks (e.g., base-sepolia) do not persist.
                let mergedPricing: PricingEntry[] = existingPricing;

                if (toolData.pricing !== undefined) {
                    // Dedupe incoming pricing by a stable composite key
                    const seen = new Set<string>();
                    mergedPricing = (toolData.pricing || []).filter((p) => {
                        const key = `${p.network}|${p.assetAddress}|${p.tokenDecimals}|${p.maxAmountRequiredRaw}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                }
                
                const updatedTool = await tx.update(mcpTools)
                    .set({
                        description: toolData.description,
                        inputSchema: toolData.inputSchema,
                        isMonetized: !!(mergedPricing && mergedPricing.some((p: PricingEntry) => p.active === true)),
                        pricing: mergedPricing,
                        updatedAt: new Date()
                    })
                    .where(eq(mcpTools.id, existingTool.id))
                    .returning();
                
                toolResults.push(updatedTool[0]);
            } else {
                // Create new tool
                const newTool = await tx.insert(mcpTools).values({
                    serverId: serverId,
                    name: toolData.name,
                    description: toolData.description,
                    inputSchema: toolData.inputSchema,
                    isMonetized: !!toolData.pricing && toolData.pricing.some((p: PricingEntry) => p.active === true),
                    pricing: toolData.pricing,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).returning();
                toolResults.push(newTool[0]);
            }
        }

        // Remove tools that no longer exist on the server
        const toolsToRemove = existingTools.filter(tool => !currentToolNames.has(tool.name));
        if (toolsToRemove.length > 0) {
            console.log(`Removing ${toolsToRemove.length} tools that no longer exist on server:`, toolsToRemove.map(t => t.name));
            
            for (const toolToRemove of toolsToRemove) {
                await tx.delete(mcpTools)
                    .where(eq(mcpTools.id, toolToRemove.id));
            }
        }

        return {
            server: server[0],
            tools: toolResults
        };
    },

    getMcpServer: (id: string) => async (tx: TransactionType) => {
        return await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.id, id),
            columns: {
                id: true,
                serverId: true,
                name: true,
                receiverAddress: true,
                description: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            }
        });
    },

    internal_getMcpServerByServerId: (serverId: string) => async (tx: TransactionType) => {
        return await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.serverId, serverId),
            columns: {
                id: true,
                serverId: true,
                mcpOrigin: true,
                creatorId: true,
                receiverAddress: true,
                requireAuth: true,
                authHeaders: true,
                description: true,
                name: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                ownership: {
                    columns: {
                        id: true,
                        role: true,
                        createdAt: true,
                        active: true
                    }
                }
            }
        });
    },

    getMcpServerByOrigin: (mcpOrigin: string) => async (tx: TransactionType) => {
        return await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.mcpOrigin, mcpOrigin),
            columns: {
                id: true,
                serverId: true,
                mcpOrigin: true,
                creatorId: true,
                receiverAddress: true,
                requireAuth: true,
                authHeaders: true,
                description: true,
                name: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                creator: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        isMonetized: true,
                        pricing: true,
                        status: true,
                        metadata: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });
    },

    getMcpServerByServerId: (serverId: string) => async (tx: TransactionType) => {
        return await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.serverId, serverId),
            columns: {
                id: true,
                serverId: true,
                name: true,
                mcpOrigin: false,
                receiverAddress: true,
                description: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                creator: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        isMonetized: true,
                        pricing: true,
                        status: true,
                        metadata: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    with: {
                        // pricing relation removed - pricing data now in payment jsonb field
                        payments: {
                            columns: {
                                id: true,
                                amountRaw: true,
                                tokenDecimals: true,
                                currency: true,
                                network: true,
                                status: true,
                                createdAt: true,
                                settledAt: true
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true
                                    }
                                }
                            },
                            orderBy: [desc(payments.createdAt)],
                            limit: 10
                        },
                        usage: {
                            columns: {
                                id: true,
                                timestamp: true,
                                responseStatus: true,
                                executionTimeMs: true,
                                result: false
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true
                                    }
                                }
                            },
                            orderBy: [desc(toolUsage.timestamp)],
                            limit: 10
                        },
                        proofs: {
                            columns: {
                                id: true,
                                isConsistent: true,
                                confidenceScore: true,
                                status: true,
                                verificationType: true,
                                createdAt: true,
                                webProofPresentation: true
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true
                                    }
                                }
                            },
                            orderBy: [desc(proofs.createdAt)],
                            limit: 10
                        }
                    },
                    orderBy: [mcpTools.name]
                },
                // Analytics will be computed from views, not included in main query
                ownership: {
                    where: eq(serverOwnership.active, true),
                    columns: {
                        id: true,
                        role: true,
                        createdAt: true,
                        active: true
                    },
                    with: {
                        user: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        },
                        grantedByUser: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true
                            }
                        }
                    }
                },
                webhooks: {
                    where: eq(webhooks.active, true),
                    columns: {
                        id: true,
                        url: true,
                        events: true,
                        active: true,
                        lastTriggeredAt: true,
                        failureCount: true,
                        createdAt: true,
                        updatedAt: true
                    }
                },
                proofs: {
                    columns: {
                        id: true,
                        isConsistent: true,
                        confidenceScore: true,
                        status: true,
                        verificationType: true,
                        createdAt: true,
                        webProofPresentation: true
                    },
                    with: {
                        tool: {
                            columns: {
                                id: true,
                                name: true
                            }
                        },
                        user: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true
                            }
                        }
                    },
                    orderBy: [desc(proofs.createdAt)],
                    limit: 20
                }
            }
        });
    },

    listMcpServers: (limit = 10, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.mcpServers.findMany({
            limit,
            offset,
            orderBy: [desc(mcpServers.createdAt)],
            columns: {
                id: true,
                serverId: true,
                name: true,
                receiverAddress: true,
                description: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        isMonetized: true,
                        pricing: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    orderBy: [mcpTools.name]
                }
            }
        });
    },

    listMcpServersByActivity: (limit = 10, offset = 0) => async (tx: TransactionType) => {
        // Get all servers with their related activity data
        const servers = await tx.query.mcpServers.findMany({
            columns: {
                id: true,
                serverId: true,
                name: true,
                receiverAddress: true,
                description: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                creator: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true,
                        avatarUrl: true
                    }
                },
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        isMonetized: true,
                        pricing: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    with: {
                        payments: {
                            where: eq(payments.status, 'completed'),
                            columns: {
                                id: true,
                                amountRaw: true,
                                tokenDecimals: true,
                                currency: true,
                                userId: true,
                                createdAt: true
                            }
                        },
                        usage: {
                            columns: {
                                id: true,
                                userId: true,
                                timestamp: true,
                                responseStatus: true
                            }
                        }
                    },
                    orderBy: [mcpTools.name]
                }
            }
        });

        // Calculate activity metrics for each server
        const serversWithActivity = servers.map(server => {
            const allPayments = server.tools.flatMap(tool => tool.payments);
            const allUsage = server.tools.flatMap(tool => tool.usage);
            
            // Calculate metrics
            const totalPayments = allPayments.length;
            const totalRevenue = allPayments.reduce((sum, payment) => 
                sum + parseFloat(payment.amountRaw), 0
            );
            const totalUsage = allUsage.length;
            const successfulUsage = allUsage.filter(usage => 
                usage.responseStatus === 'success' || usage.responseStatus === '200'
            ).length;
            
            // Get unique users from both payments and usage
            const paymentUserIds = allPayments
                .map(p => p.userId)
                .filter(Boolean);
            const usageUserIds = allUsage
                .map(u => u.userId)
                .filter(Boolean);
            const uniqueUsers = new Set([...paymentUserIds, ...usageUserIds]).size;
            
            // Calculate recent activity (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentPayments = allPayments.filter(p => 
                new Date(p.createdAt) > thirtyDaysAgo
            ).length;
            const recentUsage = allUsage.filter(u => 
                new Date(u.timestamp) > thirtyDaysAgo
            ).length;
            
            // Calculate activity score (weighted combination of metrics)
            const activityScore = (
                totalPayments * 10 +        // High weight for payments
                totalRevenue * 0.1 +        // Revenue impact (assuming small amounts)
                totalUsage * 2 +            // Medium weight for usage
                uniqueUsers * 15 +          // High weight for unique users
                recentPayments * 20 +       // Higher weight for recent payments
                recentUsage * 5 +           // Medium weight for recent usage
                successfulUsage * 1         // Small bonus for successful usage
            );

            return {
                ...server,
                activityMetrics: {
                    totalPayments,
                    totalRevenue,
                    totalUsage,
                    uniqueUsers,
                    recentPayments,
                    recentUsage,
                    successfulUsage,
                    activityScore
                }
            };
        });

        // Sort by activity score (descending) and apply pagination
        const sortedServers = serversWithActivity
            .sort((a, b) => b.activityMetrics.activityScore - a.activityMetrics.activityScore)
            .slice(offset, offset + limit);

        return sortedServers;
    },

    updateMcpServer: (id: string, data: {
        url?: string;
        mcpOrigin?: string;
        receiverAddress?: string;
        requireAuth?: boolean;
        authHeaders?: Record<string, unknown>;
        status?: string;
        description?: string;
        name?: string;
        metadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const result = await tx.update(mcpServers)
            .set({
                ...data,
                updatedAt: new Date()
            })
            .where(eq(mcpServers.id, id))
            .returning();

        if (!result[0]) throw new Error(`MCP Server with ID ${id} not found`);
        return result[0];
    },

    deleteMcpServer: (id: string) => async (tx: TransactionType) => {
        const result = await tx.delete(mcpServers)
            .where(eq(mcpServers.id, id))
            .returning();

        if (!result[0]) throw new Error(`MCP Server with ID ${id} not found`);
        return result[0];
    },

    // MCP Tools
    createTool: (data: {
        serverId: string;
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        outputSchema: Record<string, unknown>;
        isMonetized?: boolean;
        pricing?: PricingEntry[];
        status?: string;
        metadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const tool = await tx.insert(mcpTools).values({
            serverId: data.serverId,
            name: data.name,
            description: data.description,
            inputSchema: data.inputSchema,
            outputSchema: data.outputSchema,
            isMonetized: data.isMonetized,
            pricing: data.pricing,
            status: data.status,
            metadata: data.metadata,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!tool[0]) throw new Error("Failed to create tool");
        return tool[0];
    },

    getMcpTool: (id: string) => async (tx: TransactionType) => {
        return await tx.query.mcpTools.findFirst({
            where: eq(mcpTools.id, id)
        });
    },

    listMcpToolsByServer: (serverId: string) => async (tx: TransactionType) => {
        return await tx.query.mcpTools.findMany({
            where: eq(mcpTools.serverId, serverId),
            orderBy: [mcpTools.name]
        });
    },

    updateTool: (toolId: string, data: {
        name?: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
        isMonetized?: boolean;
        pricing?: PricingEntry[];
        status?: string;
        metadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        // Get existing tool to preserve pricing data
        const existingTool = await tx.query.mcpTools.findFirst({
            where: eq(mcpTools.id, toolId)
        });

        if (!existingTool) {
            throw new Error(`Tool with ID ${toolId} not found`);
        }

        // Preserve existing pricing data when updating pricing field
        const existingPricing = (existingTool.pricing as PricingEntry[]) || [];
        const mergedPricing = data.pricing !== undefined ? data.pricing : existingPricing;
        const isMonetized = data.isMonetized !== undefined ? data.isMonetized : !!(existingPricing.filter((p: PricingEntry) => p.active === true).length > 0);

        const tool = await tx.update(mcpTools)
            .set({
                name: data.name,
                description: data.description,
                inputSchema: data.inputSchema,
                isMonetized: isMonetized,
                pricing: mergedPricing,
                status: data.status,
                metadata: data.metadata,
                updatedAt: new Date()
            })
            .where(eq(mcpTools.id, toolId))
            .returning();

        if (!tool[0]) throw new Error(`Tool with ID ${toolId} not found`);
        return tool[0];
    },

    deleteMcpTool: (id: string) => async (tx: TransactionType) => {
        const result = await tx.delete(mcpTools)
            .where(eq(mcpTools.id, id))
            .returning();

        if (!result[0]) throw new Error(`Tool with ID ${id} not found`);
        return result[0];
    },

    // Users
    getUserByWalletAddress: (walletAddress: string) => async (tx: TransactionType) => {
        return await tx.query.users.findFirst({
            where: eq(users.walletAddress, walletAddress)
        });
    },

    getUserById: (id: string) => async (tx: TransactionType) => {
        return await tx.query.users.findFirst({
            where: eq(users.id, id)
        });
    },

    createUser: (data: {
        walletAddress?: string;
        name?: string;
        email?: string;
        emailVerified?: boolean;
        image?: string;
        displayName?: string;
        avatarUrl?: string;
        // New wallet-specific options (for initial wallet)
        walletType?: 'external' | 'managed' | 'custodial';
        walletProvider?: string;
        blockchain?: string; // 'ethereum', 'solana', 'near', etc.
        architecture?: BlockchainArchitecture; // 'evm', 'solana', 'near', 'cosmos', 'bitcoin'
        walletMetadata?: Record<string, unknown>; // Blockchain-specific data
        externalWalletId?: string; // For managed services
        externalUserId?: string; // User ID in external system
    }) => async (tx: TransactionType) => {
        // Ensure user has at least one identifier (wallet or email)
        if (!data.walletAddress && !data.email) {
            throw new Error("User must have either a wallet address or email address");
        }

        // Create user first
        const result = await tx.insert(users).values({
            walletAddress: data.walletAddress, // Keep for legacy compatibility
            name: data.name,
            email: data.email,
            emailVerified: data.emailVerified,
            image: data.image,
            displayName: data.displayName,
            avatarUrl: data.avatarUrl,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create user");
        
        const user = result[0];

        // If wallet address provided, add it to the new wallet system
        if (data.walletAddress) {
            // Determine architecture if not provided
            const architecture = data.architecture || getBlockchainArchitecture(data.blockchain);
            
            await txOperations.addWalletToUser({
                userId: user.id,
                walletAddress: data.walletAddress,
                walletType: data.walletType || 'external',
                provider: data.walletProvider || 'unknown',
                blockchain: data.blockchain,
                architecture,
                isPrimary: true, // First wallet is always primary
                walletMetadata: data.walletMetadata,
                externalWalletId: data.externalWalletId,
                externalUserId: data.externalUserId
            })(tx);
        }

        return user;
    },

    updateUserLastLogin: (id: string) => async (tx: TransactionType) => {
        const now = new Date();

        const result = await tx.update(users)
            .set({
                lastLoginAt: now,
                updatedAt: now
            })
            .where(eq(users.id, id))
            .returning();

        if (!result[0]) throw new Error(`User with ID ${id} not found`);
        return result[0];
    },

    getUserByEmail: (email: string) => async (tx: TransactionType) => {
        return await tx.query.users.findFirst({
            where: eq(users.email, email)
        });
    },

    getUserByEmailOrWallet: (identifier: string) => async (tx: TransactionType) => {
        // Try to find user by email first, then by wallet address (including both legacy and new wallet tables)
        const userByEmail = await tx.query.users.findFirst({
            where: eq(users.email, identifier)
        });
        
        if (userByEmail) return userByEmail;

        // Check legacy wallet field
        const userByLegacyWallet = await tx.query.users.findFirst({
            where: eq(users.walletAddress, identifier)
        });
        
        if (userByLegacyWallet) return userByLegacyWallet;

        // Check new user_wallets table
        const walletRecord = await tx.query.userWallets.findFirst({
            where: eq(userWallets.walletAddress, identifier),
            with: {
                user: true
            }
        });
        
        return walletRecord?.user || null;
    },

    // Multi-Wallet Management Operations
    addWalletToUser: (data: {
        userId: string;
        walletAddress: string;
        walletType: 'external' | 'managed' | 'custodial';
        provider?: string;
        blockchain?: string; // 'ethereum', 'solana', 'near', 'polygon', 'base', etc.
        architecture?: BlockchainArchitecture; // 'evm', 'solana', 'near', 'cosmos', 'bitcoin'
        isPrimary?: boolean;
        walletMetadata?: Record<string, unknown>; // Blockchain-specific data like chainId, ensName, etc.
        externalWalletId?: string; // For managed services like Coinbase CDP, Privy
        externalUserId?: string; // User ID in external system
    }) => async (tx: TransactionType) => {
        // Check if this exact combination already exists
        const existingWallet = await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.userId, data.userId),
                eq(userWallets.walletAddress, data.walletAddress),
                data.provider ? eq(userWallets.provider, data.provider) : isNull(userWallets.provider),
                eq(userWallets.walletType, data.walletType)
            )
        });

        if (existingWallet) {
            // If wallet exists but is inactive, reactivate it
            if (!existingWallet.isActive) {
                const updatedWallet = await tx.update(userWallets)
                    .set({
                        isActive: true,
                        isPrimary: data.isPrimary || existingWallet.isPrimary,
                        blockchain: data.blockchain || existingWallet.blockchain,
                        architecture: data.architecture || existingWallet.architecture,
                        walletMetadata: data.walletMetadata || existingWallet.walletMetadata,
                        externalWalletId: data.externalWalletId || existingWallet.externalWalletId,
                        externalUserId: data.externalUserId || existingWallet.externalUserId,
                        updatedAt: new Date(),
                        lastUsedAt: new Date()
                    })
                    .where(eq(userWallets.id, existingWallet.id))
                    .returning();
                
                return updatedWallet[0];
            }
            
            // If wallet is active, update it with new data and return it
            const updatedWallet = await tx.update(userWallets)
                .set({
                    isPrimary: data.isPrimary !== undefined ? data.isPrimary : existingWallet.isPrimary,
                    blockchain: data.blockchain || existingWallet.blockchain,
                    architecture: data.architecture || existingWallet.architecture,
                    walletMetadata: data.walletMetadata || existingWallet.walletMetadata,
                    externalWalletId: data.externalWalletId || existingWallet.externalWalletId,
                    externalUserId: data.externalUserId || existingWallet.externalUserId,
                    updatedAt: new Date(),
                    lastUsedAt: new Date()
                })
                .where(eq(userWallets.id, existingWallet.id))
                .returning();
            
            return updatedWallet[0];
        }

        // If this is set as primary, unset any existing primary wallet
        if (data.isPrimary) {
            await tx.update(userWallets)
                .set({ isPrimary: false, updatedAt: new Date() })
                .where(and(
                    eq(userWallets.userId, data.userId),
                    eq(userWallets.isPrimary, true)
                ));
        }

        // Determine architecture if not provided
        const architecture = data.architecture || getBlockchainArchitecture(data.blockchain);

        // Create new wallet record (race-safe on primary uniqueness)
        try {
            const result = await tx.insert(userWallets).values({
                userId: data.userId,
                walletAddress: data.walletAddress,
                walletType: data.walletType,
                provider: data.provider,
                blockchain: data.blockchain,
                architecture,
                isPrimary: data.isPrimary || false,
                walletMetadata: data.walletMetadata,
                externalWalletId: data.externalWalletId,
                externalUserId: data.externalUserId,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();

            if (!result[0]) throw new Error("Failed to add wallet to user");
            return result[0];
        } catch (e: unknown) {
            const err = e as { code?: string; constraint?: string; message?: string };
            const isPrimaryUnique = err?.code === '23505' && (err?.constraint?.includes('user_wallets_primary_unique') || err?.message?.includes('user_wallets_primary_unique'));
            if (!isPrimaryUnique) throw e;

            // Another concurrent insert won the primary race. Retry insert as non-primary.
            const retry = await tx.insert(userWallets).values({
                userId: data.userId,
                walletAddress: data.walletAddress,
                walletType: data.walletType,
                provider: data.provider,
                blockchain: data.blockchain,
                architecture,
                isPrimary: false,
                walletMetadata: data.walletMetadata,
                externalWalletId: data.externalWalletId,
                externalUserId: data.externalUserId,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();

            if (!retry[0]) throw new Error("Failed to add wallet to user after primary conflict");
            return retry[0];
        }
    },

    getUserWallets: (userId: string, activeOnly = true) => async (tx: TransactionType) => {
        const conditions = [eq(userWallets.userId, userId)];
        if (activeOnly) {
            conditions.push(eq(userWallets.isActive, true));
        }

        return await tx.query.userWallets.findMany({
            where: and(...conditions),
            orderBy: [desc(userWallets.isPrimary), desc(userWallets.createdAt)]
        });
    },

    getUserPrimaryWallet: (userId: string) => async (tx: TransactionType) => {
        return await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.userId, userId),
                eq(userWallets.isPrimary, true),
                eq(userWallets.isActive, true)
            )
        });
    },

    getWalletByAddress: (walletAddress: string) => async (tx: TransactionType) => {
        return await tx.query.userWallets.findFirst({
            where: eq(userWallets.walletAddress, walletAddress),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        displayName: true,
                        avatarUrl: true,
                        image: true
                    }
                }
            }
        });
    },

    setPrimaryWallet: (userId: string, walletId: string) => async (tx: TransactionType) => {
        // First, verify the wallet belongs to the user
        const wallet = await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.id, walletId),
                eq(userWallets.userId, userId),
                eq(userWallets.isActive, true)
            )
        });

        if (!wallet) {
            throw new Error("Wallet not found or doesn't belong to user");
        }

        // Unset existing primary wallet
        await tx.update(userWallets)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(and(
                eq(userWallets.userId, userId),
                eq(userWallets.isPrimary, true)
            ));

        // Set new primary wallet
        const result = await tx.update(userWallets)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(eq(userWallets.id, walletId))
            .returning();

        return result[0];
    },

    removeWallet: (userId: string, walletId: string) => async (tx: TransactionType) => {
        // Verify wallet belongs to user
        const wallet = await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.id, walletId),
                eq(userWallets.userId, userId)
            )
        });

        if (!wallet) {
            throw new Error("Wallet not found or doesn't belong to user");
        }

        // Don't allow removing the last wallet
        const userWalletCount = await tx.query.userWallets.findMany({
            where: and(
                eq(userWallets.userId, userId),
                eq(userWallets.isActive, true)
            )
        });

        if (userWalletCount.length <= 1) {
            throw new Error("Cannot remove the last wallet from a user");
        }

        // Mark as inactive instead of deleting (for audit trail)
        const result = await tx.update(userWallets)
            .set({ 
                isActive: false, 
                isPrimary: false,
                updatedAt: new Date() 
            })
            .where(eq(userWallets.id, walletId))
            .returning();

        // If this was the primary wallet, set another one as primary
        if (wallet.isPrimary) {
            const remainingWallets = await tx.query.userWallets.findMany({
                where: and(
                    eq(userWallets.userId, userId),
                    eq(userWallets.isActive, true)
                ),
                orderBy: [desc(userWallets.createdAt)],
                limit: 1
            });

            if (remainingWallets[0]) {
                await tx.update(userWallets)
                    .set({ isPrimary: true, updatedAt: new Date() })
                    .where(eq(userWallets.id, remainingWallets[0].id));
            }
        }

        return result[0];
    },

    updateWalletMetadata: (walletId: string, metadata: {
        walletMetadata?: Record<string, unknown>; // All blockchain-specific data goes here
        lastUsedAt?: Date;
    }) => async (tx: TransactionType) => {
        const result = await tx.update(userWallets)
            .set({
                ...metadata,
                updatedAt: new Date()
            })
            .where(eq(userWallets.id, walletId))
            .returning();

        if (!result[0]) throw new Error(`Wallet with ID ${walletId} not found`);
        return result[0];
    },

    // Create managed wallet for user (via external services like Coinbase CDP, Privy)
    createManagedWallet: (userId: string, data: {
        walletAddress: string;
        provider: string; // 'coinbase-cdp', 'privy', 'magic', etc.
        blockchain?: string; // 'ethereum', 'solana', 'near', etc.
        architecture?: BlockchainArchitecture; // 'evm', 'solana', 'near', 'cosmos', 'bitcoin'
        externalWalletId: string; // Reference ID from external service
        externalUserId?: string; // User ID in external system
        isPrimary?: boolean;
        walletMetadata?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        // Determine architecture if not provided
        const architecture = data.architecture || getBlockchainArchitecture(data.blockchain);
        
        return await txOperations.addWalletToUser({
            userId,
            walletAddress: data.walletAddress,
            walletType: 'managed',
            provider: data.provider,
            blockchain: data.blockchain,
            architecture,
            isPrimary: data.isPrimary,
            externalWalletId: data.externalWalletId,
            externalUserId: data.externalUserId,
            walletMetadata: {
                ...data.walletMetadata,
                type: 'managed',
                createdByService: true,
                provider: data.provider
            }
        })(tx);
    },

    // CDP-specific operations
    createCDPManagedWallet: (userId: string, data: {
        walletAddress: string;
        accountId: string; // CDP account ID/name
        accountName: string;
        network: string; // CDP network (base, base-sepolia, etc.)
        isSmartAccount?: boolean;
        ownerAccountId?: string; // For smart accounts
        isPrimary?: boolean;
    }) => async (tx: TransactionType) => {
        // Determine blockchain and architecture for CDP wallets
        const blockchain = data.network.includes('base') ? 'base' : 'ethereum';
        const architecture = getBlockchainArchitecture(blockchain);
        
        return await txOperations.addWalletToUser({
            userId,
            walletAddress: data.walletAddress,
            walletType: 'managed',
            provider: 'coinbase-cdp',
            blockchain,
            architecture,
            isPrimary: data.isPrimary,
            externalWalletId: data.accountId,
            externalUserId: userId,
            walletMetadata: {
                cdpAccountId: data.accountId,
                cdpAccountName: data.accountName,
                cdpNetwork: data.network,
                isSmartAccount: data.isSmartAccount || false,
                ownerAccountId: data.ownerAccountId,
                provider: 'coinbase-cdp',
                type: 'managed',
                createdByService: true,
                managedBy: 'coinbase-cdp',
                gasSponsored: data.isSmartAccount && (data.network === 'base' || data.network === 'base-sepolia'),
            }
        })(tx);
    },

    getCDPWalletsByUser: (userId: string) => async (tx: TransactionType) => {
        return await tx.query.userWallets.findMany({
            where: and(
                eq(userWallets.userId, userId),
                eq(userWallets.provider, 'coinbase-cdp'),
                eq(userWallets.isActive, true)
            ),
            orderBy: [desc(userWallets.isPrimary), desc(userWallets.createdAt)]
        });
    },

    getCDPWalletByAccountId: (accountId: string) => async (tx: TransactionType) => {
        return await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.externalWalletId, accountId),
                eq(userWallets.provider, 'coinbase-cdp'),
                eq(userWallets.isActive, true)
            ),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        displayName: true,
                        avatarUrl: true,
                        image: true
                    }
                }
            }
        });
    },

    updateCDPWalletMetadata: (walletId: string, metadata: {
        cdpAccountName?: string;
        cdpNetwork?: string;
        lastUsedAt?: Date;
        balanceCache?: Record<string, unknown>;
        transactionHistory?: Record<string, unknown>[];
    }) => async (tx: TransactionType) => {
        const wallet = await tx.query.userWallets.findFirst({
            where: eq(userWallets.id, walletId)
        });

        if (!wallet || wallet.provider !== 'coinbase-cdp') {
            throw new Error('CDP wallet not found');
        }

        const updatedMetadata = {
            ...wallet.walletMetadata as Record<string, unknown>,
            ...metadata,
            lastUpdated: new Date().toISOString()
        };

        return await tx.update(userWallets)
            .set({
                walletMetadata: updatedMetadata,
                updatedAt: new Date(),
                ...(metadata.lastUsedAt && { lastUsedAt: metadata.lastUsedAt })
            })
            .where(eq(userWallets.id, walletId))
            .returning();
    },

    // Helper to check if user has any CDP wallets
    userHasCDPWallets: (userId: string) => async (tx: TransactionType) => {
        const cdpWallets = await tx.query.userWallets.findMany({
            where: and(
                eq(userWallets.userId, userId),
                eq(userWallets.provider, 'coinbase-cdp'),
                eq(userWallets.isActive, true)
            ),
            limit: 1 // Just need to know if any exist
        });

        return cdpWallets.length > 0;
    },

    // Auto-create CDP wallet for new users
    autoCreateCDPWalletForUser: (userId: string, userInfo: {
        email?: string;
        name?: string;
        displayName?: string;
    }, options?: {
        createSmartAccount?: boolean;
        network?: CDPNetwork;
    }) => async (tx: TransactionType) => {
        console.log(`[DEBUG] Starting CDP wallet auto-creation for user ${userId}`);
        
        // Extract options with defaults
        const createSmartAccount = options?.createSmartAccount ?? false; // Default to true for backward compatibility
        const network = options?.network ?? 'base-sepolia';
        
        console.log(`[DEBUG] Options - createSmartAccount: ${createSmartAccount}, network: ${network}`);
        
        try {
            // Check if user already has CDP wallets
            console.log(`[DEBUG] Checking if user ${userId} already has CDP wallets`);
            const hasCDPWallets = await txOperations.userHasCDPWallets(userId)(tx);
            console.log(`[DEBUG] User ${userId} has CDP wallets:`, hasCDPWallets);
            
            if (hasCDPWallets) {
                console.log(`User ${userId} already has CDP wallets, skipping auto-creation`);
                return null;
            }

            // Generate account name based on user info (max 28 chars to allow for "-smart" suffix)
            // CDP requires names to be 2-36 characters, alphanumeric + hyphens only
            const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
            const accountName = userInfo.displayName 
                ? `mcpay-${userInfo.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 10)}-${timestamp}`
                : `mcpay-${userId.slice(0, 8)}-${timestamp}`;

            console.log(`[DEBUG] Auto-creating CDP wallet for user ${userId} with account name: ${accountName}`);

            // Double-check if user already has CDP wallets (race condition protection)
            const hasCDPWalletsAgain = await txOperations.userHasCDPWallets(userId)(tx);
            if (hasCDPWalletsAgain) {
                console.log(`User ${userId} already has CDP wallets (race condition detected), skipping auto-creation`);
                return null;
            }

            // Create CDP account with optional smart account
            console.log(`[DEBUG] Calling createCDPAccount...`);
            const cdpResult = await createCDPAccount({
                accountName,
                network, // Use configured network
                createSmartAccount, // Use configured smart account option
            });
            console.log(`[DEBUG] CDP account creation result:`, cdpResult);

            const wallets = [];

            // Store main account
            console.log(`[DEBUG] Storing main account in database...`);
            
            // Check if user already has a primary wallet to avoid constraint violations
            const existingPrimaryWallet = await tx.query.userWallets.findFirst({
                where: and(
                    eq(userWallets.userId, userId),
                    eq(userWallets.isPrimary, true),
                    eq(userWallets.isActive, true)
                )
            });
            
            const mainWallet = await txOperations.createCDPManagedWallet(userId, {
                walletAddress: cdpResult.account.walletAddress,
                accountId: cdpResult.account.accountId,
                accountName: cdpResult.account.accountName || cdpResult.account.accountId,
                network: cdpResult.account.network,
                isSmartAccount: false,
                isPrimary: !existingPrimaryWallet, // Only set as primary if no existing primary wallet
            })(tx);
            
            if (mainWallet) {
                wallets.push(mainWallet);
                console.log(`[DEBUG] Main wallet stored:`, mainWallet.walletAddress);
            }

            // Store smart account if created
            if (cdpResult.smartAccount) {
                console.log(`[DEBUG] Storing smart account in database...`);
                const smartWallet = await txOperations.createCDPManagedWallet(userId, {
                    walletAddress: cdpResult.smartAccount.walletAddress,
                    accountId: cdpResult.smartAccount.accountId,
                    accountName: cdpResult.smartAccount.accountName || cdpResult.smartAccount.accountId,
                    network: cdpResult.smartAccount.network,
                    isSmartAccount: true,
                    ownerAccountId: cdpResult.account.accountId,
                    isPrimary: false, // Smart accounts are not primary by default
                })(tx);
                if (smartWallet) {
                    wallets.push(smartWallet);
                    console.log(`[DEBUG] Smart wallet stored:`, smartWallet.walletAddress);
                }
            }

            console.log(`[DEBUG] Successfully created ${wallets.length} CDP wallets for user ${userId}`);
            
            return {
                cdpResult,
                wallets,
                accountName
            };
        } catch (error) {
            console.error(`[ERROR] Failed to auto-create CDP wallet for user ${userId}:`, error);
            console.error(`[ERROR] Error details:`, {
                name: error instanceof Error ? error.name : 'Unknown',
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });
            // Don't throw error - this is a best-effort auto-creation
            // The user can always create wallets manually later
            return null;
        }
    },

    // Legacy compatibility - migrate legacy wallet to new system
    migrateLegacyWallet: (userId: string) => async (tx: TransactionType) => {
        const user = await tx.query.users.findFirst({
            where: eq(users.id, userId)
        });

        if (!user?.walletAddress) {
            return null; // No legacy wallet to migrate
        }

        // Check if wallet already exists in new system
        const existingWallet = await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.userId, userId),
                eq(userWallets.walletAddress, user.walletAddress)
            )
        });

        if (existingWallet) {
            return existingWallet; // Already migrated
        }

        // Migrate legacy wallet - assume EVM architecture as default for legacy wallets
        const migratedWallet = await txOperations.addWalletToUser({
            userId,
            walletAddress: user.walletAddress,
            walletType: 'external',
            provider: 'legacy',
            blockchain: 'ethereum', // Default to ethereum for legacy wallets
            architecture: 'evm', // Default to EVM for legacy wallets
            isPrimary: true,
            walletMetadata: {
                migratedFromLegacy: true,
                migratedAt: new Date().toISOString()
            }
        })(tx);

        return migratedWallet;
    },

    // Session operations
    createSession: (data: {
        id: string;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string;
        userAgent?: string;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(session).values({
            id: data.id,
            userId: data.userId,
            expiresAt: data.expiresAt,
            token: data.token,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create session");
        return result[0];
    },

    getSessionByToken: (token: string) => async (tx: TransactionType) => {
        return await tx.query.session.findFirst({
            where: eq(session.token, token),
            with: {
                user: true
            }
        });
    },

    deleteSession: (id: string) => async (tx: TransactionType) => {
        const result = await tx.delete(session)
            .where(eq(session.id, id))
            .returning();

        if (!result[0]) throw new Error(`Session with ID ${id} not found`);
        return result[0];
    },

    // Account operations (for OAuth providers)
    createAccount: (data: {
        id: string;
        accountId: string;
        providerId: string;
        userId: string;
        accessToken?: string;
        refreshToken?: string;
        idToken?: string;
        accessTokenExpiresAt?: Date;
        refreshTokenExpiresAt?: Date;
        scope?: string;
        password?: string;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(account).values({
            id: data.id,
            accountId: data.accountId,
            providerId: data.providerId,
            userId: data.userId,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            idToken: data.idToken,
            accessTokenExpiresAt: data.accessTokenExpiresAt,
            refreshTokenExpiresAt: data.refreshTokenExpiresAt,
            scope: data.scope,
            password: data.password,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create account");
        return result[0];
    },

    getAccountByProvider: (userId: string, providerId: string) => async (tx: TransactionType) => {
        return await tx.query.account.findFirst({
            where: and(
                eq(account.userId, userId),
                eq(account.providerId, providerId)
            )
        });
    },

    // Verification operations
    createVerification: (data: {
        id: string;
        identifier: string;
        value: string;
        expiresAt: Date;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(verification).values({
            id: data.id,
            identifier: data.identifier,
            value: data.value,
            expiresAt: data.expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create verification");
        return result[0];
    },

    getVerification: (identifier: string, value: string) => async (tx: TransactionType) => {
        return await tx.query.verification.findFirst({
            where: and(
                eq(verification.identifier, identifier),
                eq(verification.value, value)
            )
        });
    },

    deleteVerification: (id: string) => async (tx: TransactionType) => {
        const result = await tx.delete(verification)
            .where(eq(verification.id, id))
            .returning();

        if (!result[0]) throw new Error(`Verification with ID ${id} not found`);
        return result[0];
    },

    // Enhanced Tool Pricing (now stored in mcpTools.payment field)
    createToolPricing: (toolId: string, pricing: PricingEntry) => async (tx: TransactionType) => {
        // Get current tool data
        const tool = await tx.query.mcpTools.findFirst({
            where: eq(mcpTools.id, toolId)
        });
        
        if (!tool) {
            throw new Error(`Tool with ID ${toolId} not found`);
        }

        const currentPricing = (tool.pricing as PricingEntry[]) || [];
        
        // Deactivate existing pricing entries
        const updatedPricing = currentPricing.map((p: PricingEntry) => ({ ...p, active: false, updatedAt: new Date().toISOString() }));
        
        // Create new pricing entry
        const newPricing = {
            id: crypto.randomUUID(),
            maxAmountRequiredRaw: pricing.maxAmountRequiredRaw,
            tokenDecimals: pricing.tokenDecimals,
            network: pricing.network,
            assetAddress: pricing.assetAddress,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add new pricing to the array
        updatedPricing.push(newPricing);

        const result = await tx
            .update(mcpTools)
            .set({ 
                pricing: updatedPricing as PricingEntry[],
                isMonetized: true,
                updatedAt: new Date()
            })
            .where(eq(mcpTools.id, toolId))
            .returning();

        if (!result[0]) {
            throw new Error("Failed to update tool with pricing");
        }

        // Return pricing in the same format as the old table
        return {
            id: newPricing.id,
            toolId,
            amountRaw: newPricing.maxAmountRequiredRaw,
            tokenDecimals: newPricing.tokenDecimals,
            network: newPricing.network,
            assetAddress: newPricing.assetAddress,
            active: newPricing.active,
            createdAt: new Date(newPricing.createdAt),
            updatedAt: new Date(newPricing.updatedAt)
        };
    },

    getActiveToolPricing: (toolId: string) => async (tx: TransactionType) => {
        const tool = await tx.query.mcpTools.findFirst({
            where: eq(mcpTools.id, toolId)
        });
        
        if (!tool?.pricing) {
            return null;
        }
        
        const pricing = tool.pricing as PricingEntry[];
        
        if (!pricing.length) {
            return null;
        }

        // Return only active pricing entries
        const activePricing = pricing.filter(p => p.active === true);
        
        return activePricing.length > 0 ? activePricing : null;
    },

    deactivateToolPricing: (toolId: string) => async (tx: TransactionType) => {
        const tool = await tx.query.mcpTools.findFirst({
            where: eq(mcpTools.id, toolId)
        });
        
        if (!tool?.pricing) {
            return null;
        }
        
        const pricing = tool.pricing as PricingEntry[];
        
        if (!pricing) {
            return null;
        }
        
        const currentActive = pricing.find((p: PricingEntry) => p.active === true);
        
        if (!currentActive) {
            return null;
        }
        
        // Deactivate current pricing
        const updatedPricing = pricing.map((p: PricingEntry) => 
            p.createdAt === currentActive.createdAt 
                ? { ...p, active: false, updatedAt: new Date().toISOString() }
                : p
        );

        await tx
            .update(mcpTools)
            .set({ 
                pricing: updatedPricing as PricingEntry[],
                isMonetized: false,
                updatedAt: new Date()
            })
            .where(eq(mcpTools.id, toolId));

        // Return the deactivated pricing in the same format
        return {
            id: currentActive.id,
            toolId,
            amountRaw: currentActive.maxAmountRequiredRaw,
            tokenDecimals: currentActive.tokenDecimals,
            network: currentActive.network,
            assetAddress: currentActive.assetAddress,
            active: false,
            createdAt: new Date(currentActive.createdAt),
            updatedAt: new Date()
        };
    },

    // Payments
    createPayment: (data: {
        toolId: string;
        userId?: string;
        amountRaw: string; // Base units as string (e.g., "100000" for 0.1 USDC)
        tokenDecimals: number; // Token decimals (e.g., 6 for USDC)
        currency: string;
        network: string;
        transactionHash?: string;
        status?: string;
        signature?: string;
        paymentData?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(payments).values({
            toolId: data.toolId,
            userId: data.userId,
            amountRaw: data.amountRaw,
            tokenDecimals: data.tokenDecimals,
            currency: data.currency,
            network: data.network,
            transactionHash: data.transactionHash,
            status: data.status || 'pending',
            signature: data.signature,
            paymentData: data.paymentData,
            createdAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create payment");
        return result[0];
    },

    updatePaymentStatus: (id: string, status: string, transactionHash?: string) => async (tx: TransactionType) => {
        const updated = await tx.update(payments)
            .set({
                status,
                ...(transactionHash ? { transactionHash } : {}),
                ...(status === 'completed' ? { settledAt: new Date() } : {})
            })
            .where(eq(payments.id, id))
            .returning();

        if (!updated[0]) throw new Error(`Payment with ID ${id} not found`);
        return updated[0];
    },

    getPaymentByTransactionHash: (transactionHash: string) => async (tx: TransactionType) => {
        return await tx.query.payments.findFirst({
            where: eq(payments.transactionHash, transactionHash)
        });
    },

    // Latest payments (for explorer)
    listLatestPayments: (limit = 24, offset = 0, options?: { status?: string }) => async (tx: TransactionType) => {
        const whereClause = options?.status ? eq(payments.status, options.status) : undefined;

        const rows = await tx.query.payments.findMany({
            where: whereClause,
            columns: {
                id: true,
                amountRaw: true,
                tokenDecimals: true,
                currency: true,
                network: true,
                status: true,
                transactionHash: true,
                createdAt: true
            },
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true
                    },
                    with: {
                        server: {
                            columns: {
                                id: true,
                                serverId: true,
                                name: true
                            }
                        }
                    }
                },
                user: {
                    columns: {
                        id: true,
                        displayName: true,
                        name: true,
                        walletAddress: true
                    }
                }
            },
            orderBy: [desc(payments.createdAt)],
            limit,
            offset
        });

        // Get total count matching the filter (for pagination)
        let totalQuery = tx.select({ total: count() }).from(payments);
        if (whereClause) {
            // @ts-expect-error drizzle typing for conditional where is not trivial
            totalQuery = totalQuery.where(whereClause);
        }
        const total = await totalQuery.then(rows => Number(rows?.[0]?.total || 0));

        // Normalize shape for explorer clients
        const items = rows.map(r => ({
            id: r.id,
            status: r.status === 'completed' ? 'success' : (r.status === 'pending' ? 'pending' : 'failed'),
            serverId: r.tool?.server?.serverId,
            serverName: r.tool?.server?.name,
            tool: r.tool?.name,
            amountRaw: r.amountRaw,
            tokenDecimals: r.tokenDecimals,
            currency: r.currency,
            network: r.network,
            user: r.user?.name || r.user?.displayName || r.user?.walletAddress || 'Anonymous',
            timestamp: r.createdAt?.toISOString?.() || new Date(r.createdAt as unknown as string).toISOString(),
            txHash: r.transactionHash || ''
        }));

        return { items, total };
    },

    // API Keys
    validateApiKey: (keyHash: string) => async (tx: TransactionType) => {
        const apiKey = await tx.query.apiKeys.findFirst({
            where: and(
                eq(apiKeys.keyHash, keyHash),
                eq(apiKeys.active, true)
            ),
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                        displayName: true,
                        avatarUrl: true,
                        image: true
                    }
                }
            }
        });

        if (!apiKey) {
            return null;
        }

        // Check if key is expired
        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return null;
        }

        // Update last used timestamp
        await tx.update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, apiKey.id));

        return {
            apiKey,
            user: apiKey.user
        };
    },

    createApiKey: (data: {
        userId: string;
        keyHash: string;
        name: string;
        permissions: string[];
        expiresAt?: Date;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(apiKeys).values({
            userId: data.userId,
            keyHash: data.keyHash,
            name: data.name,
            permissions: data.permissions,
            expiresAt: data.expiresAt,
            active: true,
            createdAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create API key");
        return result[0];
    },

    getUserApiKeys: (userId: string) => async (tx: TransactionType) => {
        return await tx.query.apiKeys.findMany({
            where: and(
                eq(apiKeys.userId, userId),
                eq(apiKeys.active, true)
            ),
            columns: {
                id: true,
                name: true,
                permissions: true,
                lastUsedAt: true,
                createdAt: true,
                expiresAt: true,
                keyHash: false // Never return the hash
            },
            orderBy: [desc(apiKeys.createdAt)]
        });
    },

    revokeApiKey: (keyId: string, userId: string) => async (tx: TransactionType) => {
        // Verify ownership before revoking
        const apiKey = await tx.query.apiKeys.findFirst({
            where: and(
                eq(apiKeys.id, keyId),
                eq(apiKeys.userId, userId),
                eq(apiKeys.active, true)
            )
        });

        if (!apiKey) {
            throw new Error("API key not found or access denied");
        }

        const result = await tx.update(apiKeys)
            .set({
                active: false,
                lastUsedAt: new Date() // Mark revocation time
            })
            .where(eq(apiKeys.id, keyId))
            .returning();

        if (!result[0]) throw new Error(`API key with ID ${keyId} not found`);
        return result[0];
    },

    // Tool Usage
    recordToolUsage: (data: {
        toolId: string;
        userId?: string;
        responseStatus: string;
        executionTimeMs?: number;
        ipAddress?: string;
        userAgent?: string;
        requestData?: Record<string, unknown>;
        result?: Record<string, unknown>;
    }) => async (tx: TransactionType) => {
        const executionTime = data.executionTimeMs !== undefined ? data.executionTimeMs : undefined;

        const result = await tx.insert(toolUsage).values({
            toolId: data.toolId,
            userId: data.userId,
            responseStatus: data.responseStatus,
            executionTimeMs: executionTime,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            requestData: data.requestData,
            result: data.result,
            timestamp: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to record tool usage");
        return result[0];
    },

    // Get user's tool usage history
    getUserToolUsageHistory: (userId: string, limit = 50, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.toolUsage.findMany({
            where: eq(toolUsage.userId, userId),
            limit,
            offset,
            orderBy: [desc(toolUsage.timestamp)],
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    },
                    with: {
                        server: {
                            columns: {
                                id: true,
                                serverId: true,
                                name: true
                            }
                        }
                    }
                }
                // pricing relation removed - pricing data now in payment jsonb field
            }
        });
    },

    // Get user's payment history
    getUserPaymentHistory: (userId: string, limit = 50, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.payments.findMany({
            where: eq(payments.userId, userId),
            limit,
            offset,
            orderBy: [desc(payments.createdAt)],
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    },
                    with: {
                        server: {
                            columns: {
                                id: true,
                                serverId: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
    },

    // Server Ownership
    assignOwnership: (serverId: string, userId: string, role = 'owner') => async (tx: TransactionType) => {
        const ownership = await tx.insert(serverOwnership).values({
            serverId,
            userId,
            role,
            active: true,
            createdAt: new Date()
        }).returning();

        if (!ownership[0]) throw new Error("Failed to assign ownership");
        return ownership[0];
    },

    getServerOwnership: (serverId: string, userId: string) => async (tx: TransactionType) => {
        return await tx.query.serverOwnership.findFirst({
            where: and(
                eq(serverOwnership.serverId, serverId),
                eq(serverOwnership.userId, userId),
                eq(serverOwnership.active, true)
            )
        });
    },

    listServerOwners: (serverId: string) => async (tx: TransactionType) => {
        return await tx.query.serverOwnership.findMany({
            where: and(
                eq(serverOwnership.serverId, serverId),
                eq(serverOwnership.active, true)
            )
        });
    },

    getApiKeyByHash: (keyHash: string) => async (tx: TransactionType) => {
        return await tx.query.apiKeys.findFirst({
            where: and(
                eq(apiKeys.keyHash, keyHash),
                eq(apiKeys.active, true)
            )
        });
    },

    updateApiKeyLastUsed: (id: string) => async (tx: TransactionType) => {
        const result = await tx.update(apiKeys)
            .set({
                lastUsedAt: new Date()
            })
            .where(eq(apiKeys.id, id))
            .returning();

        if (!result[0]) throw new Error(`API key with ID ${id} not found`);
        return result[0];
    },

    // Webhooks
    createWebhook: (data: {
        serverId: string;
        url: string;
        secret?: string;
        events: string[];
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(webhooks).values({
            serverId: data.serverId,
            url: data.url,
            secret: data.secret,
            events: data.events,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            failureCount: 0
        }).returning();

        if (!result[0]) throw new Error("Failed to create webhook");
        return result[0];
    },

    listWebhooks: (serverId: string) => async (tx: TransactionType) => {
        return await tx.query.webhooks.findMany({
            where: and(
                eq(webhooks.serverId, serverId),
                eq(webhooks.active, true)
            )
        });
    },

    // Proofs operations
    createProof: (data: {
        toolId: string;
        serverId: string;
        userId?: string;
        isConsistent: boolean;
        confidenceScore: number;
        executionUrl?: string;
        executionMethod?: string;
        executionHeaders?: Record<string, unknown>;
        executionParams: Record<string, unknown>;
        executionResult: Record<string, unknown>;
        executionTimestamp: Date;
        aiEvaluation: string;
        inconsistencies?: Array<{
            type: 'parameter_mismatch' | 'result_mismatch' | 'description_mismatch';
            details: string;
        }>;
        webProofPresentation?: string;
        notaryUrl?: string;
        proofMetadata?: Record<string, unknown>;
        replayExecutionResult?: Record<string, unknown>;
        replayExecutionTimestamp?: Date;
        status?: string;
        verificationType?: string;
    }) => async (tx: TransactionType) => {
        const result = await tx.insert(proofs).values({
            toolId: data.toolId,
            serverId: data.serverId,
            userId: data.userId,
            isConsistent: data.isConsistent,
            confidenceScore: data.confidenceScore.toString(),
            executionUrl: data.executionUrl,
            executionMethod: data.executionMethod,
            executionHeaders: data.executionHeaders,
            executionParams: data.executionParams,
            executionResult: data.executionResult,
            executionTimestamp: data.executionTimestamp,
            aiEvaluation: data.aiEvaluation,
            inconsistencies: data.inconsistencies,
            webProofPresentation: data.webProofPresentation,
            notaryUrl: data.notaryUrl,
            proofMetadata: data.proofMetadata,
            replayExecutionResult: data.replayExecutionResult,
            replayExecutionTimestamp: data.replayExecutionTimestamp,
            status: data.status || 'verified',
            verificationType: data.verificationType || 'execution',
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        if (!result[0]) throw new Error("Failed to create proof");
        return result[0];
    },

    getProofById: (id: string) => async (tx: TransactionType) => {
        return await tx.query.proofs.findFirst({
            where: eq(proofs.id, id),
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                server: {
                    columns: {
                        id: true,
                        serverId: true,
                        name: true
                    }
                },
                user: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true
                    }
                }
            }
        });
    },

    listProofsByTool: (toolId: string, limit = 10, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.proofs.findMany({
            where: eq(proofs.toolId, toolId),
            limit,
            offset,
            orderBy: [desc(proofs.createdAt)],
            with: {
                user: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true
                    }
                }
            }
        });
    },

    listProofsByServer: (serverId: string, limit = 10, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.proofs.findMany({
            where: eq(proofs.serverId, serverId),
            limit,
            offset,
            orderBy: [desc(proofs.createdAt)],
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                user: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true
                    }
                }
            }
        });
    },

    listProofsByUser: (userId: string, limit = 10, offset = 0) => async (tx: TransactionType) => {
        return await tx.query.proofs.findMany({
            where: eq(proofs.userId, userId),
            limit,
            offset,
            orderBy: [desc(proofs.createdAt)],
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                server: {
                    columns: {
                        id: true,
                        serverId: true,
                        name: true
                    }
                }
            }
        });
    },

    listProofs: (filters?: {
        isConsistent?: boolean;
        verificationType?: string;
        status?: string;
        minConfidenceScore?: number;
    }, limit = 10, offset = 0) => async (tx: TransactionType) => {
        const conditions = [];
        
        if (filters?.isConsistent !== undefined) {
            conditions.push(eq(proofs.isConsistent, filters.isConsistent));
        }
        
        if (filters?.verificationType) {
            conditions.push(eq(proofs.verificationType, filters.verificationType));
        }
        
        if (filters?.status) {
            conditions.push(eq(proofs.status, filters.status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        return await tx.query.proofs.findMany({
            where: whereClause,
            limit,
            offset,
            orderBy: [desc(proofs.createdAt)],
            with: {
                tool: {
                    columns: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                server: {
                    columns: {
                        id: true,
                        serverId: true,
                        name: true
                    }
                },
                user: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true
                    }
                }
            }
        });
    },

    updateProofStatus: (id: string, status: string) => async (tx: TransactionType) => {
        const result = await tx.update(proofs)
            .set({
                status,
                updatedAt: new Date()
            })
            .where(eq(proofs.id, id))
            .returning();

        if (!result[0]) throw new Error(`Proof with ID ${id} not found`);
        return result[0];
    },

    getProofStats: (filters?: {
        toolId?: string;
        serverId?: string;
        userId?: string;
        startDate?: Date;
        endDate?: Date;
    }) => async (tx: TransactionType) => {
        // This would be a more complex query in practice
        // For now, return a simple count-based implementation
        const conditions = [];
        
        if (filters?.toolId) {
            conditions.push(eq(proofs.toolId, filters.toolId));
        }
        
        if (filters?.serverId) {
            conditions.push(eq(proofs.serverId, filters.serverId));
        }
        
        if (filters?.userId) {
            conditions.push(eq(proofs.userId, filters.userId));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const allProofs = await tx.query.proofs.findMany({
            where: whereClause,
            columns: {
                isConsistent: true,
                confidenceScore: true,
                verificationType: true,
                webProofPresentation: true
            }
        });

        const totalProofs = allProofs.length;
        const consistentProofs = allProofs.filter(p => p.isConsistent).length;
        const inconsistentProofs = totalProofs - consistentProofs;
        const proofsWithWebProof = allProofs.filter(p => p.webProofPresentation).length;
        
        const avgConfidenceScore = totalProofs > 0 
            ? allProofs.reduce((sum, p) => sum + parseFloat(p.confidenceScore), 0) / totalProofs
            : 0;

        const verificationTypeStats = allProofs.reduce((stats, proof) => {
            stats[proof.verificationType] = (stats[proof.verificationType] || 0) + 1;
            return stats;
        }, {} as Record<string, number>);

        return {
            totalProofs,
            consistentProofs,
            inconsistentProofs,
            consistencyRate: totalProofs > 0 ? consistentProofs / totalProofs : 0,
            avgConfidenceScore,
            proofsWithWebProof,
            webProofRate: totalProofs > 0 ? proofsWithWebProof / totalProofs : 0,
            verificationTypeStats
        };
    },

    // Get recent proofs for a server (for reputation scoring)
    getRecentServerProofs: (serverId: string, days = 30) => async (tx: TransactionType) => {
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - days);

        return await tx.query.proofs.findMany({
            where: and(
                eq(proofs.serverId, serverId),
                // Note: For date comparison, you'd need to use a proper date comparison function
                // This is a simplified version
            ),
            columns: {
                isConsistent: true,
                confidenceScore: true,
                webProofPresentation: true,
                createdAt: true
            },
            orderBy: [desc(proofs.createdAt)]
        });
    },

    getServerRegistrationData: (serverId: string) => async (tx: TransactionType) => {
        // Get the server with its related data for registration details
        const server = await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.serverId, serverId),
            columns: {
                id: true,
                serverId: true,
                name: true,
                description: true,
                mcpOrigin: true,
                receiverAddress: true,
                requireAuth: true,
                authHeaders: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                metadata: true
            },
            with: {
                creator: {
                    columns: {
                        id: true,
                        displayName: true,
                        walletAddress: true
                    }
                },
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        pricing: true,
                        isMonetized: true
                    }
                }
            }
        });

        if (!server) {
            return null;
        }

        // Transform tools data to include payment information formatted properly
        const toolsWithPaymentInfo = server.tools.map(tool => {
            const baseToolData = {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema
            };

            // Add payment info if tool is monetized and has payment data
            if (tool.isMonetized && tool.pricing) {
                return {
                    ...baseToolData,
                    pricing: tool.pricing
                };
            }

            return baseToolData;
        });

        // Create registration metadata including counts
        const registrationMetadata: Record<string, unknown> = {
            timestamp: server.createdAt.toISOString(),
            toolsCount: server.tools.length,
            monetizedToolsCount: server.tools.filter(tool => tool.isMonetized).length,
            registeredFromUI: (server.metadata as Record<string, unknown>)?.registeredFromUI || false
        };

        // Safely merge additional metadata if it exists and is an object
        if (server.metadata && typeof server.metadata === 'object') {
            Object.assign(registrationMetadata, server.metadata);
        }

        return {
            id: server.id,
            serverId: server.serverId,
            mcpOrigin: server.mcpOrigin,
            creatorId: server.creator?.id,
            receiverAddress: server.receiverAddress,
            requireAuth: server.requireAuth,
            authHeaders: server.authHeaders,
            createdAt: server.createdAt.toISOString(),
            updatedAt: server.updatedAt.toISOString(),
            status: server.status,
            name: server.name,
            description: server.description,
            tools: toolsWithPaymentInfo,
            metadata: registrationMetadata
        };
    },

    getMcpServerWithStats: (serverId: string) => async (tx: TransactionType) => {
        // Get basic server info first
        const server = await tx.query.mcpServers.findFirst({
            where: eq(mcpServers.serverId, serverId),
            columns: {
                id: true,
                serverId: true,
                name: true,
                mcpOrigin: false,
                receiverAddress: true,
                description: true,
                metadata: true,
                status: true,
                createdAt: true,
                updatedAt: true
            },
            with: {
                creator: {
                    columns: {
                        id: true,
                        walletAddress: true,
                        displayName: true,
                        name: true,
                        avatarUrl: true,
                        image: true
                    },
                    with: {
                        wallets: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                walletType: true
                            }
                        }
                    }
                },
                tools: {
                    columns: {
                        id: true,
                        name: true,
                        description: true,
                        inputSchema: true,
                        outputSchema: true,
                        isMonetized: true,
                        pricing: true,
                        status: true,
                        metadata: true,
                        createdAt: true,
                        updatedAt: true
                    },
                    with: {
                        payments: {
                            columns: {
                                id: true,
                                amountRaw: true,
                                tokenDecimals: true,
                                currency: true,
                                network: true,
                                status: true,
                                createdAt: true,
                                settledAt: true,
                                transactionHash: true
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true,
                                        name: true,
                                        avatarUrl: true,
                                        image: true
                                    }
                                }
                            },
                            orderBy: [desc(payments.createdAt)],
                            limit: 10
                        },
                        usage: {
                            columns: {
                                id: true,
                                timestamp: true,
                                responseStatus: true,
                                executionTimeMs: true,
                                result: false
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true,
                                        name: true,
                                        avatarUrl: true,
                                        image: true
                                    }
                                }
                            },
                            orderBy: [desc(toolUsage.timestamp)],
                            limit: 20
                        },
                        proofs: {
                            columns: {
                                id: true,
                                isConsistent: true,
                                confidenceScore: true,
                                status: true,
                                verificationType: true,
                                createdAt: true,
                                webProofPresentation: true
                            },
                            with: {
                                user: {
                                    columns: {
                                        id: true,
                                        walletAddress: true,
                                        displayName: true
                                    }
                                }
                            },
                            orderBy: [desc(proofs.createdAt)],
                            limit: 10
                        }
                    },
                    orderBy: [mcpTools.name]
                },
                proofs: {
                    columns: {
                        id: true,
                        isConsistent: true,
                        confidenceScore: true,
                        status: true,
                        verificationType: true,
                        createdAt: true,
                        webProofPresentation: true
                    },
                    with: {
                        tool: {
                            columns: {
                                id: true,
                                name: true
                            }
                        },
                        user: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true
                            }
                        }
                    },
                    orderBy: [desc(proofs.createdAt)],
                    limit: 10
                },
                ownership: {
                    where: eq(serverOwnership.active, true),
                    columns: {
                        id: true,
                        role: true,
                        createdAt: true,
                        active: true
                    },
                    with: {
                        user: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true,
                                avatarUrl: true
                            }
                        },
                        grantedByUser: {
                            columns: {
                                id: true,
                                walletAddress: true,
                                displayName: true
                            }
                        }
                    }
                },
                webhooks: {
                    where: eq(webhooks.active, true),
                    columns: {
                        id: true,
                        url: true,
                        events: true,
                        active: true,
                        lastTriggeredAt: true,
                        failureCount: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }
            }
        });

        if (!server) return null;

        // Calculate date boundaries
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Get total counts for each tool using $count
        const toolCountPromises = server.tools.map(async (tool) => {
            const [totalPayments, completedPayments, totalUsage, totalProofs, consistentProofs] = await Promise.all([
                tx.$count(payments, eq(payments.toolId, tool.id)),
                tx.$count(payments, and(eq(payments.toolId, tool.id), eq(payments.status, 'completed'))),
                tx.$count(toolUsage, eq(toolUsage.toolId, tool.id)),
                tx.$count(proofs, eq(proofs.toolId, tool.id)),
                tx.$count(proofs, and(eq(proofs.toolId, tool.id), eq(proofs.isConsistent, true)))
            ]);

            return {
                ...tool,
                totalPayments,
                completedPayments,
                totalUsage,
                totalProofs,
                consistentProofs
            };
        });

        const toolsWithCounts = await Promise.all(toolCountPromises);

        // Get tools count and breakdown using $count
        const [totalTools, monetizedTools] = await Promise.all([
            tx.$count(mcpTools, eq(mcpTools.serverId, server.id)),
            tx.$count(mcpTools, and(eq(mcpTools.serverId, server.id), eq(mcpTools.isMonetized, true)))
        ]);

        // Get payment statistics using $count
        const serverToolsCondition = and(
            eq(payments.toolId, mcpTools.id),
            eq(mcpTools.serverId, server.id)
        );

        const [
            totalPayments,
            completedPayments,
            pendingPayments,
            failedPayments,
            recentPayments,
            weeklyPayments
        ] = await Promise.all([
            tx.$count(payments, exists(
                tx.select().from(mcpTools).where(and(
                    eq(payments.toolId, mcpTools.id),
                    eq(mcpTools.serverId, server.id)
                ))
            )),
            tx.$count(payments, and(
                eq(payments.status, 'completed'),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(payments.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(payments, and(
                eq(payments.status, 'pending'),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(payments.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(payments, and(
                eq(payments.status, 'failed'),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(payments.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(payments, and(
                gte(payments.createdAt, thirtyDaysAgo),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(payments.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(payments, and(
                gte(payments.createdAt, sevenDaysAgo),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(payments.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            ))
        ]);

        // Get usage statistics using $count
        const [
            totalUsage,
            successfulUsage,
            failedUsage,
            recentUsage,
            weeklyUsage
        ] = await Promise.all([
            tx.$count(toolUsage, exists(
                tx.select().from(mcpTools).where(and(
                    eq(toolUsage.toolId, mcpTools.id),
                    eq(mcpTools.serverId, server.id)
                ))
            )),
            tx.$count(toolUsage, and(
                gte(toolUsage.responseStatus, '200'),
                lt(toolUsage.responseStatus, '300'),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(toolUsage.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(toolUsage, and(
                or(
                    isNull(toolUsage.responseStatus),
                    gte(toolUsage.responseStatus, '400')
                ),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(toolUsage.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(toolUsage, and(
                gte(toolUsage.timestamp, thirtyDaysAgo),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(toolUsage.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            )),
            tx.$count(toolUsage, and(
                gte(toolUsage.timestamp, sevenDaysAgo),
                exists(
                    tx.select().from(mcpTools).where(and(
                        eq(toolUsage.toolId, mcpTools.id),
                        eq(mcpTools.serverId, server.id)
                    ))
                )
            ))
        ]);

        // Get additional stats that need aggregation (revenue, averages, distinct counts)
        const [revenueData, avgResponseTimeData, uniqueUsersData] = await Promise.all([
            // Revenue calculations
            tx
                .select({
                    totalRevenue: sum(sql`CAST(${payments.amountRaw} AS NUMERIC)`),
                    recentRevenue: sum(sql`CASE WHEN ${payments.createdAt} > ${thirtyDaysAgo} THEN CAST(${payments.amountRaw} AS NUMERIC) ELSE 0 END`),
                    weeklyRevenue: sum(sql`CASE WHEN ${payments.createdAt} > ${sevenDaysAgo} THEN CAST(${payments.amountRaw} AS NUMERIC) ELSE 0 END`)
                })
                .from(payments)
                .innerJoin(mcpTools, eq(payments.toolId, mcpTools.id))
                .where(and(
                    eq(mcpTools.serverId, server.id),
                    eq(payments.status, 'completed')
                ))
                .then(rows => rows[0] || { totalRevenue: '0', recentRevenue: '0', weeklyRevenue: '0' }),
            
            // Average response time
            tx
                .select({
                    avgResponseTime: avg(toolUsage.executionTimeMs)
                })
                .from(toolUsage)
                .innerJoin(mcpTools, eq(toolUsage.toolId, mcpTools.id))
                .where(eq(mcpTools.serverId, server.id))
                .then(rows => rows[0] || { avgResponseTime: '0' }),
            
            // Unique users counts
            tx
                .select({
                    uniquePayingUsers: sql<number>`COUNT(DISTINCT ${payments.userId})`,
                    uniqueActiveUsers: sql<number>`COUNT(DISTINCT ${toolUsage.userId})`
                })
                .from(mcpTools)
                .leftJoin(payments, eq(payments.toolId, mcpTools.id))
                .leftJoin(toolUsage, eq(toolUsage.toolId, mcpTools.id))
                .where(eq(mcpTools.serverId, server.id))
                .then(rows => rows[0] || { uniquePayingUsers: 0, uniqueActiveUsers: 0 })
        ]);

        // Combine the stats
        const toolStats = {
            totalTools,
            monetizedTools,
            freeTools: totalTools - monetizedTools
        };

        const paymentStats = {
            totalPayments,
            completedPayments,
            pendingPayments,
            failedPayments,
            totalRevenue: revenueData.totalRevenue || '0',
            uniquePayingUsers: uniqueUsersData.uniquePayingUsers,
            recentPayments,
            weeklyPayments,
            recentRevenue: revenueData.recentRevenue || '0',
            weeklyRevenue: revenueData.weeklyRevenue || '0'
        };

        const usageStats = {
            totalUsage,
            successfulUsage,
            failedUsage,
            avgResponseTime: avgResponseTimeData.avgResponseTime || '0',
            uniqueActiveUsers: uniqueUsersData.uniqueActiveUsers,
            recentUsage,
            weeklyUsage
        };

        // Get proof statistics using aggregation (both server-level and tool-level proofs)
        const [serverProofStats, toolProofStats] = await Promise.all([
            // Server-level proofs
            tx
                .select({
                    serverProofs: count(),
                    serverConsistentProofs: count(sql`CASE WHEN ${proofs.isConsistent} = true THEN 1 END`),
                    serverProofsWithWebProof: count(sql`CASE WHEN ${proofs.webProofPresentation} IS NOT NULL THEN 1 END`),
                    serverAvgConfidence: avg(sql`CAST(${proofs.confidenceScore} AS NUMERIC)`),
                    uniqueProvingUsers: sql<number>`COUNT(DISTINCT ${proofs.userId})`
                })
                .from(proofs)
                .where(eq(proofs.serverId, server.id))
                .then(rows => rows[0] || {
                    serverProofs: 0,
                    serverConsistentProofs: 0,
                    serverProofsWithWebProof: 0,
                    serverAvgConfidence: '0',
                    uniqueProvingUsers: 0
                }),
            
            // Tool-level proofs  
            tx
                .select({
                    toolProofs: count(),
                    toolConsistentProofs: count(sql`CASE WHEN ${proofs.isConsistent} = true THEN 1 END`),
                    toolProofsWithWebProof: count(sql`CASE WHEN ${proofs.webProofPresentation} IS NOT NULL THEN 1 END`),
                    toolAvgConfidence: avg(sql`CAST(${proofs.confidenceScore} AS NUMERIC)`)
                })
                .from(proofs)
                .innerJoin(mcpTools, eq(proofs.toolId, mcpTools.id))
                .where(eq(mcpTools.serverId, server.id))
                .then(rows => rows[0] || {
                    toolProofs: 0,
                    toolConsistentProofs: 0,
                    toolProofsWithWebProof: 0,
                    toolAvgConfidence: '0'
                })
        ]);

        // Get revenue breakdown by currency/network
        const revenueByNetwork = await tx
            .select({
                currency: payments.currency,
                network: payments.network,
                decimals: payments.tokenDecimals,
                amount: sum(sql`CAST(${payments.amountRaw} AS NUMERIC)`),
                count: count()
            })
            .from(payments)
            .innerJoin(mcpTools, eq(payments.toolId, mcpTools.id))
            .where(and(
                eq(mcpTools.serverId, server.id),
                eq(payments.status, 'completed')
            ))
            .groupBy(payments.currency, payments.network, payments.tokenDecimals);

        // Get latest activity timestamp using SQL
        const lastActivity = await tx
            .select({
                lastPayment: sql<Date | null>`MAX(${payments.createdAt})`,
                lastUsage: sql<Date | null>`MAX(${toolUsage.timestamp})`,
                lastServerProof: sql<Date | null>`MAX(${proofs.createdAt})`
            })
            .from(mcpTools)
            .leftJoin(payments, eq(payments.toolId, mcpTools.id))
            .leftJoin(toolUsage, eq(toolUsage.toolId, mcpTools.id))
            .leftJoin(proofs, eq(proofs.serverId, server.id))
            .where(eq(mcpTools.serverId, server.id))
            .then(rows => {
                const row = rows[0];
                if (!row) return null;
                
                const dates = [row.lastPayment, row.lastUsage, row.lastServerProof]
                    .filter(d => d !== null)
                    .map(d => new Date(d!));
                
                return dates.length > 0 
                    ? new Date(Math.max(...dates.map(d => d.getTime())))
                    : null;
            });

        // Get top tools performance using SQL aggregation
        const topTools = await tx
            .select({
                name: mcpTools.name,
                isMonetized: mcpTools.isMonetized,
                totalUsage: count(toolUsage.id),
                totalPayments: count(payments.id),
                totalRevenue: sum(sql`CASE WHEN ${payments.status} = 'completed' THEN CAST(${payments.amountRaw} AS NUMERIC) ELSE 0 END`),
                avgResponseTime: avg(toolUsage.executionTimeMs)
            })
            .from(mcpTools)
            .leftJoin(toolUsage, eq(toolUsage.toolId, mcpTools.id))
            .leftJoin(payments, eq(payments.toolId, mcpTools.id))
            .where(eq(mcpTools.serverId, server.id))
            .groupBy(mcpTools.id, mcpTools.name, mcpTools.isMonetized)
            .orderBy(desc(count(toolUsage.id)))
            .limit(5);

        // Calculate combined proof statistics
        const totalProofs = serverProofStats.serverProofs + toolProofStats.toolProofs;
        const consistentProofs = serverProofStats.serverConsistentProofs + toolProofStats.toolConsistentProofs;
        const proofsWithWebProof = serverProofStats.serverProofsWithWebProof + toolProofStats.toolProofsWithWebProof;
        
        // Calculate reputation score
        const reputationScore = (() => {
            if (totalProofs === 0) return 0;
            
            const consistencyRate = consistentProofs / totalProofs;
            const serverConfidence = parseFloat(serverProofStats.serverAvgConfidence || '0');
            const toolConfidence = parseFloat(toolProofStats.toolAvgConfidence || '0');
            const avgConfidence = serverProofStats.serverProofs > 0 && toolProofStats.toolProofs > 0 
                ? (serverConfidence + toolConfidence) / 2 
                : serverConfidence + toolConfidence;
            const webProofBonus = proofsWithWebProof / totalProofs * 0.2;
            
                return Math.min(1, consistencyRate * 0.6 + avgConfidence * 0.3 + webProofBonus);
        })();

        // Calculate success rates
        const paymentSuccessRate = paymentStats.totalPayments > 0 ? paymentStats.completedPayments / paymentStats.totalPayments : 0;
        const usageSuccessRate = usageStats.totalUsage > 0 ? usageStats.successfulUsage / usageStats.totalUsage : 0;
        const proofConsistencyRate = totalProofs > 0 ? consistentProofs / totalProofs : 0;

        const stats = {
            // Basic totals
            totalTools: toolStats.totalTools,
            monetizedTools: toolStats.monetizedTools,
            freeTools: toolStats.freeTools,
            
            // Payment totals and breakdowns
            totalPayments: paymentStats.totalPayments,
            completedPayments: paymentStats.completedPayments,
            pendingPayments: paymentStats.pendingPayments,
            failedPayments: paymentStats.failedPayments,
            paymentSuccessRate,
            
            // Revenue totals
            totalRevenue: parseFloat(paymentStats.totalRevenue || '0'),
            revenueByNetwork: revenueByNetwork.map(r => ({
                currency: r.currency,
                network: r.network,
                decimals: r.decimals,
                amount: parseFloat(r.amount || '0'),
                count: r.count
            })),
            
            // Usage totals and metrics
            totalUsage: usageStats.totalUsage,
            successfulUsage: usageStats.successfulUsage,
            failedUsage: usageStats.failedUsage,
            usageSuccessRate,
            avgResponseTime: parseFloat(usageStats.avgResponseTime || '0'),
            
            // Proof totals
            totalProofs,
            consistentProofs,
            inconsistentProofs: totalProofs - consistentProofs,
            proofsWithWebProof,
            proofConsistencyRate,
            
            // User engagement metrics
            totalUniqueUsers: Math.max(
                paymentStats.uniquePayingUsers, 
                usageStats.uniqueActiveUsers,
                serverProofStats.uniqueProvingUsers
            ),
            payingUsers: paymentStats.uniquePayingUsers,
            activeUsers: usageStats.uniqueActiveUsers,
            provingUsers: serverProofStats.uniqueProvingUsers,
            
            // Time-based metrics (last 30 days)
            recentPayments: paymentStats.recentPayments,
            recentUsage: usageStats.recentUsage,
            recentRevenue: parseFloat(paymentStats.recentRevenue || '0'),
            
            // Time-based metrics (last 7 days)
            weeklyPayments: paymentStats.weeklyPayments,
            weeklyUsage: usageStats.weeklyUsage,
            weeklyRevenue: parseFloat(paymentStats.weeklyRevenue || '0'),
            
            // Tool performance insights
            topTools: topTools.map(t => ({
                name: t.name,
                isMonetized: t.isMonetized,
                totalUsage: t.totalUsage,
                totalPayments: t.totalPayments,
                totalRevenue: parseFloat(t.totalRevenue || '0'),
                successRate: 0, // Would need more complex query
                avgResponseTime: parseFloat(t.avgResponseTime || '0')
            })),
            mostProfitableTools: topTools
                .filter(t => t.isMonetized)
                .sort((a, b) => parseFloat(b.totalRevenue || '0') - parseFloat(a.totalRevenue || '0'))
                .slice(0, 5)
                .map(t => ({
                    name: t.name,
                    isMonetized: t.isMonetized,
                    totalUsage: t.totalUsage,
                    totalPayments: t.totalPayments,
                    totalRevenue: parseFloat(t.totalRevenue || '0'),
                    successRate: 0, // Would need more complex query
                    avgResponseTime: parseFloat(t.avgResponseTime || '0')
                })),
            
            // Server health metrics
            reputationScore,
            
            // Activity tracking
            lastActivity,
            
            // Server configuration
            totalOwners: server.ownership.length,
            activeWebhooks: server.webhooks.filter(w => w.active).length,
            totalWebhooks: server.webhooks.length
        };

        return {
            ...server,
            tools: toolsWithCounts,
            stats
        };
    },

    // Server Creation with Authenticated User
    createServerForAuthenticatedUser: (data: {
        serverId: string;
        mcpOrigin: string;
        authenticatedUserId: string;
        receiverAddress: string;
        requireAuth?: boolean;
        authHeaders?: Record<string, unknown>;
        description?: string;
        name?: string;
        metadata?: Record<string, unknown>;
        walletInfo?: {
            blockchain?: string;
            walletType?: 'external' | 'managed' | 'custodial';
            provider?: string;
            network?: string;
        };
        tools: Array<{
            name: string;
            description?: string;
            inputSchema?: Record<string, unknown>;
            outputSchema?: Record<string, unknown>;
            pricing: PricingEntry[] | undefined;
        }>;
    }) => async (tx: TransactionType) => {
        console.log('Creating server for authenticated user:', data.authenticatedUserId);
        
        // Use the authenticated user - no need to lookup by wallet
        const user = await txOperations.getUserById(data.authenticatedUserId)(tx);
        if (!user) {
            throw new Error('Authenticated user not found');
        }

        // Check if the user already has this wallet address
        const existingWallet = await tx.query.userWallets.findFirst({
            where: and(
                eq(userWallets.userId, user.id),
                eq(userWallets.walletAddress, data.receiverAddress),
                eq(userWallets.isActive, true)
            )
        });

        // Add wallet to user if they don't have it
        if (!existingWallet) {
            console.log('Adding new wallet to authenticated user:', data.receiverAddress);
            const walletInfo = data.walletInfo;
            
            await txOperations.addWalletToUser({
                userId: user.id,
                walletAddress: data.receiverAddress,
                walletType: (walletInfo?.walletType as 'external' | 'managed' | 'custodial') || 'external',
                provider: walletInfo?.provider || 'unknown',
                blockchain: walletInfo?.blockchain || 'ethereum',
                architecture: getBlockchainArchitecture(walletInfo?.blockchain),
                isPrimary: false, // Don't make it primary automatically
                walletMetadata: {
                    registrationNetwork: walletInfo?.network || 'base-sepolia',
                    addedViaServerCreation: true,
                    ...(walletInfo || {})
                }
            })(tx);
        }

        // Create the server under the authenticated user
        console.log('Creating server record for user:', user.id);
        const serverRecord = await txOperations.createServer({
            serverId: data.serverId,
            creatorId: user.id,
            mcpOrigin: data.mcpOrigin,
            receiverAddress: data.receiverAddress,
            requireAuth: data.requireAuth,
            authHeaders: data.authHeaders,
            name: data.name || 'No name available',
            description: data.description || 'No description available',
            metadata: data.metadata
        })(tx);

        // Create tools
        console.log('Creating tools:', data.tools.length);
        const createdTools = [];
        
        for (const tool of data.tools) {
            const createdTool = await txOperations.createTool({
                serverId: serverRecord.id,
                name: tool.name,
                description: tool.description || `Access to ${tool.name}`,
                inputSchema: tool.inputSchema || {},
                outputSchema: tool.outputSchema || {},
                isMonetized: !!tool.pricing,
                pricing: tool.pricing as PricingEntry[] | undefined
            })(tx);

            createdTools.push(createdTool);
        }

        // Assign ownership to the authenticated user
        console.log('Assigning server ownership to authenticated user:', user.id);
        await txOperations.assignOwnership(serverRecord.id, user.id, 'owner')(tx);

        console.log('Server creation completed successfully');
        return {
            server: serverRecord,
            tools: createdTools,
            user: user
        };
    }
};
