'use server'

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { customerSchema } from '@/lib/validations/customer';
import { db } from '@/lib/db/client';
import { customers, businesses } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { canAddCustomer } from '@/lib/subscriptions/entitlements';

export const createCustomer = createAuthenticatedAction(customerSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  
  if (!businessId) {
    throw new ActionError('Please complete your business profile in Settings before adding customers.', { code: 'NOT_FOUND' });
  }

  // Quota check: Verify customer limit for Free tier
  const bizResult = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  if (bizResult.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.business_id, businessId));
  const currentCount = Number(countResult[0]?.count || 0);

  const quotaCheck = canAddCustomer(bizResult[0], currentCount);
  if (!quotaCheck.allowed) {
    throw new ActionError(quotaCheck.reason || 'Customer quota exceeded.', {
      code: quotaCheck.code || 'CUSTOMER_QUOTA_EXCEEDED',
    });
  }

  const data = {
    business_id: businessId,
    name: input.name,
    gstin: input.gstin || null,
    email: input.email || null,
    phone: input.phone || null,
    address_line1: input.address_line1 || null,
    address_line2: input.address_line2 || null,
    city: input.city || null,
    state_code: input.state_code,
    pincode: input.pincode || null,
  };

  try {
    await db.insert(customers).values(data);
  } catch {
    throw new ActionError('We could not save the customer. Please try again.', { code: 'TRANSACTION_FAILED' });
  }

  revalidatePath('/customers');

  return { success: true };
}, 'create-customer');
