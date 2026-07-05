import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { roleEnum } from './enums';
import { auditLog } from './audit_log';

// This table is an app-level profile, not the auth credentials table itself, since Neon Auth manages its own internal auth tables separately.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth_user_id: text('auth_user_id').notNull().unique(),
  business_id: uuid('business_id').references(() => businesses.id), // nullable because a user can exist before completing business setup in Phase 5
  role: roleEnum('role').notNull().default('owner'),
  display_name: text('display_name'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('users_business_id_idx').on(table.business_id)
]);

export const usersRelations = relations(users, ({ one, many }) => ({
  business: one(businesses, {
    fields: [users.business_id],
    references: [businesses.id]
  }),
  auditLog: many(auditLog)
}));
