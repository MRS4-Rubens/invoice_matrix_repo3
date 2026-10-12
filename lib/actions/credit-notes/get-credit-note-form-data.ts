'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, creditNotes, creditNoteLineItems, businesses, taxRates } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const getCreditNoteFormDataSchema = z.object({
  invoiceId: z.string().uuid('Valid invoice ID is required')
});

export const getCreditNoteFormData = createAuthenticatedAction(
  getCreditNoteFormDataSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    // 1. Fetch original invoice
    const invoiceRows = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.business_id, businessId)));

    if (invoiceRows.length === 0) {
      throw new ActionError('Original invoice not found.', { code: 'NOT_FOUND' });
    }

    const invoice = invoiceRows[0];

    if (invoice.lifecycle_status !== 'finalized') {
      throw new ActionError('Credit notes can only be issued against finalized invoices.', { code: 'INVALID_STATUS' });
    }

    // 2. Fetch original line items
    const originalItems = await db
      .select()
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoice_id, invoice.id))
      .orderBy(invoiceLineItems.sort_order);

    // 3. Fetch all already finalized or draft credit notes against this invoice to calculate credited quantities
    const existingCnLineItems = await db
      .select({
        description: creditNoteLineItems.description,
        hsn_sac_code: creditNoteLineItems.hsn_sac_code,
        credited_quantity: sql<number>`coalesce(sum(${creditNoteLineItems.quantity}), 0)`
      })
      .from(creditNoteLineItems)
      .innerJoin(creditNotes, eq(creditNoteLineItems.credit_note_id, creditNotes.id))
      .where(
        and(
          eq(creditNotes.original_invoice_id, invoice.id),
          eq(creditNotes.lifecycle_status, 'finalized'),
          eq(creditNotes.status, 'active')
        )
      )
      .groupBy(creditNoteLineItems.description, creditNoteLineItems.hsn_sac_code);

    const creditedMap = new Map<string, number>();
    for (const item of existingCnLineItems) {
      const key = `${item.description}::${item.hsn_sac_code}`;
      creditedMap.set(key, Number(item.credited_quantity || 0));
    }

    // 3b. Fetch total amount already credited across all active finalized credit notes for this invoice
    const existingCnSumRes = await db
      .select({ total: sql<number>`coalesce(sum(${creditNotes.grand_total_paise}), 0)` })
      .from(creditNotes)
      .where(
        and(
          eq(creditNotes.original_invoice_id, invoice.id),
          eq(creditNotes.lifecycle_status, 'finalized'),
          eq(creditNotes.status, 'active')
        )
      );
    const previouslyCreditedPaise = Number(existingCnSumRes[0]?.total || 0);

    // 4. Fetch business & tax rates
    const businessRows = await db.select().from(businesses).where(eq(businesses.id, businessId));
    if (businessRows.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
    const business = businessRows[0];

    const activeTaxRates = await db.select().from(taxRates).where(eq(taxRates.is_active, true));

    // 5. Build line item data with remaining creditable quantity
    const preparedLineItems = originalItems.map(item => {
      const key = `${item.description}::${item.hsn_sac_code}`;
      const alreadyCredited = creditedMap.get(key) || 0;
      const origQty = Number(item.quantity);
      const remainingQty = Math.max(0, origQty - alreadyCredited);

      // Find matching tax rate id
      const matchedTaxRate = activeTaxRates.find(
        tr => Number(tr.rate_percentage) === Number(item.tax_rate_percentage)
      ) || activeTaxRates[0];

      return {
        id: item.id,
        product_id: item.product_id,
        description: item.description,
        hsn_sac_code: item.hsn_sac_code,
        unit_of_measurement: item.unit_of_measurement,
        unit_price_paise: item.unit_price_paise,
        unit_price_rupees: item.unit_price_paise / 100,
        discount_percentage: (() => {
          const gross = origQty * item.unit_price_paise;
          return gross > 0 ? Math.round((item.discount_paise / gross) * 100) : 0;
        })(),
        tax_rate_percentage: Number(item.tax_rate_percentage),
        tax_rate_id: matchedTaxRate ? matchedTaxRate.id : '',
        original_quantity: origQty,
        already_credited_quantity: alreadyCredited,
        remaining_creditable_quantity: remainingQty
      };
    });

    return {
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        grand_total_paise: invoice.grand_total_paise,
        subtotal_paise: invoice.subtotal_paise,
        total_tax_paise: invoice.total_tax_paise,
        billing_name: invoice.billing_name_snapshot,
        billing_gstin: invoice.billing_gstin_snapshot,
        place_of_supply_state_code: invoice.place_of_supply_state_code
      },
      previouslyCreditedPaise,
      business: {
        id: business.id,
        legal_name: business.legal_name,
        trade_name: business.trade_name,
        gstin: business.gstin,
        state_code: business.state_code
      },
      lineItems: preparedLineItems,
      taxRates: activeTaxRates
    };
  },
  'get-credit-note-form-data'
);
