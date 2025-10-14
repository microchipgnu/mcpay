import { z } from 'zod';

// Define the schema for client-safe environment variables
const clientEnvSchema = z.object({
  // Next.js replaces process.env.NODE_ENV at build time
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Only expose NEXT_PUBLIC_* vars on the client
  NEXT_PUBLIC_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_MCP2_URL: z.string().url(),
  NEXT_PUBLIC_MCP_PROXY_URL: z.string().url(),
  NEXT_PUBLIC_MCP_DATA_URL: z.string().url(),
});

// Build the raw env object using individual references so Next can inline them
const rawClientEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_MCP2_URL: process.env.NEXT_PUBLIC_MCP2_URL ?? 'https://mcp2.mcpay.tech',
  NEXT_PUBLIC_MCP_PROXY_URL: process.env.NEXT_PUBLIC_MCP_PROXY_URL ?? 'https://mcp.mcpay.tech',
  NEXT_PUBLIC_MCP_DATA_URL: process.env.NEXT_PUBLIC_MCP_DATA_URL ?? 'http://localhost:3010',
};

// Validate without crashing the browser or dev server
const parsed = clientEnvSchema.safeParse(rawClientEnv);
if (!parsed.success) {
  const issues = parsed.error.flatten().fieldErrors;
  if (typeof window !== 'undefined') {
    console.warn('Environment validation failed on the client:', issues);
  } else {
    console.warn('Environment validation failed:', issues);
  }
}

// Export the validated environment variables
export const env = (parsed.success ? parsed.data : rawClientEnv);

// Type for the environment object
export type Env = typeof env;

// Helper functions for specific use cases
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// Export default as the env object for convenience
export default env;
