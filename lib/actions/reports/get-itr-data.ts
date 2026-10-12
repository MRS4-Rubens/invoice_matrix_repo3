'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { businesses, invoices, invoiceLineItems, payments } from '@/lib/db/schema';
import { eq, and, between, inArray, asc } from 'drizzle-orm';
import { z } from 'zod';

const getItrDataSchema = z.object({
  startDate: z.string().max(30),
  endDate: z.string().max(30),
  label: z.string().max(100)
});

export interface ItrInvoiceItem {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  customer_name: string | null;
  customer_gstin: string | null;
  rates: Record<number, number>; // rate percentage -> taxable_value_paise
  subtotal_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
  payment_status: string;
}

export interface ItrMonthlySummary {
  monthKey: string;
  monthLabel: string;
  quarterLabel: string;
  invoiceCount: number;
  rates: Record<number, number>; // rate percentage -> taxable_value_paise
  subtotal_paise: number;
  total_tax_paise: number;
  grand_total_paise: number;
}

export interface ItrExportData {
  business: {
    legal_name: string;
    trade_name: string | null;
    gstin: string;
    pan: string | null;
  };
  label: string;
  startDate: string;
  endDate: string;
  isAnnual: boolean;
  supportedRates: number[];
  invoices: ItrInvoiceItem[];
  rateTotals: Record<number, number>; // rate percentage -> total taxable_value_paise
  totalSalesTaxablePaise: number;
  totalTaxPaise: number;
  grandTotalSalesPaise: number;
  monthlySummary: ItrMonthlySummary[];
  turnover44Ad: {
    digitalReceiptsPaise: number;
    cashReceiptsPaise: number;
    unpaidReceivablesPaise: number;
    totalTurnoverPaise: number;
    presumptiveDigitalProfitPaise: number;
    presumptiveCashProfitPaise: number;
    totalPresumptiveProfitPaise: number;
  };
}

export const getItrExportData = createAuthenticatedAction(getItrDataSchema, async (input, context) => {
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
      pan: businesses.pan,
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
      subtotal_paise: invoices.subtotal_paise,
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

  // 3. Fetch line items for these invoices
  const rawLineItems = invoiceIds.length > 0
    ? await db
        .select({
          invoice_id: invoiceLineItems.invoice_id,
          tax_rate_percentage: invoiceLineItems.tax_rate_percentage,
          taxable_value_paise: invoiceLineItems.taxable_value_paise,
          line_total_paise: invoiceLineItems.line_total_paise,
        })
        .from(invoiceLineItems)
        .where(inArray(invoiceLineItems.invoice_id, invoiceIds))
    : [];

  // Group line items by invoice_id and tax_rate_percentage
  const invoiceRateMap = new Map<string, Record<number, number>>();
  const allEncounteredRates = new Set<number>([0, 5, 12, 18, 28]); // Standard Indian GST rates

  for (const item of rawLineItems) {
    const rateNum = Number(item.tax_rate_percentage);
    allEncounteredRates.add(rateNum);

    if (!invoiceRateMap.has(item.invoice_id)) {
      invoiceRateMap.set(item.invoice_id, {});
    }
    const currentRates = invoiceRateMap.get(item.invoice_id)!;
    currentRates[rateNum] = (currentRates[rateNum] || 0) + item.taxable_value_paise;
  }

  // Sort supported rates in ascending order
  const supportedRates = Array.from(allEncounteredRates).sort((a, b) => a - b);

  // 4. Fetch payments linked to these invoices for Section 44AD digital vs cash split (only active payments)
  const rawPayments = invoiceIds.length > 0
    ? await db
        .select({
          invoice_id: payments.invoice_id,
          amount_paise: payments.amount_paise,
          payment_method: payments.payment_method,
        })
        .from(payments)
        .where(
          and(
            inArray(payments.invoice_id, invoiceIds),
            eq(payments.status, 'active')
          )
        )
    : [];

  const invoicePaymentMap = new Map<string, { digitalPaise: number; cashPaise: number; totalPaidPaise: number }>();
  const digitalMethods = new Set(['upi', 'bank_transfer', 'cheque', 'card']);

  for (const pay of rawPayments) {
    if (!invoicePaymentMap.has(pay.invoice_id)) {
      invoicePaymentMap.set(pay.invoice_id, { digitalPaise: 0, cashPaise: 0, totalPaidPaise: 0 });
    }
    const rec = invoicePaymentMap.get(pay.invoice_id)!;
    rec.totalPaidPaise += pay.amount_paise;
    if (digitalMethods.has(pay.payment_method)) {
      rec.digitalPaise += pay.amount_paise;
    } else {
      rec.cashPaise += pay.amount_paise;
    }
  }

  // 5. Build invoice item records & aggregate rate totals
  const rateTotals: Record<number, number> = {};
  for (const r of supportedRates) {
    rateTotals[r] = 0;
  }

  let totalSalesTaxablePaise = 0;
  let totalTaxPaise = 0;
  let grandTotalSalesPaise = 0;

  let totalDigitalReceiptsPaise = 0;
  let totalCashReceiptsPaise = 0;
  let totalUnpaidReceivablesPaise = 0;

  const invoiceItems: ItrInvoiceItem[] = rawInvoices.map((inv) => {
    const rates: Record<number, number> = {};
    for (const r of supportedRates) {
      rates[r] = 0;
    }

    const matchedRates = invoiceRateMap.get(inv.id);
    if (matchedRates) {
      for (const [rStr, val] of Object.entries(matchedRates)) {
        const r = Number(rStr);
        rates[r] = val;
        rateTotals[r] = (rateTotals[r] || 0) + val;
      }
    } else {
      // Fallback: If invoice had no line items, put subtotal in 0%
      rates[0] = inv.subtotal_paise;
      rateTotals[0] = (rateTotals[0] || 0) + inv.subtotal_paise;
    }

    totalSalesTaxablePaise += inv.subtotal_paise;
    totalTaxPaise += inv.total_tax_paise;
    grandTotalSalesPaise += inv.grand_total_paise;

    // 44AD tracking
    const payInfo = invoicePaymentMap.get(inv.id) || { digitalPaise: 0, cashPaise: 0, totalPaidPaise: 0 };
    totalDigitalReceiptsPaise += payInfo.digitalPaise;
    totalCashReceiptsPaise += payInfo.cashPaise;
    const unpaid = Math.max(0, inv.grand_total_paise - payInfo.totalPaidPaise);
    totalUnpaidReceivablesPaise += unpaid;

    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name || 'Cash Customer',
      customer_gstin: inv.customer_gstin || 'Unregistered',
      rates,
      subtotal_paise: inv.subtotal_paise,
      total_tax_paise: inv.total_tax_paise,
      grand_total_paise: inv.grand_total_paise,
      payment_status: inv.payment_status
    };
  });

  // 6. Build Month-wise summary for ITR P&L Schedule
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthMap = new Map<string, ItrMonthlySummary>();

  for (const inv of invoiceItems) {
    if (!inv.invoice_date) continue;
    const [yStr, mStr] = inv.invoice_date.split('-');
    const mNum = parseInt(mStr, 10);
    const key = `${yStr}-${mStr}`;
    const label = `${monthNames[mNum - 1]} ${yStr}`;

    // Indian Financial Quarters: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
    let quarterLabel = 'Q1 (Apr-Jun)';
    if (mNum >= 7 && mNum <= 9) quarterLabel = 'Q2 (Jul-Sep)';
    else if (mNum >= 10 && mNum <= 12) quarterLabel = 'Q3 (Oct-Dec)';
    else if (mNum >= 1 && mNum <= 3) quarterLabel = 'Q4 (Jan-Mar)';

    if (!monthMap.has(key)) {
      const initialRates: Record<number, number> = {};
      for (const r of supportedRates) initialRates[r] = 0;
      monthMap.set(key, {
        monthKey: key,
        monthLabel: label,
        quarterLabel,
        invoiceCount: 0,
        rates: initialRates,
        subtotal_paise: 0,
        total_tax_paise: 0,
        grand_total_paise: 0
      });
    }

    const monthSummary = monthMap.get(key)!;
    monthSummary.invoiceCount += 1;
    monthSummary.subtotal_paise += inv.subtotal_paise;
    monthSummary.total_tax_paise += inv.total_tax_paise;
    monthSummary.grand_total_paise += inv.grand_total_paise;

    for (const r of supportedRates) {
      monthSummary.rates[r] = (monthSummary.rates[r] || 0) + (inv.rates[r] || 0);
    }
  }

  const monthlySummary = Array.from(monthMap.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  // Determine if annual (e.g. difference between start and end > 100 days or label contains "FY")
  const isAnnual = input.label.toUpperCase().includes('FY') || monthlySummary.length > 2;

  // Presumptive calculation (Sec 44AD): 6% on digital turnover, 8% on cash/unpaid turnover
  const totalCollectionsPaise = totalDigitalReceiptsPaise + totalCashReceiptsPaise + totalUnpaidReceivablesPaise;
  const digitalFraction = totalCollectionsPaise > 0 ? (totalDigitalReceiptsPaise / totalCollectionsPaise) : 0;
  
  const digitalTurnoverTaxablePaise = Math.round(totalSalesTaxablePaise * digitalFraction);
  const cashTurnoverTaxablePaise = totalSalesTaxablePaise - digitalTurnoverTaxablePaise;

  const presumptiveDigitalProfitPaise = Math.round(digitalTurnoverTaxablePaise * 0.06);
  const presumptiveCashProfitPaise = Math.round(cashTurnoverTaxablePaise * 0.08);
  const totalPresumptiveProfitPaise = presumptiveDigitalProfitPaise + presumptiveCashProfitPaise;

  return {
    business: {
      legal_name: business.legal_name,
      trade_name: business.trade_name,
      gstin: business.gstin,
      pan: business.pan,
    },
    label: input.label,
    startDate: input.startDate,
    endDate: input.endDate,
    isAnnual,
    supportedRates,
    invoices: invoiceItems,
    rateTotals,
    totalSalesTaxablePaise,
    totalTaxPaise,
    grandTotalSalesPaise,
    monthlySummary,
    turnover44Ad: {
      digitalReceiptsPaise: totalDigitalReceiptsPaise,
      cashReceiptsPaise: totalCashReceiptsPaise,
      unpaidReceivablesPaise: totalUnpaidReceivablesPaise,
      totalTurnoverPaise: totalSalesTaxablePaise,
      presumptiveDigitalProfitPaise,
      presumptiveCashProfitPaise,
      totalPresumptiveProfitPaise
    }
  };
}, 'get-itr-data');
