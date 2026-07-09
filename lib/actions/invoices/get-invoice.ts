'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ActionError } from '@/lib/actions/_shared/errors';

export const getInvoice = createAuthenticatedAction(z.object({ id: z.string().uuid() }), async ({ id }, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) throw new ActionError('No business linked.');

  const existing = await db.select().from(invoices).where(eq(invoices.id, id));
  if (existing.length === 0) throw new ActionError('Invoice not found.');
  
  const invoice = existing[0];
  if (invoice.business_id !== businessId) throw new ActionError('Invoice not found.');

  const customerResult = await db.select().from(customers).where(eq(customers.id, invoice.customer_id));
  const customer = customerResult[0];

  const lineItems = await db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoice_id, id)).orderBy(invoiceLineItems.sort_order);

  return {
    ...invoice,
    customer,
    lineItems
  };
}, 'get-invoice');
