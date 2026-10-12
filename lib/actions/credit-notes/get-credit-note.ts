'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { creditNotes, creditNoteLineItems, invoices, businesses, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const getCreditNoteSchema = z.object({
  id: z.string().uuid('Valid credit note ID is required')
});

export const getCreditNote = createAuthenticatedAction(
  getCreditNoteSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    // 1. Fetch credit note
    const cnRows = await db
      .select()
      .from(creditNotes)
      .where(and(eq(creditNotes.id, input.id), eq(creditNotes.business_id, businessId)));

    if (cnRows.length === 0) {
      throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
    }

    const creditNote = cnRows[0];

    // 2. Fetch original invoice
    const invRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, creditNote.original_invoice_id));

    if (invRows.length === 0) {
      throw new ActionError('Original invoice not found.', { code: 'NOT_FOUND' });
    }

    const originalInvoice = invRows[0];

    // 2b. Fetch cumulative total credited across all active finalized credit notes for this invoice
    const cnSumRes = await db
      .select({ total: sql<number>`coalesce(sum(${creditNotes.grand_total_paise}), 0)` })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.original_invoice_id, originalInvoice.id),
          eq(creditNotes.lifecycle_status, 'finalized'),
          eq(creditNotes.status, 'active')
        )
      );
    const totalCreditedPaiseForInvoice = Number(cnSumRes[0]?.total || 0);

    // 2c. If voided, fetch operator name
    let voidedByName: string | null = null;
    if (creditNote.voided_by) {
      const userRes = await db.select({ name: users.display_name }).from(users).where(eq(users.id, creditNote.voided_by));
      voidedByName = userRes[0]?.name || 'Authorized Operator';
    }

    // 3. Fetch business
    const bizRows = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (bizRows.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
    const business = bizRows[0];

    // 4. Fetch line items
    const lineItems = await db
      .select()
      .from(creditNoteLineItems)
      .where(eq(creditNoteLineItems.credit_note_id, creditNote.id))
      .orderBy(creditNoteLineItems.sort_order);

    return {
      ...creditNote,
      business: {
        id: business.id,
        legal_name: business.legal_name,
        trade_name: business.trade_name,
        gstin: business.gstin,
        pan: business.pan,
        address_line1: business.address_line1,
        address_line2: business.address_line2,
        city: business.city,
        state_code: business.state_code,
        pincode: business.pincode,
        phone: business.phone,
        email: business.email,
        logo_storage_key: business.logo_storage_key
      },
      originalInvoice: {
        id: originalInvoice.id,
        invoice_number: originalInvoice.invoice_number,
        invoice_date: originalInvoice.invoice_date,
        billing_name_snapshot: originalInvoice.billing_name_snapshot,
        billing_gstin_snapshot: originalInvoice.billing_gstin_snapshot,
        billing_address_snapshot: originalInvoice.billing_address_snapshot,
        place_of_supply_state_code: originalInvoice.place_of_supply_state_code,
        grand_total_paise: originalInvoice.grand_total_paise
      },
      totalCreditedPaiseForInvoice,
      voided_by_name: voidedByName,
      lineItems
    };
  },
  'get-credit-note'
);
