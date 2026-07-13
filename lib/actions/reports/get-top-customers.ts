'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, customers } from '@/lib/db/schema';
import { eq, and, between, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const getTopCustomersSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  limit: z.number().default(10)
});

export const getTopCustomers = createAuthenticatedAction(getTopCustomersSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  const results = await db.select({
    customer_id: invoices.customer_id,
    customer_name: customers.name,
    total_revenue_paise: sql<number>`sum(${invoices.grand_total_paise})`.mapWith(Number)
  })
  .from(invoices)
  .leftJoin(customers, eq(invoices.customer_id, customers.id))
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, input.startDate, input.endDate)
  ))
  .groupBy(invoices.customer_id, customers.name)
  .orderBy(desc(sql`sum(${invoices.grand_total_paise})`))
  .limit(input.limit);

  return results;
}, 'get-top-customers');
