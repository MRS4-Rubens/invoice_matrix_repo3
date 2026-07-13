'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { recordPaymentSchema } from '@/lib/validations/payment';
import { db } from '@/lib/db/client';
import { invoices, payments } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { rupeesToPaise, paiseToRupees, formatPaiseAsInr } from '@/lib/money';

export const recordPayment = createAuthenticatedAction(recordPaymentSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Verify invoice
      const invoiceResult = await tx.select().from(invoices).where(eq(invoices.id, input.invoice_id));
      if (invoiceResult.length === 0) {
        throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
      }
      
      const invoice = invoiceResult[0];
      if (invoice.business_id !== businessId) {
        throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
      }
      if (invoice.lifecycle_status !== 'finalized') {
        throw new ActionError('Payments can only be recorded against finalized invoices.', { code: 'INVALID_STATUS' });
      }

      // 2. Convert input amount
      const newAmountPaise = rupeesToPaise(input.amount);

      // 3. Query existing payments sum
      const sumResult = await tx.select({
        total: sql<number>`coalesce(sum(${payments.amount_paise}), 0)`
      }).from(payments).where(eq(payments.invoice_id, invoice.id));
      
      const existingSum = Number(sumResult[0].total);
      
      // Check overpayment (Phase 12: Note that when credit notes are built, this logic will need to account for them reducing the amount actually owed)
      if (existingSum + newAmountPaise > invoice.grand_total_paise) {
        const remainingPaise = invoice.grand_total_paise - existingSum;
        const remainingRupees = paiseToRupees(remainingPaise);
        throw new ActionError(`This payment would exceed the invoice's remaining balance of ₹${remainingRupees}. Enter an amount up to the remaining balance.`, { code: 'OVERPAYMENT' });
      }

      // 4. Insert payment
      await tx.insert(payments).values({
        business_id: businessId,
        invoice_id: invoice.id,
        amount_paise: newAmountPaise,
        payment_date: input.payment_date,
        payment_method: input.payment_method,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
      });

      // 5. Recompute new total and update invoice payment_status
      const newTotalPaise = existingSum + newAmountPaise;
      let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
      
      if (newTotalPaise === invoice.grand_total_paise) {
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

      return { 
        payment_status: newStatus, 
        remaining_balance_paise: invoice.grand_total_paise - newTotalPaise 
      };
    });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    console.error('Error recording payment:', error);
    throw new ActionError('We could not record the payment. Please try again.', { code: 'TRANSACTION_FAILED' });
  }
}, 'record-payment');
