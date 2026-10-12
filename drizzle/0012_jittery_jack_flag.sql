CREATE TABLE "subscription_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_name" text NOT NULL,
	"billing_cycle" text NOT NULL,
	"amount_paise" integer NOT NULL,
	"payment_method" text NOT NULL,
	"payment_reference" text NOT NULL,
	"screenshot_storage_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reject_reason" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_requests_payment_reference_unique" UNIQUE("payment_reference")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_plan" text DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_status" text DEFAULT 'trial' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "active_utr_no" text;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_requests_business_id_idx" ON "subscription_requests" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "subscription_requests_status_idx" ON "subscription_requests" USING btree ("status");