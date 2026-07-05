import { pgTable, text, timestamp, uuid, integer, boolean, date, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { invoices } from './invoices';
import { creditNotes } from './credit_notes';

// rows in this table are created on-demand starting in Phase 5/9, not seeded now — do not attempt to insert any rows for this table in the seed script.
export const financialYears = pgTable('financial_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  label: text('label').notNull(), // e.g. "2026-27"
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  invoice_sequence_counter: integer('invoice_sequence_counter').notNull().default(0),
  credit_note_sequence_counter: integer('credit_note_sequence_counter').notNull().default(0),
  is_current: boolean('is_current').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  unique('financial_years_business_id_label_unique').on(table.business_id, table.label),
  index('financial_years_business_id_idx').on(table.business_id)
]);

export const financialYearsRelations = relations(financialYears, ({ one, many }) => ({
  business: one(businesses, {
    fields: [financialYears.business_id],
    references: [businesses.id]
  }),
  invoices: many(invoices),
  creditNotes: many(creditNotes)
}));
