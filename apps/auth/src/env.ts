import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Server
  PORT: z.string().default("3050").transform((val) => parseInt(val, 10)),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required").default(""),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL must be a valid URL").optional(),

  // CORS / Origins
  TRUSTED_ORIGINS: z.string().optional(),

  // GitHub OAuth
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required").default(""),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required").default(""),

  // Database (sqlite)
  SQLITE_DB_PATH: z.string().min(1).default("./sqlite.db"),
});

function parseEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if ((error as any)?.issues) {
      const issues = (error as any).issues as Array<any>;
      const missingVars = issues
        .filter((err) => err.code === "invalid_type")
        .map((err) => err.path.join("."));
      const invalidVars = issues
        .filter((err) => err.code !== "invalid_type")
        .map((err) => `${err.path.join(".")}: ${err.message}`);

      console.error("❌ Auth environment validation failed:");
      if (missingVars.length > 0) {
        console.error("Missing required variables:", missingVars.join(", "));
      }
      if (invalidVars.length > 0) {
        console.error("Invalid variables:", invalidVars.join(", "));
      }
      process.exit(1);
    }
    throw error;
  }
}

export const env = parseEnv();
export type Env = typeof env;

export const isDevelopment = () => env.NODE_ENV === "development";
export const isProduction = () => env.NODE_ENV === "production";
export const isTest = () => env.NODE_ENV === "test";

export const getPort = () => env.PORT;

export const getTrustedOrigins = (): string[] => {
  const raw = env.TRUSTED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
};

export const getGitHubConfig = () => ({
  clientId: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
});

export const getSqlitePath = () => env.SQLITE_DB_PATH;

export const validateEnvironment = () => {
  console.log("✅ Auth environment variables validated successfully");
  if (isDevelopment()) {
    console.log("🔧 Running in development mode");
  }
};

export default env;


