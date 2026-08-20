ALTER TABLE "download_events" ALTER COLUMN "bytes_served" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "total_ciphertext_bytes" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "storage_used_bytes" SET DATA TYPE bigint;