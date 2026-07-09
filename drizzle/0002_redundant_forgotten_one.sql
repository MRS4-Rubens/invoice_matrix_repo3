CREATE TABLE "invoice_number_counters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"counter_value" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_number_counters_business_id_period_key_unique" UNIQUE("business_id","period_key")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "invoice_number_format" text DEFAULT 'INV/{FY}/{SEQ:4}' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_number_counters" ADD CONSTRAINT "invoice_number_counters_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_number_counters_business_id_idx" ON "invoice_number_counters" USING btree ("business_id");--> statement-breakpoint
UPDATE "businesses" SET "invoice_number_format" = "invoice_number_prefix" || '/{FY}/{SEQ:4}';--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "invoice_number_prefix";