'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { payments } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const listPayments = createAuthenticatedAction(z.object({ invoice_id: z.string().uuid() }), async ({ invoice_id }, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
  }

  try {
    const data = await db.select()
      .from(payments)
      .where(and(
        eq(payments.business_id, businessId),
        eq(payments.invoice_id, invoice_id)
      ))
      .orderBy(desc(payments.payment_date), desc(payments.created_at));

    return data;
  } catch (error) {
    console.error('Error listing payments:', error);
    throw new ActionError('We could not load the payments. Please try again.', { code: 'QUERY_FAILED' });
  }
}, 'list-payments');
