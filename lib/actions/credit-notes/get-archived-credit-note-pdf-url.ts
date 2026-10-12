'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { creditNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { ActionError } from '@/lib/actions/_shared/errors';
import { getSignedDownloadUrl } from '@/lib/storage/idrive';

export const getArchivedCreditNotePdfUrl = createAuthenticatedAction(
  z.object({ id: z.string().uuid() }),
  async ({ id }, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) throw new ActionError('No business linked.');

    const rows = await db
      .select()
      .from(creditNotes)
      .where(and(eq(creditNotes.id, id), eq(creditNotes.business_id, businessId)));

    if (rows.length === 0) throw new ActionError('Credit note not found.');

    const cn = rows[0];
    if (!cn.pdf_storage_key) {
      throw new ActionError('Archived copy is not available yet.');
    }

    const url = await getSignedDownloadUrl(cn.pdf_storage_key);
    return { url };
  },
  'get-archived-credit-note-pdf-url'
);
