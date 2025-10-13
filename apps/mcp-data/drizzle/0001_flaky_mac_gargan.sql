CREATE TABLE "rpc_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp with time zone DEFAULT now(),
	"server_id" uuid,
	"origin_raw" text,
	"origin" text,
	"jsonrpc_id" text,
	"method" text,
	"duration_ms" integer,
	"error_code" text,
	"http_status" integer,
	"request" jsonb DEFAULT '{}'::jsonb,
	"response" jsonb DEFAULT '{}'::jsonb,
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "events" CASCADE;--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP CONSTRAINT "mcp_servers_origin_unique";--> statement-breakpoint
DROP INDEX "idx_mcp_servers_tags";--> statement-breakpoint
DROP INDEX "idx_mcp_servers_capabilities";--> statement-breakpoint
DROP INDEX "idx_mcp_servers_metadata";--> statement-breakpoint
DROP INDEX "idx_mcp_servers_tools";--> statement-breakpoint
DROP INDEX "idx_mcp_servers_resources";--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "origin_raw" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "data" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "rpc_logs" ADD CONSTRAINT "rpc_logs_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rpc_logs_origin_ts" ON "rpc_logs" USING btree ("origin","ts");--> statement-breakpoint
CREATE INDEX "idx_rpc_logs_server_ts" ON "rpc_logs" USING btree ("server_id","ts");--> statement-breakpoint
CREATE INDEX "idx_rpc_logs_method_ts" ON "rpc_logs" USING btree ("method","ts");--> statement-breakpoint
CREATE INDEX "idx_rpc_logs_request" ON "rpc_logs" USING gin ("request");--> statement-breakpoint
CREATE INDEX "idx_rpc_logs_response" ON "rpc_logs" USING gin ("response");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_data" ON "mcp_servers" USING gin ("data");--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "require_auth";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "recipients";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "receiver_by_network";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "tools";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "resources";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "capabilities";--> statement-breakpoint
ALTER TABLE "mcp_servers" DROP COLUMN "metadata";--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD CONSTRAINT "mcp_servers_origin_raw_unique" UNIQUE("origin_raw");