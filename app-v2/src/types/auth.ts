import { auth } from "@/lib/gateway/auth";
import { users } from "@/lib/gateway/db/schema";

// Better-auth session type (inferred from auth instance)
export type AuthSession = typeof auth.$Infer.Session;

// Extend Hono context with proper typing
export type AppContext = {
    Variables: {
        // Optional session and user - will be undefined if not authenticated
        session?: AuthSession['session'];
        user?: AuthSession['user'];
        // Helper method to get authenticated user (throws if not authenticated)
        requireUser(): AuthSession['user'];
    };
}

export type AuthType = {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
}


// Use Drizzle-inferred types from schema
export type User = typeof users.$inferSelect;

// Enhanced User type that includes wallet information for API usage
export type UserWithWallet = User & {
    walletAddress: string; // Primary wallet address for API compatibility
};


// Auth status type
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

// Enhanced user type with wallet information
export interface AuthUser {
  id: string
  name?: string
  email?: string
  emailVerified?: boolean
  image?: string
  displayName?: string
  walletAddress?: string // Legacy field
  createdAt: string
  updatedAt: string
  wallets?: Array<{
    id: string
    walletAddress: string
    blockchain: string
    walletType: 'external' | 'managed' | 'custodial'
    provider?: string
    isPrimary: boolean
    isActive: boolean
  }>
} 