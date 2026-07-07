'use server'

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { businessProfileSchema } from '@/lib/validations/business';
import { db } from '@/lib/db/client';
import { businesses, financialYears, users } from '@/lib/db/schema';
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export const saveBusinessProfile = createAuthenticatedAction(businessProfileSchema, async (input, context) => {
  const data = {
    legal_name: input.legal_name,
    trade_name: input.trade_name || null,
    gstin: input.gstin,
    pan: input.pan || null,
    registration_type: input.registration_type,
    address_line1: input.address_line1,
    address_line2: input.address_line2 || null,
    city: input.city,
    state_code: input.state_code,
    pincode: input.pincode,
    phone: input.phone || null,
    email: input.email || null,
    bank_account_name: input.bank_account_name || null,
    bank_account_number: input.bank_account_number || null,
    bank_ifsc: input.bank_ifsc || null,
    bank_name: input.bank_name || null,
    invoice_number_prefix: input.invoice_number_prefix,
    credit_note_number_prefix: input.credit_note_number_prefix,
  };

  let businessId = context.appUser.business_id;

  try {
    await db.transaction(async (tx) => {
      if (!businessId) {
        // First-time setup
        const [newBusiness] = await tx.insert(businesses).values(data).returning({ id: businesses.id });
        businessId = newBusiness.id;

        const currentFY = getIndianFinancialYearForDate(new Date());

        await tx.insert(financialYears).values({
          business_id: businessId,
          label: currentFY.label,
          start_date: currentFY.startDate.toISOString(), // Assuming date column accepts ISO string
          end_date: currentFY.endDate.toISOString(),
          is_current: true,
          invoice_sequence_counter: 0,
          credit_note_sequence_counter: 0,
        });

        await tx.update(users)
          .set({ business_id: businessId })
          .where(eq(users.id, context.appUser.id));
      } else {
        // Editing existing profile
        await tx.update(businesses)
          .set(data)
          .where(eq(businesses.id, businessId));
      }
    });
  } catch (error) {
    console.error('Error saving business profile:', error);
    throw new ActionError('We could not save your business profile. Please try again.', { code: 'TRANSACTION_FAILED' });
  }

  revalidatePath('/settings');

  return { businessId: businessId as string };
}, 'save-business-profile');
