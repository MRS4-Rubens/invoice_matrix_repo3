'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { sensitiveActionLimiter } from '@/lib/rate-limit/upstash';
import { voidCreditNoteSchema } from '@/lib/validations/credit-note';
import { db } from '@/lib/db/client';
import { invoices, payments, creditNotes, auditLog } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Enterprise-grade Audited Credit Note Void Action (CGST Rule 53 & GSTR-1 Table 13 Compliant).
 * Replaces hard-deletion with an immutable soft-void, retains serial number for Table 13 (Cancelled Documents),
 * logs in statutory audit_log, and restores the original invoice balance.
 */
export const voidCreditNote = createAuthenticatedAction(
  voidCreditNoteSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    try {
      return await db.transaction(async (tx) => {
        // 1. Fetch credit note to verify ownership and check status
        const cnResult = await tx
          .select()
          .from(creditNotes)
          .where(eq(creditNotes.id, input.id));

        if (cnResult.length === 0) {
          throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
        }

        const creditNote = cnResult[0];
        if (creditNote.business_id !== businessId) {
          throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
        }

        if (creditNote.lifecycle_status !== 'finalized') {
          throw new ActionError('Only finalized credit notes can be voided. Drafts can be deleted directly.', { code: 'INVALID_STATUS' });
        }

        if (creditNote.status === 'voided') {
          throw new ActionError('This credit note has already been voided.', { code: 'ALREADY_VOIDED' });
        }

        // 2. Fetch original invoice
        const invoiceResult = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, creditNote.original_invoice_id));

        if (invoiceResult.length === 0 || invoiceResult[0].business_id !== businessId) {
          throw new ActionError('Associated original invoice not found.', { code: 'NOT_FOUND' });
        }
        const invoice = invoiceResult[0];

        // 3. Mark credit note as voided
        const voidedAt = new Date();
        await tx
          .update(creditNotes)
          .set({
            status: 'voided',
            voided_at: voidedAt,
            voided_by: context.appUser.id,
            void_reason: input.reason,
            void_notes: input.notes || null,
          })
          .where(eq(creditNotes.id, creditNote.id));

        // 4. Log in statutory audit log
        await tx.insert(auditLog).values({
          business_id: businessId,
          user_id: context.appUser.id,
          entity_type: 'credit_note',
          entity_id: creditNote.id,
          action: 'void',
          metadata: {
            credit_note_number: creditNote.credit_note_number,
            credit_note_sequence: creditNote.credit_note_sequence,
            grand_total_paise: creditNote.grand_total_paise,
            subtotal_paise: creditNote.subtotal_paise,
            total_tax_paise: creditNote.total_tax_paise,
            reason: input.reason,
            notes: input.notes,
            original_invoice_id: invoice.id,
            original_invoice_number: invoice.invoice_number,
            operator_display_name: context.appUser.display_name,
            voided_at: voidedAt.toISOString(),
          },
        });

        // 5. Query remaining ACTIVE finalized credit notes sum
        const remainingCnSumResult = await tx
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

        const newActiveCreditedPaise = Number(remainingCnSumResult[0]?.total || 0);
        const newNetBillPaise = Math.max(0, invoice.grand_total_paise - newActiveCreditedPaise);

        // 6. Query remaining ACTIVE payments sum
        const paymentsSumResult = await tx
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

        const activePaymentsTotalPaise = Number(paymentsSumResult[0]?.total || 0);

        // 7. Recompute and update invoice payment_status
        let newStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';

        if (activePaymentsTotalPaise >= newNetBillPaise && newNetBillPaise >= 0) {
          newStatus = 'paid';
        } else if (activePaymentsTotalPaise > 0) {
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
        revalidatePath('/credit-notes');
        revalidatePath(`/credit-notes/${creditNote.id}`);

        return {
          success: true,
          status: 'voided',
          credit_note_number: creditNote.credit_note_number,
          restored_amount_paise: creditNote.grand_total_paise,
          invoice_payment_status: newStatus,
        };
      });
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error('Error voiding credit note:', error);
      throw new ActionError('Failed to void credit note. Please try again.', { code: 'INTERNAL_ERROR' });
    }
  },
  'void-credit-note',
  { rateLimit: { limiter: sensitiveActionLimiter, keyPrefix: 'void-credit-note' } }
);
