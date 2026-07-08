'use server'

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { customers } from '@/lib/db/schema';
import { and, eq, ilike, or, asc } from 'drizzle-orm';
import { z } from 'zod';

const listCustomersSchema = z.object({
  search: z.string().optional(),
  includeInactive: z.boolean().default(false),
});

export const listCustomers = createAuthenticatedAction(listCustomersSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  
  if (!businessId) {
    throw new ActionError('Please complete your business profile in Settings before viewing customers.', { code: 'NOT_FOUND' });
  }

  const conditions = [eq(customers.business_id, businessId)];

  if (!input.includeInactive) {
    conditions.push(eq(customers.is_active, true));
  }

  if (input.search) {
    const searchTerm = `%${input.search}%`;
    const searchCondition = or(
      ilike(customers.name, searchTerm),
      ilike(customers.gstin, searchTerm),
      ilike(customers.phone, searchTerm),
      ilike(customers.email, searchTerm)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  try {
    const results = await db.select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.name));

    return { customers: results };
  } catch (error) {
    console.error('Error listing customers:', error);
    throw new ActionError('We could not retrieve your customers. Please try again.', { code: 'INTERNAL_ERROR' });
  }
}, 'list-customers');
