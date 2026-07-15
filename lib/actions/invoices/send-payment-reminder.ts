'use server';

import { z } from 'zod';
import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { sensitiveActionLimiter } from '@/lib/rate-limit/upstash';
import { logError } from '@/lib/actions/_shared/logger';
import { db } from '@/lib/db/client';
import { invoices, businesses, customers, payments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { resend } from '@/lib/email/resend';
import PaymentReminderEmail from '@/lib/email/templates/payment-reminder-email';
import { revalidatePath } from 'next/cache';
import { formatPaiseAsInr } from '@/lib/money';
import { getDisplayInvoiceStatus } from '@/lib/invoices/status';
import { getIstDateParts, formatIstDateAsIso } from '@/lib/invoices/ist-date';

const SendPaymentReminderSchema = z.object({
  invoiceId: z.string().uuid(),
});

export const sendPaymentReminder = createAuthenticatedAction(
  SendPaymentReminderSchema,
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

    // 2. Fetch payments to compute balance and current status correctly
    const invoicePayments = await db
      .select()
      .from(payments)
      .where(eq(payments.invoice_id, invoice.id));

    // Calculate sum of payments (ignoring failed ones if any, assuming all in payments table are successful unless marked otherwise, but let's assume they are all valid as per current app logic)
    // Looking at other places, we just sum amount_paise.
    const sumOfPayments = invoicePayments.reduce((acc, p) => acc + p.amount_paise, 0);
    const balancePaise = invoice.grand_total_paise - sumOfPayments;

    // Verify overdue status
    const displayStatus = getDisplayInvoiceStatus({
      lifecycle_status: invoice.lifecycle_status as 'draft' | 'finalized',
      payment_status: invoice.payment_status as 'unpaid' | 'partially_paid' | 'paid' | 'overdue',
      due_date: invoice.due_date,
    });

    if (displayStatus !== 'overdue') {
      throw new ActionError('This invoice is not currently overdue.');
    }

    if (!invoice.due_date) {
      throw new ActionError('This invoice does not have a due date.');
    }

    // Compute days overdue
    const asOfParts = getIstDateParts(new Date());
    const today = new Date(asOfParts.year, asOfParts.month - 1, asOfParts.day);
    
    const dueStr = invoice.due_date;
    const parts = dueStr.split('T')[0].split('-');
    const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    // Days diff
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

    // 5. Call resend.emails.send()
    const dueDateStr = new Date(invoice.due_date).toLocaleDateString('en-IN');
    
    try {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: customer.email,
        subject: `Payment Reminder: Invoice ${invoice.invoice_number} from ${business.legal_name}`,
        react: PaymentReminderEmail({
          businessName: business.legal_name,
          customerName: customer.name,
          invoiceNumber: invoice.invoice_number,
          dueDate: dueDateStr,
          daysOverdue: daysOverdue,
          amountDueFormatted: formatPaiseAsInr(balancePaise),
        }) as React.ReactElement,
      });

      // Handle Resend SDK errors
      if (result.error) {
        logError('send-payment-reminder', result.error);
        throw new ActionError(`Failed to send email: ${result.error.message}`);
      }
    } catch (error) {
      logError('send-payment-reminder', error);
      throw new ActionError('We could not send the email. Please try again.');
    }

    // 6. Update emailed_at and email_send_count
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
  'send-payment-reminder',
  { rateLimit: { limiter: sensitiveActionLimiter, keyPrefix: 'email-invoice' } }
);
