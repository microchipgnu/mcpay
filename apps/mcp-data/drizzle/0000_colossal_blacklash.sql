CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ts" timestamp with time zone DEFAULT now(),
	"request_id" text,
	"server_id" uuid,
	"origin" text,
	"kind" text,
	"method" text,
	"status_code" integer,
	"latency_ms" integer,
	"error_code" text,
	"payment" jsonb DEFAULT '{}'::jsonb,
	"meta" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "events_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "mcp_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin" text NOT NULL,
	"title" text,
	"description" text,
	"require_auth" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"recipients" jsonb DEFAULT '{}'::jsonb,
	"receiver_by_network" jsonb DEFAULT '{}'::jsonb,
	"tools" jsonb DEFAULT '[]'::jsonb,
	"resources" jsonb DEFAULT '[]'::jsonb,
	"capabilities" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"status" text,
	"last_seen_at" timestamp with time zone,
	"indexed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mcp_servers_origin_unique" UNIQUE("origin")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_server_id_mcp_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."mcp_servers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_events_origin_ts" ON "events" USING btree ("origin","ts");--> statement-breakpoint
CREATE INDEX "idx_events_server_ts" ON "events" USING btree ("server_id","ts");--> statement-breakpoint
CREATE INDEX "idx_events_kind_ts" ON "events" USING btree ("kind","ts");--> statement-breakpoint
CREATE INDEX "idx_events_meta" ON "events" USING gin ("meta");--> statement-breakpoint
CREATE INDEX "idx_events_payment" ON "events" USING gin ("payment");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_tags" ON "mcp_servers" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_capabilities" ON "mcp_servers" USING gin ("capabilities");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_metadata" ON "mcp_servers" USING gin ("metadata");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_tools" ON "mcp_servers" USING gin ("tools");--> statement-breakpoint
CREATE INDEX "idx_mcp_servers_resources" ON "mcp_servers" USING gin ("resources");