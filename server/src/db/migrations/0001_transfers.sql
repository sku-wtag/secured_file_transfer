CREATE TYPE "public"."transfer_gate" AS ENUM('link');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('uploading', 'ready', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "transfer_chunks" (
	"transfer_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"ciphertext_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"stored_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transfer_chunks_transfer_id_chunk_index_pk" PRIMARY KEY("transfer_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"status" "transfer_status" DEFAULT 'uploading' NOT NULL,
	"gate" "transfer_gate" DEFAULT 'link' NOT NULL,
	"wrapped_file_key" text,
	"wrap_nonce" text,
	"encrypted_manifest" text,
	"nonce_prefix" text,
	"chunk_size_bytes" integer NOT NULL,
	"chunk_count" integer NOT NULL,
	"total_ciphertext_bytes" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_downloads" integer,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "transfer_chunks" ADD CONSTRAINT "transfer_chunks_transfer_id_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;