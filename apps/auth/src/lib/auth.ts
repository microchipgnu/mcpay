import { betterAuth } from "better-auth";
import { apiKey, mcp } from "better-auth/plugins";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../../auth-schema.js";

dotenv.config();

const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS?.split(",");

const sqlite = new Database("./sqlite.db");
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
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
        },
    },
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
        },
    },
    plugins: [
        apiKey(),
        mcp({
            loginPage: "/sign-in",
        })
    ],
})