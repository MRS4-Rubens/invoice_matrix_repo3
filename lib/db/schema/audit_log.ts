import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses';
import { users } from './users';

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  business_id: uuid('business_id').notNull().references(() => businesses.id),
  user_id: uuid('user_id').references(() => users.id),
  entity_type: text('entity_type').notNull(),
  entity_id: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('audit_log_entity_type_entity_id_idx').on(table.entity_type, table.entity_id),
  index('audit_log_business_id_idx').on(table.business_id),
  index('audit_log_created_at_idx').on(table.created_at)
]);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  business: one(businesses, {
    fields: [auditLog.business_id],
    references: [businesses.id]
  }),
  user: one(users, {
    fields: [auditLog.user_id],
    references: [users.id]
  })
}));
