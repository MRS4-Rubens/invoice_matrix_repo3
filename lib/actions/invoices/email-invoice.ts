'use server';

import { z } from 'zod';
import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { logError } from '@/lib/actions/_shared/logger';
import { db } from '@/lib/db/client';
import { invoices, businesses, customers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getFileBuffer } from '@/lib/storage/idrive';
import { resend } from '@/lib/email/resend';
import InvoiceDeliveryEmail from '@/lib/email/templates/invoice-delivery-email';
import { revalidatePath } from 'next/cache';
import { formatPaiseAsInr } from '@/lib/money';

const EmailInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const emailInvoice = createAuthenticatedAction(
  EmailInvoiceSchema,
  async (input, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('User does not belong to a business.');
    }

    const { invoiceId } = input;

    // 1. Fetch invoice and verify business ownership
    const invoiceRecords = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.business_id, appUser.business_id)));

    if (invoiceRecords.length === 0) {
      throw new ActionError('Invoice not found or unauthorized.');
    }

    const invoice = invoiceRecords[0];

    if (invoice.lifecycle_status !== 'finalized') {
      throw new ActionError('Only finalized invoices can be emailed.');
    }

    // 2. Verify archival_status
    if (invoice.archival_status !== 'archived' || !invoice.pdf_storage_key) {
      throw new ActionError(
        "This invoice's PDF is still being archived. Please try again in a moment.",
        { code: 'PDF_NOT_READY' }
      );
    }

    // 3. Fetch customer email
    const customerRecords = await db
      .select()
      .from(customers)
      .where(eq(customers.id, invoice.customer_id));

    if (customerRecords.length === 0) {
      throw new ActionError('Customer not found.');
    }

    const customer = customerRecords[0];

    if (!customer.email || customer.email.trim() === '') {
      throw new ActionError(
        'This customer does not have an email address on file. Add one in Customers before emailing an invoice.',
        { code: 'NO_CUSTOMER_EMAIL' }
      );
    }

    // 4. Fetch business profile
    const businessRecords = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, appUser.business_id));

    if (businessRecords.length === 0) {
      throw new ActionError('Business not found.');
    }

    const business = businessRecords[0];

    // 5. Call getFileBuffer
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await getFileBuffer(invoice.pdf_storage_key);
    } catch (error) {
      logError('email-invoice', error);
      throw new ActionError('Could not fetch the invoice PDF from storage. Please try again later.');
    }

    // 6. Call resend.emails.send()
    const invoiceDateStr = invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : 'N/A';
    const dueDateStr = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : null;
    
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: customer.email,
        subject: `Invoice ${invoice.invoice_number} from ${business.legal_name}`,
        react: InvoiceDeliveryEmail({
          businessName: business.legal_name,
          customerName: customer.name,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoiceDateStr,
          dueDate: dueDateStr,
          grandTotalFormatted: formatPaiseAsInr(invoice.grand_total_paise),
        }) as React.ReactElement,
        attachments: [
          {
            filename: `${invoice.invoice_number.replace(/\//g, '-')}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      // 7. Handle Resend SDK errors
      if (result.error) {
        logError('email-invoice', result.error);
        throw new ActionError(`Failed to send email: ${result.error.message}`);
      }
    } catch (error) {
      logError('email-invoice', error);
      throw new ActionError('We could not send the email. Please try again.');
    }

    // 8. Update emailed_at and email_send_count
    await db
      .update(invoices)
      .set({
        emailed_at: new Date(),
        email_send_count: (invoice.email_send_count || 0) + 1,
      })
      .where(eq(invoices.id, invoice.id));

    revalidatePath(`/invoices/${invoice.id}`);
    
    return { success: true };
  },
  'email-invoice'
);
