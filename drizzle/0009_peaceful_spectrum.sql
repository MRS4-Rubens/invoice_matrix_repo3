ALTER TABLE "invoices" ALTER COLUMN "customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "default_invoice_template" text DEFAULT 'template_1' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "invoice_template" text DEFAULT 'template_1' NOT NULL;