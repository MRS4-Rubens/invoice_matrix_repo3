'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { businesses, financialYears, invoiceNumberCounters } from '@/lib/db/schema';
import { parseIsoDateToIstDate } from '@/lib/invoices/ist-date';
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year';
import { getPeriodKey, getResetGranularity } from '@/lib/invoices/number-format';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const getNextSequenceForDate = createAuthenticatedAction(
  z.object({
    dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
  }),
  async ({ dateStr }, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    try {
      const businessResult = await db.select({ invoice_number_format: businesses.invoice_number_format }).from(businesses).where(eq(businesses.id, businessId));
      if (businessResult.length === 0) {
        throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
      }
      const format = businessResult[0].invoice_number_format;
      const parsedDate = parseIsoDateToIstDate(dateStr);
      const { label } = getIndianFinancialYearForDate(parsedDate);

      // Find financial year row (no insert to avoid polluting DB on simple checks)
      const fyResult = await db.select().from(financialYears)
        .where(and(eq(financialYears.business_id, businessId), eq(financialYears.label, label)));

      if (fyResult.length === 0) {
        return { nextSequence: 1 };
      }

      const fy = fyResult[0];
      const granularity = getResetGranularity(format);
      const periodKey = getPeriodKey(granularity, fy.id, parsedDate);

      const counterResult = await db.select({ counter_value: invoiceNumberCounters.counter_value })
        .from(invoiceNumberCounters)
        .where(and(
          eq(invoiceNumberCounters.business_id, businessId),
          eq(invoiceNumberCounters.period_key, periodKey)
        ));

      const nextSequence = counterResult.length > 0 ? counterResult[0].counter_value + 1 : 1;
      return { nextSequence };
    } catch (error) {
      console.error('Error fetching sequence for date:', error);
      throw new ActionError('Could not fetch next sequence number.', { code: 'FETCH_FAILED' });
    }
  },
  'get-next-sequence'
);
