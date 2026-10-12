import { pgTable, text, timestamp, uuid, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { users } from './users';

export const subscriptionRequests = pgTable('subscription_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  user_id: uuid('user_id').notNull().references(() => users.id),
  plan_name: text('plan_name').notNull(), // 'free', 'essentials', 'professional'
  billing_cycle: text('billing_cycle').notNull(), // 'monthly', 'yearly'
  amount_paise: integer('amount_paise').notNull(),
  payment_method: text('payment_method').notNull(), // 'upi_qr', 'upi_id', 'bank_transfer'
  payment_reference: text('payment_reference').notNull().unique(), // UTR / Transaction ID
  screenshot_storage_key: text('screenshot_storage_key'), // S3 Storage key
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  reject_reason: text('reject_reason'),
  approved_at: timestamp('approved_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('subscription_requests_business_id_idx').on(table.business_id),
  index('subscription_requests_status_idx').on(table.status),
]);

export const subscriptionRequestsRelations = relations(subscriptionRequests, ({ one }) => ({
  business: one(businesses, {
    fields: [subscriptionRequests.business_id],
    references: [businesses.id],
  }),
  user: one(users, {
    fields: [subscriptionRequests.user_id],
    references: [users.id],
  }),
}));
