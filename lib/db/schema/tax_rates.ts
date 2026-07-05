import { pgTable, text, numeric, timestamp, uuid, boolean, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from './products';

// This table is intentionally NOT scoped to a business — GST rate slabs are a national government setting shared by all businesses, not something each business defines independently.
export const taxRates = pgTable('tax_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(), // e.g. "18%", "Exempt"
  rate_percentage: numeric('rate_percentage', { precision: 5, scale: 2 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  effective_from: date('effective_from').notNull(),
  effective_to: date('effective_to'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const taxRatesRelations = relations(taxRates, ({ many }) => ({
  products: many(products)
}));
