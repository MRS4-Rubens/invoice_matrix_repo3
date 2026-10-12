'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { creditNotes, invoices } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const listCreditNotesSchema = z.object({
  invoice_id: z.string().uuid().optional()
});

export const listCreditNotes = createAuthenticatedAction(
  listCreditNotesSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    const conditions = [eq(creditNotes.business_id, businessId)];
    if (input.invoice_id) {
      conditions.push(eq(creditNotes.original_invoice_id, input.invoice_id));
    }

    const rows = await db
      .select({
        id: creditNotes.id,
        credit_note_number: creditNotes.credit_note_number,
        credit_note_sequence: creditNotes.credit_note_sequence,
        reason: creditNotes.reason,
        lifecycle_status: creditNotes.lifecycle_status,
        issue_date: creditNotes.issue_date,
        subtotal_paise: creditNotes.subtotal_paise,
        total_tax_paise: creditNotes.total_tax_paise,
        grand_total_paise: creditNotes.grand_total_paise,
        created_at: creditNotes.created_at,
        status: creditNotes.status,
        voided_at: creditNotes.voided_at,
        void_reason: creditNotes.void_reason,
        void_notes: creditNotes.void_notes,
        original_invoice_id: creditNotes.original_invoice_id,
        original_invoice_number: invoices.invoice_number,
        original_invoice_date: invoices.invoice_date,
        billing_name_snapshot: invoices.billing_name_snapshot,
        billing_gstin_snapshot: invoices.billing_gstin_snapshot
      })
      .from(creditNotes)
      .innerJoin(invoices, eq(creditNotes.original_invoice_id, invoices.id))
      .where(and(...conditions))
      .orderBy(desc(creditNotes.created_at));

    return rows;
  },
  'list-credit-notes'
);
