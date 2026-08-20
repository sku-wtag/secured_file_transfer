ALTER TYPE "public"."transfer_gate" ADD VALUE 'link_password';--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "gate_verifier_hash" text;