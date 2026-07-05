CREATE INDEX "users_business_id_idx" ON "users" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "customers_business_id_idx" ON "customers" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "products_business_id_idx" ON "products" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "financial_years_business_id_idx" ON "financial_years" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "invoices_business_id_idx" ON "invoices" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "credit_notes_business_id_idx" ON "credit_notes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "payments_business_id_idx" ON "payments" USING btree ("business_id");