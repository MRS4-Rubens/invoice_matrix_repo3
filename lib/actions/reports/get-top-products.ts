'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, products } from '@/lib/db/schema';
import { eq, and, between, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

const getTopProductsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  limit: z.number().default(10)
});

export const getTopProducts = createAuthenticatedAction(getTopProductsSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  const results = await db.select({
    product_id: invoiceLineItems.product_id,
    product_name: products.name,
    total_revenue_paise: sql<number>`sum(${invoiceLineItems.line_total_paise})`.mapWith(Number),
    total_quantity: sql<number>`sum(${invoiceLineItems.quantity})`.mapWith(Number)
  })
  .from(invoiceLineItems)
  .innerJoin(invoices, eq(invoiceLineItems.invoice_id, invoices.id))
  .leftJoin(products, eq(invoiceLineItems.product_id, products.id))
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, input.startDate, input.endDate)
  ))
  .groupBy(invoiceLineItems.product_id, products.name)
  .orderBy(desc(sql`sum(${invoiceLineItems.line_total_paise})`))
  .limit(input.limit);

  return results.map(row => ({
    product_id: row.product_id,
    product_name: row.product_name || 'Ad-hoc / Other Items',
    total_revenue_paise: row.total_revenue_paise,
    total_quantity: row.total_quantity
  }));
}, 'get-top-products');
