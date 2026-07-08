'use server'

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { customerSchema } from '@/lib/validations/customer';
import { db } from '@/lib/db/client';
import { customers } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

export const createCustomer = createAuthenticatedAction(customerSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  
  if (!businessId) {
    throw new ActionError('Please complete your business profile in Settings before adding customers.', { code: 'NOT_FOUND' });
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
