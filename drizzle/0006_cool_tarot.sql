ALTER TABLE "invoices" ADD COLUMN "emailed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "email_send_count" integer DEFAULT 0 NOT NULL;