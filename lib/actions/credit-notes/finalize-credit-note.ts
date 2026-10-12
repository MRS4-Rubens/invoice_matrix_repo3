'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { finalizeCreditNoteSchema } from '@/lib/validations/credit-note';
import { sensitiveActionLimiter } from '@/lib/rate-limit/upstash';
import { db } from '@/lib/db/client';
import { creditNotes, creditNoteLineItems, invoices, businesses, payments } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentFinancialYear } from '@/lib/invoices/financial-year-rollover';
import { parseIsoDateToIstDate, formatIstDateAsIso } from '@/lib/invoices/ist-date';
import { getNextCreditNoteNumber } from '@/lib/invoices/credit-note-numbering';
import { archiveCreditNotePdf } from '@/lib/storage/archive-credit-note';

export const finalizeCreditNote = createAuthenticatedAction(
  finalizeCreditNoteSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    try {
      const result = await db.transaction(async (tx) => {
        // 1. Fetch credit note
        const cnRows = await tx
          .select()
          .from(creditNotes)
          .where(and(eq(creditNotes.id, input.id), eq(creditNotes.business_id, businessId)));

        if (cnRows.length === 0) {
          throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
        }

        const creditNote = cnRows[0];
        if (creditNote.lifecycle_status === 'finalized') {
          throw new ActionError('This credit note has already been finalized and locked.', { code: 'ALREADY_FINALIZED' });
        }

        // 2. Fetch original invoice
        const invRows = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, creditNote.original_invoice_id), eq(invoices.business_id, businessId)));

        if (invRows.length === 0) {
          throw new ActionError('Original invoice not found.', { code: 'NOT_FOUND' });
        }

        const originalInvoice = invRows[0];
        if (originalInvoice.lifecycle_status !== 'finalized') {
          throw new ActionError('Original invoice is not finalized.', { code: 'INVALID_STATUS' });
        }

        // 3. Ensure credit note has line items
        const lineItemRows = await tx
          .select()
          .from(creditNoteLineItems)
          .where(eq(creditNoteLineItems.credit_note_id, creditNote.id));

        if (lineItemRows.length === 0) {
          throw new ActionError('Credit note must contain at least one line item before finalization.', { code: 'NO_ITEMS' });
        }

        // 4. Fetch business profile
        const bizRows = await tx.select().from(businesses).where(eq(businesses.id, businessId));
        if (bizRows.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
        const business = bizRows[0];

        // 5. Get active financial year
        const issueDateObj = creditNote.issue_date ? parseIsoDateToIstDate(creditNote.issue_date) : new Date();
        const activeFy = await getOrCreateCurrentFinancialYear(tx, businessId, issueDateObj);

        // 6. Generate official, sequential Credit Note Number
        const { creditNoteNumber, sequence } = await getNextCreditNoteNumber(tx, {
          businessId,
          financialYearId: activeFy.id,
          fyLabel: activeFy.label,
          prefix: business.credit_note_number_prefix || 'CN'
        });

        const finalizedIssueDate = creditNote.issue_date || formatIstDateAsIso(new Date());

        // 7. Update credit note to finalized
        await tx
          .update(creditNotes)
          .set({
            credit_note_number: creditNoteNumber,
            credit_note_sequence: sequence,
            financial_year_id: activeFy.id,
            lifecycle_status: 'finalized',
            issue_date: finalizedIssueDate,
            finalized_at: new Date(),
            updated_at: new Date()
          })
          .where(eq(creditNotes.id, creditNote.id));

        // 8. Recalculate original invoice payment status
        // A. Sum active payments (excluding voided payments)
        const paymentsSumRes = await tx
          .select({ total: sql<number>`coalesce(sum(${payments.amount_paise}), 0)` })
          .from(payments)
          .where(
            and(
              eq(payments.invoice_id, originalInvoice.id),
              eq(payments.status, 'active')
            )
          );
        const totalPaidPaise = Number(paymentsSumRes[0]?.total || 0);

        // B. Sum all finalized credit notes (including this one)
        const cnSumRes = await tx
          .select({ total: sql<number>`coalesce(sum(${creditNotes.grand_total_paise}), 0)` })
          .from(creditNotes)
          .where(
            and(
              eq(creditNotes.original_invoice_id, originalInvoice.id),
              eq(creditNotes.lifecycle_status, 'finalized'),
              eq(creditNotes.status, 'active')
            )
          );
        const totalCreditedPaise = Number(cnSumRes[0]?.total || 0);

        const netBillPaise = originalInvoice.grand_total_paise - totalCreditedPaise;

        let newPaymentStatus: 'unpaid' | 'partially_paid' | 'paid' = 'unpaid';
        if (totalPaidPaise >= netBillPaise && netBillPaise >= 0) {
          newPaymentStatus = 'paid';
        } else if (totalPaidPaise > 0) {
          newPaymentStatus = 'partially_paid';
        } else {
          newPaymentStatus = 'unpaid';
        }

        await tx
          .update(invoices)
          .set({
            payment_status: newPaymentStatus,
          })
          .where(eq(invoices.id, originalInvoice.id));

        return {
          id: creditNote.id,
          creditNoteNumber,
          originalInvoiceId: originalInvoice.id
        };
      });

      // 9. Asynchronously archive PDF (non-blocking best effort)
      archiveCreditNotePdf(result.id).catch((err) => {
        console.error(`Background archival failed for credit note ${result.id}:`, err);
      });

      // 10. Revalidate paths
      revalidatePath(`/invoices/${result.originalInvoiceId}`);
      revalidatePath(`/credit-notes/${result.id}`);
      revalidatePath('/invoices');
      revalidatePath('/dashboard');
      revalidatePath('/reports');

      return {
        id: result.id,
        creditNoteNumber: result.creditNoteNumber
      };
    } catch (error: unknown) {
      if (error instanceof ActionError) throw error;
      const message = error instanceof Error ? error.message : 'Failed to finalize credit note.';
      throw new ActionError(message, { code: 'FINALIZE_FAILED' });
    }
  },
  'finalize-credit-note',
  {
    rateLimit: {
      limiter: sensitiveActionLimiter,
      keyPrefix: 'finalize-credit-note'
    }
  }
);
