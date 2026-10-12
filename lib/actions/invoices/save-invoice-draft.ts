'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { invoiceDraftSchema } from '@/lib/validations/invoice';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, businesses, customers, taxRates } from '@/lib/db/schema';
import { calculateInvoiceTax } from '@/lib/gst/calculate';
import { TaxCalculationInput, TaxLineItemInput } from '@/lib/gst/types';
import { eq, inArray, and, between, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getOrCreateCurrentFinancialYear } from '@/lib/invoices/financial-year-rollover';
import { parseIsoDateToIstDate } from '@/lib/invoices/ist-date';
import { canCreateInvoice, canUseTemplate } from '@/lib/subscriptions/entitlements';
import { getCurrentMonthRange } from '@/lib/reports/period';

export const saveInvoiceDraft = createAuthenticatedAction(invoiceDraftSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
  }

  try {
    return await db.transaction(async (tx) => {
      // 1. Check if updating existing
      let currentInvoice = null;
      if (input.id) {
        const existing = await tx.select().from(invoices).where(eq(invoices.id, input.id));
        if (existing.length === 0) {
          throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
        }
        currentInvoice = existing[0];
        if (currentInvoice.business_id !== businessId) {
          throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
        }
        if (currentInvoice.lifecycle_status !== 'draft') {
          throw new ActionError('This invoice has already been finalized and cannot be edited. Issue a credit note instead.', { code: 'ALREADY_FINALIZED' });
        }
      }

      // 2. Fetch dependencies for tax calculation and subscription verification
      const businessResult = await tx.select({ 
        state_code: businesses.state_code,
        default_invoice_template: businesses.default_invoice_template,
        subscription_plan: businesses.subscription_plan,
        subscription_status: businesses.subscription_status,
        trial_ends_at: businesses.trial_ends_at,
        subscription_ends_at: businesses.subscription_ends_at,
      }).from(businesses).where(eq(businesses.id, businessId));
      if (businessResult.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
      const business = businessResult[0];
      const businessStateCode = business.state_code;
      const defaultTemplate = business.default_invoice_template || 'template_1';

      // Subscription & Quota Check: if creating a new invoice, verify monthly quota
      if (!input.id) {
        const monthRange = getCurrentMonthRange();
        const countRes = await tx
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(and(
            eq(invoices.business_id, businessId),
            between(invoices.invoice_date, monthRange.startDate, monthRange.endDate)
          ));
        const currentMonthCount = Number(countRes[0]?.count || 0);

        const quotaCheck = canCreateInvoice(business, currentMonthCount);
        if (!quotaCheck.allowed) {
          throw new ActionError(quotaCheck.reason || 'Invoice monthly quota exceeded.', {
            code: quotaCheck.code || 'QUOTA_EXCEEDED',
          });
        }
      }

      // Template Entitlement Check
      const targetTemplate = input.invoice_template || defaultTemplate;
      const templateCheck = canUseTemplate(business, targetTemplate);
      if (!templateCheck.allowed) {
        throw new ActionError(templateCheck.reason || 'Selected template requires Essentials Pro.', {
          code: templateCheck.code || 'TEMPLATE_LOCKED',
        });
      }

      const customerStateCode = input.place_of_supply_state_code;

      const taxRateIds = input.line_items.map(li => li.tax_rate_id);
      const fetchedTaxRates = await tx.select({ id: taxRates.id, rate_percentage: taxRates.rate_percentage }).from(taxRates).where(inArray(taxRates.id, taxRateIds));
      const taxRateMap = new Map(fetchedTaxRates.map(tr => [tr.id, Number(tr.rate_percentage)]));

      // 3. Prepare Tax Calculation Input
      const taxLineItemInputs: TaxLineItemInput[] = input.line_items.map(li => {
        const ratePct = taxRateMap.get(li.tax_rate_id);
        if (ratePct === undefined) throw new ActionError(`Invalid tax rate ID: ${li.tax_rate_id}`);
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
        sellerStateCode: businessStateCode,
        placeOfSupplyStateCode: customerStateCode,
        lineItems: taxLineItemInputs,
        // Set the active GST rate calculation type (inclusive vs exclusive)
        gstRateType: input.gst_rate_type || 'exclusive'
      };

      // 4. Calculate Taxes
      const taxResult = calculateInvoiceTax(taxCalcInput);

      // 5. Create or Update Invoice
      let invoiceId = input.id;
      
      const invoiceData = {
        business_id: businessId,
        customer_id: input.customer_id || null,
        invoice_date: input.invoice_date || null,
        notes: input.notes || null,
        lifecycle_status: 'draft' as const,
        subtotal_paise: taxResult.subtotalPaise,
        total_cgst_paise: taxResult.totalCgstPaise,
        total_sgst_paise: taxResult.totalSgstPaise,
        total_igst_paise: taxResult.totalIgstPaise,
        total_tax_paise: taxResult.totalTaxPaise,
        grand_total_paise: Math.round(taxResult.grandTotalPaise / 100) * 100,
        billing_name_snapshot: input.billing_name,
        billing_gstin_snapshot: input.billing_gstin || null,
        place_of_supply_state_code: input.place_of_supply_state_code,
        invoice_template: input.invoice_template || defaultTemplate,
        // Calculation mode locked for this specific invoice to preserve print layout history
        gst_rate_type: input.gst_rate_type || 'exclusive',
      };

      const referenceDate = input.invoice_date ? parseIsoDateToIstDate(input.invoice_date) : new Date();
      const activeFy = await getOrCreateCurrentFinancialYear(tx, businessId, referenceDate);

      if (!invoiceId) {
        const [newInv] = await tx.insert(invoices).values({
          ...invoiceData,
          financial_year_id: activeFy.id,
          invoice_sequence: null, // Placeholder for draft
          invoice_number: `DRAFT-${Date.now()}` // Placeholder for draft uniqueness
        }).returning({ id: invoices.id });
        invoiceId = newInv.id;
      } else {
        await tx.update(invoices).set({
          ...invoiceData,
          financial_year_id: activeFy.id
        }).where(eq(invoices.id, invoiceId));
      }

      // 6. Replace Line Items
      if (input.id) {
        await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoice_id, invoiceId));
      }

      const insertItems = input.line_items.map((li, idx) => {
        const calcLi = taxResult.lineItems[idx];
        return {
          invoice_id: invoiceId as string,
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

      await tx.insert(invoiceLineItems).values(insertItems);

      revalidatePath('/invoices');
      revalidatePath(`/invoices/${invoiceId}`);

      return { invoiceId };
    });
  } catch (error) {
    if (error instanceof ActionError) throw error;
    console.error('Error saving invoice draft:', error);
    throw new ActionError('We could not save the invoice draft. Please try again.', { code: 'TRANSACTION_FAILED' });
  }
}, 'save-invoice-draft');
