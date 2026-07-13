ALTER TABLE "businesses" ADD COLUMN "payment_due_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" date;