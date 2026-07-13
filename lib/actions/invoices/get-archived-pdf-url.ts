'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ActionError } from '@/lib/actions/_shared/errors';
import { getSignedDownloadUrl } from '@/lib/storage/idrive';

export const getArchivedPdfUrl = createAuthenticatedAction(
  z.object({ id: z.string().uuid() }),
  async ({ id }, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) throw new ActionError('No business linked.');

    const existing = await db.select().from(invoices).where(eq(invoices.id, id));
    if (existing.length === 0) throw new ActionError('Invoice not found.');
    
    const invoice = existing[0];
    if (invoice.business_id !== businessId) throw new ActionError('Invoice not found.');

    if (invoice.archival_status !== 'archived' || !invoice.pdf_storage_key) {
      throw new ActionError('Archived copy is not available yet.');
    }

    const url = await getSignedDownloadUrl(invoice.pdf_storage_key);
    return { url };
  },
  'get-archived-pdf-url'
);
