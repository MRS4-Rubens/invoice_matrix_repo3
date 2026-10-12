'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { businesses, invoices, invoiceLineItems, creditNotes } from '@/lib/db/schema';
import { eq, and, between, inArray, asc } from 'drizzle-orm';
import { z } from 'zod';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

const getGstr1DataSchema = z.object({
  startDate: z.string().max(30),
  endDate: z.string().max(30),
  label: z.string().max(100)
});

export interface Gstr1B2bRow {
  recipientGstin: string;
  receiverName: string;
  invoiceNumber: string;
  invoiceDate: string; // DD-MMM-YYYY
  invoiceValuePaise: number;
  placeOfSupply: string; // e.g. "27-Maharashtra"
  reverseCharge: string; // 'N'
  applicableTaxRatePercent: string; // ''
  invoiceType: string; // 'Regular'
  eCommerceGstin: string; // ''
  ratePercentage: number;
  taxableValuePaise: number;
  cessAmountPaise: number;
}

export interface Gstr1B2clRow {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValuePaise: number;
  placeOfSupply: string;
  applicableTaxRatePercent: string;
  ratePercentage: number;
  taxableValuePaise: number;
  cessAmountPaise: number;
  eCommerceGstin: string;
}

export interface Gstr1B2csRow {
  type: string; // 'OE'
  placeOfSupply: string;
  applicableTaxRatePercent: string;
  ratePercentage: number;
  taxableValuePaise: number;
  cessAmountPaise: number;
  eCommerceGstin: string;
}

export interface Gstr1CdnrRow {
  recipientGstin: string;
  receiverName: string;
  noteNumber: string;
  noteDate: string;
  noteType: string; // 'C' for Credit Note
  placeOfSupply: string;
  reverseCharge: string; // 'N'
  noteSupplyType: string; // 'Regular'
  noteValuePaise: number;
  applicableTaxRatePercent: string;
  ratePercentage: number;
  taxableValuePaise: number;
  cessAmountPaise: number;
}

export interface Gstr1HsnRow {
  hsnSacCode: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValuePaise: number;
  ratePercentage: number;
  taxableValuePaise: number;
  integratedTaxPaise: number;
  centralTaxPaise: number;
  stateUtTaxPaise: number;
  cessAmountPaise: number;
}

export interface Gstr1DocRow {
  natureOfDocument: string;
  srNoFrom: string;
  srNoTo: string;
  totalNumber: number;
  cancelled: number;
  netIssued: number;
}

export interface Gstr1ExportData {
  business: {
    legal_name: string;
    trade_name: string | null;
    gstin: string;
    state_code: string;
  };
  label: string;
  startDate: string;
  endDate: string;
  b2b: Gstr1B2bRow[];
  b2cl: Gstr1B2clRow[];
  b2cs: Gstr1B2csRow[];
  cdnr: Gstr1CdnrRow[];
  hsn: Gstr1HsnRow[];
  docs: Gstr1DocRow[];
  summary: {
    b2bCount: number;
    b2bTaxablePaise: number;
    b2bTaxPaise: number;
    b2clCount: number;
    b2clTaxablePaise: number;
    b2clTaxPaise: number;
    b2csCount: number;
    b2csTaxablePaise: number;
    b2csTaxPaise: number;
    cdnrCount: number;
    cdnrTaxablePaise: number;
    cdnrTaxPaise: number;
    totalTaxablePaise: number;
    totalCgstPaise: number;
    totalSgstPaise: number;
    totalIgstPaise: number;
    totalTaxPaise: number;
    totalInvoiceValuePaise: number;
  };
}

// Convert YYYY-MM-DD to standard official GST format: DD-MMM-YYYY (e.g. 01-Aug-2026)
function formatToGstDateFormat(isoDateStr: string | null): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length !== 3) return isoDateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parts[2].padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${monthNames[monthIdx] || parts[1]}-${year}`;
}

// Convert State Code to official GST Place Of Supply format: "27-Maharashtra"
function formatPlaceOfSupply(stateCode: string | null): string {
  if (!stateCode) return '';
  const state = INDIAN_GST_STATES.find((s) => s.code === stateCode);
  return state ? `${state.code}-${state.name}` : stateCode;
}

export const getGstr1ExportData = createAuthenticatedAction(getGstr1DataSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  // 1. Fetch business details
  const [business] = await db
    .select({
      legal_name: businesses.legal_name,
      trade_name: businesses.trade_name,
      gstin: businesses.gstin,
      state_code: businesses.state_code,
    })
    .from(businesses)
    .where(eq(businesses.id, businessId));

  if (!business) {
    throw new Error('Business profile not found.');
  }

  // 2. Fetch all finalized invoices in the date window
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

  // 3. Fetch invoice line items
  const rawLineItems = invoiceIds.length > 0
    ? await db
        .select({
          invoice_id: invoiceLineItems.invoice_id,
          hsn_sac_code: invoiceLineItems.hsn_sac_code,
          description: invoiceLineItems.description,
          unit_of_measurement: invoiceLineItems.unit_of_measurement,
          quantity: invoiceLineItems.quantity,
          taxable_value_paise: invoiceLineItems.taxable_value_paise,
          tax_rate_percentage: invoiceLineItems.tax_rate_percentage,
          cgst_paise: invoiceLineItems.cgst_paise,
          sgst_paise: invoiceLineItems.sgst_paise,
          igst_paise: invoiceLineItems.igst_paise,
          line_total_paise: invoiceLineItems.line_total_paise,
        })
        .from(invoiceLineItems)
        .where(inArray(invoiceLineItems.invoice_id, invoiceIds))
    : [];

  // Group line items by invoice_id and tax_rate_percentage
  interface RateGroup {
    ratePercentage: number;
    taxableValuePaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
  }
  const invoiceRateGroupsMap = new Map<string, Map<number, RateGroup>>();

  for (const item of rawLineItems) {
    const rateNum = Number(item.tax_rate_percentage);
    if (!invoiceRateGroupsMap.has(item.invoice_id)) {
      invoiceRateGroupsMap.set(item.invoice_id, new Map());
    }
    const rateMap = invoiceRateGroupsMap.get(item.invoice_id)!;
    if (!rateMap.has(rateNum)) {
      rateMap.set(rateNum, {
        ratePercentage: rateNum,
        taxableValuePaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0
      });
    }
    const group = rateMap.get(rateNum)!;
    group.taxableValuePaise += item.taxable_value_paise;
    group.cgstPaise += item.cgst_paise;
    group.sgstPaise += item.sgst_paise;
    group.igstPaise += item.igst_paise;
  }

  // 4. Classify invoices into B2B, B2CL, B2CS
  const b2bRows: Gstr1B2bRow[] = [];
  const b2clRows: Gstr1B2clRow[] = [];
  const b2csAggregateMap = new Map<string, Gstr1B2csRow>();

  let b2bTaxablePaise = 0;
  let b2bTaxPaise = 0;
  let b2clTaxablePaise = 0;
  let b2clTaxPaise = 0;
  let b2csTaxablePaise = 0;
  let b2csTaxPaise = 0;

  const b2bInvoiceNumbers = new Set<string>();
  const b2clInvoiceNumbers = new Set<string>();

  for (const inv of rawInvoices) {
    const isRegistered = Boolean(inv.customer_gstin && inv.customer_gstin.trim().length === 15);
    const isInterState = inv.place_of_supply_state_code !== business.state_code;
    const isLargeInvoice = inv.grand_total_paise > 25000000; // > ₹2,50,000

    const posFormatted = formatPlaceOfSupply(inv.place_of_supply_state_code);
    const dateFormatted = formatToGstDateFormat(inv.invoice_date);

    // Obtain rate groups or fallback
    const rateGroups = invoiceRateGroupsMap.has(inv.id)
      ? Array.from(invoiceRateGroupsMap.get(inv.id)!.values())
      : [{
          ratePercentage: 0,
          taxableValuePaise: inv.subtotal_paise,
          cgstPaise: inv.total_cgst_paise,
          sgstPaise: inv.total_sgst_paise,
          igstPaise: inv.total_igst_paise
        }];

    if (isRegistered) {
      // ----------------------------------------------------
      // Table 4: B2B Invoices (One row per rate percentage)
      // ----------------------------------------------------
      b2bInvoiceNumbers.add(inv.invoice_number);
      for (const rg of rateGroups) {
        b2bRows.push({
          recipientGstin: inv.customer_gstin!.trim().toUpperCase(),
          receiverName: inv.customer_name || 'Registered Recipient',
          invoiceNumber: inv.invoice_number,
          invoiceDate: dateFormatted,
          invoiceValuePaise: inv.grand_total_paise,
          placeOfSupply: posFormatted,
          reverseCharge: 'N',
          applicableTaxRatePercent: '',
          invoiceType: 'Regular',
          eCommerceGstin: '',
          ratePercentage: rg.ratePercentage,
          taxableValuePaise: rg.taxableValuePaise,
          cessAmountPaise: 0,
        });
        b2bTaxablePaise += rg.taxableValuePaise;
        b2bTaxPaise += (rg.cgstPaise + rg.sgstPaise + rg.igstPaise);
      }
    } else if (isInterState && isLargeInvoice) {
      // ----------------------------------------------------
      // Table 5: B2CL (B2C Large) Invoices (> ₹2.5L Interstate)
      // ----------------------------------------------------
      b2clInvoiceNumbers.add(inv.invoice_number);
      for (const rg of rateGroups) {
        b2clRows.push({
          invoiceNumber: inv.invoice_number,
          invoiceDate: dateFormatted,
          invoiceValuePaise: inv.grand_total_paise,
          placeOfSupply: posFormatted,
          applicableTaxRatePercent: '',
          ratePercentage: rg.ratePercentage,
          taxableValuePaise: rg.taxableValuePaise,
          cessAmountPaise: 0,
          eCommerceGstin: ''
        });
        b2clTaxablePaise += rg.taxableValuePaise;
        b2clTaxPaise += (rg.cgstPaise + rg.sgstPaise + rg.igstPaise);
      }
    } else {
      // ----------------------------------------------------
      // Table 7: B2CS (B2C Small) Aggregated by POS & Rate
      // ----------------------------------------------------
      for (const rg of rateGroups) {
        const key = `${posFormatted}_${rg.ratePercentage}`;
        if (!b2csAggregateMap.has(key)) {
          b2csAggregateMap.set(key, {
            type: 'OE', // Other than e-commerce
            placeOfSupply: posFormatted,
            applicableTaxRatePercent: '',
            ratePercentage: rg.ratePercentage,
            taxableValuePaise: 0,
            cessAmountPaise: 0,
            eCommerceGstin: ''
          });
        }
        const b2csItem = b2csAggregateMap.get(key)!;
        b2csItem.taxableValuePaise += rg.taxableValuePaise;
        b2csTaxablePaise += rg.taxableValuePaise;
        b2csTaxPaise += (rg.cgstPaise + rg.sgstPaise + rg.igstPaise);
      }
    }
  }

  const b2csRows = Array.from(b2csAggregateMap.values()).sort((a, b) => {
    const posDiff = a.placeOfSupply.localeCompare(b.placeOfSupply);
    if (posDiff !== 0) return posDiff;
    return a.ratePercentage - b.ratePercentage;
  });

  // 5. Fetch and build CDNR (Credit Notes for Registered Persons)
  const rawCreditNotes = await db
    .select({
      id: creditNotes.id,
      credit_note_number: creditNotes.credit_note_number,
      issue_date: creditNotes.issue_date,
      subtotal_paise: creditNotes.subtotal_paise,
      total_cgst_paise: creditNotes.total_cgst_paise,
      total_sgst_paise: creditNotes.total_sgst_paise,
      total_igst_paise: creditNotes.total_igst_paise,
      total_tax_paise: creditNotes.total_tax_paise,
      grand_total_paise: creditNotes.grand_total_paise,
      original_invoice_id: creditNotes.original_invoice_id,
      recipient_gstin: invoices.billing_gstin_snapshot,
      receiver_name: invoices.billing_name_snapshot,
      place_of_supply_state_code: invoices.place_of_supply_state_code,
      status: creditNotes.status,
    })
    .from(creditNotes)
    .innerJoin(invoices, eq(creditNotes.original_invoice_id, invoices.id))
    .where(
      and(
        eq(creditNotes.business_id, businessId),
        eq(creditNotes.lifecycle_status, 'finalized'),
        between(creditNotes.issue_date, input.startDate, input.endDate)
      )
    )
    .orderBy(asc(creditNotes.issue_date), asc(creditNotes.credit_note_number));

  const cdnrRows: Gstr1CdnrRow[] = [];
  let cdnrTaxablePaise = 0;
  let cdnrTaxPaise = 0;

  for (const cn of rawCreditNotes) {
    if (cn.status === 'voided') continue;
    // Only registered buyers go to CDNR
    if (cn.recipient_gstin && cn.recipient_gstin.trim().length === 15) {
      cdnrRows.push({
        recipientGstin: cn.recipient_gstin.trim().toUpperCase(),
        receiverName: cn.receiver_name || 'Registered Recipient',
        noteNumber: cn.credit_note_number,
        noteDate: formatToGstDateFormat(cn.issue_date),
        noteType: 'C',
        placeOfSupply: formatPlaceOfSupply(cn.place_of_supply_state_code),
        reverseCharge: 'N',
        noteSupplyType: 'Regular',
        noteValuePaise: cn.grand_total_paise,
        applicableTaxRatePercent: '',
        ratePercentage: 18, // Default rate or blended rate
        taxableValuePaise: cn.subtotal_paise,
        cessAmountPaise: 0,
      });
      cdnrTaxablePaise += cn.subtotal_paise;
      cdnrTaxPaise += cn.total_tax_paise;
    }
  }

  // 6. Build HSN Summary (Table 12)
  const hsnMap = new Map<string, Gstr1HsnRow>();

  for (const item of rawLineItems) {
    const hsnCode = item.hsn_sac_code.trim();
    const rateNum = Number(item.tax_rate_percentage);
    const uqc = item.unit_of_measurement ? `${item.unit_of_measurement.toUpperCase()}` : 'OTH';
    const key = `${hsnCode}_${uqc}_${rateNum}`;

    if (!hsnMap.has(key)) {
      hsnMap.set(key, {
        hsnSacCode: hsnCode,
        description: item.description,
        uqc,
        totalQuantity: 0,
        totalValuePaise: 0,
        ratePercentage: rateNum,
        taxableValuePaise: 0,
        integratedTaxPaise: 0,
        centralTaxPaise: 0,
        stateUtTaxPaise: 0,
        cessAmountPaise: 0,
      });
    }

    const hsnRow = hsnMap.get(key)!;
    hsnRow.totalQuantity += Number(item.quantity);
    hsnRow.taxableValuePaise += item.taxable_value_paise;
    hsnRow.integratedTaxPaise += item.igst_paise;
    hsnRow.centralTaxPaise += item.cgst_paise;
    hsnRow.stateUtTaxPaise += item.sgst_paise;
    const itemTax = item.igst_paise + item.cgst_paise + item.sgst_paise;
    hsnRow.totalValuePaise += item.taxable_value_paise + itemTax;
  }

  const hsnRows = Array.from(hsnMap.values()).sort((a, b) => a.hsnSacCode.localeCompare(b.hsnSacCode));

  // 7. Build Documents Issued (Table 13)
  const docRows: Gstr1DocRow[] = [];

  if (rawInvoices.length > 0) {
    docRows.push({
      natureOfDocument: 'Invoices for outward supply',
      srNoFrom: rawInvoices[0].invoice_number,
      srNoTo: rawInvoices[rawInvoices.length - 1].invoice_number,
      totalNumber: rawInvoices.length,
      cancelled: 0,
      netIssued: rawInvoices.length
    });
  }

  if (rawCreditNotes.length > 0) {
    const cancelledCount = rawCreditNotes.filter(cn => cn.status === 'voided').length;
    docRows.push({
      natureOfDocument: 'Credit Note',
      srNoFrom: rawCreditNotes[0].credit_note_number,
      srNoTo: rawCreditNotes[rawCreditNotes.length - 1].credit_note_number,
      totalNumber: rawCreditNotes.length,
      cancelled: cancelledCount,
      netIssued: rawCreditNotes.length - cancelledCount
    });
  }

  // 8. Aggregate executive period totals
  let totalTaxablePaise = 0;
  let totalCgstPaise = 0;
  let totalSgstPaise = 0;
  let totalIgstPaise = 0;
  let totalTaxPaise = 0;
  let totalInvoiceValuePaise = 0;

  for (const inv of rawInvoices) {
    totalTaxablePaise += inv.subtotal_paise;
    totalCgstPaise += inv.total_cgst_paise;
    totalSgstPaise += inv.total_sgst_paise;
    totalIgstPaise += inv.total_igst_paise;
    totalTaxPaise += inv.total_tax_paise;
    totalInvoiceValuePaise += inv.grand_total_paise;
  }

  return {
    business: {
      legal_name: business.legal_name,
      trade_name: business.trade_name,
      gstin: business.gstin,
      state_code: business.state_code
    },
    label: input.label,
    startDate: input.startDate,
    endDate: input.endDate,
    b2b: b2bRows,
    b2cl: b2clRows,
    b2cs: b2csRows,
    cdnr: cdnrRows,
    hsn: hsnRows,
    docs: docRows,
    summary: {
      b2bCount: b2bInvoiceNumbers.size,
      b2bTaxablePaise,
      b2bTaxPaise,
      b2clCount: b2clInvoiceNumbers.size,
      b2clTaxablePaise,
      b2clTaxPaise,
      b2csCount: b2csRows.length,
      b2csTaxablePaise,
      b2csTaxPaise,
      cdnrCount: cdnrRows.length,
      cdnrTaxablePaise,
      cdnrTaxPaise,
      totalTaxablePaise,
      totalCgstPaise,
      totalSgstPaise,
      totalIgstPaise,
      totalTaxPaise,
      totalInvoiceValuePaise
    }
  };
}, 'get-gstr1-data');
