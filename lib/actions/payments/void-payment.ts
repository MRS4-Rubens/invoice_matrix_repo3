'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { sensitiveActionLimiter } from '@/lib/rate-limit/upstash';
import { voidPaymentSchema } from '@/lib/validations/payment';
import { db } from '@/lib/db/client';
import { invoices, payments, creditNotes, auditLog } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Enterprise-grade Audited Payment Void Action (Anti-Fraud & MCA Rule 3 Compliant).
 * Replaces un-audited hard-deletion with an immutable soft-void and writes to audit_log.
 */
export const voidPayment = createAuthenticatedAction(
  voidPaymentSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    try {
      return await db.transaction(async (tx) => {
        // 1. Fetch payment to verify ownership and check status
        const paymentResult = await tx
          .select()
          .from(payments)
          .where(eq(payments.id, input.id));

        if (paymentResult.length === 0) {
          throw new ActionError('Payment record not found.', { code: 'NOT_FOUND' });
        }

        const payment = paymentResult[0];
        if (payment.business_id !== businessId) {
          throw new ActionError('Payment record not found.', { code: 'NOT_FOUND' });
        }

        if (payment.status === 'voided') {
          throw new ActionError('This payment record has already been voided.', { code: 'ALREADY_VOIDED' });
        }

        // 2. Fetch invoice to ensure business ownership
        const invoiceResult = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, payment.invoice_id));

        if (invoiceResult.length === 0 || invoiceResult[0].business_id !== businessId) {
          throw new ActionError('Associated invoice not found.', { code: 'NOT_FOUND' });
        }
        const invoice = invoiceResult[0];

        // 3. Mark payment as voided
        const voidedAt = new Date();
        await tx
          .update(payments)
          .set({
            status: 'voided',
            voided_at: voidedAt,
            voided_by: context.appUser.id,
            void_reason: input.reason,
            void_notes: input.notes,
          })
          .where(eq(payments.id, payment.id));

        // 4. Log in statutory audit log
        await tx.insert(auditLog).values({
          business_id: businessId,
          user_id: context.appUser.id,
          entity_type: 'payment',
          entity_id: payment.id,
          action: 'void',
          metadata: {
            amount_paise: payment.amount_paise,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            reference_number: payment.reference_number,
            reason: input.reason,
            notes: input.notes,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            operator_display_name: context.appUser.display_name,
            voided_at: voidedAt.toISOString(),
          },
        });

        // 5. Query remaining ACTIVE payments sum
        const sumResult = await tx
          .select({
            total: sql<number>`coalesce(sum(${payments.amount_paise}), 0)`,
          })
          .from(payments)
          .where(
            and(
              eq(payments.invoice_id, invoice.id),
              eq(payments.status, 'active')
            )
          );

        const newActiveTotalPaise = Number(sumResult[0]?.total || 0);

        // 6. Query finalized credit notes sum
        const cnSumResult = await tx
          .select({
            total: sql<number>`coalesce(sum(${creditNotes.grand_total_paise}), 0)`,
          })
          .from(creditNotes)
          .where(
            and(
              eq(creditNotes.original_invoice_id, invoice.id),
              eq(creditNotes.lifecycle_status, 'finalized'),
              eq(creditNotes.status, 'active')
            )
          );
        const totalCreditedPaise = Number(cnSumResult[0]?.total || 0);
        const netBillPaise = Math.max(0, invoice.grand_total_paise - totalCreditedPaise);

        // 7. Recompute and update invoice payment_status
        let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';

        if (newActiveTotalPaise >= netBillPaise && netBillPaise >= 0) {
          newStatus = 'paid';
        } else if (newActiveTotalPaise > 0) {
          newStatus = 'partially_paid';
        }

        await tx
          .update(invoices)
          .set({
            payment_status: newStatus,
          })
          .where(eq(invoices.id, invoice.id));

        // 8. Revalidate paths
        revalidatePath('/invoices');
        revalidatePath(`/invoices/${invoice.id}`);

        return {
          success: true,
          voidedPaymentId: payment.id,
          newPaymentStatus: newStatus,
          activeTotalPaise: newActiveTotalPaise,
        };
      });
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('Error voiding payment:', error);
      throw new ActionError('We could not void the payment. Please try again.', { code: 'TRANSACTION_FAILED' });
    }
  },
  'void-payment',
  { rateLimit: { limiter: sensitiveActionLimiter, keyPrefix: 'void-payment' } }
);
