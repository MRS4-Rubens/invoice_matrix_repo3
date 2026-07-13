'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { invoices, payments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Deleting a payment record is a bookkeeping correction, not a change to a legal document — unlike invoices, payment records are not subject to GST immutability rules, so direct deletion (rather than a credit-note-style correction) is appropriate here.
export const deletePayment = createAuthenticatedAction(z.object({ id: z.string().uuid() }), async ({ id }, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch the payment
      const paymentResult = await tx.select().from(payments).where(and(eq(payments.id, id), eq(payments.business_id, businessId)));
      if (paymentResult.length === 0) {
        throw new ActionError('Payment not found.', { code: 'NOT_FOUND' });
      }
      const payment = paymentResult[0];

      // 2. Fetch the invoice
      const invoiceResult = await tx.select().from(invoices).where(eq(invoices.id, payment.invoice_id));
      if (invoiceResult.length === 0) {
        throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
      }
      const invoice = invoiceResult[0];

      // 3. Delete the payment
      await tx.delete(payments).where(eq(payments.id, id));

      // 4. Query remaining payments sum
      const sumResult = await tx.select({
        total: sql<number>`coalesce(sum(${payments.amount_paise}), 0)`
      }).from(payments).where(eq(payments.invoice_id, invoice.id));
      
      const newTotalPaise = Number(sumResult[0].total);

      // 5. Recompute and update invoice payment_status
      let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      
      if (newTotalPaise >= invoice.grand_total_paise) {
        newStatus = 'paid';
      } else if (newTotalPaise > 0) {
        newStatus = 'partially_paid';
      }

      await tx.update(invoices).set({
        payment_status: newStatus
      }).where(eq(invoices.id, invoice.id));

      // 6. Revalidate
      revalidatePath('/invoices');
      revalidatePath(`/invoices/${invoice.id}`);

      return { success: true };
    });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    console.error('Error deleting payment:', error);
    throw new ActionError('We could not delete the payment. Please try again.', { code: 'TRANSACTION_FAILED' });
  }
}, 'delete-payment');
