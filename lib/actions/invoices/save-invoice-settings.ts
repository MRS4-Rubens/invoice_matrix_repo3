'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { invoiceSettingsSchema } from '@/lib/validations/invoice-settings';
import { db } from '@/lib/db/client';
import { businesses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getPlanEntitlements } from '@/lib/subscriptions/entitlements';

export const saveInvoiceSettings = createAuthenticatedAction(
  invoiceSettingsSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError(
        'Please complete your business profile before configuring invoice settings.',
        { code: 'NO_BUSINESS' }
      );
    }

    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!business) {
      throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
    }

    // Server-side entitlement check for custom invoice number formats
    const { canCustomizeInvoiceFormat } = getPlanEntitlements(business);
    if (!canCustomizeInvoiceFormat) {
      if (
        input.invoice_number_format !== business.invoice_number_format &&
        input.invoice_number_format !== 'BMA/{FY}/{SEQ:4}'
      ) {
        throw new ActionError(
          'Custom invoice numbering formats and brand prefixes are exclusive to paid plans. Upgrade to Essentials Pro to customize your invoice format.',
          { code: 'INVOICE_FORMAT_LOCKED' }
        );
      }
    }

    try {
      await db
        .update(businesses)
        .set({
          invoice_number_format: input.invoice_number_format,
          credit_note_number_prefix: input.credit_note_number_prefix,
          payment_due_days: input.payment_due_days,
          default_invoice_template: input.default_invoice_template,
          default_gst_rate_type: input.default_gst_rate_type,
          invoice_terms: input.invoice_terms,
          updated_at: new Date(),
        })
        .where(eq(businesses.id, businessId));
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      throw new ActionError('Failed to save invoice settings. Please try again.', {
        code: 'UPDATE_FAILED',
      });
    }

    revalidatePath('/settings');
    revalidatePath('/invoices');
    revalidatePath('/invoices/new');
    revalidatePath('/credit-notes/new');

    return { success: true };
  },
  'save-invoice-settings'
);
