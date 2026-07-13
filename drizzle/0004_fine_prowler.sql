CREATE TYPE "public"."archival_status" AS ENUM('pending', 'archived', 'failed');--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "archival_status" "archival_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "archival_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "invoices_archival_status_idx" ON "invoices" USING btree ("archival_status");