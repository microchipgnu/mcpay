import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  NEXT_PUBLIC_AUTH_URL: z.url('NEXT_PUBLIC_AUTH_URL must be a valid URL').default(''),
  // MCP2 Configuration
  MCP2_URL: z.url().default('http://localhost:3006'),

  MCP_PROXY_URL: z.url().default('http://localhost:3005'),
});

// Parse and validate environment variables
function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter((err) => err.code === 'invalid_type')
        .map((err) => err.path.join('.'));
      
      const invalidVars = error.issues
        .filter((err) => err.code !== 'invalid_type')
        .map((err) => `${err.path.join('.')}: ${err.message}`);

      console.error('❌ Environment validation failed:');
      
      if (missingVars.length > 0) {
        console.error('Missing required variables:', missingVars.join(', '));
      }
      
      if (invalidVars.length > 0) {
        console.error('Invalid variables:', invalidVars.join(', '));
      }
      
      process.exit(1);
    }
    throw error;
  }
}

// Export the validated environment variables
export const env = parseEnv();

// Type for the environment object
export type Env = typeof env;

// Helper functions for specific use cases
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// Export default as the env object for convenience
export default env;
