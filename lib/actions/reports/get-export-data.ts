'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { businesses, invoices, invoiceLineItems, creditNotes } from '@/lib/db/schema';
import { eq, and, between, inArray, asc } from 'drizzle-orm';
import { z } from 'zod';

const getExportDataSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  label: z.string()
});

export interface ExportInvoice {
  invoice_number: string;
  invoice_date: string | null;
  customer_name: string | null;
  customer_gstin: string | null;
  place_of_supply_state_code: string | null;
  subtotal_paise: number;
  total_cgst_paise: number;
  total_sgst_paise: number;
  total_igst_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
  payment_status: string;
}

export interface ExportCreditNote {
  credit_note_number: string;
  issue_date: string | null;
  subtotal_paise: number;
  total_cgst_paise: number;
  total_sgst_paise: number;
  total_igst_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
}

export interface ExportHsnSummary {
  hsn_sac_code: string;
  description: string;
  unit_of_measurement: string;
  total_quantity: number;
  taxable_value_paise: number;
  tax_rate_percentage: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  total_tax_paise: number;
  total_value_paise: number;
}

export interface ExportData {
  business: {
    legal_name: string;
    gstin: string;
  };
  label: string;
  invoices: ExportInvoice[];
  creditNotes: ExportCreditNote[];
  hsnSummary: ExportHsnSummary[];
  periodTotals: {
    totalInvoices: number;
    totalTaxableValuePaise: number;
    totalCgstPaise: number;
    totalSgstPaise: number;
    totalIgstPaise: number;
    totalTaxPaise: number;
    totalInvoiceValuePaise: number;
  };
}

export const getExportData = createAuthenticatedAction(getExportDataSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  // 1. Fetch business profile
  const [business] = await db
    .select({ legal_name: businesses.legal_name, gstin: businesses.gstin })
    .from(businesses)
    .where(eq(businesses.id, businessId));

  if (!business) {
    throw new Error('Business profile not found.');
  }

  // 2. Fetch all finalized invoices in period
  const rawInvoices = await db
    .select({
      id: invoices.id,
      invoice_number: invoices.invoice_number,
      invoice_date: invoices.invoice_date,
      customer_name: invoices.billing_name_snapshot,
      customer_gstin: invoices.billing_gstin_snapshot,
      place_of_supply_state_code: invoices.place_of_supply_state_code,
      subtotal_paise: invoices.subtotal_paise,
      total_cgst_paise: invoices.total_cgst_paise,
      total_sgst_paise: invoices.total_sgst_paise,
      total_igst_paise: invoices.total_igst_paise,
      total_tax_paise: invoices.total_tax_paise,
      grand_total_paise: invoices.grand_total_paise,
      payment_status: invoices.payment_status
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.business_id, businessId),
        eq(invoices.lifecycle_status, 'finalized'),
        between(invoices.invoice_date, input.startDate, input.endDate)
      )
    )
    .orderBy(asc(invoices.invoice_date), asc(invoices.invoice_number));

  const invoiceIds = rawInvoices.map((inv) => inv.id);

  // 3. Fetch invoice_line_items
  const rawLineItems = invoiceIds.length > 0 
    ? await db
        .select({
          hsn_sac_code: invoiceLineItems.hsn_sac_code,
          description: invoiceLineItems.description,
          unit_of_measurement: invoiceLineItems.unit_of_measurement,
          quantity: invoiceLineItems.quantity,
          taxable_value_paise: invoiceLineItems.taxable_value_paise,
          tax_rate_percentage: invoiceLineItems.tax_rate_percentage,
          cgst_paise: invoiceLineItems.cgst_paise,
          sgst_paise: invoiceLineItems.sgst_paise,
          igst_paise: invoiceLineItems.igst_paise
        })
        .from(invoiceLineItems)
        .where(inArray(invoiceLineItems.invoice_id, invoiceIds))
    : [];

  // 4. Fetch credit_notes
  const rawCreditNotes = await db
    .select({
      credit_note_number: creditNotes.credit_note_number,
      issue_date: creditNotes.issue_date,
      subtotal_paise: creditNotes.subtotal_paise,
      total_cgst_paise: creditNotes.total_cgst_paise,
      total_sgst_paise: creditNotes.total_sgst_paise,
      total_igst_paise: creditNotes.total_igst_paise,
      total_tax_paise: creditNotes.total_tax_paise,
      grand_total_paise: creditNotes.grand_total_paise,
    })
    .from(creditNotes)
    .where(
      and(
        eq(creditNotes.business_id, businessId),
        eq(creditNotes.lifecycle_status, 'finalized'),
        between(creditNotes.issue_date, input.startDate, input.endDate)
      )
    )
    .orderBy(asc(creditNotes.issue_date), asc(creditNotes.credit_note_number));

  // 5. Group HSN Summary
  const hsnMap = new Map<string, ExportHsnSummary>();

  for (const item of rawLineItems) {
    const key = `${item.hsn_sac_code}_${item.unit_of_measurement}_${item.tax_rate_percentage}`;
    
    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsn_sac_code: item.hsn_sac_code,
        description: item.description, // using first-seen description
        unit_of_measurement: item.unit_of_measurement,
        total_quantity: 0,
        taxable_value_paise: 0,
        tax_rate_percentage: Number(item.tax_rate_percentage),
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        total_tax_paise: 0,
        total_value_paise: 0
      });
    }

    const group = hsnMap.get(key)!;
    group.total_quantity += Number(item.quantity);
    group.taxable_value_paise += item.taxable_value_paise;
    group.cgst_paise += item.cgst_paise;
    group.sgst_paise += item.sgst_paise;
    group.igst_paise += item.igst_paise;
    const itemTotalTax = item.cgst_paise + item.sgst_paise + item.igst_paise;
    group.total_tax_paise += itemTotalTax;
    group.total_value_paise += item.taxable_value_paise + itemTotalTax;
  }

  const hsnSummary = Array.from(hsnMap.values());

  // 6. Compute period-level totals
  let totalTaxableValuePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;
  let totalTaxPaise = 0;
  let totalInvoiceValuePaise = 0;

  for (const inv of rawInvoices) {
    totalTaxableValuePaise += inv.subtotal_paise;
    totalCgstPaise += inv.total_cgst_paise;
    totalSgstPaise += inv.total_sgst_paise;
    totalIgstPaise += inv.total_igst_paise;
    totalTaxPaise += inv.total_tax_paise;
    totalInvoiceValuePaise += inv.grand_total_paise;
  }

  const periodTotals = {
    totalInvoices: rawInvoices.length,
    totalTaxableValuePaise,
    totalCgstPaise,
    totalSgstPaise,
    totalIgstPaise,
    totalTaxPaise,
    totalInvoiceValuePaise
  };

  const exportInvoices: ExportInvoice[] = rawInvoices.map((inv) => ({
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    customer_name: inv.customer_name,
    customer_gstin: inv.customer_gstin,
    place_of_supply_state_code: inv.place_of_supply_state_code,
    subtotal_paise: inv.subtotal_paise,
    total_cgst_paise: inv.total_cgst_paise,
    total_sgst_paise: inv.total_sgst_paise,
    total_igst_paise: inv.total_igst_paise,
    total_tax_paise: inv.total_tax_paise,
    grand_total_paise: inv.grand_total_paise,
    payment_status: inv.payment_status
  }));

  const exportCreditNotes: ExportCreditNote[] = rawCreditNotes.map((cn) => ({
    credit_note_number: cn.credit_note_number,
    issue_date: cn.issue_date,
    subtotal_paise: cn.subtotal_paise,
    total_cgst_paise: cn.total_cgst_paise,
    total_sgst_paise: cn.total_sgst_paise,
    total_igst_paise: cn.total_igst_paise,
    total_tax_paise: cn.total_tax_paise,
    grand_total_paise: cn.grand_total_paise
  }));

  const exportData: ExportData = {
    business: {
      legal_name: business.legal_name,
      gstin: business.gstin
    },
    label: input.label,
    invoices: exportInvoices,
    creditNotes: exportCreditNotes,
    hsnSummary,
    periodTotals
  };

  return exportData;
}, 'get-export-data');
