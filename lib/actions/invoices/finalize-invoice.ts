'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { invoices, invoiceLineItems, businesses, customers, taxRates } from '@/lib/db/schema';
import { calculateInvoiceTax } from '@/lib/gst/calculate';
import { TaxCalculationInput, TaxLineItemInput } from '@/lib/gst/types';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getNextInvoiceNumber } from '@/lib/invoices/numbering';
import { formatIstDateAsIso, getIstDateParts } from '@/lib/invoices/ist-date';
import { getOrCreateCurrentFinancialYear } from '@/lib/invoices/financial-year-rollover';
import { logError } from '@/lib/actions/_shared/logger';
import { archiveInvoicePdf } from '@/lib/storage/archive-invoice';

export const finalizeInvoice = createAuthenticatedAction(z.object({ id: z.string().uuid() }), async ({ id }, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new ActionError('Your account is not linked to a business profile.', { code: 'NO_BUSINESS_LINKED' });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Fetch Draft Invoice
      const existing = await tx.select().from(invoices).where(eq(invoices.id, id));
      if (existing.length === 0) throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
      
      const invoice = existing[0];
      if (invoice.business_id !== businessId) throw new ActionError('Invoice not found.', { code: 'NOT_FOUND' });
      if (invoice.lifecycle_status !== 'draft') {
        throw new ActionError('This invoice has already been finalized.', { code: 'ALREADY_FINALIZED' });
      }

      // 2. Fetch Business and Customer
      const businessResult = await tx.select().from(businesses).where(eq(businesses.id, businessId));
      if (businessResult.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });
      const business = businessResult[0];

      if (business.registration_type === 'composition') {
        throw new ActionError('Composition-scheme invoicing (Bill of Supply) is not yet supported — this MVP handles Regular-scheme tax invoices only.', { code: 'NOT_SUPPORTED' });
      }

      const customerResult = await tx.select().from(customers).where(eq(customers.id, invoice.customer_id));
      if (customerResult.length === 0) throw new ActionError('Customer not found.', { code: 'NOT_FOUND' });
      const customer = customerResult[0];

      // 3. Fetch Line Items and Tax Rates for authoritative recalc
      const lineItems = await tx.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoice_id, id)).orderBy(invoiceLineItems.sort_order);
      if (lineItems.length === 0) throw new ActionError('Cannot finalize an invoice with no line items.', { code: 'NO_ITEMS' });

      // Note: the draft might have stale tax rates if they changed, though our draft stores tax_rate_percentage
      // To strictly follow "recompute authoritatively", we just use the stored rate from line items or fetch from DB if we stored the relation.
      // Wait, invoice_line_items doesn't store tax_rate_id directly (schema only has tax_rate_percentage). 
      // But we just re-run calculateInvoiceTax with the percentages currently in line items to ensure mathematical consistency.
      const taxLineItemInputs: TaxLineItemInput[] = lineItems.map(li => ({
        quantity: Number(li.quantity),
        unitPricePaise: li.unit_price_paise,
        discountPaise: li.discount_paise,
        taxRatePercentage: Number(li.tax_rate_percentage)
      }));

      const taxCalcInput: TaxCalculationInput = {
        sellerStateCode: business.state_code,
        placeOfSupplyStateCode: customer.state_code,
        lineItems: taxLineItemInputs
      };

      const taxResult = calculateInvoiceTax(taxCalcInput);

      // 4. Update Line Items if any rounding differences occurred (defense in depth)
      // Since it's finalized, we want to make absolutely sure line items match the calculation.
      for (let i = 0; i < lineItems.length; i++) {
        const li = lineItems[i];
        const calcLi = taxResult.lineItems[i];
        await tx.update(invoiceLineItems).set({
          taxable_value_paise: calcLi.taxableValuePaise,
          cgst_paise: calcLi.cgstPaise,
          sgst_paise: calcLi.sgstPaise,
          igst_paise: calcLi.igstPaise,
          line_total_paise: calcLi.lineTotalPaise
        }).where(eq(invoiceLineItems.id, li.id));
      }

      // 5. Get Next Invoice Number
      const invoiceDate = new Date();
      const fy = await getOrCreateCurrentFinancialYear(tx, businessId, invoiceDate);

      const { invoiceNumber, absoluteSequence } = await getNextInvoiceNumber(tx, {
        businessId: business.id,
        financialYearId: fy.id,
        fyLabel: fy.label,
        invoiceNumberFormat: business.invoice_number_format,
        invoiceDate
      });

      // 6. Snapshot fields
      const cityStatePincode = [customer.city, customer.state_code, customer.pincode].filter(Boolean).join(', ');
      const billingAddressSnapshot = [
        customer.address_line1,
        customer.address_line2,
        cityStatePincode
      ].filter(Boolean).join('\n');

      const { year, month, day } = getIstDateParts(invoiceDate);
      const dueIstDate = new Date(Date.UTC(year, month - 1, day + business.payment_due_days));
      const dueDateString = `${dueIstDate.getUTCFullYear()}-${String(dueIstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueIstDate.getUTCDate()).padStart(2, '0')}`;

      await tx.update(invoices).set({
        invoice_sequence: absoluteSequence,
        invoice_number: invoiceNumber,
        financial_year_id: fy.id,
        lifecycle_status: 'finalized',
        invoice_date: formatIstDateAsIso(invoiceDate),
        due_date: dueDateString,
        finalized_at: invoiceDate,
        place_of_supply_state_code: customer.state_code,
        seller_gstin_snapshot: business.gstin,
        billing_name_snapshot: customer.name,
        billing_gstin_snapshot: customer.gstin,
        billing_address_snapshot: billingAddressSnapshot,
        subtotal_paise: taxResult.subtotalPaise,
        total_cgst_paise: taxResult.totalCgstPaise,
        total_sgst_paise: taxResult.totalSgstPaise,
        total_igst_paise: taxResult.totalIgstPaise,
        total_tax_paise: taxResult.totalTaxPaise,
        grand_total_paise: taxResult.grandTotalPaise,
      }).where(eq(invoices.id, id));

      revalidatePath('/invoices');
      revalidatePath(`/invoices/${id}`);

      return { invoiceId: id, invoiceNumber };
    });
    
    // Archival is intentionally decoupled from the finalize transaction — a slow or temporarily-down 
    // PDF provider must never block a business owner from finalizing a real invoice. If this fails here, 
    // the daily retry cron (Task 7) will catch it.
    archiveInvoicePdf(id).then(result => {
      if (!result.success) {
        logError('finalize-invoice', new Error(result.error || 'Archival failed'), { invoiceId: id });
      }
    });

    return result;
  } catch (error) {
    if (error instanceof ActionError) throw error;
    console.error('Error finalizing invoice:', error);
    throw new ActionError('We could not finalize the invoice. Please try again.', { code: 'TRANSACTION_FAILED' });
  }
}, 'finalize-invoice');
