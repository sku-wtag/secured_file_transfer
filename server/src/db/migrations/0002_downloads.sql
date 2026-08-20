CREATE TABLE "download_events" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"bytes_served" integer DEFAULT 0 NOT NULL,
	"ip_truncated" text NOT NULL,
	"user_agent_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "download_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"transfer_id" text NOT NULL,
	"secret_hash" text NOT NULL,
	"ip_truncated" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_grant_id_download_grants_id_fk" FOREIGN KEY ("grant_id") REFERENCES "public"."download_grants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "download_grants" ADD CONSTRAINT "download_grants_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;