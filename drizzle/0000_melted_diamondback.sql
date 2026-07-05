CREATE TYPE "public"."invoice_type" AS ENUM('tax_invoice', 'bill_of_supply');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('draft', 'finalized');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."registration_type" AS ENUM('regular', 'composition');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"gstin" varchar(15) NOT NULL,
	"pan" varchar(10),
	"registration_type" "registration_type" DEFAULT 'regular' NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" text NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"pincode" varchar(6) NOT NULL,
	"phone" text,
	"email" text,
	"logo_storage_key" text,
	"bank_account_name" text,
	"bank_account_number" text,
	"bank_ifsc" text,
	"bank_name" text,
	"invoice_number_prefix" text DEFAULT 'INV' NOT NULL,
	"credit_note_number_prefix" text DEFAULT 'CN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_gstin_unique" UNIQUE("gstin"),
	CONSTRAINT "businesses_gstin_length" CHECK (length("businesses"."gstin") = 15)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"business_id" uuid,
	"role" "role" DEFAULT 'owner' NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"gstin" varchar(15),
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state_code" varchar(2) NOT NULL,
	"pincode" varchar(6),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_gstin_length" CHECK (length("customers"."gstin") = 15)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"hsn_sac_code" varchar(8) NOT NULL,
	"unit_of_measurement" text DEFAULT 'PCS' NOT NULL,
	"default_sale_price_paise" integer NOT NULL,
	"default_tax_rate_id" uuid,
	"stock_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"rate_percentage" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"label" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"invoice_sequence_counter" integer DEFAULT 0 NOT NULL,
	"credit_note_sequence_counter" integer DEFAULT 0 NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_years_business_id_label_unique" UNIQUE("business_id","label")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"financial_year_id" uuid NOT NULL,
	"invoice_sequence" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_type" "invoice_type" DEFAULT 'tax_invoice' NOT NULL,
	"lifecycle_status" "lifecycle_status" DEFAULT 'draft' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"invoice_date" date,
	"place_of_supply_state_code" varchar(2),
	"seller_gstin_snapshot" varchar(15),
	"billing_name_snapshot" text,
	"billing_gstin_snapshot" varchar(15),
	"billing_address_snapshot" text,
	"subtotal_paise" integer DEFAULT 0 NOT NULL,
	"total_cgst_paise" integer DEFAULT 0 NOT NULL,
	"total_sgst_paise" integer DEFAULT 0 NOT NULL,
	"total_igst_paise" integer DEFAULT 0 NOT NULL,
	"total_tax_paise" integer DEFAULT 0 NOT NULL,
	"grand_total_paise" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"pdf_storage_key" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_business_id_financial_year_id_invoice_seq_unique" UNIQUE("business_id","financial_year_id","invoice_sequence"),
	CONSTRAINT "invoices_business_id_invoice_number_unique" UNIQUE("business_id","invoice_number")
);
--> statement-breakpoint
CREATE TABLE "invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"hsn_sac_code" varchar(8) NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_of_measurement" text NOT NULL,
	"unit_price_paise" integer NOT NULL,
	"discount_paise" integer DEFAULT 0 NOT NULL,
	"taxable_value_paise" integer NOT NULL,
	"tax_rate_percentage" numeric(5, 2) NOT NULL,
	"cgst_paise" integer DEFAULT 0 NOT NULL,
	"sgst_paise" integer DEFAULT 0 NOT NULL,
	"igst_paise" integer DEFAULT 0 NOT NULL,
	"line_total_paise" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"original_invoice_id" uuid NOT NULL,
	"financial_year_id" uuid NOT NULL,
	"credit_note_sequence" integer NOT NULL,
	"credit_note_number" text NOT NULL,
	"reason" text NOT NULL,
	"lifecycle_status" "lifecycle_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date,
	"subtotal_paise" integer DEFAULT 0 NOT NULL,
	"total_cgst_paise" integer DEFAULT 0 NOT NULL,
	"total_sgst_paise" integer DEFAULT 0 NOT NULL,
	"total_igst_paise" integer DEFAULT 0 NOT NULL,
	"total_tax_paise" integer DEFAULT 0 NOT NULL,
	"grand_total_paise" integer DEFAULT 0 NOT NULL,
	"pdf_storage_key" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_business_id_financial_year_id_seq_unique" UNIQUE("business_id","financial_year_id","credit_note_sequence"),
	CONSTRAINT "credit_notes_business_id_credit_note_number_unique" UNIQUE("business_id","credit_note_number")
);
--> statement-breakpoint
CREATE TABLE "credit_note_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credit_note_id" uuid NOT NULL,
	"product_id" uuid,
	"description" text NOT NULL,
	"hsn_sac_code" varchar(8) NOT NULL,
	"quantity" numeric(10, 3) NOT NULL,
	"unit_of_measurement" text NOT NULL,
	"unit_price_paise" integer NOT NULL,
	"discount_paise" integer DEFAULT 0 NOT NULL,
	"taxable_value_paise" integer NOT NULL,
	"tax_rate_percentage" numeric(5, 2) NOT NULL,
	"cgst_paise" integer DEFAULT 0 NOT NULL,
	"sgst_paise" integer DEFAULT 0 NOT NULL,
	"igst_paise" integer DEFAULT 0 NOT NULL,
	"line_total_paise" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount_paise" integer NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_default_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("default_tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_financial_year_id_financial_years_id_fk" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_original_invoice_id_invoices_id_fk" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_financial_year_id_financial_years_id_fk" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_line_items" ADD CONSTRAINT "credit_note_line_items_credit_note_id_credit_notes_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note_line_items" ADD CONSTRAINT "credit_note_line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_lifecycle_status_idx" ON "invoices" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "invoices_payment_status_idx" ON "invoices" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "credit_notes_original_invoice_id_idx" ON "credit_notes" USING btree ("original_invoice_id");--> statement-breakpoint
CREATE INDEX "credit_note_line_items_credit_note_id_idx" ON "credit_note_line_items" USING btree ("credit_note_id");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_business_id_idx" ON "audit_log" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");