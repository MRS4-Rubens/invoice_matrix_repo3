ALTER TABLE "businesses" ADD COLUMN "invoice_terms" text DEFAULT '1. Goods once sold will not be taken back.
2. Payment to be made within 30 days from the date of invoice.
3. Interest @ 24% per annum will be charged on overdue invoices until payment is received.' NOT NULL;