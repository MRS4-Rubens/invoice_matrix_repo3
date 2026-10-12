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
  const profileData = {
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
    nature_of_business: input.nature_of_business || null,
    alternate_phone: input.alternate_phone || null,
  };

  let businessId = context.appUser.business_id;

  try {
    await db.transaction(async (tx) => {
      if (!businessId) {
        // First-time setup: initialize with legal details + statutory default invoice settings
        const newBusinessData = {
          ...profileData,
          invoice_number_format: input.invoice_number_format || 'BMA/{FY}/{SEQ:4}',
          credit_note_number_prefix: input.credit_note_number_prefix || 'CN',
          invoice_terms: input.invoice_terms || '1. Goods once sold will not be taken back.\n2. Payment to be made within 30 days from the date of invoice.\n3. Interest @ 24% per annum will be charged on overdue invoices until payment is received.',
          payment_due_days: input.payment_due_days ?? 30,
          default_invoice_template: input.default_invoice_template || 'template_1',
          default_gst_rate_type: input.default_gst_rate_type || 'exclusive',
          subscription_plan: 'trial',
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        };

        const [newBusiness] = await tx.insert(businesses).values(newBusinessData).returning({ id: businesses.id });
        businessId = newBusiness.id;

        const currentFY = getIndianFinancialYearForDate(new Date());

        await tx.insert(financialYears).values({
          business_id: businessId,
          label: currentFY.label,
          start_date: currentFY.startDate.toISOString(),
          end_date: currentFY.endDate.toISOString(),
          is_current: true,
          invoice_sequence_counter: 0,
          credit_note_sequence_counter: 0,
        });

        await tx.update(users)
          .set({ business_id: businessId })
          .where(eq(users.id, context.appUser.id));
      } else {
        // Editing existing profile: update profile details and only touch invoice settings if explicitly supplied
        const updatePayload: Record<string, unknown> = {
          ...profileData,
          updated_at: new Date(),
        };

        if (input.invoice_number_format !== undefined) updatePayload.invoice_number_format = input.invoice_number_format;
        if (input.credit_note_number_prefix !== undefined) updatePayload.credit_note_number_prefix = input.credit_note_number_prefix;
        if (input.invoice_terms !== undefined) updatePayload.invoice_terms = input.invoice_terms;
        if (input.payment_due_days !== undefined) updatePayload.payment_due_days = input.payment_due_days;
        if (input.default_invoice_template !== undefined) updatePayload.default_invoice_template = input.default_invoice_template;
        if (input.default_gst_rate_type !== undefined) updatePayload.default_gst_rate_type = input.default_gst_rate_type;

        await tx.update(businesses)
          .set(updatePayload)
          .where(eq(businesses.id, businessId));
      }
    });
  } catch (error) {
    console.error('Error saving business profile:', error);
    throw new ActionError('We could not save your business profile. Please try again.', { code: 'TRANSACTION_FAILED' });
  }

  // Flush NextJS client router cache for settings and invoice pages
  revalidatePath('/settings');
  revalidatePath('/invoices/new');
  revalidatePath('/invoices');

  return { businessId: businessId as string };
}, 'save-business-profile');
