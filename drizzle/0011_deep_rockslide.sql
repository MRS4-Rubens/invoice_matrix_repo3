CREATE TYPE "public"."gst_rate_type" AS ENUM('inclusive', 'exclusive');--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "default_gst_rate_type" "gst_rate_type" DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "gst_rate_type" "gst_rate_type" DEFAULT 'exclusive' NOT NULL;