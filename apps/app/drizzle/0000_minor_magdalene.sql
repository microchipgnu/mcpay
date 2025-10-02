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