'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, financialYears } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { paiseToRupees } from '@/lib/money';
import { z } from 'zod';

export type FinancialYearSalesData = {
  key: string;
  label: string;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  grand_total: number;
  invoice_count: number;
  is_current: boolean;
};

export const getSalesByFinancialYear = createAuthenticatedAction(
  z.object({}),
  async (_, context) => {
    const businessId = context.appUser.business_id;
    if (!businessId) {
      throw new Error('Your account is not linked to a business profile.');
    }

    const rows = await db
      .select({
        id: financialYears.id,
        label: financialYears.label,
        startDate: financialYears.start_date,
        endDate: financialYears.end_date,
        isCurrent: financialYears.is_current,
        subtotal: sql<number>`coalesce(sum(${invoices.subtotal_paise}), 0)`,
        total_cgst: sql<number>`coalesce(sum(${invoices.total_cgst_paise}), 0)`,
        total_sgst: sql<number>`coalesce(sum(${invoices.total_sgst_paise}), 0)`,
        total_igst: sql<number>`coalesce(sum(${invoices.total_igst_paise}), 0)`,
        total_tax: sql<number>`coalesce(sum(${invoices.total_tax_paise}), 0)`,
        grand_total: sql<number>`coalesce(sum(${invoices.grand_total_paise}), 0)`,
        invoice_count: sql<number>`count(${invoices.id})`,
      })
      .from(financialYears)
      .leftJoin(
        invoices,
        and(
          eq(invoices.financial_year_id, financialYears.id),
          eq(invoices.lifecycle_status, 'finalized')
        )
      )
      .where(eq(financialYears.business_id, businessId))
      .groupBy(
        financialYears.id,
        financialYears.label,
        financialYears.start_date,
        financialYears.end_date,
        financialYears.is_current
      )
      .orderBy(financialYears.start_date);

    return rows.map((r) => ({
      key: r.label,
      label: r.label.startsWith('FY') ? r.label : `FY ${r.label}`,
      subtotal: paiseToRupees(Number(r.subtotal || 0)),
      total_cgst: paiseToRupees(Number(r.total_cgst || 0)),
      total_sgst: paiseToRupees(Number(r.total_sgst || 0)),
      total_igst: paiseToRupees(Number(r.total_igst || 0)),
      total_tax: paiseToRupees(Number(r.total_tax || 0)),
      grand_total: paiseToRupees(Number(r.grand_total || 0)),
      invoice_count: Number(r.invoice_count || 0),
      is_current: Boolean(r.isCurrent),
    }));
  },
  'get-sales-by-financial-year'
);
