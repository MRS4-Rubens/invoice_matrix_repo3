'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, customers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const listInvoices = createAuthenticatedAction(z.object({}), async (_, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) return [];

  const results = await db
    .select({
      id: invoices.id,
      invoice_number: invoices.invoice_number,
      invoice_date: invoices.invoice_date,
      grand_total_paise: invoices.grand_total_paise,
      lifecycle_status: invoices.lifecycle_status,
      customer_name: customers.name
    })
    .from(invoices)
    .innerJoin(customers, eq(invoices.customer_id, customers.id))
    .where(eq(invoices.business_id, businessId))
    .orderBy(desc(invoices.created_at));

  return results;
}, 'list-invoices');
