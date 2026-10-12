'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { creditNoteDraftSchema } from '@/lib/validations/credit-note';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, creditNotes, creditNoteLineItems, businesses, taxRates } from '@/lib/db/schema';
import { calculateInvoiceTax } from '@/lib/gst/calculate';
import { TaxCalculationInput, TaxLineItemInput } from '@/lib/gst/types';
import { eq, and, inArray, sql, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentFinancialYear } from '@/lib/invoices/financial-year-rollover';
import { parseIsoDateToIstDate } from '@/lib/invoices/ist-date';

export const saveCreditNoteDraft = createAuthenticatedAction(
  creditNoteDraftSchema,
  async (input, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
    }

    try {
      return await db.transaction(async (tx) => {
        // 1. Verify original invoice
        const invRows = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, input.original_invoice_id), eq(invoices.business_id, businessId)));

        if (invRows.length === 0) {
          throw new ActionError('Original invoice not found.', { code: 'NOT_FOUND' });
        }

        const originalInvoice = invRows[0];
        if (originalInvoice.lifecycle_status !== 'finalized') {
          throw new ActionError('Credit notes can only be issued against finalized invoices.', { code: 'INVALID_STATUS' });
        }

        // 2. If updating existing draft, verify it is still a draft
        let creditNoteId = input.id;
        if (creditNoteId) {
          const existingCn = await tx
            .select()
            .from(creditNotes)
            .where(and(eq(creditNotes.id, creditNoteId), eq(creditNotes.business_id, businessId)));

          if (existingCn.length === 0) {
            throw new ActionError('Credit note not found.', { code: 'NOT_FOUND' });
          }

          if (existingCn[0].lifecycle_status !== 'draft') {
            throw new ActionError('This credit note has already been finalized and cannot be edited.', { code: 'ALREADY_FINALIZED' });
          }
        }

        // 3. Fetch business profile
        const bizRows = await tx.select().from(businesses).where(eq(businesses.id, businessId));
        if (bizRows.length === 0) throw new ActionError('Business profile not found.', { code: 'NOT_FOUND' });
        const business = bizRows[0];

        // 4. Validate creditable quantities against original invoice
        const origLineItems = await tx
          .select()
          .from(invoiceLineItems)
          .where(eq(invoiceLineItems.invoice_id, originalInvoice.id));

        const origItemMap = new Map(origLineItems.map(item => [`${item.description}::${item.hsn_sac_code}`, item]));

        // Fetch already credited quantities from OTHER finalized credit notes
        const existingCredited = await tx
          .select({
            description: creditNoteLineItems.description,
            hsn_sac_code: creditNoteLineItems.hsn_sac_code,
            credited_quantity: sql<number>`coalesce(sum(${creditNoteLineItems.quantity}), 0)`
          })
          .from(creditNoteLineItems)
          .innerJoin(creditNotes, eq(creditNoteLineItems.credit_note_id, creditNotes.id))
          .where(
            and(
              eq(creditNotes.original_invoice_id, originalInvoice.id),
              eq(creditNotes.lifecycle_status, 'finalized'),
              eq(creditNotes.status, 'active'),
              creditNoteId ? ne(creditNotes.id, creditNoteId) : undefined
            )
          )
          .groupBy(creditNoteLineItems.description, creditNoteLineItems.hsn_sac_code);

        const alreadyCreditedMap = new Map<string, number>();
        for (const ec of existingCredited) {
          alreadyCreditedMap.set(`${ec.description}::${ec.hsn_sac_code}`, Number(ec.credited_quantity || 0));
        }

        // Verify each requested line item
        for (const item of input.line_items) {
          const key = `${item.description}::${item.hsn_sac_code}`;
          const orig = origItemMap.get(key);
          if (!orig) {
            throw new ActionError(`Item "${item.description}" (HSN ${item.hsn_sac_code}) does not exist on original invoice #${originalInvoice.invoice_number}.`, { code: 'INVALID_ITEM' });
          }

          const originalQty = Number(orig.quantity);
          const alreadyCredited = alreadyCreditedMap.get(key) || 0;
          const maxAllowed = originalQty - alreadyCredited;

          if (item.quantity > maxAllowed) {
            throw new ActionError(
              `Quantity for "${item.description}" (${item.quantity}) exceeds the remaining creditable quantity (${maxAllowed}).`,
              { code: 'QUANTITY_EXCEEDED' }
            );
          }
        }

        // 5. Fetch tax rates and calculate GST
        const taxRateIds = input.line_items.map(li => li.tax_rate_id);
        const fetchedTaxRates = await tx
          .select({ id: taxRates.id, rate_percentage: taxRates.rate_percentage })
          .from(taxRates)
          .where(inArray(taxRates.id, taxRateIds));

        const taxRateMap = new Map(fetchedTaxRates.map(tr => [tr.id, Number(tr.rate_percentage)]));

        const taxLineItemInputs: TaxLineItemInput[] = input.line_items.map(li => {
          const ratePct = taxRateMap.get(li.tax_rate_id);
          if (ratePct === undefined) throw new ActionError(`Invalid tax rate: ${li.tax_rate_id}`);
          const grossPaise = Math.round(li.quantity * Math.round(li.unit_price * 100));
          const discountPaise = Math.round(grossPaise * (li.discount / 100));
          return {
            quantity: li.quantity,
            unitPricePaise: Math.round(li.unit_price * 100),
            discountPaise,
            taxRatePercentage: ratePct
          };
        });

        const taxCalcInput: TaxCalculationInput = {
          sellerStateCode: business.state_code,
          placeOfSupplyStateCode: originalInvoice.place_of_supply_state_code || business.state_code,
          lineItems: taxLineItemInputs,
          gstRateType: 'exclusive'
        };

        const taxResult = calculateInvoiceTax(taxCalcInput);

        // 6. Get or create financial year for credit note date
        const issueDateObj = input.issue_date ? parseIsoDateToIstDate(input.issue_date) : new Date();
        const activeFy = await getOrCreateCurrentFinancialYear(tx, businessId, issueDateObj);

        // 7. Insert or update credit_notes
        const cnData = {
          business_id: businessId,
          original_invoice_id: originalInvoice.id,
          financial_year_id: activeFy.id,
          reason: input.reason,
          lifecycle_status: 'draft' as const,
          issue_date: input.issue_date || null,
          subtotal_paise: taxResult.subtotalPaise,
          total_cgst_paise: taxResult.totalCgstPaise,
          total_sgst_paise: taxResult.totalSgstPaise,
          total_igst_paise: taxResult.totalIgstPaise,
          total_tax_paise: taxResult.totalTaxPaise,
          grand_total_paise: Math.round(taxResult.grandTotalPaise / 100) * 100
        };

        if (!creditNoteId) {
          const [newCn] = await tx
            .insert(creditNotes)
            .values({
              ...cnData,
              credit_note_sequence: null,
              credit_note_number: `DRAFT-CN-${Date.now()}`
            })
            .returning({ id: creditNotes.id });
          creditNoteId = newCn.id;
        } else {
          await tx
            .update(creditNotes)
            .set(cnData)
            .where(eq(creditNotes.id, creditNoteId));
        }

        // 8. Replace line items
        await tx.delete(creditNoteLineItems).where(eq(creditNoteLineItems.credit_note_id, creditNoteId));

        const insertItems = input.line_items.map((li, idx) => {
          const calcLi = taxResult.lineItems[idx];
          return {
            credit_note_id: creditNoteId as string,
            product_id: li.product_id || null,
            description: li.description,
            hsn_sac_code: li.hsn_sac_code,
            quantity: li.quantity.toString(),
            unit_of_measurement: li.unit_of_measurement,
            unit_price_paise: Math.round(li.unit_price * 100),
            discount_paise: calcLi.discountPaise,
            taxable_value_paise: calcLi.taxableValuePaise,
            tax_rate_percentage: calcLi.taxRatePercentage.toString(),
            cgst_paise: calcLi.cgstPaise,
            sgst_paise: calcLi.sgstPaise,
            igst_paise: calcLi.igstPaise,
            line_total_paise: calcLi.lineTotalPaise,
            sort_order: idx
          };
        });

        await tx.insert(creditNoteLineItems).values(insertItems);

        // 9. Revalidate paths
        revalidatePath(`/invoices/${originalInvoice.id}`);
        revalidatePath(`/credit-notes/${creditNoteId}`);

        return { id: creditNoteId };
      });
    } catch (error: unknown) {
      if (error instanceof ActionError) throw error;
      const message = error instanceof Error ? error.message : 'Failed to save credit note draft.';
      throw new ActionError(message, { code: 'SAVE_FAILED' });
    }
  },
  'save-credit-note-draft'
);
