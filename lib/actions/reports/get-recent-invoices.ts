'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, customers } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getDisplayInvoiceStatus, type DisplayInvoiceStatus } from '@/lib/invoices/status';
import { formatIstDateAsIso } from '@/lib/invoices/ist-date';
import { z } from 'zod';

const getRecentInvoicesSchema = z.object({
  limit: z.number().default(5)
});

export type RecentInvoiceInfo = {
  id: string;
  invoice_number: string;
  customer_name: string;
  invoice_date: string | null;
  grand_total_paise: number;
  status: DisplayInvoiceStatus;
};

export const getRecentInvoices = createAuthenticatedAction(getRecentInvoicesSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  const recent = await db.select({
    id: invoices.id,
    invoice_number: invoices.invoice_number,
    invoice_date: invoices.invoice_date,
    grand_total_paise: invoices.grand_total_paise,
    due_date: invoices.due_date,
    lifecycle_status: invoices.lifecycle_status,
    payment_status: invoices.payment_status,
    customer_name: customers.name
  })
  .from(invoices)
  .leftJoin(customers, eq(invoices.customer_id, customers.id))
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized')
  ))
  .orderBy(desc(invoices.finalized_at))
  .limit(input.limit);

  return recent.map(inv => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    customer_name: inv.customer_name || 'Unknown Customer',
    invoice_date: inv.invoice_date,
    grand_total_paise: inv.grand_total_paise,
    status: getDisplayInvoiceStatus({
      lifecycle_status: inv.lifecycle_status,
      payment_status: inv.payment_status,
      due_date: inv.due_date
    })
  }));
}, 'get-recent-invoices');
