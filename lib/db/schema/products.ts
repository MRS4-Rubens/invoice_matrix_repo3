import { pgTable, text, varchar, timestamp, uuid, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { taxRates } from './tax_rates';
import { invoiceLineItems } from './invoice_line_items';
import { creditNoteLineItems } from './credit_note_line_items';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  name: text('name').notNull(),
  description: text('description'),
  hsn_sac_code: varchar('hsn_sac_code', { length: 8 }).notNull(),
  unit_of_measurement: text('unit_of_measurement').notNull().default('PCS'),
  default_sale_price_paise: integer('default_sale_price_paise').notNull(),
  default_tax_rate_id: uuid('default_tax_rate_id').references(() => taxRates.id),
  stock_quantity: integer('stock_quantity'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('products_business_id_idx').on(table.business_id)
]);

export const productsRelations = relations(products, ({ one, many }) => ({
  business: one(businesses, {
    fields: [products.business_id],
    references: [businesses.id]
  }),
  defaultTaxRate: one(taxRates, {
    fields: [products.default_tax_rate_id],
    references: [taxRates.id]
  }),
  invoiceLineItems: many(invoiceLineItems),
  creditNoteLineItems: many(creditNoteLineItems)
}));
