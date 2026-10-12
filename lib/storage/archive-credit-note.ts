import { db } from '@/lib/db/client';
import { creditNotes, businesses, financialYears } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createArchivalToken } from '@/lib/security/archival-token';
import { renderUrlToPdfBuffer } from '@/lib/pdf/html-to-pdf-provider';
import { uploadFileToStorage } from '@/lib/storage/idrive';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function archiveCreditNotePdf(creditNoteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch credit note, business, financial year
    const existing = await db.select().from(creditNotes).where(eq(creditNotes.id, creditNoteId));
    if (existing.length === 0) throw new Error('Credit note not found');
    const creditNote = existing[0];

    const businessResult = await db.select().from(businesses).where(eq(businesses.id, creditNote.business_id));
    if (businessResult.length === 0) throw new Error('Business not found');

    const fyResult = await db.select().from(financialYears).where(eq(financialYears.id, creditNote.financial_year_id));
    if (fyResult.length === 0) throw new Error('Financial year not found');

    const fyLabel = fyResult[0].label;

    // 2. Generate archival token
    const token = createArchivalToken(creditNoteId);

    // 3. Build full URL to the archival-render route
    const renderUrl = `${baseUrl}/api/credit-notes/${creditNoteId}/archival-render?token=${token}`;

    // 4. Render PDF
    const pdfBuffer = await renderUrlToPdfBuffer(renderUrl);

    // 5. Upload to storage (iDrive e2)
    const storageKey = `credit-notes/${creditNote.business_id}/${fyLabel}/${creditNoteId}.pdf`;
    await uploadFileToStorage(storageKey, pdfBuffer, 'application/pdf');

    // 6. Update credit note record
    await db
      .update(creditNotes)
      .set({
        pdf_storage_key: storageKey,
        updated_at: new Date()
      })
      .where(eq(creditNotes.id, creditNoteId));

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown archival error';
    // Best-effort strategy: log and return failure without crashing caller
    console.error(`[ArchiveCreditNote] Failed to archive credit note ${creditNoteId}:`, message);
    return { success: false, error: message };
  }
}
