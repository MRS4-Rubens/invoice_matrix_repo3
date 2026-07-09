import { pgTable, text, timestamp, uuid, integer, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';

// This table manages the display-facing counter for invoice numbers.
// It is separate from financial_years.invoice_sequence_counter, which remains the permanent audit sequence.
// See lib/invoices/numbering.ts for how this is atomically updated.
export const invoiceNumberCounters = pgTable('invoice_number_counters', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  period_key: text('period_key').notNull(),
  counter_value: integer('counter_value').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('invoice_number_counters_business_id_period_key_unique').on(table.business_id, table.period_key),
  index('invoice_number_counters_business_id_idx').on(table.business_id),
]);

export const invoiceNumberCountersRelations = relations(invoiceNumberCounters, ({ one }) => ({
  business: one(businesses, {
    fields: [invoiceNumberCounters.business_id],
    references: [businesses.id]
  })
}));
