import { pgTable, text, varchar, timestamp, uuid, integer, date, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { customers } from './customers';
import { financialYears } from './financial_years';
import { invoiceTypeEnum, lifecycleStatusEnum, paymentStatusEnum } from './enums';
import { invoiceLineItems } from './invoice_line_items';
import { payments } from './payments';
import { creditNotes } from './credit_notes';

// The *_snapshot fields: once an invoice is finalized, these fields freeze the seller/buyer details as they were at that moment, so later edits to the business profile or customer record never silently alter a finalized invoice's legal content.
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  customer_id: uuid('customer_id').notNull().references(() => customers.id),
  financial_year_id: uuid('financial_year_id').notNull().references(() => financialYears.id),
  invoice_sequence: integer('invoice_sequence').notNull(),
  invoice_number: text('invoice_number').notNull(),
  invoice_type: invoiceTypeEnum('invoice_type').notNull().default('tax_invoice'),
  lifecycle_status: lifecycleStatusEnum('lifecycle_status').notNull().default('draft'),
  payment_status: paymentStatusEnum('payment_status').notNull().default('unpaid'),
  invoice_date: date('invoice_date'),
  place_of_supply_state_code: varchar('place_of_supply_state_code', { length: 2 }),
  seller_gstin_snapshot: varchar('seller_gstin_snapshot', { length: 15 }),
  billing_name_snapshot: text('billing_name_snapshot'),
  billing_gstin_snapshot: varchar('billing_gstin_snapshot', { length: 15 }),
  billing_address_snapshot: text('billing_address_snapshot'),
  subtotal_paise: integer('subtotal_paise').notNull().default(0),
  total_cgst_paise: integer('total_cgst_paise').notNull().default(0),
  total_sgst_paise: integer('total_sgst_paise').notNull().default(0),
  total_igst_paise: integer('total_igst_paise').notNull().default(0),
  total_tax_paise: integer('total_tax_paise').notNull().default(0),
  grand_total_paise: integer('grand_total_paise').notNull().default(0),
  notes: text('notes'),
  pdf_storage_key: text('pdf_storage_key'),
  finalized_at: timestamp('finalized_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('invoices_business_id_financial_year_id_invoice_seq_unique').on(table.business_id, table.financial_year_id, table.invoice_sequence),
  unique('invoices_business_id_invoice_number_unique').on(table.business_id, table.invoice_number),
  index('invoices_customer_id_idx').on(table.customer_id),
  index('invoices_lifecycle_status_idx').on(table.lifecycle_status),
  index('invoices_payment_status_idx').on(table.payment_status),
  index('invoices_business_id_idx').on(table.business_id)
]);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  business: one(businesses, {
    fields: [invoices.business_id],
    references: [businesses.id]
  }),
  customer: one(customers, {
    fields: [invoices.customer_id],
    references: [customers.id]
  }),
  financialYear: one(financialYears, {
    fields: [invoices.financial_year_id],
    references: [financialYears.id]
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
  creditNotes: many(creditNotes)
}));
