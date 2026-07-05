import { pgTable, text, timestamp, uuid, integer, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { invoices } from './invoices';
import { paymentMethodEnum } from './enums';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  invoice_id: uuid('invoice_id').notNull().references(() => invoices.id),
  amount_paise: integer('amount_paise').notNull(),
  payment_date: date('payment_date').notNull(),
  payment_method: paymentMethodEnum('payment_method').notNull(),
  reference_number: text('reference_number'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('payments_invoice_id_idx').on(table.invoice_id),
  index('payments_business_id_idx').on(table.business_id)
]);

export const paymentsRelations = relations(payments, ({ one }) => ({
  business: one(businesses, {
    fields: [payments.business_id],
    references: [businesses.id]
  }),
  invoice: one(invoices, {
    fields: [payments.invoice_id],
    references: [invoices.id]
  })
}));
