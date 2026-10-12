'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { creditNotes, creditNoteLineItems } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const deleteCreditNoteDraftSchema = z.object({
  id: z.string().uuid('Valid credit note ID is required')
});

export const deleteCreditNoteDraft = createAuthenticatedAction(
  deleteCreditNoteDraftSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    const cnRows = await db
      .select()
      .from(creditNotes)
      .where(and(eq(creditNotes.id, input.id), eq(creditNotes.business_id, businessId)));

    if (cnRows.length === 0) {
      throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
    }

    const creditNote = cnRows[0];
    if (creditNote.lifecycle_status !== 'draft') {
      throw new ActionError(
        'Finalized credit notes cannot be deleted under GST law. They are permanent tax records.',
        { code: 'CANNOT_DELETE_FINALIZED' }
      );
    }

    await db.transaction(async (tx) => {
      await tx.delete(creditNoteLineItems).where(eq(creditNoteLineItems.credit_note_id, creditNote.id));
      await tx.delete(creditNotes).where(eq(creditNotes.id, creditNote.id));
    });

    revalidatePath(`/invoices/${creditNote.original_invoice_id}`);
    revalidatePath('/invoices');

    return { success: true };
  },
  'delete-credit-note-draft'
);
