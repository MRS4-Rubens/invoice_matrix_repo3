'use server'

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { customers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const deactivateSchema = z.object({
  id: z.string().uuid(),
});

export const deactivateCustomer = createAuthenticatedAction(deactivateSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  
  if (!businessId) {
    throw new ActionError('Please complete your business profile in Settings before updating customers.', { code: 'NOT_FOUND' });
  }

  try {
    const result = await db.update(customers)
      .set({ is_active: false, updated_at: new Date() })
      .where(and(eq(customers.id, input.id), eq(customers.business_id, businessId)))
      .returning({ id: customers.id });

    if (result.length === 0) {
      throw new ActionError('Customer not found.', { code: 'NOT_FOUND' });
    }
  } catch (error) {
    if (error instanceof ActionError) throw error;
    throw new ActionError('We could not deactivate the customer. Please try again.', { code: 'TRANSACTION_FAILED' });
  }

  revalidatePath('/customers');
  revalidatePath(`/customers/${input.id}/edit`);

  return { success: true };
}, 'deactivate-customer');
