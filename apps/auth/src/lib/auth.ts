import { betterAuth } from "better-auth";
import { apiKey, mcp, oAuthProxy } from "better-auth/plugins";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { getGitHubConfig, getSqlitePath, getTrustedOrigins } from "../env.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../auth-schema.js";

dotenv.config();

const TRUSTED_ORIGINS = getTrustedOrigins();

const sqlite = new Database(getSqlitePath());
const db = drizzle(sqlite, { schema });

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite"
    }),
    trustedOrigins: TRUSTED_ORIGINS,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        github: getGitHubConfig(),
    },
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
        },
    },
    plugins: [
        oAuthProxy(),
        apiKey(),
        mcp({
            loginPage: "/connect",
        })
    ],
})