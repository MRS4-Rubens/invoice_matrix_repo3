import { pgTable, text, varchar, timestamp, uuid, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { registrationTypeEnum } from './enums'; // I will create an enums file
import { users } from './users';
import { customers } from './customers';
import { products } from './products';
import { financialYears } from './financial_years';
import { invoices } from './invoices';
import { creditNotes } from './credit_notes';
import { payments } from './payments';
import { auditLog } from './audit_log';

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  legal_name: text('legal_name').notNull(),
  trade_name: text('trade_name'),
  gstin: varchar('gstin', { length: 15 }).notNull().unique(),
  pan: varchar('pan', { length: 10 }),
  registration_type: registrationTypeEnum('registration_type').notNull().default('regular'),
  address_line1: text('address_line1').notNull(),
  address_line2: text('address_line2'),
  city: text('city').notNull(),
  state_code: varchar('state_code', { length: 2 }).notNull(),
  pincode: varchar('pincode', { length: 6 }).notNull(),
  phone: text('phone'),
  email: text('email'),
  logo_storage_key: text('logo_storage_key'),
  bank_account_name: text('bank_account_name'),
  bank_account_number: text('bank_account_number'),
  bank_ifsc: text('bank_ifsc'),
  bank_name: text('bank_name'),
  invoice_terms: text('invoice_terms').notNull().default('1. Goods once sold will not be taken back.\n2. Payment to be made within 30 days from the date of invoice.\n3. Interest @ 24% per annum will be charged on overdue invoices until payment is received.'),
  invoice_number_format: text('invoice_number_format').notNull().default('INV/{FY}/{SEQ:4}'),
  credit_note_number_prefix: text('credit_note_number_prefix').notNull().default('CN'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  check('businesses_gstin_length', sql`length(${table.gstin}) = 15`)
]);

// MVP supports one row in this table (single business/GSTIN), but the schema itself is not artificially restricted to one row, so multi-business support is possible later without a schema rewrite.

export const businessesRelations = relations(businesses, ({ many }) => ({
  users: many(users),
  customers: many(customers),
  products: many(products),
  financialYears: many(financialYears),
  invoices: many(invoices),
  creditNotes: many(creditNotes),
  payments: many(payments),
  auditLog: many(auditLog)
}));
