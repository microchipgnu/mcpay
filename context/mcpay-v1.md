


Directory structure:
└── microchipgnu-mcpay/
    └── app/
        ├── components.json
        ├── drizzle.config.ts
        ├── eslint.config.mjs
        ├── next.config.ts
        ├── package.json
        ├── playwright.config.ts
        ├── postcss.config.mjs
        ├── tsconfig.json
        ├── drizzle/
        │   ├── 0000_minor_magdalene.sql
        │   ├── 0001_pink_morlocks.sql
        │   └── meta/
        │       └── _journal.json
        ├── public/
        │   └── site.webmanifest
        ├── scripts/
        │   ├── add-managed-and-fund.ts
        │   ├── drizzle-migrate.cjs
        │   └── gen-accounts.ts
        └── src/
            ├── app/
            │   ├── globals.css
            │   ├── layout.tsx
            │   ├── page.tsx
            │   ├── (server)/
            │   │   ├── api/
            │   │   │   ├── auth/
            │   │   │   │   └── [...all]/
            │   │   │   │       └── route.ts
            │   │   │   ├── chat/
            │   │   │   │   └── route.ts
            │   │   │   └── deploy/
            │   │   │       ├── actions.ts
            │   │   │       └── route.ts
            │   │   ├── ping/
            │   │   │   └── [[...route]]/
            │   │   │       └── route.ts
            │   │   ├── requirements/
            │   │   │   └── [[...route]]/
            │   │   │       └── route.ts
            │   │   └── validate/
            │   │       └── [[...route]]/
            │   │           └── route.ts
            │   ├── explorer/
            │   │   └── page.tsx
            │   ├── register/
            │   │   └── success/
            │   │       └── page.tsx
            │   └── servers/
            │       ├── page.tsx
            │       └── [id]/
            │           └── page.tsx
            ├── components/
            │   ├── custom-ui/
            │   │   ├── analytics-chart.tsx
            │   │   ├── built-with-section.tsx
            │   │   ├── chat-body.tsx
            │   │   ├── chat-with-preview.tsx
            │   │   ├── client-explorer-page.tsx
            │   │   ├── client-servers-page.tsx
            │   │   ├── code-block.tsx
            │   │   ├── code-preview.tsx
            │   │   ├── connect-button.tsx
            │   │   ├── content-cards-small.tsx
            │   │   ├── content-cards.tsx
            │   │   ├── explorer-link.tsx
            │   │   ├── faq-section.tsx
            │   │   ├── footer.tsx
            │   │   ├── greeting.tsx
            │   │   ├── hero-stats.tsx
            │   │   ├── hero-tab.tsx
            │   │   ├── hero.tsx
            │   │   ├── icons.tsx
            │   │   ├── integration-tab.tsx
            │   │   ├── logo-stack.tsx
            │   │   ├── markdown.tsx
            │   │   ├── mcp-preview.tsx
            │   │   ├── message.tsx
            │   │   ├── messages.tsx
            │   │   ├── minimal-explorer.tsx
            │   │   ├── multimodal-input.tsx
            │   │   ├── navbar.tsx
            │   │   ├── servers-grid.tsx
            │   │   ├── suggested-actions.tsx
            │   │   ├── token-icon.tsx
            │   │   ├── tool-call-streaming.tsx
            │   │   └── typing-animation.tsx
            │   ├── hooks/
            │   │   └── use-account-modal.ts
            │   └── providers/
            │       ├── query-client.tsx
            │       ├── theme-context.tsx
            │       └── user.tsx
            ├── hooks/
            │   ├── use-chat-scroll.tsx
            │   └── use-scroll-to-bottom.tsx
            ├── lib/
            │   ├── utils.ts
            │   ├── client/
            │   │   ├── auth.ts
            │   │   ├── blockscout.ts
            │   │   ├── config.ts
            │   │   ├── utils.ts
            │   │   └── wallet-utils.ts
            │   ├── commons/
            │   │   ├── amounts.ts
            │   │   ├── balance-tracker.ts
            │   │   ├── index.ts
            │   │   ├── networks.ts
            │   │   └── tokens.ts
            │   └── gateway/
            │       ├── analytics.ts
            │       ├── auth-utils.ts
            │       ├── auth.ts
            │       ├── env.ts
            │       ├── inspect-mcp.ts
            │       ├── openmcp-schema.ts
            │       ├── payments.ts
            │       ├── 3rd-parties/
            │       │   ├── cdp.ts
            │       │   ├── onramp.ts
            │       │   └── vlayer.ts
            │       ├── db/
            │       │   ├── index.ts
            │       │   └── schema.ts
            │       └── payment-strategies/
            │           ├── cdp-strategy.ts
            │           ├── config.ts
            │           ├── index.ts
            │           ├── testing-strategy.ts
            │           └── types.ts
            └── types/
                ├── api.ts
                ├── auth.ts
                ├── blockchain.ts
                ├── chat.ts
                ├── database-actions.ts
                ├── index.ts
                ├── mcp.ts
                ├── payments.ts
                ├── ui.ts
                ├── wallet.ts
                └── x402.ts


Files Content:

(Files content cropped to 300k characters, download full ingest to see more)
================================================
FILE: app/components.json
================================================
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}


================================================
FILE: app/drizzle.config.ts
================================================
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/gateway/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});



================================================
FILE: app/eslint.config.mjs
================================================
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;



================================================
FILE: app/next.config.ts
================================================
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;



================================================
FILE: app/package.json
================================================
{
  "name": "mcpay.tech",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "dev:no-turbo": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:apply-changes": "drizzle-kit push",
    "db:generate-migrations": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "e2e:install": "playwright install --with-deps",
    "e2e:test": "playwright test",
    "e2e:codegen": "playwright codegen",
    "e2e:ui": "playwright test --ui",
    "e2e:show-report": "playwright show-report",
    "migrate": "node scripts/drizzle-migrate.cjs",
    "account:generate": "tsx scripts/gen-accounts.ts",
    "account:add-managed": "tsx scripts/add-managed-and-fund.ts"
  },
  "dependencies": {
    "@ai-sdk/react": "^2.0.0-beta.27",
    "@coinbase/cdp-sdk": "^1.26.0",
    "@hono/node-server": "^1.18.1",
    "@hookform/resolvers": "^5.1.1",
    "@modelcontextprotocol/sdk": "^1.12.1",
    "@monaco-editor/react": "^4.7.0",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-aspect-ratio": "^1.1.7",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-collapsible": "^1.1.11",
    "@radix-ui/react-context-menu": "^2.2.15",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-hover-card": "^1.1.14",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-menubar": "^1.1.15",
    "@radix-ui/react-navigation-menu": "^1.2.13",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-radio-group": "^1.3.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slider": "^1.3.5",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toggle": "^1.1.9",
    "@radix-ui/react-toggle-group": "^1.1.10",
    "@radix-ui/react-tooltip": "^1.2.7",
    "@vercel/ai-sdk-gateway": "^0.1.9",
    "@vercel/analytics": "^1.5.0",
    "@vercel/kv": "^3.0.0",
    "@vercel/mcp-adapter": "0.11.1",
    "@vercel/sandbox": "^0.0.12",
    "ai": "5.0.0-beta.20",
    "ajv": "^8.17.1",
    "better-auth": "^1.2.12",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^16.5.0",
    "drizzle-orm": "^0.44.1",
    "embla-carousel-react": "^8.6.0",
    "highlight.js": "^11.11.1",
    "hono": "^4.7.10",
    "input-otp": "^1.4.2",
    "lucide-react": "^0.525.0",
    "mcp-handler": "^1.0.1",
    "mcpay": "0.0.19",
    "motion": "^12.23.6",
    "next": "15.4.1",
    "next-themes": "^0.4.6",
    "pg": "^8.16.0",
    "pino-pretty": "^13.0.0",
    "react": "19.1.0",
    "react-day-picker": "^9.8.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.60.0",
    "react-markdown": "^10.1.0",
    "react-resizable-panels": "^3.0.3",
    "react-syntax-highlighter": "^15.6.1",
    "recharts": "2.15.4",
    "rehype-highlight": "^7.0.2",
    "remark-gfm": "^4.0.1",
    "sonner": "^2.0.6",
    "tailwind-merge": "^3.3.1",
    "vaul": "^1.1.2",
    "vercel-url": "^0.2.8",
    "viem": "^2.32.0",
    "wagmi": "^2.15.7",
    "x402": "^0.4.1",
    "zod": "^4.0.5"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^22.15.29",
    "@types/pg": "^8.15.2",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "drizzle-kit": "^0.31.1",
    "eslint": "^9",
    "eslint-config-next": "15.4.1",
    "tailwindcss": "^4",
    "tsx": "^4.19.4",
    "tw-animate-css": "^1.3.5",
    "typescript": "^5.8.3",
    "@types/react-syntax-highlighter": "^15.5.13",
    "@playwright/test": "^1.47.2",
    "@testcontainers/postgresql": "^10.13.2",
    "@testcontainers/redis": "^10.13.2",
    "testcontainers": "^10.13.2",
    "get-port": "^7.1.0"
  }
}



================================================
FILE: app/playwright.config.ts
================================================
// @ts-nocheck
import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: 'tests/e2e',
  fullyParallel: true,
  timeout: 90_000,
  // Store all run artifacts (per-test output, traces, etc.) in a stable folder
  outputDir: 'tests/e2e/artifacts',
  // Reduce noisy interleaved console output; keep HTML for deep dives
  reporter: [
    ['line'],
    [require.resolve('./tests/e2e/utils/per-test-logs-reporter')],
    ['html', { open: 'never' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'main', use: { baseURL: process.env.PW_BASE_URL || 'http://localhost:3001' } },
  ],
  globalSetup: './tests/e2e/setup/globalSetup.ts',
  globalTeardown: './tests/e2e/setup/globalTeardown.ts',
};

export default config;





================================================
FILE: app/postcss.config.mjs
================================================
const config = {
  plugins: ["@tailwindcss/postcss"],
};

export default config;



================================================
FILE: app/tsconfig.json
================================================
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": [
    "node_modules",
    "tests/**",
    "playwright.config.ts",
    "vitest.config*.ts"
  ]
}



================================================
FILE: app/drizzle/0000_minor_magdalene.sql
================================================
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key_hash" text NOT NULL,
	"name" text NOT NULL,
	"permissions" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"last_used_at" timestamp,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" text NOT NULL,
	"mcp_origin" text NOT NULL,
	"creator_id" uuid,
	"receiver_address" text NOT NULL,
	"require_auth" boolean DEFAULT false NOT NULL,
	"auth_headers" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"name" text,
	"description" text,
	"metadata" jsonb,
	CONSTRAINT "mcp_servers_server_id_unique" UNIQUE("server_id"),
	CONSTRAINT "mcp_servers_mcp_origin_unique" UNIQUE("mcp_origin")
);
--> statement-breakpoint
CREATE TABLE "mcp_tools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb DEFAULT '{}'::jsonb,
	"is_monetized" boolean DEFAULT false NOT NULL,
	"pricing" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"user_id" uuid,
	"amount_raw" numeric(38, 0) NOT NULL,
	"token_decimals" integer NOT NULL,
	"currency" text NOT NULL,
	"network" text NOT NULL,
	"transaction_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp,
	"signature" text,
	"payment_data" jsonb,
	CONSTRAINT "payments_transaction_hash_unique" UNIQUE("transaction_hash"),
	CONSTRAINT "amount_raw_positive_check" CHECK ("amount_raw" >= 0)
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"server_id" uuid NOT NULL,
	"user_id" uuid,
	"is_consistent" boolean NOT NULL,
	"confidence_score" numeric(3, 2) NOT NULL,
	"execution_url" text,
	"execution_method" text,
	"execution_headers" jsonb,
	"execution_params" jsonb NOT NULL,
	"execution_result" jsonb NOT NULL,
	"execution_timestamp" timestamp NOT NULL,
	"ai_evaluation" text NOT NULL,
	"inconsistencies" jsonb,
	"web_proof_presentation" text,
	"notary_url" text,
	"proof_metadata" jsonb,
	"replay_execution_result" jsonb,
	"replay_execution_timestamp" timestamp,
	"status" text DEFAULT 'verified' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"verification_type" text DEFAULT 'execution' NOT NULL,
	CONSTRAINT "confidence_score_range_check" CHECK ("confidence_score" >= 0 AND "confidence_score" <= 1)
);
--> statement-breakpoint
CREATE TABLE "server_ownership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"granted_by" uuid,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tool_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid,
	"request_data" jsonb,
	"response_status" text,
	"execution_time_ms" integer,
	"ip_address" text,
	"user_agent" text,
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" text NOT NULL,
	"wallet_type" text NOT NULL,
	"provider" text,
	"blockchain" text,
	"architecture" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"wallet_metadata" jsonb,
	"external_wallet_id" text,
	"external_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text,
	"name" text,
	"email" text,
	"email_verified" boolean DEFAULT false,
	"image" text,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"server_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_triggered_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_tools" ADD CONSTRAINT "mcp_tools_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tool_id_mcp_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."mcp_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_tool_id_mcp_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."mcp_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_ownership" ADD CONSTRAINT "server_ownership_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_ownership" ADD CONSTRAINT "server_ownership_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_ownership" ADD CONSTRAINT "server_ownership_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_usage" ADD CONSTRAINT "tool_usage_tool_id_mcp_tools_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."mcp_tools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_usage" ADD CONSTRAINT "tool_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_wallets" ADD CONSTRAINT "user_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "api_key_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_active_idx" ON "api_keys" USING btree ("active");--> statement-breakpoint
CREATE INDEX "api_key_expires_at_idx" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "mcp_server_status_idx" ON "mcp_servers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_server_creator_idx" ON "mcp_servers" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "mcp_server_created_at_idx" ON "mcp_servers" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "mcp_server_origin_idx" ON "mcp_servers" USING btree ("mcp_origin");--> statement-breakpoint
CREATE INDEX "mcp_server_status_created_idx" ON "mcp_servers" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "mcp_tool_server_id_idx" ON "mcp_tools" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "mcp_tool_name_idx" ON "mcp_tools" USING btree ("name");--> statement-breakpoint
CREATE INDEX "mcp_tool_status_idx" ON "mcp_tools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mcp_tool_server_name_idx" ON "mcp_tools" USING btree ("server_id","name");--> statement-breakpoint
CREATE INDEX "mcp_tool_monetized_idx" ON "mcp_tools" USING btree ("is_monetized");--> statement-breakpoint
CREATE INDEX "payment_tool_id_idx" ON "payments" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "payment_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_network_idx" ON "payments" USING btree ("network");--> statement-breakpoint
CREATE INDEX "payment_tool_user_idx" ON "payments" USING btree ("tool_id","user_id");--> statement-breakpoint
CREATE INDEX "proof_tool_id_idx" ON "proofs" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "proof_server_id_idx" ON "proofs" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "proof_user_id_idx" ON "proofs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "proof_status_idx" ON "proofs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proof_created_at_idx" ON "proofs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "proof_is_consistent_idx" ON "proofs" USING btree ("is_consistent");--> statement-breakpoint
CREATE INDEX "proof_confidence_score_idx" ON "proofs" USING btree ("confidence_score");--> statement-breakpoint
CREATE INDEX "proof_verification_type_idx" ON "proofs" USING btree ("verification_type");--> statement-breakpoint
CREATE INDEX "proof_tool_created_idx" ON "proofs" USING btree ("tool_id","created_at");--> statement-breakpoint
CREATE INDEX "proof_server_consistent_idx" ON "proofs" USING btree ("server_id","is_consistent");--> statement-breakpoint
CREATE UNIQUE INDEX "server_ownership_server_user_idx" ON "server_ownership" USING btree ("server_id","user_id");--> statement-breakpoint
CREATE INDEX "server_ownership_server_id_idx" ON "server_ownership" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "server_ownership_user_id_idx" ON "server_ownership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "server_ownership_active_idx" ON "server_ownership" USING btree ("active");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "tool_usage_tool_id_idx" ON "tool_usage" USING btree ("tool_id");--> statement-breakpoint
CREATE INDEX "tool_usage_user_id_idx" ON "tool_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tool_usage_timestamp_idx" ON "tool_usage" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "tool_usage_status_idx" ON "tool_usage" USING btree ("response_status");--> statement-breakpoint
CREATE INDEX "tool_usage_tool_timestamp_idx" ON "tool_usage" USING btree ("tool_id","timestamp");--> statement-breakpoint
CREATE INDEX "user_wallets_user_id_idx" ON "user_wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_wallets_wallet_address_idx" ON "user_wallets" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "user_wallets_type_idx" ON "user_wallets" USING btree ("wallet_type");--> statement-breakpoint
CREATE INDEX "user_wallets_blockchain_idx" ON "user_wallets" USING btree ("blockchain");--> statement-breakpoint
CREATE INDEX "user_wallets_architecture_idx" ON "user_wallets" USING btree ("architecture");--> statement-breakpoint
CREATE INDEX "user_wallets_primary_idx" ON "user_wallets" USING btree ("is_primary");--> statement-breakpoint
CREATE INDEX "user_wallets_active_idx" ON "user_wallets" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "user_wallets_provider_idx" ON "user_wallets" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "user_wallets_external_id_idx" ON "user_wallets" USING btree ("external_wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_wallets_primary_unique" ON "user_wallets" USING btree ("user_id") WHERE is_primary = true;--> statement-breakpoint
CREATE UNIQUE INDEX "user_wallets_unique_combination" ON "user_wallets" USING btree ("user_id","wallet_address","provider","wallet_type");--> statement-breakpoint
CREATE INDEX "user_wallet_address_idx" ON "users" USING btree ("wallet_address");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_last_login_idx" ON "users" USING btree ("last_login_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expires_at_idx" ON "verification" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webhook_server_id_idx" ON "webhooks" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "webhook_active_idx" ON "webhooks" USING btree ("active");--> statement-breakpoint
CREATE INDEX "webhook_failure_count_idx" ON "webhooks" USING btree ("failure_count");--> statement-breakpoint
CREATE VIEW "public"."daily_activity" AS (select activity_date as "date", COUNT(DISTINCT tool_usage.id) as "total_requests", COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as "unique_users", COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as "total_payments", AVG(tool_usage.execution_time_ms) as "avg_response_time", 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE DATE(p2.created_at) = dates.activity_date
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END
       as "revenue_details" from (
      SELECT DISTINCT DATE(timestamp) as activity_date FROM tool_usage
      UNION
      SELECT DISTINCT DATE(created_at) as activity_date FROM payments
    ) dates left join "tool_usage" on DATE(tool_usage.timestamp) = dates.activity_date left join "payments" on DATE(payments.created_at) = dates.activity_date group by activity_date order by activity_date DESC);--> statement-breakpoint
CREATE VIEW "public"."daily_server_analytics" AS (select mcp_servers.id as "server_id", server_dates.activity_date as "date", COUNT(DISTINCT tool_usage.id) as "total_requests", COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as "unique_users", COUNT(DISTINCT CASE WHEN tool_usage.response_status NOT IN ('success', '200') THEN tool_usage.id END) as "error_count", AVG(tool_usage.execution_time_ms) as "avg_response_time", 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  JOIN mcp_tools t2 ON t2.id = p2.tool_id
                  WHERE t2.server_id = mcp_servers.id
                    AND DATE(p2.created_at) = server_dates.activity_date
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END
       as "revenue_details", COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as "total_payments" from (
      SELECT DISTINCT 
        mcp_servers.id as server_id,
        dates.activity_date
      FROM mcp_servers
      CROSS JOIN (
        SELECT DISTINCT DATE(timestamp) as activity_date FROM tool_usage
        UNION
        SELECT DISTINCT DATE(created_at) as activity_date FROM payments
      ) dates
    ) server_dates left join "mcp_servers" on mcp_servers.id = server_dates.server_id left join "mcp_tools" on mcp_tools.server_id = mcp_servers.id left join "tool_usage" on tool_usage.tool_id = mcp_tools.id AND DATE(tool_usage.timestamp) = server_dates.activity_date left join "payments" on payments.tool_id = mcp_tools.id AND DATE(payments.created_at) = server_dates.activity_date group by mcp_servers.id, server_dates.activity_date);--> statement-breakpoint
CREATE VIEW "public"."global_analytics" AS (select COUNT(DISTINCT mcp_servers.id) as "total_servers", COUNT(DISTINCT CASE WHEN mcp_servers.status = 'active' THEN mcp_servers.id END) as "active_servers", COUNT(DISTINCT mcp_tools.id) as "total_tools", COUNT(DISTINCT CASE WHEN mcp_tools.is_monetized THEN mcp_tools.id END) as "monetized_tools", COUNT(DISTINCT tool_usage.id) as "total_requests", COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END) as "successful_requests", COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as "unique_users", COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as "total_payments", AVG(tool_usage.execution_time_ms) as "avg_response_time", 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END
       as "revenue_details", COUNT(DISTINCT proofs.id) as "total_proofs", COUNT(DISTINCT CASE WHEN proofs.is_consistent THEN proofs.id END) as "consistent_proofs" from "mcp_servers" left join "mcp_tools" on mcp_tools.server_id = mcp_servers.id left join "tool_usage" on tool_usage.tool_id = mcp_tools.id left join "payments" on payments.tool_id = mcp_tools.id left join "proofs" on proofs.server_id = mcp_servers.id);--> statement-breakpoint
CREATE VIEW "public"."server_summary_analytics" AS (select mcp_servers.id as "server_id", mcp_servers.name as "server_name", COUNT(DISTINCT tool_usage.id) as "total_requests", COUNT(DISTINCT mcp_tools.id) as "total_tools", COUNT(DISTINCT CASE WHEN mcp_tools.is_monetized THEN mcp_tools.id END) as "monetized_tools", COUNT(DISTINCT COALESCE(tool_usage.user_id, payments.user_id)) as "unique_users", COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as "total_payments", COUNT(DISTINCT CASE WHEN tool_usage.response_status NOT IN ('success', '200') THEN tool_usage.id END) as "error_count", AVG(tool_usage.execution_time_ms) as "avg_response_time", 
        CASE 
          WHEN COUNT(DISTINCT tool_usage.id) > 0 THEN
            (COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END)::float / COUNT(DISTINCT tool_usage.id)) * 100
          ELSE 0
        END
       as "success_rate", 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  JOIN mcp_tools t2 ON t2.id = p2.tool_id
                  WHERE t2.server_id = mcp_servers.id
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END
       as "revenue_details", 
        COUNT(DISTINCT CASE 
          WHEN tool_usage.timestamp > NOW() - INTERVAL '30 days' 
          THEN tool_usage.id 
        END)
       as "recent_requests", 
        COUNT(DISTINCT CASE 
          WHEN payments.created_at > NOW() - INTERVAL '30 days' AND payments.status = 'completed' 
          THEN payments.id 
        END)
       as "recent_payments", 
        GREATEST(
          MAX(tool_usage.timestamp),
          MAX(payments.created_at)
        )
       as "last_activity" from "mcp_servers" left join "mcp_tools" on mcp_tools.server_id = mcp_servers.id left join "tool_usage" on tool_usage.tool_id = mcp_tools.id left join "payments" on payments.tool_id = mcp_tools.id group by mcp_servers.id, mcp_servers.name);--> statement-breakpoint
CREATE VIEW "public"."tool_analytics" AS (select mcp_tools.id as "tool_id", mcp_tools.name as "tool_name", mcp_tools.server_id as "server_id", mcp_tools.is_monetized as "is_monetized", COUNT(DISTINCT tool_usage.id) as "total_requests", COUNT(DISTINCT CASE WHEN tool_usage.response_status IN ('success', '200') THEN tool_usage.id END) as "successful_requests", COUNT(DISTINCT tool_usage.user_id) as "unique_users", AVG(tool_usage.execution_time_ms) as "avg_response_time", COUNT(DISTINCT CASE WHEN payments.status = 'completed' THEN payments.id END) as "total_payments", 
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN payments.status = 'completed' AND payments.amount_raw IS NOT NULL THEN payments.id END) > 0 THEN
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'currency', payments.currency,
                'network', payments.network,
                'decimals', payments.token_decimals,
                'amount_raw', (
                  SELECT SUM(p2.amount_raw::numeric)::text
                  FROM payments p2
                  WHERE p2.tool_id = mcp_tools.id
                    AND p2.status = 'completed'
                    AND p2.currency = payments.currency
                    AND p2.network = payments.network
                    AND p2.token_decimals = payments.token_decimals
                )
              )
            ) FILTER (WHERE payments.status = 'completed' AND payments.amount_raw IS NOT NULL)
          ELSE NULL
        END
       as "revenue_details", MAX(tool_usage.timestamp) as "last_used", 
        COUNT(DISTINCT CASE 
          WHEN tool_usage.timestamp > NOW() - INTERVAL '30 days' 
          THEN tool_usage.id 
        END)
       as "recent_requests" from "mcp_tools" left join "tool_usage" on tool_usage.tool_id = mcp_tools.id left join "payments" on payments.tool_id = mcp_tools.id group by mcp_tools.id, mcp_tools.name, mcp_tools.server_id, mcp_tools.is_monetized);


================================================
FILE: app/drizzle/0001_pink_morlocks.sql
================================================
DROP VIEW "public"."daily_activity";--> statement-breakpoint
DROP VIEW "public"."daily_server_analytics";--> statement-breakpoint
DROP VIEW "public"."global_analytics";--> statement-breakpoint
DROP VIEW "public"."server_summary_analytics";--> statement-breakpoint
DROP VIEW "public"."tool_analytics";


================================================
FILE: app/drizzle/meta/_journal.json
================================================
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1753565018655,
      "tag": "0000_minor_magdalene",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "7",
      "when": 1755455095230,
      "tag": "0001_pink_morlocks",
      "breakpoints": true
    }
  ]
}


================================================
FILE: app/public/site.webmanifest
================================================
{"name":"","short_name":"","icons":[{"src":"/android-chrome-192x192.png","sizes":"192x192","type":"image/png"},{"src":"/android-chrome-512x512.png","sizes":"512x512","type":"image/png"}],"theme_color":"#ffffff","background_color":"#ffffff","display":"standalone"}


================================================
FILE: app/scripts/add-managed-and-fund.ts
================================================
#!/usr/bin/env tsx
import 'dotenv/config';
import { parseArgs } from 'node:util';
import { withTransaction, txOperations } from '@/lib/gateway/db/actions';
import { isTest } from '@/lib/gateway/env';

async function main() {
  const {
    values: { userId, network = 'base-sepolia', createSmartAccount = 'false', fundSei = 'false' },
  } = parseArgs({
    options: {
      userId: { type: 'string', short: 'u' },
      network: { type: 'string', short: 'n' },
      createSmartAccount: { type: 'string' },
      fundSei: { type: 'string' },
    },
  });

  if (!userId) {
    console.error('Usage: tsx scripts/add-managed-and-fund.ts --userId <USER_ID> [--network base-sepolia] [--createSmartAccount true|false] [--fundSei true|false]');
    process.exit(1);
  }

  console.log(`[SCRIPT] Ensuring CDP managed wallets for user ${userId} on ${network} (smart=${createSmartAccount})`);

  const result = await withTransaction(async (tx) => {
    return await txOperations.autoCreateCDPWalletForUser(
      userId,
      {
        // Minimal user info; can be extended if needed
        displayName: userId.slice(0, 8),
      },
      {
        createSmartAccount: String(createSmartAccount).toLowerCase() === 'true',
        network: network as any,
      },
    )(tx);
  });

  if (result) {
    console.log('[SCRIPT] CDP wallets created or ensured:', {
      accountName: result.accountName,
      wallets: result.wallets.map((w) => ({ id: w.id, address: w.walletAddress, primary: w.isPrimary })),
    });
  } else {
    console.log('[SCRIPT] User already had CDP wallets, no creation performed.');
  }

  // Optional: experimental SEI funding similar to auth.ts hook
  if (String(fundSei).toLowerCase() === 'true') {
    if (isTest()) {
      console.log('[SEI FAUCET] Skipping in test environment');
      return;
    }

    if (!process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY) {
      console.log('[SEI FAUCET] Missing EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY; skipping funding');
      return;
    }

    try {
      // Defer importing viem deps to runtime to avoid type resolution issues in CLI context
      // @ts-ignore - runtime require for CLI script
      const { createPublicClient, createWalletClient, http, parseUnits } = await import('viem');
      // @ts-ignore - runtime require for CLI script
      const { privateKeyToAccount } = await import('viem/accounts');
      // @ts-ignore - runtime require for CLI script
      const { seiTestnet } = await import('viem/chains');

      const faucetAccount = privateKeyToAccount(process.env.EXPERIMENTAL_SEI_FAUCET_PRIVATE_KEY as `0x${string}`);
      const publicClient = createPublicClient({ chain: seiTestnet, transport: http() });
      const walletClient = createWalletClient({ chain: seiTestnet, transport: http(), account: faucetAccount });

      // Find a primary or first active wallet for the user
      const wallets = await withTransaction(async (tx) => {
        return await txOperations.getCDPWalletsByUser(userId)(tx);
      });

      const primary = wallets.find((w: any) => w.isPrimary && w.isActive) || wallets.find((w: any) => w.isActive);
      if (!primary) {
        console.log('[SEI FAUCET] No active wallet found for user');
        return;
      }

      const userAddress = primary.walletAddress as `0x${string}`;
      console.log(`[SEI FAUCET] Checking USDC balance for ${userAddress}`);

      const USDC_ADDRESS = '0x4fCF1784B31630811181f670Aea7A7bEF803eaED' as const;
      const USDC_DECIMALS = 6;
      const FUNDING_AMOUNT = '0.5';

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

      if (userUSDCBalance === BigInt(0)) {
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
          console.error('[SEI FAUCET] Insufficient faucet USDC balance');
          return;
        }

        const txHash = await walletClient.writeContract({
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

        console.log('[SEI FAUCET] Transfer sent:', txHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log('[SEI FAUCET] Receipt:', receipt.status);
      } else {
        console.log('[SEI FAUCET] User already has USDC; skipping funding');
      }
    } catch (err) {
      console.error('[SEI FAUCET] Error funding user:', err);
    }
  }
}

main().catch((err) => {
  console.error('[SCRIPT] Error:', err);
  process.exit(1);
});





================================================
FILE: app/scripts/drizzle-migrate.cjs
================================================
#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { spawn } = require('node:child_process');

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', env });
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} -> ${code}`))));
  });
}

(async () => {
  const env = { ...process.env };
  if (!env.DATABASE_URL) {
    console.log("DRIZZLE MIGRATE", env);
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  await run('node', ['./node_modules/.bin/drizzle-kit', 'migrate'], env);
})();





================================================
FILE: app/scripts/gen-accounts.ts
================================================
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const privateKey = generatePrivateKey();
const { address } = privateKeyToAccount(privateKey);

// Output only the address and private key, each on its own line
// eslint-disable-next-line no-console
console.log(address);
// eslint-disable-next-line no-console
console.log(privateKey);





================================================
FILE: app/src/app/globals.css
================================================
@import 'highlight.js/styles/github.css' screen and (prefers-color-scheme: light);
@import 'highlight.js/styles/github-dark.css' screen and (prefers-color-scheme: dark);

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(0.96 0 0 / 0.3);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.55 0.04 257);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.93 0.01 256);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(0.28 0.04 260);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background-color: theme('colors.gray.200');
  }
  ::-webkit-scrollbar-thumb {
    background-color: theme('colors.gray.400');
    border-radius: 4px;
  }
  /* Dark‑mode overrides */
  .dark ::-webkit-scrollbar-track {
    background-color: theme('colors.gray.800');
  }
  .dark ::-webkit-scrollbar-thumb {
    background-color: theme('colors.gray.600');
  }

  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: theme('colors.gray.400') theme('colors.gray.200');
  }
  .dark * {
    scrollbar-color: theme('colors.gray.600') theme('colors.gray.800');
  }

  .font-host {
    font-family: var(--font-host-grotesk);
  }
  .font-mono {
    font-family: var(--font-geist-mono);
  }

  /* Hide scrollbar utility */
  .scrollbar-hide {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;  /* Chrome, Safari, and Opera */
  }

  /* Text selection colors */
  ::selection {
    background-color: rgb(20 184 166 / 0.1); /* teal-500 with 25% opacity for light mode */
    color: rgb(13 148 136); /* teal-600 for better contrast */
  }
  
  .dark ::selection {
    background-color: rgb(20 184 166 / 0.1); /* teal-500 with 10% opacity for dark mode */
    color: rgb(153 246 228); /* teal-200 for better contrast */
  }

}


================================================
FILE: app/src/app/layout.tsx
================================================
import type { Metadata, Viewport } from "next";
import { Inter, Host_Grotesk, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-context";
import { UserProvider } from "@/components/providers/user";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/custom-ui/navbar";
import { wagmiConfig } from "@/lib/client/config";
import { WagmiProvider } from "wagmi";
import { AppReactQueryProvider } from "@/components/providers/query-client";
import { Analytics } from "@vercel/analytics/next"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "MCPay — Payments for MCPs",
  description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "MCPay — Payments for MCPs",
    description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
    type: "website",
    url: "https://mcpay.tech",
    siteName: "MCPay",
    images: [
      {
        url: '/mcpay-agentic-payments-og-image.png',
        width: 1200,
        height: 630,
        alt: 'MCPay — Payments for MCPs',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "MCPay — Payments for MCPs",
    description: "Add micropayments per tool call to your MCP servers or APIs without rewriting infrastructure. Prepare your stack for agent-to-agent payments.",
    images: ['/mcpay-agentic-payments-og-image.png'],
    creator: '@mcpaytech',
    site: '@mcpaytech',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${hostGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <WagmiProvider config={wagmiConfig}>
            <AppReactQueryProvider>
              <UserProvider>
                <Navbar />
                {children}
                <Toaster />
              </UserProvider>
            </AppReactQueryProvider>
          </WagmiProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}



================================================
FILE: app/src/app/page.tsx
================================================
"use client"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/providers/theme-context"
import { urlUtils } from "@/lib/client/utils"
import { ArrowRight, Rocket, TrendingUp } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import Hero from "@/components/custom-ui/hero"
import ServersGrid from "@/components/custom-ui/servers-grid"
import ContentCards from "@/components/custom-ui/content-cards"
import Footer from "@/components/custom-ui/footer"
import MinimalExplorer from "@/components/custom-ui/minimal-explorer"
import BuiltWithSection from "@/components/custom-ui/built-with-section"
import FAQSection from "@/components/custom-ui/faq-section"
import ContentCardsSmall from "@/components/custom-ui/content-cards-small"
import TypingAnimation from "@/components/custom-ui/typing-animation"
import { useWindowScroll } from "@/hooks/use-chat-scroll"

interface APITool {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isMonetized: boolean;
  payment: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: string
    properties: Record<string, MCPInputPropertySchema>
  }
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

interface MCPInputPropertySchema {
  type: string;
  description?: string;
  [key: string]: unknown;
}

export interface MCPServer {
  id: string
  name: string
  description: string
  url: string
  category: string
  tools: MCPTool[]
  icon: React.ReactNode
  verified?: boolean
}

interface APIServer {
  id: string;
  serverId: string;
  name: string;
  receiverAddress: string;
  description: string;
  metadata?: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  tools: APITool[];
}

const transformServerData = (apiServer: APIServer): MCPServer => ({
  id: apiServer.serverId,
  name: apiServer.name || 'Unknown Server',
  description: apiServer.description || 'No description available',
  url: apiServer.receiverAddress,
  category: (apiServer.metadata as Record<string, unknown>)?.category as string || 'General',
  icon: <TrendingUp className="h-6 w-6" />,
  verified: apiServer.status === 'active',
  tools: apiServer.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: (tool.inputSchema as Record<string, unknown>)?.type as string || "object",
      properties: (tool.inputSchema as Record<string, unknown>)?.properties as Record<string, MCPInputPropertySchema> || {}
    },
    annotations: {
      title: tool.name,
      readOnlyHint: !tool.isMonetized,
      destructiveHint: false,
    },
  })),
});

export default function MCPBrowser() {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { isDark } = useTheme()
  const { isAtBottom: hasReachedBottom } = useWindowScroll(200)

  const getFriendlyErrorMessage = (error: string) => {
    if (error.includes('404')) {
      return {
        title: "Welcome to MCPay!",
        message: "We're setting up the server directory. Be the first to register your MCP server and start earning!",
        actionText: "Register your server",
        actionHref: "/register",
        showRetry: false
      }
    }
    if (error.includes('500') || error.includes('502') || error.includes('503')) {
      return {
        title: "Server maintenance",
        message: "We're performing some quick maintenance. Please try again in a few moments.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true
      }
    }
    if (error.includes('Network') || error.includes('fetch')) {
      return {
        title: "Connection issue",
        message: "Please check your internet connection and try again.",
        actionText: "Try again",
        actionHref: null,
        showRetry: true
      }
    }
    return {
      title: "Something went wrong",
      message: "We're working to fix this issue. In the meantime, you can register your MCP server.",
      actionText: "Register your server",
      actionHref: "/register",
      showRetry: true
    }
  }

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true)
        setError(null)

        const serversResponse = await fetch(urlUtils.getApiUrl('/servers?limit=6&type=trending'))
        if (!serversResponse.ok) {
          throw new Error(`Failed to fetch servers: ${serversResponse.status}`)
        }

        const servers: APIServer[] = await serversResponse.json()
        setMcpServers(servers.map(transformServerData))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch servers')
      } finally {
        setLoading(false)
      }
    }
    fetchServers()
  }, [])

  if (error) {
    const errorInfo = getFriendlyErrorMessage(error)
    return (
      <div className="min-h-screen bg-background">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-16 relative">
            <div className="mb-[100px]"></div>
            <h1 className={`text-5xl font-extrabold tracking-tight mb-6 animate-fade-in-up ${isDark ? "text-white" : "text-gray-900"}`}>
              {errorInfo.title}
            </h1>
            <p className={`text-lg max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-300 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
              {errorInfo.message}
            </p>
            <div className="flex items-center justify-center gap-6 mt-8 animate-fade-in-up animation-delay-500">
              {errorInfo.actionHref && (
                <Link href={errorInfo.actionHref}>
                  <Button size="lg" className="bg-[#0052FF] hover:bg-[#0052FF]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    <Rocket className="h-5 w-5 mr-2" />
                    {errorInfo.actionText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
              {errorInfo.showRetry && (
                <Button
                  onClick={() => window.location.reload()}
                  size="lg"
                  variant="outline"
                  className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  {errorInfo.actionHref ? "Try Again" : errorInfo.actionText}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">

        <section className="mb-16 md:mb-40">
          <Hero />
        </section>

        <section className="mb-40">
          <MinimalExplorer />
        </section>

        <section className="mb-40">
          <ContentCardsSmall />
        </section>

        <section className="mb-40">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-semibold font-host mb-10">Featured Servers</h2>
          </div>
          <ServersGrid servers={mcpServers} loading={loading} />
          <div className="text-center mt-10">
            <div className="inline-flex gap-4">
              <Link href="/servers">
                <Button variant="ghostCustom" className="min-w-[10rem]">Browse Servers</Button>
              </Link>
              <Link href="/explorer">
                <Button variant="ghostCustomSecondary" className="min-w-[10rem]">Explorer</Button>
              </Link>
            </div>
          </div>
        </section>


        <section className="mb-40">
          <div className="max-w-6xl px-4 md:px-6 mx-auto">
            <h2 className="text-3xl font-semibold font-host mb-10">How it works</h2>
          </div>
          <ContentCards />
        </section>

        <section className="mb-40">
          <BuiltWithSection />
        </section>

        <section className="mb-40">
          <FAQSection />
        </section>

        <section className="mb-2">
          <div className="max-w-6xl px-4 md:px-6 mx-auto text-center">
            <TypingAnimation 
              text="Join the future of agentic payments."
              trigger={hasReachedBottom}
              speed={20}
            />
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}



================================================
FILE: app/src/app/(server)/api/auth/[...all]/route.ts
================================================
import { auth } from "@/lib/gateway/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler); 


================================================
FILE: app/src/app/(server)/api/chat/route.ts
================================================
import { getMcpPrompts } from '@/lib/gateway/inspect-mcp';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  convertToModelMessages,
  experimental_createMCPClient as createMCPClient,
  streamText,
  UIMessage,
  ToolSet,
  generateObject,
  createUIMessageStream,
  createUIMessageStreamResponse
} from 'ai';
import { NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';
import { createHash } from 'crypto';
import { getKVConfig } from '@/lib/gateway/env';
import { z } from 'zod';
import type { MCPClient } from '@/types/mcp';
import { DEPLOYMENT_URL } from "vercel-url";


// Type definitions for MCP data
interface McpPrompt {
  name: string;
  description?: string;
  content: string;
  messages: unknown[];
}

interface McpPromptsResponse {
  prompts: McpPrompt[];
}

interface CachedMcpData {
  prompts: McpPromptsResponse;
  tools: ToolSet;
}

export const maxDuration = 800;

const CACHE_TTL = 300; // 5 minutes in seconds

// Initialize KV client with configuration from env.ts
const kvConfig = getKVConfig();
const kv = createClient({
  url: kvConfig.restApiUrl,
  token: kvConfig.restApiToken,
});

function getCacheKey(mcpUrl: string): string {
  // Create a stable cache key from the URL
  const hash = createHash('md5').update(mcpUrl).digest('hex');
  return `mcp_data:${hash}`;
}

// Create MCP client efficiently for serverless environment
// Includes Better Auth session cookies by forwarding the incoming request cookies
async function createOptimizedMcpClient(
  mcpUrl: string,
  requestHeaders?: Headers
): Promise<{ client: MCPClient; tools: ToolSet }> {
  console.log('Chat API: Creating optimized MCP client for serverless');

  try {
    const cookieHeader = requestHeaders?.get('cookie');
    const outboundHeaders: Record<string, string> = {};
    if (cookieHeader) {
      outboundHeaders['cookie'] = cookieHeader;
    }

    // Use Streamable HTTP transport which is more efficient for serverless
    const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
      requestInit: {
        headers: outboundHeaders,
        credentials: 'include',
      },
    });
    const client = await createMCPClient({ transport });
    const tools = await client.tools();

    return { client, tools };
  } catch (error) {
    console.error('Chat API: Failed to create MCP client:', error);
    throw error;
  }
}

async function getCachedMcpData(mcpUrl: string, requestHeaders?: Headers): Promise<CachedMcpData> {
  const promptsCacheKey = `${getCacheKey(mcpUrl)}_prompts`;

  try {
    // Check for cached prompts first
    const cachedPrompts = await kv.get(promptsCacheKey);

    if (cachedPrompts) {
      console.log('Chat API: Using cached prompts, creating fresh MCP client');

      // Always create fresh client for tools (tools are hard to serialize reliably)
      const { tools } = await createOptimizedMcpClient(mcpUrl, requestHeaders);

      return {
        prompts: cachedPrompts as McpPromptsResponse,
        tools
      };
    }

    console.log('Chat API: Fetching fresh MCP data');

    // Fetch fresh data in parallel
    const [prompts, mcpClientResult] = await Promise.all([
      getMcpPrompts(mcpUrl),
      createOptimizedMcpClient(mcpUrl, requestHeaders)
    ]);

    const { tools } = mcpClientResult;

    // Cache prompts only (tools are recreated each time for reliability)
    await kv.set(promptsCacheKey, prompts, { ex: CACHE_TTL });

    console.log(`Chat API: Cached prompts for ${CACHE_TTL} seconds`);

    return { prompts, tools };
  } catch (error) {
    console.error('Chat API: Cache error, falling back to fresh data:', error);

    // Fallback to fresh data if cache fails
    const [prompts, mcpClientResult] = await Promise.all([
      getMcpPrompts(mcpUrl),
      createOptimizedMcpClient(mcpUrl, requestHeaders)
    ]);

    const { tools } = mcpClientResult;

    return { prompts, tools };
  }
}

export async function POST(req: Request) {
  console.log('Chat API: POST request received');
  try {
    const { messages, sessionId }: { messages: UIMessage[], sessionId?: string } = await req.json();
    console.log('Chat API: Messages received:', messages);

    console.log('Chat API: Session ID:', sessionId);

    // TODO: remove the hardcoded API key
    const mcpUrl = `${DEPLOYMENT_URL}/mcp/23e2ab26-7808-4984-855c-ec6a7dc97c3a`;

    const { prompts, tools } = await getCachedMcpData(mcpUrl, req.headers);

    // find system prompt  
    const systemPrompt = prompts.prompts.find((prompt: McpPrompt) => prompt.name === "system");

    const modelMessages = convertToModelMessages(messages);

    const stream = createUIMessageStream({
      execute: ({ writer }) => {

        let _sessionId = "";
        let previewRanDuringStream = false;
        const result = streamText({
          system: systemPrompt?.content || "You are a helpful assistant.",
          model: "anthropic/claude-sonnet-4",
          messages: modelMessages,
          tools,
          onStepFinish: async ({ toolResults, toolCalls, usage, finishReason }) => {
            if (Array.isArray(toolCalls)) {
              const previewCalledThisStep = toolCalls.some((call: { toolName?: string }) => call?.toolName === 'preview');
              if (previewCalledThisStep) {
                previewRanDuringStream = true;
              }
            }
            toolResults.forEach(async (toolResult) => {
              if (toolResult.toolName === 'create_session') {
                const result = await generateObject({
                  model: "openai/gpt-4o-mini",
                  schema: z.object({
                    sessionId: z.string().min(1).describe("The session ID of the chat"),
                  }),
                  prompt: `Extract the session ID from this tool result. Return only the session ID value as a string: ${JSON.stringify(toolResult.output)}`,
                });

                // Stream the session ID back to the client
                writer.write({
                  type: 'data-session',
                  data: { sessionId: result.object.sessionId },
                });

                writer.write({
                  type: 'data-payment',
                  data: { paid: true },
                });

                _sessionId = result.object.sessionId;
              }
              if (toolResult.toolName === 'preview') {
                previewRanDuringStream = true;
                const result = await generateObject({
                  model: "openai/gpt-4o-mini",
                  schema: z.object({
                    url: z.string().min(1).describe("The URL of the preview")
                  }),
                  prompt: `Extract the preview URL from the tool result: ${JSON.stringify(toolResult.output, null, 2)}`,
                });

                writer.write({
                  type: 'data-preview',
                  data: { url: result.object.url },
                });

                writer.write({
                  type: 'data-payment',
                  data: { paid: true },
                });
              }
            });
          },
          stopWhen: ({ steps }) => {
            return steps.length > 20;
          },
          onFinish: async ({ toolResults, toolCalls, usage, finishReason }) => {
            console.log('Chat API: Finish reason:', finishReason);
            console.log('Chat API: Session ID:', _sessionId, sessionId);
            const currentSessionId = _sessionId || sessionId;
            const parallelTasks: Promise<void>[] = [];

            if (currentSessionId) {
              const previewTool = tools?.["preview"];
              if (!previewRanDuringStream && previewTool && typeof previewTool.execute === 'function') {
                parallelTasks.push((async () => {
                  try {
                    console.log('Chat API: Executing preview tool with session ID:', currentSessionId);
                    const previewResult = await previewTool.execute?.({
                      sessionId: currentSessionId,
                    }, { toolCallId: "", messages: [] });

                    if (!previewResult) {
                      console.log('Chat API: Preview tool returned no result');
                      return;
                    }

                    console.log('Chat API: Preview tool result:', previewResult);

                    if (previewResult.content && previewResult.content[0] && previewResult.content[0].text) {
                      console.log('Chat API: Extracting URL from preview content:', previewResult.content[0].text);
                      const result = await generateObject({
                        model: "openai/gpt-4o-mini",
                        schema: z.object({
                          url: z.string().min(1).describe("The URL of the preview")
                        }),
                        prompt: `Extract the preview URL from the tool result: ${JSON.stringify(previewResult.content[0].text, null, 2)}`,
                      });

                      console.log('Chat API: Extracted preview URL:', result.object.url);
                      writer.write({
                        type: 'data-preview',
                        data: { url: result.object.url },
                      });

                      writer.write({
                        type: 'data-payment',
                        data: { paid: true },
                      });
                    } else {
                      console.log('Chat API: No valid preview content found in tool result');
                    }
                  } catch (error) {
                    console.error('Error parsing preview result:', error);
                  }
                })());
              } else if (previewRanDuringStream) {
                console.log('Chat API: Skipping preview execution in onFinish because it already ran during stream');
              } else {
                console.log('Chat API: Preview tool not available');
              }

              const codebaseTool = tools?.["get_all_codebase"];
              if (codebaseTool && typeof codebaseTool.execute === 'function') {
                parallelTasks.push((async () => {
                  try {
                    const codebaseResult = await codebaseTool.execute?.({
                      sessionId: currentSessionId,
                    }, { toolCallId: "", messages: [] });

                    if (!codebaseResult) {
                      console.log('Chat API: Codebase tool returned no result');
                      return;
                    }

                    if (codebaseResult.content && codebaseResult.content[0] && codebaseResult.content[0].text) {
                      const codebase = codebaseResult.content[0].text;
                      writer.write({
                        type: 'data-codebase',
                        data: { codebase },
                      });
                    }
                  } catch (error) {
                    console.error('Error parsing codebase result:', error);
                  }
                })());
              }

              if (parallelTasks.length > 0) {
                await Promise.allSettled(parallelTasks);
              }
            } else {
              console.log('Chat API: No session ID for executing tools');
            }
          },
        });

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}


================================================
FILE: app/src/app/(server)/api/deploy/actions.ts
================================================
import db from '@/lib/gateway/db';
import * as schema from '@/lib/gateway/db/schema';
import { and, eq } from 'drizzle-orm';

type CodebaseFileEntry = {
  content: string;
  lastModified?: number;
  size?: number;
  lastModifiedISO?: string;
};

export type CodebasePayload = {
  files: Record<string, CodebaseFileEntry>;
};

export type DeployRequestInput = {
  codebase: string; // JSON string of CodebasePayload
  repoName?: string;
  organization?: string; // optional GitHub org slug if creating under org
  isPrivate?: boolean;
  env?: string[]; // optional env keys to include in vercel button URL
  envDescription?: string; // optional description for env vars in deploy button
  envLink?: string; // optional docs link for env vars in deploy button
  projectName?: string; // override project name in Vercel
  redirectPath?: string; // optional path on our app for redirect after deploy
  repositoryUrl?: string; // optionally deploy an existing repo directly
  framework?: string; // optional framework hint for Vercel import flow (e.g. 'hono')
  teamSlug?: string; // optional team slug for Vercel import flow
};

export type DeployResult = {
  owner: string;
  repo: string;
  repositoryUrl: string;
  vercelDeployUrl: string;
};

const GITHUB_API = 'https://api.github.com';

function toBase64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

async function fetchGitHubRaw(url: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'mcpay.tech',
      ...(init?.headers || {})
    },
  });
}

async function fetchGitHub<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'mcpay.tech',
      ...(init?.headers || {})
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getUserGitHubAccessToken(userId: string): Promise<string | null> {
  const rows = await db
    .select({ accessToken: schema.account.accessToken })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'github')))
    .limit(1);
  const token = rows?.[0]?.accessToken;
  return token || null;
}

async function getGitHubOwnerLogin(token: string): Promise<string> {
  const me = await fetchGitHub<{ login: string }>(`${GITHUB_API}/user`, token);
  return me.login;
}

async function getTokenScopes(token: string): Promise<Set<string>> {
  const res = await fetchGitHubRaw(`${GITHUB_API}/user`, token);
  // Even if JSON parse fails, we only need headers
  const scopesHeader = res.headers.get('x-oauth-scopes') || '';
  const scopes = new Set(
    scopesHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return scopes;
}

async function ensureUniqueRepoName(token: string, desiredName: string, owner: string, isOrg: boolean): Promise<string> {
  // Try desired name, if exists, append numeric suffix
  let name = desiredName;
  let attempt = 0;
  while (attempt < 5) {
    const exists = await repoExists(token, owner, name);
    if (!exists) return name;
    attempt += 1;
    name = `${desiredName}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return name;
}

async function repoExists(token: string, owner: string, repo: string): Promise<boolean> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'mcpay.tech',
    },
  });
  return res.status === 200;
}

async function createRepository(token: string, params: { name: string; privateRepo: boolean; organization?: string; description?: string }): Promise<{ owner: string; repo: string; html_url: string }>
{
  const { name, privateRepo, organization, description } = params;
  if (organization) {
    const created = await fetchGitHub<{ owner: { login: string }; name: string; html_url: string }>(
      `${GITHUB_API}/orgs/${organization}/repos`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ name, private: privateRepo, auto_init: true, description }),
      }
    );
    return { owner: created.owner.login, repo: created.name, html_url: created.html_url };
  }

  const created = await fetchGitHub<{ owner: { login: string }; name: string; html_url: string }>(
    `${GITHUB_API}/user/repos`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ name, private: privateRepo, auto_init: true, description }),
    }
  );
  return { owner: created.owner.login, repo: created.name, html_url: created.html_url };
}

async function getRepository(token: string, owner: string, repo: string): Promise<{ default_branch: string }>{
  return fetchGitHub<{ default_branch: string }>(`${GITHUB_API}/repos/${owner}/${repo}`, token);
}

async function getFileShaIfExists(token: string, owner: string, repo: string, path: string, ref: string): Promise<string | null> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`;
  const res = await fetchGitHubRaw(url, token);
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  // If the path resolves to a directory, return null (we only care about file sha)
  if (Array.isArray(data)) return null;
  return data?.sha || null;
}

async function putFileViaContentsApi(token: string, owner: string, repo: string, path: string, content: string, branch: string, message?: string): Promise<void> {
  // Use encodeURI to preserve path separators while encoding other characters
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURI(path)}`;
  const existingSha = await getFileShaIfExists(token, owner, repo, path, branch);
  const body: Record<string, unknown> = {
    message: message || `Add ${path}`,
    content: toBase64(content),
    branch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }
  await fetchGitHub(url, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deployWithGitHub(input: DeployRequestInput, userId: string, userLogin?: string): Promise<DeployResult> {
  // Ensure MCPAY keys are always included in env list passed to Vercel
  const ensuredEnv = Array.from(new Set<string>([...(input?.env || []), 'MCPAY_API_KEY', 'MCPAY_API_URL']));
  const safeInput: DeployRequestInput = { ...input, env: ensuredEnv };
  // If repositoryUrl is provided, import existing repo into Vercel directly
  if (safeInput?.repositoryUrl) {
    const repositoryUrl = safeInput.repositoryUrl;

    // Build Vercel import URL (/new/import uses 's' for source URL)
    const params = new URLSearchParams();
    params.set('s', repositoryUrl);
    params.set('project-name', safeInput.projectName || 'mcpay-app');
    params.set('framework', safeInput.framework || 'hono');
    if (safeInput.teamSlug) params.set('teamSlug', safeInput.teamSlug);
    if (safeInput.repoName) params.set('repo-name', safeInput.repoName);
    if (safeInput.env && safeInput.env.length > 0) {
      params.set('env', safeInput.env.join(','));
    }
    if (safeInput.envDescription) params.set('envDescription', safeInput.envDescription);
    if (safeInput.envLink) params.set('envLink', safeInput.envLink);

    // Attempt to parse owner/repo (GitHub only) for return payload
    let owner = '';
    let repo = '';
    try {
      const url = new URL(repositoryUrl);
      if (url.hostname === 'github.com') {
        const parts = url.pathname.replace(/^\//, '').split('/');
        if (parts.length >= 2) {
          owner = parts[0];
          repo = parts[1].replace(/\.git$/, '');
        }
      }
    } catch (_) {
      // ignore parse errors
    }

    const vercelDeployUrl = `https://vercel.com/new/import?${params.toString()}`;
    return { owner, repo, repositoryUrl, vercelDeployUrl };
  }

  if (!safeInput?.codebase) {
    throw new Error('Missing codebase or repositoryUrl');
  }

  // Parse codebase JSON
  let parsed: CodebasePayload;
  try {
    parsed = JSON.parse(safeInput.codebase) as CodebasePayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.files) {
      throw new Error('Invalid codebase format');
    }
  } catch (e) {
    throw new Error('Failed to parse codebase JSON');
  }

  // Get GitHub token
  const token = await getUserGitHubAccessToken(userId);
  if (!token) {
    throw new Error('GitHub account not connected. Please sign in with GitHub.');
  }

  // Check token scopes and adjust visibility if needed
  const scopes = await getTokenScopes(token);
  const hasRepoScope = scopes.has('repo');
  const hasPublicRepoScope = scopes.has('public_repo');
  if (!hasRepoScope && !hasPublicRepoScope) {
    throw new Error('Your GitHub token is missing repo permissions. Please reconnect GitHub with the "repo" scope to allow repository creation.');
  }

  // Determine owner
  const ownerLogin = safeInput.organization || userLogin || (await getGitHubOwnerLogin(token));
  const desiredName = safeInput.repoName || 'mcpay-app';
  const name = await ensureUniqueRepoName(token, desiredName, ownerLogin, Boolean(input.organization));

  // Create repository (auto-initialize with README so default branch exists)
  const created = await createRepository(token, {
    name,
    // If only public_repo, force public repo creation
    privateRepo: hasRepoScope ? (safeInput.isPrivate !== false) : false,
    organization: safeInput.organization,
    description: 'Created by MCPay Build',
  });

  const owner = created.owner;
  const repo = created.repo;
  const repoInfo = await getRepository(token, owner, repo);
  const defaultBranch = repoInfo.default_branch || 'main';

  // Commit files sequentially to keep API usage predictable
  const files = parsed.files;
  const filePaths = Object.keys(files);
  for (const filePath of filePaths) {
    const entry = files[filePath];
    await putFileViaContentsApi(token, owner, repo, filePath, entry.content, defaultBranch, 'Initial import from MCPay Build');
  }

  const repositoryUrl = `https://github.com/${owner}/${repo}`;

  // Build Vercel import URL (/new/import uses 's' for source URL)
  const params = new URLSearchParams();
  params.set('s', repositoryUrl);
  params.set('project-name', safeInput.projectName || repo);
  params.set('framework', safeInput.framework || 'hono');
  if (safeInput.teamSlug) params.set('teamSlug', safeInput.teamSlug);
  if (safeInput.repoName) params.set('repo-name', safeInput.repoName);
  if (safeInput.env && safeInput.env.length > 0) {
    params.set('env', safeInput.env.join(','));
  }
  if (safeInput.envDescription) params.set('envDescription', safeInput.envDescription);
  if (safeInput.envLink) params.set('envLink', safeInput.envLink);

  // Use Vercel Import flow to deploy the repository directly
  const vercelDeployUrl = `https://vercel.com/new/import?${params.toString()}`;

  return { owner, repo, repositoryUrl, vercelDeployUrl };
}





================================================
FILE: app/src/app/(server)/api/deploy/route.ts
================================================
import { auth } from '@/lib/gateway/auth';
import { NextResponse } from 'next/server';
import { deployWithGitHub, type DeployRequestInput } from './actions';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const input = (await req.json()) as DeployRequestInput;
    const result = await deployWithGitHub(input, userId);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deployment failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}





================================================
FILE: app/src/app/(server)/ping/[[...route]]/route.ts
================================================
// Enhanced ping service that registers MCP servers automatically with payment information

import { extractApiKeyFromHeaders, hashApiKey } from "@/lib/gateway/auth-utils";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { mcpTools } from "@/lib/gateway/db/schema";
import { getMcpServerInfo, getMcpToolsWithPayments, validatePaymentInfo } from "@/lib/gateway/inspect-mcp";
import { PricingEntry } from "@/types";
import { Hono, type Context, type Next } from "hono";
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { randomUUID } from "node:crypto";

export const runtime = 'nodejs'

// List of blocked URL origins that are not allowed to be registered
const BLOCKED_ORIGINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    // Add more blocked origins as needed
    // maybe the vercel sandbox
];

/**
 * Check if a URL origin is blocked
 * @param url - The URL to check
 * @returns true if the origin is blocked, false otherwise
 */
function isOriginBlocked(url: string): boolean {
    // Only apply blocked origins in actual production environment
    // On Vercel: VERCEL_ENV can be 'production', 'preview', or 'development'
    // We only want to block origins in actual production, not preview deployments
    const isVercelProduction = process.env.VERCEL_ENV === 'production';
    const isNodeProduction = process.env.NODE_ENV === 'production';
    const isActualProduction = isVercelProduction || (isNodeProduction && !process.env.VERCEL_ENV);
    
    if (!isActualProduction) {
        return false;
    }

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        // Block domains ending with vercel.run
        if (hostname.endsWith('.vercel.run') || hostname === 'vercel.run') {
            return true;
        }
        
        // Check against blocked origins list
        return BLOCKED_ORIGINS.some(blockedOrigin => {
            const normalizedBlocked = blockedOrigin.toLowerCase();
            
            // Exact match
            if (hostname === normalizedBlocked) {
                return true;
            }
            
            // Subdomain match (e.g. blocked: example.com, url: sub.example.com)
            if (hostname.endsWith(`.${normalizedBlocked}`)) {
                return true;
            }
            
            return false;
        });
    } catch (error) {
        // If URL parsing fails, consider it blocked for security (only in production)
        console.warn('Failed to parse URL for origin check:', url, error);
        return true;
    }
}

// Define user type that matches what we get from API key validation
type ApiKeyUser = {
    id: string;
    name: string | null;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    image: string | null;
};

// Define extended context type for ping middleware with API key info
type PingAppContext = {
    Variables: {
        user: ApiKeyUser;
        apiKeyInfo?: {
            id: string;
            userId: string;
            keyHash: string;
            name: string;
            permissions: string[];
            createdAt: Date;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
            active: boolean;
        };
    };
};

const app = new Hono<PingAppContext>({
    strict: false,
}).basePath('/ping')

// Add CORS middleware to handle cross-origin requests
app.use('*', cors({
    origin: '*', // You might want to restrict this to your domain in production
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: true,
}))

// Add error handling middleware
app.onError((err, c) => {
    console.error('Ping route error:', err)
    return c.json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        service: 'mcpay-ping'
    }, 500)
})

// API key authentication middleware for ping requests
const pingAuthMiddleware = async (c: Context<PingAppContext>, next: Next) => {
    try {
        // Extract API key from headers
        const apiKey = extractApiKeyFromHeaders(c.req.raw.headers);

        if (!apiKey) {
            return c.json({
                status: 'error',
                message: 'API key required. Please provide a valid API key in X-API-KEY header or Authorization: Bearer header.',
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 401);
        }

        // Validate API key
        const keyHash = hashApiKey(apiKey);
        const apiKeyResult = await withTransaction(async (tx) => {
            return await txOperations.validateApiKey(keyHash)(tx);
        });

        if (!apiKeyResult?.user) {
            return c.json({
                status: 'error',
                message: 'Invalid or expired API key.',
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 401);
        }

        console.log(`[${new Date().toISOString()}] User authenticated via API key: ${apiKeyResult.user.id}`);

        // Add user to context with proper typing
        c.set('user', apiKeyResult.user);
        // Store API key info in context
        c.set('apiKeyInfo', apiKeyResult.apiKey);

        await next();
    } catch (error) {
        console.error('Ping auth middleware error:', error);
        return c.json({
            status: 'error',
            message: 'Authentication failed',
            timestamp: new Date().toISOString(),
            service: 'mcpay-ping'
        }, 401);
    }
};

app.post('/', pingAuthMiddleware, async (c) => {
    try {
        console.log('Enhanced ping received');
        const user = c.get('user');
        if (!user) {
            return c.json({
                status: 'error',
                message: 'User not found in context',
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 401);
        }
        const body = await c.req.json();

        console.log('Ping payload:', body);

        const {
            detectedUrls,
            receiverAddress,
            requireAuth = false,
            authHeaders
        } = body;

        if (!detectedUrls || !Array.isArray(detectedUrls) || detectedUrls.length === 0) {
            return c.json({
                status: 'error',
                message: 'No detected URLs provided',
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 400);
        }

        // Check if any of the detected URLs have blocked origins
        const blockedUrls = detectedUrls.filter(url => isOriginBlocked(url));
        if (blockedUrls.length > 0) {
            console.warn('Blocked origin detected:', blockedUrls[0]);
            return c.json({
                status: 'error',
                message: 'Origin is blocked and cannot be registered',
                blockedOrigin: blockedUrls[0],
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 403);
        }

        // Set proper headers to prevent caching and ensure fresh responses
        c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
        c.header('Pragma', 'no-cache');
        c.header('Expires', '0');
        c.header('Content-Type', 'application/json');

        const mcpUrl = new URL(`${detectedUrls[0]}/mcp`);
        console.log('Connecting to MCP server at:', mcpUrl.toString());

        // Get user's primary wallet address for receiverAddress fallback
        let userWalletAddress: string | null = null;
        try {
            const userWallets = await withTransaction(async (tx) => {
                return await tx.query.userWallets.findMany({
                    where: (userWallets, { eq, and }) => and(
                        eq(userWallets.userId, user.id),
                        eq(userWallets.isActive, true)
                    ),
                    orderBy: (userWallets, { desc }) => [desc(userWallets.isPrimary), desc(userWallets.createdAt)],
                    limit: 1
                });
            });

            console.log('User wallets:', userWallets);

            userWalletAddress = userWallets[0]?.walletAddress || null;
        } catch (error) {
            console.warn('Failed to get user wallet address:', error);
        }

        const serverInfo = await getMcpServerInfo(mcpUrl.toString(), userWalletAddress || receiverAddress || '0x0000000000000000000000000000000000000000');

        // Extract tools with payment information
        let toolsWithPricing;
        try {
            // FIX THIS: receiverAddress is not always set
            toolsWithPricing = serverInfo.tools;
            console.log(`Found ${toolsWithPricing.length} tools, ${toolsWithPricing.filter(t => t.pricing).length} with pricing info`);
        } catch (error) {
            console.error('Failed to connect to MCP server:', error);
            return c.json({
                status: 'error',
                message: 'Failed to connect to MCP server',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
                service: 'mcpay-ping'
            }, 400);
        }

        // Log payment information for debugging
        toolsWithPricing.forEach(tool => {
            if (tool.pricing) {
                tool.pricing.forEach(pricing => {
                    console.log(`Tool ${tool.name} pricing info:`, pricing);
                    const isValid = validatePaymentInfo(pricing);
                    console.log(`Payment info valid: ${isValid}`);
                });
            }
        });

        // Auto-register or update server using atomic upsert to prevent race conditions
        const serverResult = await withTransaction(async (tx) => {
            try {
                // Use upsert operation to handle race conditions gracefully
                const upsertResult = await txOperations.upsertServerByOrigin({
                    serverId: randomUUID(),
                    mcpOrigin: mcpUrl.toString(), // Use raw URL as provided
                    creatorId: user.id,
                    receiverAddress: receiverAddress || userWalletAddress || '0x0000000000000000000000000000000000000000',
                    requireAuth,
                    authHeaders,
                    name: serverInfo.metadata.name || 'Auto-registered Server',
                    description: 'Server registered via ping',
                    metadata: {
                        registeredFromPing: true,
                        timestamp: new Date().toISOString(),
                        toolsCount: toolsWithPricing.length,
                        monetizedToolsCount: toolsWithPricing.filter(t => t.pricing).length,
                    }
                })(tx);

                if (upsertResult.isNew) {
                    console.log('Created new server:', upsertResult.server.id);
                    
                    // Create tools for new server
                    const toolResults = [];
                    for (const tool of toolsWithPricing) {
                        const newTool = await tx.insert(mcpTools).values({
                            serverId: upsertResult.server.id,
                            name: tool.name,
                            description: tool.description || `Access to ${tool.name}`,
                            inputSchema: tool.inputSchema || {},
                            isMonetized: !!tool.pricing && tool.pricing.some((p: PricingEntry) => p.active === true),
                            pricing: tool.pricing,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }).returning();
                        
                        toolResults.push(newTool[0]);
                    }
                    
                    return {
                        server: upsertResult.server,
                        tools: toolResults,
                        isNew: true
                    };
                } else {
                    console.log('Updating existing server:', upsertResult.server.id);
                    
                    // Update existing server with tools
                    const updateResult = await txOperations.updateServerFromPing(upsertResult.server.id, {
                        name: serverInfo.metadata.name || upsertResult.server.name || 'Auto-registered Server',
                        description: serverInfo.metadata.description || upsertResult.server.description || 'Server registered via ping',
                        metadata: {
                            ...(upsertResult.server.metadata && typeof upsertResult.server.metadata === 'object' ? upsertResult.server.metadata : {}),
                            registeredFromPing: true,
                            lastPing: new Date().toISOString(),
                            toolsCount: toolsWithPricing.length,
                            monetizedToolsCount: toolsWithPricing.filter(t => t.pricing).length
                        },
                        toolsData: toolsWithPricing.map(tool => ({
                            name: tool.name,
                            description: tool.description || `Access to ${tool.name}`,
                            inputSchema: tool.inputSchema || ({} as Record<string, unknown>),
                            pricing: tool.pricing
                        }))
                    })(tx);

                    return {
                        server: updateResult.server,
                        tools: updateResult.tools,
                        isNew: false
                    };
                }
            } catch (error) {
                console.error('Server upsert failed:', error);
                throw error;
            }
        });

        const toolSummary = toolsWithPricing.map(tool => ({
            name: tool.name,
            hasPricing: !!tool.pricing,
            pricingInfo: tool.pricing ? {
                asset: tool.pricing[0].assetAddress,
                network: tool.pricing[0].network,
                amount: tool.pricing[0].maxAmountRequiredRaw
            } : null
        }));

        return c.json({
            status: 'success',
            message: `Server ${serverResult.isNew ? 'registered' : 'updated'} successfully`,
            server: {
                id: serverResult.server.id,
                serverId: serverResult.server.serverId,
                name: serverResult.server.name,
                mcpOrigin: mcpUrl.toString(),
                toolsRegistered: toolsWithPricing.length,
                monetizedTools: toolsWithPricing.filter(t => t.pricing).length,
                registrationStatus: serverResult.isNew ? 'created' : 'updated'
            },
            tools: toolSummary,
            timestamp: new Date().toISOString(),
            service: 'mcpay-ping',
            requestId: Math.random().toString(36).substring(7)
        });
    } catch (error) {
        console.error('Error processing enhanced ping:', error);
        return c.json({
            status: 'error',
            message: 'Failed to process ping',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            service: 'mcpay-ping'
        }, 500);
    }
});

// Add GET endpoint for health checks
app.get('/', async (c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    c.header('Content-Type', 'application/json');

    const isVercelProduction = process.env.VERCEL_ENV === 'production';
    const isNodeProduction = process.env.NODE_ENV === 'production';
    const isActualProduction = isVercelProduction || (isNodeProduction && !process.env.VERCEL_ENV);

    return c.json({
        status: 'ok',
        message: 'Enhanced ping service is running',
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            VERCEL_ENV: process.env.VERCEL_ENV || 'not-vercel',
            isProduction: isActualProduction
        },
        features: [
            'Auto server registration',
            'Payment extraction from tool annotations',
            'Tool synchronization',
            'API key authentication',
            isActualProduction ? 'Blocked origins protection (active)' : 'Blocked origins protection (inactive)'
        ],
        blockedOrigins: isActualProduction ? BLOCKED_ORIGINS : [],
        blockedOriginsNote: isActualProduction 
            ? 'Active in production environment' 
            : `Disabled in ${process.env.VERCEL_ENV || 'development'} environment`,
        authentication: 'Requires valid API key in X-API-KEY header or Authorization: Bearer header',
        timestamp: new Date().toISOString(),
        service: 'mcpay-ping'
    });
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);


================================================
FILE: app/src/app/(server)/requirements/[[...route]]/route.ts
================================================
// Service that generates payment requirements for MCP tool calls

import { fromBaseUnits } from "@/lib/commons";
import { getNetworkTokens } from "@/lib/commons/networks";
import { extractApiKeyFromHeaders, hashApiKey } from "@/lib/gateway/auth-utils";
import { txOperations, withTransaction } from "@/lib/gateway/db/actions";
import { createExactPaymentRequirements } from "@/lib/gateway/payments";
import type { SupportedNetwork } from "@/types/x402";
import { Hono, type Context, type Next } from "hono";
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { z } from "zod";

export const runtime = 'nodejs'

// Define user type that matches what we get from API key validation
type ApiKeyUser = {
    id: string;
    name: string | null;
    email: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    image: string | null;
};

// Define extended context type for requirements middleware with API key info
type RequirementsAppContext = {
    Variables: {
        user: ApiKeyUser;
        userWalletAddress: string | null;
        apiKeyInfo?: {
            id: string;
            userId: string;
            keyHash: string;
            name: string;
            permissions: string[];
            createdAt: Date;
            expiresAt: Date | null;
            lastUsedAt: Date | null;
            active: boolean;
        };
    };
};

// Define input validation schemas
const SimplePaymentOptionsSchema = z.object({
  price: z.number().positive(),
  currency: z.string().default('USD'),
  recipient: z.string().optional(),
  network: z.string().optional()
});

const AdvancedPaymentOptionsSchema = z.object({
  recipient: z.string(),
  rawAmount: z.string(),
  tokenDecimals: z.number().int().min(0).max(18),
  tokenAddress: z.string().optional(),
  network: z.union([z.number(), z.string()]),
  tokenSymbol: z.string().optional()
});

const PaymentOptionsSchema = z.union([SimplePaymentOptionsSchema, AdvancedPaymentOptionsSchema]);

const PaymentRequirementsRequestSchema = z.object({
  tool: z.string().min(1),
  paymentOptions: PaymentOptionsSchema,
  timestamp: z.string()
});

type SimplePaymentOptions = z.infer<typeof SimplePaymentOptionsSchema>;
type AdvancedPaymentOptions = z.infer<typeof AdvancedPaymentOptionsSchema>;

const app = new Hono<RequirementsAppContext>({
    strict: false,
}).basePath('/requirements')

// Add CORS middleware to handle cross-origin requests
app.use('*', cors({
    origin: '*', // You might want to restrict this to your domain in production
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: false,
}))

// Add error handling middleware
app.onError((err, c) => {
    console.error('Requirements route error:', err)
    return c.json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        service: 'mcpay-requirements'
    }, 500)
})

// API key authentication middleware for requirements requests
const requirementsAuthMiddleware = async (c: Context<RequirementsAppContext>, next: Next) => {
    try {
        // Extract API key from headers
        const apiKey = extractApiKeyFromHeaders(c.req.raw.headers);

        if (!apiKey) {
            return c.json({
                status: 'error',
                message: 'API key required. Please provide a valid API key in X-API-KEY header or Authorization: Bearer header.',
                timestamp: new Date().toISOString(),
                service: 'mcpay-requirements'
            }, 401);
        }

        // Validate API key
        const keyHash = hashApiKey(apiKey);
        const apiKeyResult = await withTransaction(async (tx) => {
            return await txOperations.validateApiKey(keyHash)(tx);
        });

        if (!apiKeyResult?.user) {
            return c.json({
                status: 'error',
                message: 'Invalid or expired API key.',
                timestamp: new Date().toISOString(),
                service: 'mcpay-requirements'
            }, 401);
        }

        console.log(`[${new Date().toISOString()}] User authenticated via API key: ${apiKeyResult.user.id}`);

        // Add user to context with proper typing
        c.set('user', apiKeyResult.user);
        // Store API key info in context
        c.set('apiKeyInfo', apiKeyResult.apiKey);

        // Get user's primary wallet address for default recipient
        let userWalletAddress: string | null = null;
        try {
            const userWallets = await withTransaction(async (tx) => {
                return await tx.query.userWallets.findMany({
                    where: (userWallets, { eq, and }) => and(
                        eq(userWallets.userId, apiKeyResult.user.id),
                        eq(userWallets.isActive, true)
                    ),
                    orderBy: (userWallets, { desc }) => [desc(userWallets.isPrimary), desc(userWallets.createdAt)],
                    limit: 1
                });
            });

            userWalletAddress = userWallets[0]?.walletAddress || null;
            console.log(`[${new Date().toISOString()}] User wallet address: ${userWalletAddress}`);
        } catch (error) {
            console.warn('Failed to get user wallet address:', error);
        }

        // Store wallet address in context
        c.set('userWalletAddress', userWalletAddress);

        await next();
    } catch (error) {
        console.error('Requirements auth middleware error:', error);
        return c.json({
            status: 'error',
            message: 'Authentication failed',
            timestamp: new Date().toISOString(),
            service: 'mcpay-requirements'
        }, 401);
    }
};

// Helper function to check if payment options are simple
function isSimplePaymentOptions(options: SimplePaymentOptions | AdvancedPaymentOptions): options is SimplePaymentOptions {
    return 'price' in options;
}

// Helper function to convert PaymentOptions to payment requirements
function processPaymentOptions(
    tool: string,
    paymentOptions: SimplePaymentOptions | AdvancedPaymentOptions,
    userWalletAddress: string | null
) {
    const network = (paymentOptions.network || 'sei-testnet') as SupportedNetwork;
    const resource = `mcpay://tool/${tool}` as `${string}://${string}`;
    const description = `Payment for ${tool} tool execution`;

    if (isSimplePaymentOptions(paymentOptions)) {
        // Handle simple payment options (USD price)
        const { price, currency, recipient } = paymentOptions;
        
        if (currency.toUpperCase() !== 'USD') {
            throw new Error(`Currency ${currency} not supported. Only USD is currently supported for simple payment options.`);
        }

        // Use recipient from options, fallback to user's wallet, then to default
        const payTo = (recipient as `0x${string}`) || 
                     (userWalletAddress as `0x${string}`) || 
                     "0x742d35Cc6634C0532925a3b8D42d5Fde6D5FfFd6" as `0x${string}`;
        
        return createExactPaymentRequirements(
            price.toString(), // Convert USD amount to string
            network,
            resource,
            description,
            payTo
        );
    } else {
        // Handle advanced payment options (raw amounts)
        const { recipient, rawAmount, tokenSymbol = 'USDC' } = paymentOptions;
        
        // Get token info to determine decimals
        const tokens = getNetworkTokens(network);
        const token = tokens.find(t => t.symbol === tokenSymbol.toUpperCase());
        
        if (!token) {
            throw new Error(`Token ${tokenSymbol} not found on network ${network}`);
        }

        // Convert rawAmount from base units to human-readable format for createExactPaymentRequirements
        // Since createExactPaymentRequirements expects a price string and will convert it back to base units
        const humanAmount = fromBaseUnits(rawAmount, token.decimals);
        
        const payTo = recipient as `0x${string}`;
        
        return createExactPaymentRequirements(
            humanAmount,
            network,
            resource,
            description,
            payTo
        );
    }
}

// Add GET endpoint for health checks
app.get('/', async (c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    c.header('Content-Type', 'application/json')

    return c.json({
        status: 'ok',
        message: 'Requirements service is running',
        timestamp: new Date().toISOString(),
        service: 'mcpay-requirements'
    });
});

// Add POST endpoint for generating payment requirements
app.post('/', requirementsAuthMiddleware, async (c) => {
    try {
        c.header('Content-Type', 'application/json')
        
        const user = c.get('user');
        const userWalletAddress = c.get('userWalletAddress');
        
        const body = await c.req.json();
        
        // Validate the request body
        const validationResult = PaymentRequirementsRequestSchema.safeParse(body);
        if (!validationResult.success) {
            return c.json({
                status: 'error',
                message: 'Invalid request body',
                errors: validationResult.error.issues,
                timestamp: new Date().toISOString(),
                service: 'mcpay-requirements'
            }, 400);
        }

        const { tool, paymentOptions } = validationResult.data;

        console.log(`[${new Date().toISOString()}] Generating payment requirements for tool: ${tool}, user: ${user.id}`);

        // Process the payment options and generate requirements
        const paymentRequirements = processPaymentOptions(tool, paymentOptions, userWalletAddress);

        console.log(`[${new Date().toISOString()}] Generated payment requirements:`, JSON.stringify(paymentRequirements, null, 2));

        // Return the payment requirements in the expected format
        return c.json(paymentRequirements);
        
    } catch (error) {
        console.error('Error generating payment requirements:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return c.json({
            status: 'error',
            message: `Failed to generate payment requirements: ${errorMessage}`,
            timestamp: new Date().toISOString(),
            service: 'mcpay-requirements'
        }, 500);
    }
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);


================================================
FILE: app/src/app/(server)/validate/[[...route]]/route.ts
================================================
// Service that validates payment headers by checking the database

import { Hono } from "hono";
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { withTransaction } from "@/lib/gateway/db/actions";
import { z } from "zod";

export const runtime = 'nodejs'



// Define input validation schemas
const PaymentValidationRequestSchema = z.object({
  payment: z.string().min(1),
  timestamp: z.string()
});

// Define response type matching what paid-mcp-server.ts expects
interface PaymentValidationResponse {
  isValid: boolean;
  errorReason?: string;
  paymentId?: string;
  userId?: string;
  amount?: string;
  currency?: string;
  metadata?: Record<string, unknown>;
}

const app = new Hono({
    strict: false,
}).basePath('/validate')

// Add CORS middleware to handle cross-origin requests
app.use('*', cors({
    origin: '*', // You might want to restrict this to your domain in production
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
    credentials: false,
}))

// Add error handling middleware
app.onError((err, c) => {
    console.error('Validation route error:', err)
    return c.json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
        service: 'mcpay-validate'
    }, 500)
})



// Add GET endpoint for health checks
app.get('/', async (c) => {
    c.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    c.header('Content-Type', 'application/json')

    return c.json({
        status: 'ok',
        message: 'Payment validation service is running',
        timestamp: new Date().toISOString(),
        service: 'mcpay-validate'
    });
});

// Add POST endpoint for payment validation
app.post('/', async (c) => {
    try {
        c.header('Content-Type', 'application/json')
        
        const body = await c.req.json();
        
        // Validate the request body
        const validationResult = PaymentValidationRequestSchema.safeParse(body);
        if (!validationResult.success) {
            const response: PaymentValidationResponse = {
                isValid: false,
                errorReason: `Invalid request body: ${validationResult.error.issues.map(e => e.message).join(', ')}`
            };
            return c.json(response, 400);
        }

        const { payment: paymentHeader } = validationResult.data;

        console.log(`[${new Date().toISOString()}] Validating payment header`);

        // Check if payment exists in database by signature
        const existingPayment = await withTransaction(async (tx) => {
            return await tx.query.payments.findFirst({
                where: (payments, { eq }) => eq(payments.signature, paymentHeader),
                with: {
                    user: {
                        columns: {
                            id: true,
                            email: true,
                            displayName: true
                        }
                    },
                    tool: {
                        columns: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
        });

        console.log("[mcpay-validate] paymentHeader", paymentHeader);

        if (!existingPayment) {
            console.log(`[${new Date().toISOString()}] Payment not found in database`);
            const response: PaymentValidationResponse = {
                isValid: false,
                errorReason: "Payment not found in database"
            };
            return c.json(response);
        }

        // Check if payment is completed
        if (existingPayment.status !== 'completed') {
            console.log(`[${new Date().toISOString()}] Payment found but status is: ${existingPayment.status}`);
            const response: PaymentValidationResponse = {
                isValid: false,
                errorReason: `Payment status is ${existingPayment.status}, expected completed`
            };
            return c.json(response);
        }

        // Payment is valid
        console.log(`[${new Date().toISOString()}] Payment validation successful for payment ID: ${existingPayment.id}`);
        
        const response: PaymentValidationResponse = {
            isValid: true,
            paymentId: existingPayment.id,
            userId: existingPayment.userId || undefined,
            amount: existingPayment.amountRaw,
            currency: existingPayment.currency,
            metadata: {
                network: existingPayment.network,
                transactionHash: existingPayment.transactionHash,
                settledAt: existingPayment.settledAt?.toISOString(),
                toolName: existingPayment.tool?.name,
                tokenDecimals: existingPayment.tokenDecimals,
                validatedAt: new Date().toISOString(),
                validatedBy: 'mcpay-validate-service'
            }
        };

        return c.json(response);
        
    } catch (error) {
        console.error('Error validating payment:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        const response: PaymentValidationResponse = {
            isValid: false,
            errorReason: `Internal server error: ${errorMessage}`
        };
        
        return c.json(response, 500);
    }
});

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);



================================================
FILE: app/src/app/explorer/page.tsx
================================================
import { Suspense } from "react"
import ClientExplorerPage from "@/components/custom-ui/client-explorer-page"

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading explorer…</div>}>
      <ClientExplorerPage />
    </Suspense>
  )
}



================================================
FILE: app/src/app/register/success/page.tsx
================================================
"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Server, Calendar, User, Globe, ExternalLink, ChevronDown, ChevronRight, Shield, Database, Hash, AlertCircle, Home, Plus, Eye, Wrench, DollarSign, Zap } from "lucide-react"
import { useTheme } from "@/components/providers/theme-context"
import { openBlockscout } from "@/lib/client/blockscout"
import { api } from "@/lib/client/utils"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ServerRegistrationData, ServerRegistrationMetadata } from "@/types/mcp"
import { PricingEntry } from "@/types"
import { 
  formatTokenAmount,
  fromBaseUnits,
  getTokenInfo,
} from "@/lib/commons"
import { type Network } from "@/types/blockchain"
import Image from "next/image"



// Enhanced token display with verification badge
const TokenDisplay = ({
  currency,
  network,
  amount
}: {
  currency: string
  network: string
  amount?: string | number
}) => {
  const tokenInfo = getTokenInfo(currency, network as Network)

  return (
    <div className="flex items-center gap-2">
      {/* Token Logo */}
      {tokenInfo?.logoUri && (
        <div className="w-5 h-5 rounded-full overflow-hidden">
          <Image
            src={tokenInfo.logoUri}
            alt={tokenInfo.symbol}
            width={20}
            height={20}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Amount and Symbol */}
      <div className="flex items-center gap-1">
        {amount && (
          <span className="font-medium">
            {formatCurrency(amount, currency, network)}
          </span>
        )}
        {!amount && tokenInfo && (
          <span className="font-medium">{tokenInfo.symbol}</span>
        )}
        {!amount && !tokenInfo && (
          <span className="font-mono text-xs">
            {currency && currency.startsWith('0x') ? `${currency.slice(0, 6)}...` : currency || 'Unknown'}
          </span>
        )}
      </div>
    </div>
  )
}

// Enhanced formatCurrency function using token registry
const formatCurrency = (amount: string | number, currency: string, network?: string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount

  // Handle undefined or null currency
  if (!currency) {
    return `${num.toFixed(6)} Unknown`
  }

  // If we have network info, try to get token info from registry
  if (network) {
    const tokenInfo = getTokenInfo(currency, network as Network)
    if (tokenInfo) {
      // Use formatTokenAmount for precise formatting
      // Since we already have human-readable amounts, pass them directly
      return formatTokenAmount(num, currency, network as Network, {
        showSymbol: true,
        precision: tokenInfo.isStablecoin ? 2 : 4,
        compact: num >= 1000
      });
    }
  }

  // Fallback: check if it's a token address and show abbreviated
  if (currency.startsWith('0x') && currency.length === 42) {
    return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
  }

  // Simple currency display
  return `${num.toFixed(6)} ${currency}`
}

function RegisterSuccessContent() {
  const { isDark } = useTheme()
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const [registrationData, setRegistrationData] = useState<ServerRegistrationData | null>(null)
  const [dataError, setDataError] = useState<string>("")
  const searchParams = useSearchParams()

    // Load registration data from server ID
  useEffect(() => {
    const fetchRegistrationData = async () => {
      try {
        const serverIdParam = searchParams.get('serverId')
        
        if (serverIdParam) {
          // Fetch data from API using server ID
          const data = await api.getServerRegistration(serverIdParam)
          setRegistrationData(data)
        } else {
          // No server ID provided
          setDataError("No server ID found in URL. Please register a server first.")
        }
      } catch (error) {
        console.error("Failed to load registration data:", error)
        
        // Handle different error types
        if (error instanceof Error) {
          if (error.message.includes('403') || error.message.includes('Forbidden')) {
            setDataError("You can only view registration details for servers you created. Please sign in with the correct account.")
          } else if (error.message.includes('404')) {
            setDataError("Server registration not found. The server may have been deleted or the ID is incorrect.")
          } else {
            setDataError("Failed to load registration data. Please try again or contact support.")
          }
        } else {
          setDataError("Failed to load registration data. Please try again or contact support.")
        }
      }
    }

    fetchRegistrationData()
  }, [searchParams])

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  // Extract hostname from URL for display
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  // Don't render anything until we have data or show error
  if (!registrationData) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
        <div className={`p-8 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'} backdrop-blur-sm max-w-md w-full`}>
          <div className="text-center">
            {dataError ? (
              <>
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <AlertCircle className={`h-8 w-8 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Registration Not Found
                </h3>
                                 <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-6`}>
                   {dataError}
                 </p>
                 <div className="space-y-3">
                   {dataError.includes("sign in") ? (
                     <>
                       <Link href="/register">
                         <Button className="w-full">
                           <User className="h-4 w-4 mr-2" />
                           Sign In to Account
                         </Button>
                       </Link>
                       <Link href="/register">
                         <Button variant="outline" className="w-full">
                           Register New Server
                         </Button>
                       </Link>
                     </>
                   ) : (
                     <Link href="/register">
                       <Button className="w-full">
                         Register New Server
                       </Button>
                     </Link>
                   )}
                 </div>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading registration data...</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      {/* Header Section */}
      <div className={`border-b ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white/50'} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Success Header */}
          <div className="text-center space-y-6">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${isDark ? "bg-green-500/20" : "bg-green-50"} mb-2`}>
              <CheckCircle className={`h-10 w-10 ${isDark ? "text-green-400" : "text-green-600"}`} />
            </div>
            
            <div className="space-y-3">
              <h1 className={`text-3xl sm:text-4xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                Registration Successful!
              </h1>
              <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-600"} max-w-3xl mx-auto`}>
                Your MCP server <a  className="font-semibold text-blue-600">{registrationData.name}</a> has been registered successfully and is now available on the platform.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {(registrationData.metadata as ServerRegistrationMetadata)?.toolsCount || 0}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Total Tools
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className="text-2xl font-bold text-green-600">
                  {(registrationData.metadata as ServerRegistrationMetadata)?.monetizedToolsCount || 0}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Monetized
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"} backdrop-blur-sm`}>
                <div className={`text-2xl font-bold ${registrationData.status === 'active' ? 'text-green-600' : 'text-amber-600'}`}>
                  {registrationData.status.toUpperCase()}
                </div>
                <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Status
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Server Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-6">
                <Server className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Server Information
                </h2>
                <Badge variant="secondary" className="ml-auto">Active</Badge>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Server Name
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-white" : "text-gray-900"} font-medium`}>
                    {registrationData.name}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    MCP Origin
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center justify-between gap-2`}>
                    <span className={`text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                      {getHostname(registrationData.mcpOrigin)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(registrationData.mcpOrigin, '_blank')}
                      className={`p-1 h-auto flex-shrink-0 ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                      title="Open MCP URL"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Receiver Address
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center justify-between gap-2`}>
                    <span className={`text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                      {registrationData.receiverAddress}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openBlockscout(registrationData.receiverAddress)}
                      className={`p-1 h-auto flex-shrink-0 ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`}
                      title="View on Blockscout"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Configuration */}
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-6">
                <Shield className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Configuration
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Registration Date
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Calendar className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {formatDate(registrationData.createdAt)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Authentication
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Shield className={`h-4 w-4 ${registrationData.requireAuth ? 'text-green-500' : isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {registrationData.requireAuth ? 'Required' : 'Not Required'}
                    </span>
                    <Badge variant={registrationData.requireAuth ? "default" : "secondary"} className="ml-auto">
                      {registrationData.requireAuth ? 'Secure' : 'Open'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                    Registration Source
                  </label>
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} flex items-center gap-3`}>
                    <Globe className={`h-4 w-4 ${isDark ? "text-gray-400" : "text-gray-600"}`} />
                    <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                      {registrationData.metadata.registeredFromUI ? 'Web Interface' : 'API'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Database className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Description
              </h2>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"} leading-relaxed`}>
              {registrationData.description}
            </div>
          </div>

          {/* Tools Information */}
          {registrationData.tools && registrationData.tools.length > 0 ? (
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className={`h-6 w-6 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Registered Tools
                  </h2>
                  <Badge variant="outline" className="ml-2">
                    {registrationData.tools.length} tool{registrationData.tools.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {(registrationData.metadata as ServerRegistrationMetadata)?.monetizedToolsCount || 0} monetized
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registrationData.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className={`p-5 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"} transition-all hover:shadow-md`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Wrench className={`h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                            <h3 className={`font-medium text-base ${isDark ? "text-gray-200" : "text-gray-800"}`}>
                              {tool.name}
                            </h3>
                          </div>
                          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"} leading-relaxed`}>
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      
                      <Separator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
                      
                      {/* Payment Information */}
                      {('pricing' in tool) && tool.pricing && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              Price per use
                            </span>
                            <TokenDisplay
                              currency={(tool.pricing as PricingEntry[])?.[0]?.assetAddress || '0x0000000000000000000000000000000000000000'}
                              network={(tool.pricing as PricingEntry[])?.[0]?.network || 'base-sepolia'}
                              amount={(() => {
                                const paymentInfo = tool.pricing as PricingEntry[] | undefined;
                                const rawAmount = paymentInfo?.[0]?.maxAmountRequiredRaw;
                                const network = paymentInfo?.[0]?.network || 'base-sepolia';
                                const currency = paymentInfo?.[0]?.assetAddress || '0x0000000000000000000000000000000000000000';
                                // Get token info to determine decimals
                                const tokenInfo = getTokenInfo(currency, network as Network);
                                const decimals = tokenInfo?.decimals || 6; // Default to 6 for USDC
                                
                                // Convert from base units to human-readable amount
                                if (rawAmount !== null && rawAmount !== undefined) {
                                  try {
                                    // Raw amount should be a string
                                    const rawAmountStr = String(rawAmount);
                                    const converted = fromBaseUnits(rawAmountStr, decimals);
                                    return converted;
                                  } catch (error) {
                                    console.error('Error converting amount:', error);
                                    return '0';
                                  }
                                }
                                
                                console.log('No raw amount found, returning 0');
                                return '0';
                              })()}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                Network
                              </span>
                              <Badge variant="outline" className="text-xs py-0 px-2">
                                {(tool.pricing as PricingEntry)?.network || 'base-sepolia'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tools Summary */}
              <div className={`mt-6 p-4 rounded-lg ${isDark ? "bg-gray-800/50 border border-gray-700" : "bg-blue-50 border border-blue-200"}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isDark ? "bg-blue-500/20" : "bg-blue-100"}`}>
                    <Zap className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium text-sm ${isDark ? "text-blue-200" : "text-blue-900"} mb-1`}>
                      Tools Ready for Use
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                      All {registrationData.tools.length} tools are now registered and available for monetized usage. 
                      Users will be charged the specified amount when they invoke each tool through your MCP server.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Zap className={`h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  No Tools Detected
                </h3>
              </div>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                This server doesn&apos;t have any tools registered yet. Tools will appear here once they are added to your MCP server.
              </p>
            </div>
          )}

          {/* Technical Details - Collapsible */}
          <div className={`rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="p-6">
              <button
                onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                className={`flex items-center justify-between w-full text-left group p-4 -m-4 rounded-lg transition-all duration-200 hover:${isDark ? "bg-gray-800/50" : "bg-gray-50"} focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                    <Database className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                      Technical Details
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Server IDs, timestamps, and metadata
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} group-hover:${isDark ? "text-gray-300" : "text-gray-700"} transition-colors duration-200`}>
                    {isDetailsExpanded ? "Hide" : "Show"}
                  </span>
                  <div className={`p-2 rounded-full transition-all duration-200 group-hover:${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                    {isDetailsExpanded ? (
                      <ChevronDown className={`h-4 w-4 transition-all duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                    ) : (
                      <ChevronRight className={`h-4 w-4 transition-all duration-300 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                    )}
                  </div>
                </div>
              </button>
            </div>
            
            <div className={`overflow-hidden transition-all duration-500 ease-out ${
              isDetailsExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
            }`}>
              <div className={`px-6 pb-6 transition-all duration-300 ${isDetailsExpanded ? "translate-y-0" : "-translate-y-2"}`}>
                <Separator className={`mb-6 ${isDark ? "bg-gray-700" : "bg-gray-200"}`} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Hash className="h-4 w-4" />
                        Registration ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.id}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Server className="h-4 w-4" />
                        Server ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.serverId}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <User className="h-4 w-4" />
                        Creator ID
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.creatorId}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Calendar className="h-4 w-4" />
                        Last Updated
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {formatDate(registrationData.updatedAt)}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} flex items-center gap-2 mb-2`}>
                        <Calendar className="h-4 w-4" />
                        Metadata Timestamp
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                        {formatDate((registrationData.metadata as ServerRegistrationMetadata)?.timestamp || registrationData.createdAt)}
                      </div>
                    </div>

                    <div>
                      <label className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} block mb-2`}>
                        Full MCP Origin URL
                      </label>
                      <div className={`p-3 rounded-lg ${isDark ? "bg-gray-800" : "bg-gray-50"} text-sm font-mono ${isDark ? "text-gray-300" : "text-gray-600"} break-all`}>
                        {registrationData.mcpOrigin}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
                  What&apos;s Next?
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your server is ready to use. View details, register more servers, or return home.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:w-auto w-full">
                <Link href={`/servers/${registrationData.serverId}`} className="sm:w-auto w-full">
                  <Button className="w-full h-11 font-medium">
                    <Eye className="h-4 w-4 mr-2" />
                    View Server Details
                  </Button>
                </Link>
                <Link href="/register" className="sm:w-auto w-full">
                  <Button variant="outline" className="w-full h-11 font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    Register Another
                  </Button>
                </Link>
                <Link href="/" className="sm:w-auto w-full">
                  <Button variant="outline" className="w-full h-11 font-medium">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  const { isDark } = useTheme()
  
  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50'}`}>
      <div className={`p-8 rounded-xl border ${isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-white'} backdrop-blur-sm`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>Loading...</p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RegisterSuccessContent />
    </Suspense>
  )
}



================================================
FILE: app/src/app/servers/page.tsx
================================================
import { Suspense } from "react"
import ClientServersPage from "@/components/custom-ui/client-servers-page"

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading servers...</div>}>
            <ClientServersPage />
        </Suspense>
    )
}



================================================
FILE: app/src/app/servers/[id]/page.tsx
================================================
"use client"

import { AnalyticsChart } from "@/components/custom-ui/analytics-chart"
import { TransactionLink } from "@/components/custom-ui/explorer-link"
import { IntegrationTab } from "@/components/custom-ui/integration-tab"
import { ToolExecutionModal } from "@/components/custom-ui/tool-execution-modal"
import { useTheme } from "@/components/providers/theme-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getExplorerName, openExplorer } from "@/lib/client/blockscout"
import { api, urlUtils } from "@/lib/client/utils"
import {
  formatTokenAmount,
  fromBaseUnits,
  getTokenInfo,
} from "@/lib/commons"
// Add missing imports from amounts utilities
import { RevenueDetail } from "@/lib/gateway/db/schema"
import { PricingEntry } from "@/types"
import { type Network } from "@/types/blockchain"
import { type DailyServerAnalytics, type McpServerWithStats, type ServerSummaryAnalytics, type ToolFromMcpServerWithStats } from "@/types/mcp"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Coins,
  Copy,
  DollarSign,
  Loader2,
  Play,
  RefreshCcw,
  Shield,
  Users,
  Wrench,
  XCircle
} from "lucide-react"
import Image from "next/image"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function ServerDashboard() {
  const params = useParams()
  const serverId = params.id as string
  const [serverData, setServerData] = useState<McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolFromMcpServerWithStats | null>(null)
  const [showToolModal, setShowToolModal] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [openTooltips, setOpenTooltips] = useState<Record<string, boolean>>({})
  const [showAllPricing, setShowAllPricing] = useState(false)
  const { isDark } = useTheme()

  // Initialize tab from URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs = ['overview', 'integration', 'tools', 'analytics']
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash)
    }
  }, [])

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Don't add hash for default tab to keep URLs clean
    if (value === 'overview') {
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      window.history.replaceState(null, '', `#${value}`)
    }
  }

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await api.getServer(serverId)
        setServerData(data as McpServerWithStats & { dailyAnalytics: DailyServerAnalytics[], summaryAnalytics: ServerSummaryAnalytics })
      } catch (err) {
        console.error('Error fetching server data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch server data')
      } finally {
        setLoading(false)
      }
    }

    if (serverId) {
      fetchServerData()
    }
  }, [serverId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleToolExecution = (tool: ToolFromMcpServerWithStats) => {
    setSelectedTool(tool)
    setShowToolModal(true)
  }

  // Handle tooltip open/close
  const handleTooltipOpenChange = (toolId: string, open: boolean) => {
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: open
    }))
  }

  const toggleTooltip = (toolId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenTooltips(prev => ({
      ...prev,
      [toolId]: !prev[toolId]
    }))
  }

  // Helper function to safely convert to number
  const safeNumber = (value: unknown): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  // Helper function to get active pricing entries
  const getActivePricing = (pricing: PricingEntry[] | null): PricingEntry[] => {
    if (!pricing || !Array.isArray(pricing)) return []
    return pricing.filter(p => p.active === true)
  }

  // Helper function to calculate total revenue from revenueDetails array
  const calculateTotalRevenue = (revenueDetails: RevenueDetail[] | null): number => {
    if (!revenueDetails || !Array.isArray(revenueDetails)) {
      return 0
    }

    return revenueDetails.reduce((total, detail) => {
      if (detail && detail.amount_raw && detail.decimals !== undefined &&
        typeof detail.amount_raw === 'string' && detail.amount_raw.trim() !== '') {
        try {
          const humanAmount = safeNumber(fromBaseUnits(detail.amount_raw, detail.decimals))
          return total + humanAmount
        } catch (error) {
          console.error('Error converting revenue amount:', error)
          return total
        }
      }
      return total
    }, 0)
  }

  // Helper function to format the primary revenue amount for display
  const formatPrimaryRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    if (!revenueDetails || !Array.isArray(revenueDetails) || revenueDetails.length === 0) {
      return "0.00"
    }

    // Get the first revenue detail for primary display
    const primaryDetail = revenueDetails[0]
    if (primaryDetail && primaryDetail.amount_raw && primaryDetail.decimals !== undefined &&
      typeof primaryDetail.amount_raw === 'string' && primaryDetail.amount_raw.trim() !== '') {
      try {
        const humanAmount = fromBaseUnits(primaryDetail.amount_raw, primaryDetail.decimals)
        return safeNumber(humanAmount).toFixed(2)
      } catch (error) {
        console.error('Error formatting primary revenue:', error)
        return "0.00"
      }
    }

    return "0.00"
  }

  // Helper function to format daily analytics revenue
  const formatDailyRevenue = (revenueDetails: RevenueDetail[] | null): string => {
    const total = calculateTotalRevenue(revenueDetails)
    return total.toFixed(2)
  }

  // Enhanced formatCurrency function using token registry
  const formatCurrency = (amount: string | number, currency: string, network?: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount

    // Handle undefined or null currency
    if (!currency) {
      return `${num.toFixed(6)} Unknown`
    }

    // If we have network info, try to get token info from registry
    if (network) {
      try {
        const tokenInfo = getTokenInfo(currency, network as Network)
        if (tokenInfo) {
          // Use formatTokenAmount for precise formatting
          // Since we already have human-readable amounts, pass them directly
          return formatTokenAmount(num, currency, network as Network, {
            showSymbol: true,
            precision: tokenInfo.isStablecoin ? 2 : 4,
            compact: num >= 1000
          });
        }
      } catch (error) {
        console.error('Error getting token info:', error)
        // Fall through to fallback
      }
    }

    // Fallback: check if it's a token address and show abbreviated
    if (currency.startsWith('0x') && currency.length === 42) {
      return `${num.toFixed(6)} ${currency.slice(0, 6)}...${currency.slice(-4)}`
    }

    // Simple currency display
    return `${num.toFixed(6)} ${currency}`
  }

  // Enhanced token display with verification badge
  const TokenDisplay = ({
    currency,
    network,
    amount
  }: {
    currency?: string
    network?: string
    amount?: string | number
  }) => {
    // Safety checks for required parameters
    if (!currency || !network) {
      return (
        <span className={isDark ? "text-gray-400" : "text-gray-500"}>
          {amount ? `${amount} Unknown` : 'Unknown'}
        </span>
      )
    }

    let tokenInfo = null
    try {
      tokenInfo = getTokenInfo(currency, network as Network)
    } catch (error) {
      console.error('Error getting token info in TokenDisplay:', error)
    }

    return (
      <div className="flex items-center gap-2">
        {/* Token Logo */}
        {tokenInfo?.logoUri && (
          <div className="w-5 h-5 rounded-full overflow-hidden">
            <Image
              src={tokenInfo.logoUri}
              alt={tokenInfo.symbol}
              width={20}
              height={20}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Amount and Symbol */}
        <div className="flex items-center gap-1">
          {amount && (
            <span className="font-medium">
              {formatCurrency(amount, currency, network)}
            </span>
          )}
          {!amount && tokenInfo && (
            <span className="font-medium">{tokenInfo.symbol}</span>
          )}
          {!amount && !tokenInfo && (
            <span className="font-mono text-xs">
              {currency && currency.startsWith('0x') ? `${currency.slice(0, 6)}...` : currency || 'Unknown'}
            </span>
          )}
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className={isDark ? "text-gray-300" : "text-gray-600"}>Loading server dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-red-400" : "text-red-500"}`} />
              <h3 className="text-lg font-medium mb-2">Failed to load server</h3>
              <p className={`mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className={isDark ? "bg-gray-700 text-white hover:bg-gray-600" : ""}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!serverData) return null

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-gradient-to-br from-black to-gray-900 text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900"
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{serverData.name}</h1>
              <p className={`text-sm max-w-xl ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {serverData.description}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Created: {formatDate(serverData?.createdAt ? (typeof serverData.createdAt === 'string' ? serverData.createdAt : serverData.createdAt.toISOString()) : '')}
            </span>
            <span className={isDark ? "text-gray-400" : "text-gray-500"}>
              Last Activity: {formatDate(serverData.summaryAnalytics.lastActivity || '')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className={`grid w-full grid-cols-4 mb-6 ${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="analytics">Analytics & Payments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Total Revenue
                      </p>
                      <div className="text-base font-bold mt-0.5">${formatPrimaryRevenue(serverData.summaryAnalytics.revenueDetails)}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {serverData.summaryAnalytics.totalPayments || 0} payments
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Total Usage
                      </p>
                      <div className="text-base font-bold mt-0.5">{(serverData.stats.totalUsage || 0).toLocaleString()}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {safeNumber(serverData.summaryAnalytics.avgResponseTime).toFixed(0)}ms avg
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Activity className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Unique Users
                      </p>
                      <div className="text-base font-bold mt-0.5">{serverData.stats.activeUsers || 0}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        Active users
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""} hover:shadow-md transition-shadow`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                        Tools
                      </p>
                      <div className="text-base font-bold mt-0.5">{serverData.summaryAnalytics.totalTools || 0}</div>
                      <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {serverData.summaryAnalytics.monetizedTools || 0} monetized
                      </p>
                    </div>
                    <div className={`p-1.5 rounded-full ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                      <Wrench className="h-3.5 w-3.5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Server Connection */}
            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Connection & Owner</CardTitle>
                <CardDescription>Essential information for connecting to and trusting this server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* MCP Connection URL */}
                <div>
                  <label className={`text-sm font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    MCP Connection URL
                  </label>
                  <div className="flex items-start gap-2">
                    <code className={`flex-1 text-sm p-3 rounded-md font-mono break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
                      }`}>
                      {urlUtils.getMcpUrl(serverData.serverId)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        copyToClipboard(urlUtils.getMcpUrl(serverData.serverId))
                        toast.success("MCP URL copied to clipboard")
                      }}
                      title="Copy MCP URL"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Payment Address */}
                <div>
                  <label className={`text-sm font-medium block mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Payment Address
                  </label>
                  <div className="flex items-start gap-2">
                    <code className={`flex-1 text-sm p-3 rounded-md font-mono break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"}`}>
                      {serverData.receiverAddress}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        copyToClipboard(serverData.receiverAddress)
                        toast.success("Address copied to clipboard")
                      }}
                      title="Copy address"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Owner & Server ID */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Server Owner
                    </label>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700" : "bg-gray-100"
                        }`}>
                        {serverData.creator?.avatarUrl || serverData.creator?.image ? (
                          <Image
                            src={serverData.creator?.avatarUrl || serverData.creator?.image || ''}
                            alt={serverData.creator.displayName || serverData.creator.name || ''}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <Users className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{serverData.creator?.displayName || serverData.creator?.name || ''}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm font-medium block mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Server ID
                    </label>
                    <code className={`text-sm font-mono block p-3 rounded-md break-all overflow-hidden ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-800"
                      }`}>
                      {serverData.serverId}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integration Tab */}
          <TabsContent value="integration" className="space-y-6">
            <IntegrationTab serverData={serverData} onTabChange={handleTabChange} />
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <Card className={`${isDark ? "bg-gray-800 border-gray-700" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Tools ({serverData.summaryAnalytics.totalTools})
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {serverData.summaryAnalytics.monetizedTools || 0} monetized • {(serverData.summaryAnalytics.totalTools || 0) - (serverData.summaryAnalytics.monetizedTools || 0)} free • Hover or click &quot;Paid&quot; badges to see pricing details
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllPricing(!showAllPricing)}
                    className={`${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    {showAllPricing ? 'Hide' : 'Show'} All Pricing
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Tool</TableHead>
                        <TableHead>Type</TableHead>
                        {showAllPricing && <TableHead>Pricing Details</TableHead>}
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Verification</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serverData.tools || []).map((tool) => (
                        <TableRow key={tool.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium text-sm">{tool.name}</div>
                              <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.description.length > 60 ? `${tool.description.substring(0, 60)}...` : tool.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                const isPaid = activePricing.length > 0
                                
                                if (isPaid && activePricing[0]) {
                                  return (
                                    <Tooltip 
                                      open={openTooltips[tool.id] || false}
                                      onOpenChange={(open) => handleTooltipOpenChange(tool.id, open)}
                                    >
                                      <TooltipTrigger asChild>
                                        <Badge 
                                          variant="secondary" 
                                          className={`text-xs cursor-pointer select-none ${isDark ? "bg-gray-600 text-gray-200 hover:bg-gray-500" : "hover:bg-gray-200"}`}
                                          onClick={(e) => toggleTooltip(tool.id, e)}
                                        >
                                          Paid
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent 
                                        side="right" 
                                        className={`max-w-xs p-3 ${
                                          isDark 
                                            ? "bg-gray-800 border-gray-700 text-gray-100" 
                                            : "bg-white border-gray-200 text-gray-900"
                                        }`}
                                      >
                                        <div className="space-y-2">
                                          <div className={`text-xs font-medium ${
                                            isDark ? "text-gray-300" : "text-gray-600"
                                          }`}>
                                            {activePricing.length === 1 ? 'Pricing' : `Pricing (${activePricing.length} options)`}
                                          </div>
                                          <div className="space-y-1.5">
                                            {activePricing.map((pricing, index) => (
                                              <div 
                                                key={index}
                                                className={`flex items-center justify-between py-1.5 px-2 rounded ${
                                                  isDark ? "bg-gray-700/50" : "bg-gray-50"
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <TokenDisplay
                                                    currency={pricing?.assetAddress}
                                                    network={pricing?.network}
                                                    amount={pricing?.maxAmountRequiredRaw && typeof pricing.maxAmountRequiredRaw === 'string' && pricing.maxAmountRequiredRaw.trim() !== ''
                                                      ? fromBaseUnits(pricing.maxAmountRequiredRaw, pricing.tokenDecimals || 0)
                                                      : '0'}
                                                  />
                                                </div>
                                                <Badge 
                                                  variant="outline" 
                                                  className={`text-xs ml-2 shrink-0 ${
                                                    isDark 
                                                      ? "border-gray-600 text-gray-300 bg-gray-800" 
                                                      : "border-gray-300 text-gray-600 bg-white"
                                                  }`}
                                                >
                                                  {pricing.network}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                } else {
                                  return (
                                    <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                      Free
                                    </Badge>
                                  )
                                }
                              })()}
                            </TooltipProvider>
                          </TableCell>
                          {showAllPricing && (
                            <TableCell className="w-[120px]">
                              {(() => {
                                const activePricing = getActivePricing(tool.pricing as PricingEntry[])
                                if (activePricing.length > 0) {
                                  // Get unique prices and show them compactly
                                  const uniquePrices = [...new Set(activePricing.map(p => 
                                    p?.maxAmountRequiredRaw && typeof p.maxAmountRequiredRaw === 'string' && p.maxAmountRequiredRaw.trim() !== ''
                                      ? fromBaseUnits(p.maxAmountRequiredRaw, p.tokenDecimals || 0)
                                      : '0'
                                  ))]
                                  
                                  return (
                                    <div className="text-sm font-medium">
                                      {uniquePrices.length === 1 ? (
                                        <span>{formatCurrency(uniquePrices[0], activePricing[0]?.assetAddress || '', activePricing[0]?.network)}</span>
                                      ) : (
                                        <div className="space-y-0.5">
                                          {uniquePrices.slice(0, 3).map((price, index) => (
                                            <div key={index} className="text-xs">
                                              {formatCurrency(price, activePricing.find(p => 
                                                fromBaseUnits(p.maxAmountRequiredRaw || '0', p.tokenDecimals || 0) === price
                                              )?.assetAddress || '', activePricing[0]?.network)}
                                            </div>
                                          ))}
                                          {uniquePrices.length > 3 && (
                                            <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                              +{uniquePrices.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                } else {
                                  return (
                                    <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                      Free
                                    </div>
                                  )
                                }
                              })()}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="text-sm">
                              <div>{tool.totalUsage || 0} uses</div>
                              <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                {tool.totalPayments || 0} payments
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {(tool.totalProofs || 0) > 0 ? (
                              <div className="flex items-center justify-end gap-2 text-xs">
                                <div className={`flex items-center gap-1 ${(tool.consistentProofs || 0) > 0 ? "text-green-500" : "text-red-500"
                                  }`}>
                                  {(tool.consistentProofs || 0) > 0 ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  <span>
                                    {tool.consistentProofs || 0}/{tool.totalProofs || 0}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                No proofs
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToolExecution(tool)}
                              className={`text-xs ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Try
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics & Payments Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Analytics Chart */}
            <AnalyticsChart 
              dailyAnalytics={serverData.dailyAnalytics || []} 
              isDark={isDark} 
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <CardTitle className="flex justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Recent Proofs
                    </div>
                    <div>
                      <Badge variant="outline" className={`ml-6 text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                        Powered by <a href="https://www.vlayer.xyz/" target="_blank" rel="noopener noreferrer" className="inline-block ml-1 hover:opacity-80 transition-opacity">
                          <Image src="/vlayer-logo.svg" alt="vLayer" width={60} height={20} className="inline" />
                        </a>
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(serverData.proofs || []).length > 0 ? (
                      (serverData.proofs || []).slice(0, 5).map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {proof.isConsistent ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{proof.tool.name}</p>
                              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                <button
                                  onClick={() => openExplorer(proof.user?.walletAddress || '', 'base-sepolia')}
                                  className={`hover:underline ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                                  title={`View address on ${getExplorerName('base-sepolia')}`}
                                >
                                  {proof.user?.displayName || proof.user?.walletAddress || ''}
                                </button>
                                {" • "}
                                {formatDate(typeof proof.createdAt === 'string' ? proof.createdAt : proof.createdAt.toISOString())}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {(safeNumber(proof.confidenceScore) * 100).toFixed(1)}%
                            </p>
                            {proof.webProofPresentation && (
                              <Badge variant="outline" className={`text-xs ${isDark ? "border-gray-500 text-gray-300" : ""}`}>
                                Web Proof
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={`text-center py-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No proofs yet</p>
                        <p className="text-xs mt-1">Proofs will appear here when users verify this server&apos;s tools</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Payments */}
            <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Recent Payments
                </CardTitle>
                <CardDescription>
                  Latest payment transactions from tool usage with verified token information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead className="text-right">Transaction</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(serverData.tools || [])
                        .flatMap(tool => (tool.payments || []))
                        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
                        .slice(0, 10).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="w-[60px]">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${payment.status === 'completed'
                                ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                                }`}>
                                {payment.status === 'completed' ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : (
                                  <Clock className="h-3 w-3" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              <TokenDisplay
                                currency={payment?.currency}
                                network={payment?.network}
                                amount={payment?.amountRaw && typeof payment.amountRaw === 'string' && payment.amountRaw.trim() !== ''
                                  ? fromBaseUnits(payment.amountRaw, payment.tokenDecimals || 0)
                                  : '0'}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {payment.user?.avatarUrl || payment.user?.image ? (
                                  <Image 
                                    src={payment.user.avatarUrl || payment.user.image || ''} 
                                    alt={payment.user.displayName || payment.user.name || ''} 
                                    width={20} 
                                    height={20} 
                                    className="rounded-full" 
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700" />
                                )}
                                {payment.user?.displayName || payment.user?.name || "No name"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{formatDate(payment.createdAt ? (typeof payment.createdAt === 'string' ? payment.createdAt : payment.createdAt.toISOString()) : '')}</div>
                              {payment.settledAt && (
                                <div className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Settled: {formatDate(typeof payment.settledAt === 'string' ? payment.settledAt : payment.settledAt.toISOString())}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {payment?.network ? (
                                <>
                                  <Badge variant="outline" className="text-xs w-fit mb-1">
                                    {payment.network}
                                  </Badge>
                                  <div className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                    {getExplorerName(payment.network as Network)}
                                  </div>
                                </>
                              ) : (
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                                  Unknown network
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {payment?.transactionHash && payment?.network ? (
                                <TransactionLink
                                  txHash={payment.transactionHash}
                                  network={payment.network as Network}
                                  variant="button"
                                  showCopyButton={true}
                                  className="text-xs"
                                />
                              ) : (
                                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                                  {payment?.transactionHash ? 'Unknown network' : 'Pending'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Tool Execution Modal */}
        {serverData && (
          <ToolExecutionModal
            isOpen={showToolModal}
            onClose={() => {
              setShowToolModal(false)
              setSelectedTool(null)
            }}
            tool={selectedTool}
            serverId={serverData.serverId}
          />
        )}
      </div>
    </div>
  )
}


================================================
FILE: app/src/components/custom-ui/analytics-chart.tsx
================================================
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fromBaseUnits } from "@/lib/commons"
import { RevenueDetail } from "@/lib/gateway/db/schema"
import { type DailyServerAnalytics } from "@/types/mcp"
import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react"
import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface AnalyticsChartProps {
  dailyAnalytics: DailyServerAnalytics[]
  isDark?: boolean
}

interface ChartDataPoint {
  date: string
  dateFormatted: string
  requests: number
  revenue: number
  users: number
  formattedRevenue: string
}

export function AnalyticsChart({ dailyAnalytics, isDark = false }: AnalyticsChartProps) {
  // Transform daily analytics data for charts
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!dailyAnalytics?.length) return []
    
    return dailyAnalytics
      .slice(0, 30) // Last 30 days
      .reverse() // Show chronological order
      .map((day) => {
        // Calculate total revenue from revenueDetails
        let totalRevenue = 0
        if (day.revenueDetails && Array.isArray(day.revenueDetails)) {
          totalRevenue = day.revenueDetails.reduce((sum, detail) => {
            if (detail && detail.amount_raw && detail.decimals !== undefined) {
              try {
                const humanAmount = parseFloat(fromBaseUnits(detail.amount_raw, detail.decimals))
                return sum + humanAmount
              } catch (error) {
                console.error('Error converting revenue amount:', error)
                return sum
              }
            }
            return sum
          }, 0)
        }

        // Format date for display
        const dateObj = new Date(day.date)
        const dateFormatted = dateObj.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })

        return {
          date: day.date,
          dateFormatted,
          requests: day.totalRequests || 0,
          revenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
          users: day.uniqueUsers || 0,
          formattedRevenue: `$${totalRevenue.toFixed(2)}`
        }
      })
  }, [dailyAnalytics])

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) {
      return {
        totalRequests: 0,
        totalRevenue: 0,
        totalUsers: 0,
        avgRequests: 0,
        avgRevenue: 0,
        maxRevenue: 0
      }
    }

    const totalRequests = chartData.reduce((sum, day) => sum + day.requests, 0)
    const totalRevenue = chartData.reduce((sum, day) => sum + day.revenue, 0)
    const totalUsers = chartData.reduce((sum, day) => sum + day.users, 0)
    const maxRevenue = Math.max(...chartData.map(day => day.revenue))

    return {
      totalRequests,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalUsers,
      avgRequests: Math.round(totalRequests / chartData.length),
      avgRevenue: Math.round((totalRevenue / chartData.length) * 100) / 100,
      maxRevenue: Math.round(maxRevenue * 100) / 100
    }
  }, [chartData])

  // Chart configuration for theming
  const chartConfig = {
    requests: {
      label: "Requests",
      color: isDark ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 50%)", // Blue
    },
    revenue: {
      label: "Revenue",
      color: isDark ? "hsl(142, 76%, 55%)" : "hsl(142, 76%, 45%)", // Green
    },
    users: {
      label: "Users", 
      color: isDark ? "hsl(280, 100%, 70%)" : "hsl(280, 100%, 60%)", // Purple
    }
  }

  if (!chartData.length) {
    return (
      <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Overview
          </CardTitle>
          <CardDescription>Visual representation of your server&apos;s performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-center py-12 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No analytics data available yet</p>
            <p className="text-xs mt-1">Charts will appear here once your server receives usage</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isDark ? "bg-gray-800 border-gray-700" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics Overview
        </CardTitle>
        <CardDescription>
          Last {chartData.length} days • {summaryStats.totalRequests} total requests • ${summaryStats.totalRevenue} total revenue
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-blue-900" : "bg-blue-100"}`}>
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Daily Requests</p>
              <p className="font-semibold">{summaryStats.avgRequests}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-green-900" : "bg-green-100"}`}>
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Avg Daily Revenue</p>
              <p className="font-semibold">${summaryStats.avgRevenue}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
            <div className={`p-2 rounded-full ${isDark ? "bg-purple-900" : "bg-purple-100"}`}>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>Peak Daily Revenue</p>
              <p className="font-semibold">${summaryStats.maxRevenue}</p>
            </div>
          </div>
        </div>

        {/* Chart Tabs */}
        <Tabs defaultValue="combined" className="w-full">
          <TabsList className={`grid w-full grid-cols-4 ${isDark ? "bg-gray-700" : ""}`}>
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* Combined View */}
          <TabsContent value="combined" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <LineChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="requests"
                  orientation="left"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  yAxisId="revenue"
                  orientation="right"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        name === 'revenue' ? `$${Number(value).toFixed(2)}` : Number(value).toLocaleString(),
                        chartConfig[name as keyof typeof chartConfig]?.label || name
                      ]}
                    />
                  } 
                />
                <Line
                  yAxisId="requests"
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-requests)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </TabsContent>

          {/* Requests Chart */}
          <TabsContent value="requests" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <AreaChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        Number(value).toLocaleString(),
                        'Requests'
                      ]}
                    />
                  } 
                />
                <Area
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  fill="var(--color-requests)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          {/* Revenue Chart */}
          <TabsContent value="revenue" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <BarChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                  tickFormatter={(value) => `$${value}`}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        `$${Number(value).toFixed(2)}`,
                        'Revenue'
                      ]}
                    />
                  } 
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </TabsContent>

          {/* Users Chart */}
          <TabsContent value="users" className="mt-6">
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <AreaChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 5 }}>
                <XAxis 
                  dataKey="dateFormatted" 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      labelFormatter={(label) => `${label}`}
                      formatter={(value, name) => [
                        Number(value).toLocaleString(),
                        'Unique Users'
                      ]}
                    />
                  } 
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  fill="var(--color-users)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}



================================================
FILE: app/src/components/custom-ui/built-with-section.tsx
================================================
"use client"

import { Trophy } from "lucide-react"
import Link from "next/link"

export default function BuiltWithSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left side - Title */}
        <div className="space-y-4">
          <Trophy className="h-6 w-6 text-foreground" />
          <h2 className="text-3xl font-semibold font-host">
            Built with<br />
            the best
          </h2>
        </div>

        {/* Right side - Links */}
        <div className="space-y-6 max-w-md">
          {/* Backed by section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground mb-3">
              Backed by{" "}
              <Link 
                href="https://vlayer.xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                vLayer
              </Link>{" "}
              and{" "}
              <Link 
                href="https://www.coinbase.com/developer-platform/discover/launches/summer-builder-grants" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Coinbase Developer Platform
              </Link>
              .
            </p>
          </div>

          {/* Powered by section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground mb-3">
              Powered by the{" "}
              <Link 
                href="https://modelcontextprotocol.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Model Context Protocol
              </Link>{" "}
              and{" "}
              <Link 
                href="https://x402.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                x402
              </Link>
              .
            </p>
          </div>

          {/* Awards section */}
          <div>
            <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
              1st place at{" "}
              <Link 
                href="https://ethglobal.com/events/agents" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                Coinbase Agents in Action
              </Link>
              , finalist at{" "}
              <Link 
                href="https://ethglobal.com/showcase/mcpay-fun-y16d3" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                ETHGlobal Prague
              </Link>{" "}
              and 2nd place at{" "}
              <Link 
                href="https://ethglobal.com/events/trifecta" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-foreground hover:text-teal-600 underline decoration-dotted underline-offset-2 transition-all duration-300 font-semibold"
              >
                ETH Global Trifecta
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}



================================================
FILE: app/src/components/custom-ui/chat-body.tsx
================================================
'use client';

import { Messages } from '@/components/custom-ui/messages';
import { MultimodalInput } from '@/components/custom-ui/multimodal-input';
import { ChatStatus, UIMessage } from 'ai';
import { useState } from 'react';

export interface ChatBodyProps {
  chatId: string;
  status: ChatStatus;
  messages: UIMessage[];
  isReadonly?: boolean;
  onSendMessage: (text: string) => void;
  onStop?: () => void;
}

export function ChatBody({
  chatId,
  status,
  messages,
  isReadonly = false,
  onSendMessage,
  onStop,
}: ChatBodyProps) {
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-background">
      {/* Messages list: grows and scrolls */}
      <div className="flex-1 overflow-auto h-full">
        <Messages status={status} messages={messages} />
      </div>

      {/* Input bar: always visible */}
      <form
        className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isReadonly && input.trim()) {
            onSendMessage(input);
            setInput('');
          }
        }}
      >
        <MultimodalInput
          chatId={chatId}
          messagesCount={messages.length}
          status={status}
          input={input}
          setInput={setInput}
          isReadonly={isReadonly}
          onStop={onStop}
          onSendMessage={onSendMessage}
        />
      </form>
    </div>
  );
}


================================================
FILE: app/src/components/custom-ui/chat-with-preview.tsx
================================================
'use client';

import { useMemo, useState } from 'react';
import { ChatBody } from '@/components/custom-ui/chat-body';
import { Button } from '@/components/ui/button';
import { ChatStatus, UIMessage } from 'ai';
import { McpPreview } from './mcp-preview';
import { CodebasePreview } from './code-preview';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ExternalLink, Loader2, XCircle, Copy, Check } from 'lucide-react';
import { api } from '@/lib/client/utils';
import { useSession } from '@/lib/client/auth';

export interface ChatWithPreviewProps {
  id: string;
  messages: UIMessage[];
  status: ChatStatus;
  isReadonly?: boolean;
  onSendMessage: (text: string) => void;
  onStop?: () => void;
  previewUrl?: string | null;
  userWalletAddress?: string;
  codebase?: string;
}

export default function ChatWithPreview({
  id,
  messages,
  status,
  isReadonly = false,
  onSendMessage,
  onStop,
  previewUrl = 'https://vercel-mcp-handler-mcpay.vercel.app/mcp',
  userWalletAddress = '0x0000000000000000000000000000000000000000',
  codebase = '',
}: ChatWithPreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const { data: session } = useSession();
  type DeployStepStatus = 'pending' | 'active' | 'success' | 'error';
  type DeployStep = { key: string; label: string; status: DeployStepStatus };
  const [steps, setSteps] = useState<DeployStep[]>([ 
    { key: 'prepare', label: 'Prepare codebase', status: 'pending' },
    { key: 'create_repo', label: 'Create GitHub repository', status: 'pending' },
    { key: 'commit_files', label: 'Commit project files', status: 'pending' },
    { key: 'create_vercel_link', label: 'Create Vercel import link', status: 'pending' },
    { key: 'redirect', label: 'Redirect to Vercel', status: 'pending' },
  ]);

  const completedCount = useMemo(() => steps.filter(s => s.status === 'success').length, [steps]);
  const totalCount = steps.length;
  const progressValue = Math.round((completedCount / totalCount) * 100);
  // Infer required env keys from provided codebase (.env, .env.example, env.example)
  type CodebaseFileEntry = { content: string; lastModified?: number; size?: number; lastModifiedISO?: string };
  type CodebasePayload = { files: Record<string, CodebaseFileEntry> };

  function extractEnvKeysFromContent(content: string): string[] {
    const keys = new Set<string>();
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match && match[1]) keys.add(match[1]);
    }
    return Array.from(keys);
  }

  const requiredEnvKeys = useMemo(() => {
    // Always require MCPAY essentials
    const mustHave = ['MCPAY_API_KEY', 'MCPAY_API_URL'];
    try {
      if (!codebase) return mustHave;
      const parsed = JSON.parse(codebase) as CodebasePayload;
      const files = parsed?.files || {};
      const candidates = Object.keys(files).filter((p) => {
        const name = p.split('/').pop() || p;
        // common env filenames
        return (
          name === '.env' ||
          name === '.env.example' ||
          name === 'env.example' ||
          name === 'env' ||
          /^\.env\./.test(name) // .env.local, .env.production, etc.
        );
      });

      const discoveredKeys = new Set<string>();
      for (const filePath of candidates) {
        const content = files[filePath]?.content || '';
        for (const k of extractEnvKeysFromContent(content)) discoveredKeys.add(k);
      }

      const deduped = Array.from(discoveredKeys);
      // Merge discovered keys with required MCPAY keys (MCPAY first for UX)
      const merged = Array.from(new Set<string>([...mustHave, ...deduped]));
      return merged;
    } catch (_err) {
      return mustHave;
    }
  }, [codebase]);
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [envCopied, setEnvCopied] = useState<Record<string, boolean>>({});
  const allEnvCopied = requiredEnvKeys.every((k) => envCopied[k]);

  function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    // btoa returns base64; convert to base64url by replacing chars and trimming '='
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function generateClientApiKey(prefix: string = 'mcpay'): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `${prefix}_${toBase64Url(bytes)}`;
  }

  function deriveApiUrl(): string {
    // Always use current website origin for MCPAY_API_URL
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  }

  async function copyEnvValue(name: string) {
    const value = envValues[name] || '';
    try {
      await navigator.clipboard.writeText(value);
      setEnvCopied((prev) => ({ ...prev, [name]: true }));
    } catch (_) {
      // Silently ignore copy errors
    }
  }

  function setStepStatus(key: string, status: DeployStepStatus) {
    setSteps(prev => prev.map(s => (s.key === key ? { ...s, status } : s)));
  }

  async function handleDeploy() {
    setIsDeployOpen(true);
    setDeployError(null);
    setVercelUrl(null);
    setRepoUrl(null);
    // Prepare env values for the user to copy in Vercel
    const preparedEnv: Record<string, string> = {};
    // Provide sensible defaults for known keys
    for (const key of requiredEnvKeys) {
      if (key === 'MCPAY_API_KEY') preparedEnv[key] = generateClientApiKey();
      else if (key === 'MCPAY_API_URL') preparedEnv[key] = deriveApiUrl();
      else preparedEnv[key] = '';
    }

    // If user is authenticated, create a real API key via our API
    try {
      if (session?.user?.id && requiredEnvKeys.includes('MCPAY_API_KEY')) {
        const resp = await api.createApiKey(session.user.id, {
          name: 'Deploy Button Key',
          permissions: ['read', 'write', 'execute'],
        });
        if (resp && typeof resp === 'object' && 'apiKey' in resp && resp.apiKey) {
          preparedEnv.MCPAY_API_KEY = resp.apiKey as string;
        }
      }
    } catch (_) {
      // Fallback to generated client key if API call fails
    }
    setEnvValues(preparedEnv);
    setEnvCopied(Object.fromEntries(requiredEnvKeys.map((k) => [k, false])) as Record<string, boolean>);
    // Reset steps
    setSteps([
      { key: 'prepare', label: 'Prepare codebase', status: 'active' },
      { key: 'create_repo', label: 'Create GitHub repository', status: 'pending' },
      { key: 'commit_files', label: 'Commit project files', status: 'pending' },
      { key: 'create_vercel_link', label: 'Create Vercel import link', status: 'pending' },
      { key: 'redirect', label: 'Open Vercel (after copying envs)', status: 'pending' },
    ]);

    try {
      if (!codebase) {
        throw new Error('No codebase to deploy yet.');
      }
      // Prepare step done
      setStepStatus('prepare', 'success');
      setStepStatus('create_repo', 'active');

      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codebase,
          repoName: 'mcpay-app',
          isPrivate: true,
          // Always include MCPAY essentials in the env list sent to the deploy system
          env: Array.from(new Set([...requiredEnvKeys, 'MCPAY_API_KEY', 'MCPAY_API_URL'])),
          projectName: 'mcpay-app',
          redirectPath: '/build?deployed=1'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start deploy');

      // Repo creation + commits assumed complete on successful response
      setStepStatus('create_repo', 'success');
      setStepStatus('commit_files', 'success');
      setStepStatus('create_vercel_link', 'active');

      if (data?.repositoryUrl) setRepoUrl(data.repositoryUrl as string);
      if (data?.vercelDeployUrl) setVercelUrl(data.vercelDeployUrl as string);

      setStepStatus('create_vercel_link', 'success');
      // Wait for user to copy envs before enabling the Vercel button
      setStepStatus('redirect', 'active');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Deployment failed';
      setDeployError(message);
      // Mark the first active step as error
      setSteps(prev => {
        const idx = prev.findIndex(s => s.status === 'active');
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: 'error' };
          return copy;
        }
        return prev;
      });
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* Chat pane */}
        <div className="flex-1 flex flex-col min-h-0">
          <ChatBody
            chatId={id}
            status={status}
            messages={messages}
            isReadonly={isReadonly}
            onSendMessage={onSendMessage}
            onStop={onStop}
          />
        </div>

        {/* Preview/Code pane */}
        <div className="hidden md:flex flex-col w-2/3 border-l border-gray-200 bg-background">
          {/* Navbar: Tabs and Deploy button */}
          <div className="flex items-center justify-between p-2 border-b border-muted-background">
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 cursor-pointer rounded-sm transition-opacity ${
                  activeTab === 'preview' ? 'opacity-100 bg-accent' : 'opacity-50'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`px-2 cursor-pointer rounded-sm transition-opacity ${
                  activeTab === 'code' ? 'opacity-100 bg-accent' : 'opacity-50'
                }`}
                onClick={() => setActiveTab('code')}
              >
                Code
              </Button>
            </div>
            <Button
              variant="default"
              className="cursor-pointer rounded-sm"
              size="sm"
              onClick={handleDeploy}
            >
              Deploy
            </Button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'preview' ? (
              previewUrl ? (
                <McpPreview url={previewUrl} userWalletAddress={userWalletAddress} />
              ) : (
                <div className="p-4 text-center text-muted-foreground/80">
                  No preview available. Try creating an MCP Server.
                </div>
              )
            ) : codebase ? (
              <CodebasePreview sessionData={codebase} />
            ) : (
              <div className="p-4 text-center text-muted-foreground/80">
                No code available.
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={isDeployOpen} onOpenChange={setIsDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploying your project</DialogTitle>
            <DialogDescription>
              We’ll create a GitHub repository, commit your code, and send you to Vercel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Progress value={progressValue} />
            <ul className="space-y-2">
              {steps.map((step) => (
                <li key={step.key} className="flex items-center gap-2">
                  {step.status === 'success' && <CheckCircle2 className="text-green-600" />}
                  {step.status === 'active' && <Loader2 className="animate-spin text-primary" />}
                  {step.status === 'error' && <XCircle className="text-red-600" />}
                  {step.status === 'pending' && <div className="size-4 rounded-full border border-muted-foreground/40" />}
                  <span className="text-sm">{step.label}</span>
                </li>
              ))}
            </ul>
            {/* Env values section */}
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Add these Environment Variables in Vercel</div>
              <div className="space-y-2">
                {requiredEnvKeys.map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-48 text-xs text-muted-foreground">{key}</div>
                    <div className="flex-1">
                      <div className="text-xs break-all rounded bg-muted px-2 py-1">
                        {envValues[key] || ''}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={envCopied[key] ? 'secondary' : 'default'}
                      className="h-7"
                      onClick={() => copyEnvValue(key)}
                    >
                      {envCopied[key] ? (
                        <span className="inline-flex items-center gap-1"><Check className="size-3" /> Copied</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Copy className="size-3" /> Copy</span>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            {repoUrl && (
              <div className="text-sm">
                Repository: <a href={repoUrl} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Open <ExternalLink className="size-3" /></a>
              </div>
            )}
            {deployError && (
              <div className="text-sm text-red-600">{deployError}</div>
            )}
          </div>
          <DialogFooter>
            {vercelUrl ? (
              <Button disabled={!allEnvCopied} onClick={() => window.open(vercelUrl as string, '_blank', 'noopener,noreferrer')}>
                Continue to Vercel
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setIsDeployOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


================================================
FILE: app/src/components/custom-ui/client-explorer-page.tsx
================================================
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, ArrowUpRight, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Footer from "@/components/custom-ui/footer"
import { useTheme } from "@/components/providers/theme-context"
import { api } from "@/lib/client/utils"
import { getExplorerUrl } from "@/lib/client/blockscout"
import { formatAmount, isNetworkSupported, type UnifiedNetwork } from "@/lib/commons"
import type { PaymentListItem } from "@/types/payments"
import { TokenIcon } from "@/components/custom-ui/token-icon"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"

/* ---------------- Types used by UI ---------------- */
type PaymentStatus = "success" | "pending" | "failed"
type ExplorerRow = {
  id: string
  status: PaymentStatus
  serverId?: string
  serverName?: string
  tool?: string
  amountFormatted: string
  currency?: string
  network: string
  user: string
  timestamp: string
  txHash: string
}

/* 24 rows per page */
const PAGE_SIZE = 24
const POLL_INTERVAL_MS = 10000

/* ---------------- Helpers ---------------- */
const truncateHash = (h: string, left = 6, right = 7) =>
  h.length > left + right + 3 ? `${h.slice(0, left)}...${h.slice(-right)}` : h

/* relative time with short units (secs, mins, hrs, days…) */
function formatRelativeShort(iso: string, now = Date.now()) {
  const diffMs = new Date(iso).getTime() - now
  const abs = Math.abs(diffMs)
  const sec = Math.round(abs / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  const month = Math.round(day / 30)
  const year = Math.round(day / 365)

  const value =
    sec < 60 ? { n: Math.max(1, sec), u: "secs" } :
      min < 60 ? { n: min, u: "mins" } :
        hr < 24 ? { n: hr, u: "hrs" } :
          day < 30 ? { n: day, u: "days" } :
            month < 12 ? { n: month, u: "mos" } :
              { n: year, u: "yrs" }

  return `${value.n} ${value.u} ${diffMs <= 0 ? "ago" : "from now"}`
}

function safeTxUrl(network: string, hash: string) {
  if (isNetworkSupported(network)) {
    return getExplorerUrl(hash, network as UnifiedNetwork, 'tx')
  }
  return `https://etherscan.io/tx/${hash}`
}

// No dummy rows; we now use real API

export default function ClientExplorerPage() {
  const { isDark } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()

  const pageFromQuery = Number(searchParams.get("page") || "1")
  const [page, setPage] = useState<number>(Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1)

  const [rows, setRows] = useState<ExplorerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  const totalPages = useMemo(() => {
    if (totalCount != null) return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    return page + (hasNext ? 1 : 0)
  }, [totalCount, page, hasNext])

  /* keep URL in sync */
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    if (page === 1) sp.delete("page"); else sp.set("page", String(page))
    router.replace(`?${sp.toString()}`, { scroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  /* accept manual query changes */
  useEffect(() => {
    if (page !== pageFromQuery && Number.isFinite(pageFromQuery) && pageFromQuery > 0) {
      setPage(pageFromQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageFromQuery])

  /* polling timer */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [page])

  /* fetch */
  useEffect(() => {
    const controller = new AbortController()
    const fetchRows = async () => {
      const isPoll = tick > 0
      if (!isPoll) setLoading(true)
      setError(null)

      try {
        const offset = (page - 1) * PAGE_SIZE
        const { items, total } = await api.getLatestPayments(PAGE_SIZE, offset, 'completed')
        const mapped: ExplorerRow[] = items.map((p: PaymentListItem) => ({
          id: p.id,
          status: p.status as PaymentStatus,
          serverId: p.serverId,
          serverName: p.serverName,
          tool: p.tool,
          amountFormatted: formatAmount(String(p.amountRaw), Number(p.tokenDecimals), { precision: 2, showSymbol: false, symbol: p.currency }),
          currency: p.currency,
          network: p.network,
          user: p.user,
          timestamp: p.timestamp,
          txHash: p.txHash,
        }))
        setRows(mapped)
        setTotalCount(total)
        setHasNext(offset + mapped.length < total)
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") setError(e.message)
        else if (!(e instanceof Error)) setError("Failed to fetch payments")
        setRows([])
      } finally {
        if (!isPoll) setLoading(false)
      }
    }

    fetchRows()
    return () => controller.abort()
  }, [page, tick])

  const go = (p: number) => setPage(Math.max(1, p))
  const goPrev = () => go(page - 1)
  const goNext = () => { if (totalCount != null ? page < totalPages : hasNext) go(page + 1) }
  const showPagination = totalCount != null ? totalCount > PAGE_SIZE : page > 1 || hasNext

  const onCopy = async (text: string, message = "Copied") => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(message)
    } catch {
      toast.error("Could not copy")
    }
  }

  /* Compact header/cell padding for tighter layout */
  const th = "px-2 sm:px-3 py-3 text-[12px] uppercase tracking-widest text-muted-foreground text-left whitespace-nowrap"
  const td = "px-2 sm:px-3 py-3.5 border-t border-border align-middle"

  if (error) {
    return (
      <div className="bg-background">
        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-center">
            <h1 className={`text-5xl font-extrabold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>Something went wrong</h1>
            <p className={`text-lg max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>We couldn&apos;t load the explorer right now.</p>
          </div>
        </main>
        <div className="mt-12">
          <Footer />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <main>
        {/* Wider container; title aligned with table */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-semibold font-host mb-10">Explorer</h2>
          </div>

          {/* Horizontal scroll on mobile; slightly condensed min width */}
          <div className="max-w-7xl lg:max-w-[1800px] mx-auto overflow-x-auto">
            <div className="min-w-[1100px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border">
                    <TableHead className="w-[40px] pr-1 sr-only">Status</TableHead>
                    <TableHead className={`${th} font-mono`}>Server</TableHead>
                    <TableHead className={`${th} font-mono`}>Tool</TableHead>
                    <TableHead className={`${th} font-mono`}>Amount</TableHead>
                    <TableHead className={`${th} font-mono`}>Network</TableHead>
                    <TableHead className={`${th} font-mono`}>Date</TableHead>
                    <TableHead className={`${th} font-mono text-right pr-0`}>Transaction</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {[...Array(8)].map((__, j) => (
                          <TableCell key={j} className={td}>
                            <Skeleton className="h-5 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                    : rows.map((r) => {
                      const txUrl = safeTxUrl(r.network, r.txHash)
                      const fullDate = new Date(r.timestamp).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      const rel = formatRelativeShort(r.timestamp)

                      return (
                        <TableRow key={r.id} className="hover:bg-muted/40">
                          {/* Status indicator with tooltip */}
                          <TableCell className={`${td} w-[40px] pr-1`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-teal-700 bg-teal-500/10 hover:bg-teal-500/20 dark:text-teal-200 dark:bg-teal-800/50 dark:hover:bg-teal-800/70 transition-all duration-300"
                                    aria-label={r.status}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{r.status === 'success' ? 'Success' : r.status === 'pending' ? 'Pending' : 'Failed'}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          {/* Server */}
                          <TableCell className={`${td}`}>
                            {r.serverName && r.serverId ? (
                              <Link
                                href={`/servers/${r.serverId}`}
                                className="text-[0.95rem] text-foreground/80 hover:text-teal-600 hover:underline hover:decoration-dotted underline-offset-2 whitespace-nowrap transition-all duration-300"
                              >
                                {r.serverName}
                              </Link>
                            ) : (
                              <span className="text-[0.95rem] text-muted-foreground italic">Unknown</span>
                            )}
                          </TableCell>


                          {/* Tool */}
                          <TableCell className={`${td}`}>
                            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded text-foreground">
                              {r.tool}
                            </span>
                          </TableCell>

                          {/* Amount + currency tooltip with token icon */}
                          <TableCell className={`${td} font-mono`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                                    <TokenIcon currencyOrAddress={r.currency} network={r.network} size={16} />
                                    <span className="text-foreground">{r.amountFormatted}</span>
                                  </div>
                                </TooltipTrigger>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          {/* Network */}
                          <TableCell className={`${td} font-mono text-xs sm:text-sm text-muted-foreground`}>
                          <span className="font-mono text-sm border border-foreground-muted px-2 py-0.5 rounded text-foreground-muted">
                              {r.network}
                            </span>
                          </TableCell>

                          {/* Date: relative, tooltip shows full */}
                          <TableCell className={`${td} text-[0.95rem] sm:text-sm text-muted-foreground pr-1`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="cursor-default">
                                  {rel}
                                </TooltipTrigger>
                                <TooltipContent>{fullDate}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>

                          {/* Transaction: right-aligned, reduced left padding */}
                          <TableCell className={`${td} font-mono text-right pr-0 pl-1`}>
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-xs sm:text-sm mr-2">{truncateHash(r.txHash)}</span>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="group h-7 w-7 rounded-sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onCopy(r.txHash, "Copied transaction hash")
                                      }}
                                    >
                                      <Copy className="size-4 stroke-[2] text-muted-foreground group-hover:text-foreground transition-all duration-300" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy</TooltipContent>
                                </Tooltip>


                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      asChild
                                      size="icon"
                                      variant="ghost"
                                      className="group h-7 w-7 rounded-sm"
                                    >
                                      <a
                                        href={txUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <ArrowUpRight className="size-5 stroke-[2] text-muted-foreground/80 group-hover:text-foreground transition-all duration-300" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Transaction Details</TooltipContent>
                                </Tooltip>

                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </div>

          {showPagination && (
            <div className="max-w-7xl mx-auto mt-10">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={goPrev}
                      aria-disabled={page === 1 || loading}
                      className={page === 1 || loading ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>

                  {totalCount != null && totalPages > 1 ? (
                    <>
                      {page > 2 && (
                        <>
                          <PaginationItem>
                            <PaginationLink onClick={() => go(1)}>1</PaginationLink>
                          </PaginationItem>
                          {page > 3 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                        </>
                      )}

                      {Array.from({ length: 3 })
                        .map((_, i) => page - 1 + i)
                        .filter(p => p >= 1 && p <= totalPages)
                        .map(p => (
                          <PaginationItem key={p}>
                            <PaginationLink onClick={() => go(p)} isActive={p === page}>
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                      {page < totalPages - 1 && (
                        <>
                          {page < totalPages - 2 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink onClick={() => go(totalPages)}>{totalPages}</PaginationLink>
                          </PaginationItem>
                        </>
                      )}
                    </>
                  ) : (
                    <PaginationItem>
                      <PaginationLink isActive>{page}</PaginationLink>
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={goNext}
                      aria-disabled={loading || (totalCount != null ? page >= totalPages : !hasNext)}
                      className={loading || (totalCount != null ? page >= totalPages : !hasNext) ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

      {/* simple spacing below pagination, no fixed footer */}
      <div className="mt-12">
        <Footer />
      </div>
    </div>
  )
}



================================================
FILE: app/src/components/custom-ui/client-servers-page.tsx
================================================
"use client"

import { useEffect, useMemo, useRef, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TrendingUp } from "lucide-react"
import { useTheme } from "@/components/providers/theme-context"
import { urlUtils } from "@/lib/client/utils"
import ServersGrid from "@/components/custom-ui/servers-grid"
import Footer from "@/components/custom-ui/footer"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination"

interface APITool {
    id: string
    name: string
    description: string
    inputSchema: Record<string, unknown>
    isMonetized: boolean
    payment: Record<string, unknown> | null
    status: string
    createdAt: string
    updatedAt: string
}
interface MCPInputPropertySchema {
    type: string
    description?: string
    [key: string]: unknown
}
interface MCPTool {
    name: string
    description?: string
    inputSchema: {
        type: string
        properties: Record<string, MCPInputPropertySchema>
    }
    annotations?: {
        title?: string
        readOnlyHint?: boolean
        destructiveHint?: boolean
        idempotentHint?: boolean
        openWorldHint?: boolean
    }
}
export interface MCPServer {
    id: string
    name: string
    description: string
    url: string
    category: string
    tools: MCPTool[]
    icon: React.ReactNode
    verified?: boolean
}
interface APIServer {
    id: string
    serverId: string
    name: string
    receiverAddress: string
    description: string
    metadata?: Record<string, unknown>
    status: string
    createdAt: string
    updatedAt: string
    tools: APITool[]
}
type ApiArrayResponse = APIServer[]
type ApiObjectResponse = { items: APIServer[]; total: number }

const PAGE_SIZE = 12

const transformServerData = (s: APIServer): MCPServer => ({
    id: s.serverId,
    name: s.name || "Unknown Server",
    description: s.description || "No description available",
    url: s.receiverAddress,
    category: (s.metadata as Record<string, unknown>)?.category as string || "General",
    icon: <TrendingUp className="h-6 w-6" />,
    verified: s.status === "active",
    tools: s.tools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: {
            type: (t.inputSchema as Record<string, unknown>)?.type as string || "object",
            properties: (t.inputSchema as Record<string, unknown>)?.properties as Record<string, MCPInputPropertySchema> || {},
        },
        annotations: { title: t.name, readOnlyHint: !t.isMonetized, destructiveHint: false },
    })),
})

export default function ClientServersPage() {
    const { isDark } = useTheme()
    const searchParams = useSearchParams()
    const router = useRouter()

    const pageFromQuery = Number(searchParams.get("page") || "1")
    const [page, setPage] = useState<number>(Number.isFinite(pageFromQuery) && pageFromQuery > 0 ? pageFromQuery : 1)

    const [servers, setServers] = useState<MCPServer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasNext, setHasNext] = useState(false)
    const [totalCount, setTotalCount] = useState<number | null>(null)

    const [footerFixed, setFooterFixed] = useState(true)
    const contentRef = useRef<HTMLDivElement | null>(null)

    const totalPages = useMemo(() => {
        if (totalCount != null) return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
        return page + (hasNext ? 1 : 0)
    }, [totalCount, page, hasNext])

    useEffect(() => {
        const sp = new URLSearchParams(searchParams.toString())
        if (page === 1) sp.delete("page"); else sp.set("page", String(page))
        router.replace(`?${sp.toString()}`, { scroll: true })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page])

    useEffect(() => {
        if (page !== pageFromQuery && Number.isFinite(pageFromQuery) && pageFromQuery > 0) {
            setPage(pageFromQuery)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageFromQuery])

    useEffect(() => {
        const controller = new AbortController()
        const fetchServers = async () => {
            try {
                setLoading(true)
                setError(null)
                const offset = (page - 1) * PAGE_SIZE
                const res = await fetch(urlUtils.getApiUrl(`/servers?limit=${PAGE_SIZE}&offset=${offset}`), {
                    signal: controller.signal,
                })
                if (!res.ok) throw new Error(`Failed to fetch servers: ${res.status}`)
                const data: ApiArrayResponse | ApiObjectResponse = await res.json()

                if (Array.isArray(data)) {
                    setServers(data.map(transformServerData))
                    setTotalCount(null)
                    setHasNext(data.length === PAGE_SIZE)
                } else {
                    setServers(data.items.map(transformServerData))
                    setTotalCount(data.total)
                    setHasNext(offset + data.items.length < data.total)
                }
            } catch (e: unknown) {
                if (e instanceof Error && e.name !== "AbortError") {
                    setError(e.message)
                } else if (!(e instanceof Error)) {
                    setError("Failed to fetch servers")
                }
            } finally {
                setLoading(false)
            }
        }

        fetchServers()
        return () => controller.abort()
    }, [page])

    useEffect(() => {
        let mounted = true

        const imgsLoaded = () => {
            const imgs = Array.from(document.images).filter(img => !img.complete)
            if (imgs.length === 0) return Promise.resolve()
            return new Promise<void>(resolve => {
                let done = 0
                const onDone = () => { if (++done >= imgs.length) resolve() }
                imgs.forEach(img => {
                    img.addEventListener("load", onDone, { once: true })
                    img.addEventListener("error", onDone, { once: true })
                })
                setTimeout(resolve, 500)
            })
        }

        const measure = () => {
            const doc = document.documentElement
            const body = document.body
            const scrollH = Math.max(body.scrollHeight, doc.scrollHeight)
            const clientH = window.innerHeight
            if (mounted) setFooterFixed(scrollH <= clientH + 1)
        }

        const settleThenMeasure = async () => {
            if (loading) {
                setFooterFixed(true)
                return
            }
            await imgsLoaded()
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
            if (!mounted) return
            measure()
        }

        settleThenMeasure()
        const onResize = () => requestAnimationFrame(measure)
        window.addEventListener("resize", onResize)

        return () => {
            mounted = false
            window.removeEventListener("resize", onResize)
        }
    }, [loading, servers, page, totalCount])

    const getFriendlyErrorMessage = (err: string) =>
        err.includes("404")
            ? { title: "No servers found", message: "It seems there are no servers registered yet." }
            : { title: "Something went wrong", message: "We couldn't load the servers right now." }

    const go = (p: number) => setPage(Math.max(1, p))
    const goPrev = () => go(page - 1)
    const goNext = () => {
        if (totalCount != null ? page < totalPages : hasNext) go(page + 1)
    }

    if (error) {
        const info = getFriendlyErrorMessage(error)
        return (
            <div className="bg-background">
                <main>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 text-center">
                        <h1 className={`text-5xl font-extrabold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>{info.title}</h1>
                        <p className={`text-lg max-w-3xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>{info.message}</p>
                    </div>
                </main>
                <div className={footerFixed ? "fixed inset-x-0 bottom-0" : ""}>
                    <Footer />
                </div>
            </div>
        )
    }

    const showPagination = totalCount != null ? totalCount > PAGE_SIZE : page > 1 || hasNext

    return (
        <div className="bg-background">
            <main>
                <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                    <div className="max-w-6xl px-4 md:px-6 mx-auto">
                        <h2 className="text-3xl font-semibold font-host mb-10">All Servers</h2>
                    </div>

                    <ServersGrid
                        servers={servers}
                        loading={loading}
                        className={`mb-0 ${loading && servers.length === 0 ? "min-h-[400px]" : ""}`}
                    />

                    {showPagination && (
                        <div className="mt-10">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={goPrev}
                                            aria-disabled={page === 1 || loading}
                                            className={page === 1 || loading ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>

                                    {totalCount != null && totalPages > 1 ? (
                                        <>
                                            {page > 2 && (
                                                <>
                                                    <PaginationItem>
                                                        <PaginationLink onClick={() => go(1)}>1</PaginationLink>
                                                    </PaginationItem>
                                                    {page > 3 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                </>
                                            )}

                                            {Array.from({ length: 3 })
                                                .map((_, i) => page - 1 + i)
                                                .filter(p => p >= 1 && p <= totalPages)
                                                .map(p => (
                                                    <PaginationItem key={p}>
                                                        <PaginationLink onClick={() => go(p)} isActive={p === page}>
                                                            {p}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}

                                            {page < totalPages - 1 && (
                                                <>
                                                    {page < totalPages - 2 && (
                                                        <PaginationItem>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    )}
                                                    <PaginationItem>
                                                        <PaginationLink onClick={() => go(totalPages)}>{totalPages}</PaginationLink>
                                                    </PaginationItem>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <PaginationItem>
                                            <PaginationLink isActive>{page}</PaginationLink>
                                        </PaginationItem>
                                    )}

                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={goNext}
                                            aria-disabled={loading || (totalCount != null ? page >= totalPages : !hasNext)}
                                            className={loading || (totalCount != null ? page >= totalPages : !hasNext) ? "pointer-events-none opacity-50" : ""}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </div>
            </main>

            <div className={footerFixed ? "fixed inset-x-0 bottom-0" : "mt-12"}>
                <Footer />
            </div>
        </div>
    )
}



================================================
FILE: app/src/components/custom-ui/code-block.tsx
================================================
'use client';

import type { Literal } from 'mdast';
import type { ReactNode } from 'react';

type CodeBlockNode = Literal & {
  // mdast Literal nodes have a `value: string` which is your code text
  value: string;
};

interface CodeBlockProps {
  node: CodeBlockNode;
  inline: boolean;
  className?: string;
  children: ReactNode;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className={
            `text-sm w-full font-mono overflow-x-auto
             bg-zinc-50 dark:bg-zinc-900 p-4
             border border-zinc-200 dark:border-zinc-700
             rounded-sm dark:text-zinc-50 text-zinc-900`
          }
        >
          <code className="whitespace-pre-wrap break-words">
            {children}
          </code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={
          `${className ?? ''} text-sm
           bg-zinc-100 dark:bg-zinc-800
           py-0.5 px-1 rounded-md`
        }
        {...props}
      >
        {children}
      </code>
    );
  }
}


================================================
FILE: app/src/components/custom-ui/code-preview.tsx
================================================
'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { File, Copy, Download, FileText, Code, Folder, FolderOpen, ChevronRight, ChevronDown, Check } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface FileInfo {
  content: string;
  lastModified: number;
  size: number;
  lastModifiedISO: string;
}

interface SessionData {
  files: Record<string, FileInfo>;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  fileInfo?: FileInfo;
}

interface CodebasePreviewProps {
  sessionData: string;
}

export function CodebasePreview({ sessionData }: CodebasePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<SessionData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // theme & mount for Monaco
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const monacoTheme = mounted
    ? resolvedTheme === 'dark'
      ? 'vs-dark'
      : 'vs'
    : 'vs';

  // Build file tree from flat file structure
  const buildFileTree = (files: Record<string, FileInfo>): TreeNode[] => {
    const tree: TreeNode[] = [];
    const folders: Record<string, TreeNode> = {};

    // Sort files to ensure consistent ordering
    const sortedFilePaths = Object.keys(files).sort();

    for (const filePath of sortedFilePaths) {
      const parts = filePath.split('/');
      let currentLevel = tree;
      let currentPath = '';

      // Create folders for all path segments except the last one (which is the file)
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        let folder = currentLevel.find(node => node.name === folderName && node.type === 'folder');
        if (!folder) {
          folder = {
            name: folderName,
            path: currentPath,
            type: 'folder',
            children: []
          };
          currentLevel.push(folder);
          folders[currentPath] = folder;
        }
        currentLevel = folder.children!;
      }

      // Add the file
      const fileName = parts[parts.length - 1];
      currentLevel.push({
        name: fileName,
        path: filePath,
        type: 'file',
        fileInfo: files[filePath]
      });
    }

    return tree;
  };

  // parse JSON
  useEffect(() => {
    try {
      const data = JSON.parse(sessionData) as SessionData;
      setParsedData(data);
      setParseError(null);
      const first = Object.keys(data.files)[0];
      if (first) setSelectedFile(first);
      // Auto-expand root level folders
      const tree = buildFileTree(data.files);
      const rootFolders = new Set(tree.filter(node => node.type === 'folder').map(folder => folder.path));
      setExpandedFolders(rootFolders);
    } catch (err) {
      setParsedData(null);
      setParseError(err instanceof Error ? err.message : 'Invalid session data');
    }
  }, [sessionData]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const [justCopied, setJustCopied] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000); // reset after 2s
    });
  };

  const handleDownload = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // indicate success
    setJustDownloaded(true);
    setTimeout(() => setJustDownloaded(false), 2000);
  };

  const fmtSize = (b: number) =>
    b < 1024
      ? `${b} B`
      : b < 1024 ** 2
        ? `${(b / 1024).toFixed(1)} KB`
        : `${(b / 1024 ** 2).toFixed(1)} MB`;

  const iconClass = 'h-4 w-4 text-muted-foreground';
  const getFileIcon = (fn: string) => {
    const ext = fn.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext!)) return <Code className={iconClass} />;
    if (['json', 'md'].includes(ext!)) return <FileText className={iconClass} />;
    return <File className={iconClass} />;
  };

  const getLang = (fn: string) => {
    const ext = fn.split('.').pop()?.toLowerCase();
    if (['ts', 'tsx'].includes(ext!)) return 'typescript';
    if (['js', 'jsx'].includes(ext!)) return 'javascript';
    if (ext === 'json') return 'json';
    if (ext === 'md') return 'markdown';
    if (ext === 'env') return 'bash';
    return 'text';
  };

  // Recursive component to render tree nodes
  const TreeNode: React.FC<{ node: TreeNode; depth: number }> = ({ node, depth }) => {
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = `${depth * 12 + 8}px`;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <Button
            variant="ghost"
            className="w-full justify-start px-2 py-1 text-xs font-medium h-auto"
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft }}
          >
            <div className="flex items-center gap-2">
              {isExpanded ?
                <ChevronDown className="h-3 w-3 text-muted-foreground" /> :
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              }
              {isExpanded ?
                <FolderOpen className={iconClass} /> :
                <Folder className={iconClass} />
              }
              <span className="truncate">{node.name}</span>
            </div>
          </Button>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => (
                <TreeNode key={child.path} node={child} depth={depth + 1} />
              ))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <Button
          key={node.path}
          variant={selectedFile === node.path ? 'secondary' : 'ghost'}
          className="w-full justify-start px-2 py-1 text-xs font-medium h-auto"
          onClick={() => setSelectedFile(node.path)}
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-2">
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
          </div>
        </Button>
      );
    }
  };

  // Error / Loading states
  if (parseError) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-8 flex items-center px-2 bg-red-50">
          <span className="text-red-600 text-sm">Parse Error</span>
        </div>
        <div className="p-2 text-sm text-red-600 flex-1 overflow-auto">
          {parseError}
        </div>
      </div>
    );
  }
  if (!parsedData) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const fileTree = buildFileTree(parsedData.files);

  const totalFiles = Object.keys(parsedData.files).length;
  const totalSizeBytes = Object.values(parsedData.files)
    .reduce((sum, info) => sum + info.size, 0);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* File list panel */}
      <div className="w-1/4 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-gray-800 p-2">
        {/* scrollable file tree */}
        <div className="flex-1 overflow-auto space-y-1">
          {fileTree.map((node) => (
            <TreeNode key={node.path} node={node} depth={0} />
          ))}
        </div>
        {/* fixed footer */}
        <div className="px-2">
          <div className="border-t border-foreground/10 py-2">
            <div className="flex justify-between items-center mt-1 mb-1 text-xs text-muted-foreground">
              <span className="font-medium">Total files</span>
              <span className="text-foreground/80 font-semibold">{totalFiles}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className="font-medium">Total size</span>
              <span className="text-foreground/80 font-semibold">
                {fmtSize(totalSizeBytes)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Code editor panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedFile && (
          <>
            {/* _Your_ header bar at exactly one line of text */}
            <div
              className="h-10 flex items-center justify-between px-4"
              style={{ lineHeight: '2rem' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                {getFileIcon(selectedFile)}
                <span className="truncate text-foreground font-medium">{selectedFile}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {fmtSize(parsedData.files[selectedFile].size)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Copy to clipboard"
                      onClick={() =>
                        handleCopy(parsedData.files[selectedFile].content)
                      }
                    >
                      {justCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Copy
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Download file"
                      onClick={() =>
                        handleDownload(
                          selectedFile,
                          parsedData.files[selectedFile].content
                        )
                      }
                    >
                      {justDownloaded ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Download
                  </TooltipContent>
                </Tooltip>
              </div>

            </div>

            <Separator className="my-0" />

            <div className="flex-1 overflow-auto">
              <Editor
                height="100%"
                language={getLang(selectedFile)}
                value={parsedData.files[selectedFile].content}
                theme={monacoTheme}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  fontSize: 14,
                }}
                onMount={(editor) => {
                  editor.getModel()?.updateOptions({ tabSize: 2 });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}


================================================
FILE: app/src/components/custom-ui/connect-button.tsx
================================================
"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, type Connector } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getNetworkConfig, type UnifiedNetwork } from '@/lib/commons/networks'
import type { Network } from '@/types/blockchain'
import { Loader2, Zap, AlertTriangle } from 'lucide-react'

const supportedChains: Network[] = ['base-sepolia', 'sei-testnet', 'base']

export function ConnectButton() {
  const { address, isConnected, connector } = useAccount()
  const { connectors, connect } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Determine current network based on chain ID
  const currentNetwork = useMemo(() => {
    if (!chainId) return null
    
    // Check supported networks for matching chain ID
    for (const network of supportedChains) {
      const networkConfig = getNetworkConfig(network as UnifiedNetwork)
      if (networkConfig && networkConfig.chainId === chainId) {
        return network
      }
    }
    return null
  }, [chainId])

  // Check if we're on the right network
  const isOnSupportedNetwork = currentNetwork !== null

  const availableConnectors = useMemo(() => {
    return connectors.filter(connector => connector.name !== 'Coinbase Wallet SDK')
  }, [connectors])

  const switchToNetwork = useCallback(async (targetNetwork: Network) => {
    if (!switchChain) return
    
    const networkConfig = getNetworkConfig(targetNetwork as UnifiedNetwork)
    if (!networkConfig || typeof networkConfig.chainId !== 'number') return

    try {
      setConnectionError(null)
      switchChain({ 
        chainId: networkConfig.chainId,
        addEthereumChainParameter: {
          chainName: networkConfig.name,
          rpcUrls: networkConfig.rpcUrls,
          blockExplorerUrls: networkConfig.blockExplorerUrls,
          nativeCurrency: {
            name: networkConfig.nativeCurrency.name,
            symbol: networkConfig.nativeCurrency.symbol,
            decimals: networkConfig.nativeCurrency.decimals,
          },
        }
      })
    } catch (error) {
      console.error('Failed to switch network:', error)
      const networkName = networkConfig?.name || targetNetwork
      setConnectionError(`Failed to switch to ${networkName} network`)
    }
  }, [switchChain])

  const handleConnect = useCallback(async (connector: Connector) => {
    try {
      setIsConnecting(true)
      setConnectionError(null)
      connect({ connector })
    } catch (error) {
      console.error('Connection failed:', error)
      setConnectionError('Connection failed. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }, [connect])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setConnectionError(null)
  }, [disconnect])

  // Clear error after some time
  useEffect(() => {
    if (connectionError) {
      const timer = setTimeout(() => setConnectionError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [connectionError])

  if (!isConnected) {
    return (
      <div className="space-y-3">
        {connectionError && (
          <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
            {connectionError}
          </div>
        )}
        
        <div className="space-y-2">
          {availableConnectors.map((connector) => (
            <Button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnecting}
              variant="outline"
              className="w-full h-11 text-[15px] font-medium"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Connect {connector.name}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Show network selection if connected but not on supported network
  if (!isOnSupportedNetwork) {
    return (
      <div className="space-y-3">
        <div className="text-center space-y-3">
          <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              {connector?.name} • {currentNetwork ? (() => {
                const networkConfig = getNetworkConfig(currentNetwork as UnifiedNetwork)
                return networkConfig?.name || 'Unknown Network'
              })() : 'Unknown Network'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Please switch to a supported network:
          </div>
          
          <div className="space-y-2">
            {supportedChains.map((network) => {
              const networkConfig = getNetworkConfig(network as UnifiedNetwork)
              if (!networkConfig) return null
              
              return (
                <Button
                  key={network}
                  onClick={() => switchToNetwork(network)}
                  variant="outline"
                  className="w-full h-10 text-sm"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {networkConfig.name}
                </Button>
              )
            })}
          </div>
        </div>
        
        <Button
          onClick={handleDisconnect}
          variant="ghost"
          className="w-full text-sm text-gray-500"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {connectionError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">
          {connectionError}
        </div>
      )}
      
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {connector?.name}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {(() => {
              const networkConfig = getNetworkConfig(currentNetwork as UnifiedNetwork)
              return networkConfig?.name || 'Unknown'
            })()}
          </Badge>
        </div>
        
        <div className="text-sm font-mono text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        
        <div className="text-xs text-gray-500">
          Switch to: {supportedChains.map(n => {
            const networkConfig = getNetworkConfig(n as UnifiedNetwork)
            return networkConfig?.name || n
          }).join(', ')}
        </div>
      </div>
      
      <Button
        onClick={handleDisconnect}
        variant="outline"
        className="w-full h-10"
      >
        Disconnect
      </Button>
    </div>
  )
}



================================================
FILE: app/src/components/custom-ui/content-cards-small.tsx
================================================
"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowUpRight, Check } from "lucide-react"
import { useState, useEffect } from "react"

interface CardData {
  title: string
  firstSentence: string
  restOfDescription: string
  image: string
  href: string
}

const cardData: CardData[] = [
  {
    title: "Request Payments",
    firstSentence: "Turn tool calls into transactions.",
    restOfDescription: "Price your MCP resources however you want: per call, per prompt, or per outcome.",
    image: "/painting-zoom-1.png",
    href: "https://docs.mcpay.tech/quickstart/monetize"
  },
  {
    title: "Non-Intrusive Middleware",
    firstSentence: "Drop in payments without rewriting your infrastructure.",
    restOfDescription: "MCPay wraps around your existing servers so you can start charging with zero refactor.",
    image: "/painting-zoom-2.png",
    href: "https://docs.mcpay.tech/quickstart/integrate"
  },
  {
    title: "More Than Payments",
    firstSentence: "Supercharge your servers.",
    restOfDescription: "With guardrails, analytics, data augmentation and plugins.",
    image: "/painting-zoom-3.png",
    href: "https://docs.mcpay.tech"
  }
]

export default function ContentCardsSmall() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = e.clientY / window.innerHeight
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="mb-10">
        <h2 className="text-3xl font-semibold font-host">Focus on building</h2>
      </div>
      
      {/* Wide developer card */}
      <Card className="overflow-hidden rounded-2xl mb-6 bg-background relative">
        <div className="absolute inset-0">
          <Image
            src="/mcpay-developers-image.png"
            alt="MCPay for developers"
            fill
            className="object-cover transition-transform duration-200 ease-out"
            style={{
              transform: `scale(1.15) translate(${(mousePosition.x - 0.5) * 40}px, ${(mousePosition.y - 0.5) * 40}px)`
            }}
          />
        </div>
        <CardContent className="relative z-10 p-8 md:p-12 lg:p-16">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-center">
            {/* Left Column - Content */}
            <div className="flex-1">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-regular font-host mb-6 md:mb-8 lg:mb-12 text-white">
                The most complete SDK
              </h3>
              
              <div className="flex flex-col gap-4 md:gap-6 mb-6 md:mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">SUPPORT FOR EVM AND SOLANA</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">EXTENDABLE WITH PLUGINS</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">SIMPLE X402 SETUP</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-teal-500/10 rounded flex items-center justify-center">
                    <Check className="w-4 h-4 text-teal-400" strokeWidth={2.5} />
                  </div>
                  <span className="font-mono text-sm md:text-base lg:text-xl font-medium tracking-wider text-teal-500">OPEN SOURCE</span>
                </div>
              </div>
            </div>

            {/* Right Column - Code Snippet */}
            <div className="flex-1 w-full">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg border border-teal-500/40 hover:border-teal-500 transition-all duration-300 overflow-hidden">
                <div className="p-3 text-xs font-mono leading-5 overflow-x-auto">
                  <div className="flex min-w-max">
                    <div className="select-none text-slate-400 pr-3 text-right min-w-[1.5rem] flex-shrink-0">
                      {Array.from({ length: 20 }, (_, i) => (
                        <div key={i + 1} className="h-5">{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-max">
                      <div className="h-5"><span className="text-slate-400">import</span> <span className="text-slate-400">&#123;</span> <span className="text-blue-400">createMcpPaidHandler</span> <span className="text-slate-400">&#125;</span> <span className="text-slate-400">from</span> <span className="text-teal-500">&quot;mcpay/handler&quot;</span></div>
                      <div className="h-5"></div>
                      <div className="h-5"><span className="text-slate-400">export</span> <span className="text-slate-400">const</span> <span className="text-blue-400">paidMcp</span> <span className="text-slate-400">=</span> <span className="text-blue-400">createMcpPaidHandler</span><span className="t