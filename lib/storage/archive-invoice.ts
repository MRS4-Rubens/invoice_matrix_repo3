import { db } from '@/lib/db/client';
import { invoices, businesses, financialYears } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createArchivalToken } from '@/lib/security/archival-token';
import { renderUrlToPdfBuffer } from '@/lib/pdf/html-to-pdf-provider';
import { uploadFileToStorage } from '@/lib/storage/idrive';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function archiveInvoicePdf(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch invoice, business, financial year
    const existing = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (existing.length === 0) throw new Error('Invoice not found');
    const invoice = existing[0];

    const businessResult = await db.select().from(businesses).where(eq(businesses.id, invoice.business_id));
    if (businessResult.length === 0) throw new Error('Business not found');
    
    const fyResult = await db.select().from(financialYears).where(eq(financialYears.id, invoice.financial_year_id));
    if (fyResult.length === 0) throw new Error('Financial year not found');
    
    const fyLabel = fyResult[0].label;

    // 2. Generate archival token
    const token = createArchivalToken(invoiceId);

    // 3. Build full URL to the archival-render route
    const renderUrl = `${baseUrl}/api/invoices/${invoiceId}/archival-render?token=${token}`;

    // 4. Render PDF
    const pdfBuffer = await renderUrlToPdfBuffer(renderUrl);

    // 5. Upload to storage
    const storageKey = `invoices/${invoice.business_id}/${fyLabel}/${invoiceId}.pdf`;
    await uploadFileToStorage(storageKey, pdfBuffer, 'application/pdf');

    // 6. Update invoice record
    await db.update(invoices).set({
      pdf_storage_key: storageKey,
      archival_status: 'archived',
      archived_at: new Date(),
    }).where(eq(invoices.id, invoiceId));

    return { success: true };
  } catch (error: any) {
    // Best-effort strategy: never crash the caller, just record the failure for the cron to retry later.
    try {
      const existing = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      if (existing.length > 0) {
        await db.update(invoices).set({
          archival_status: 'failed',
          archival_attempts: existing[0].archival_attempts + 1
        }).where(eq(invoices.id, invoiceId));
      }
    } catch (fallbackError) {
      // Ignore errors updating the fallback status
    }
    
    return { success: false, error: error.message || 'Unknown archival error' };
  }
}
