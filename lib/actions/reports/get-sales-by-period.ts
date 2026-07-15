'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices } from '@/lib/db/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { paiseToRupees } from '@/lib/money';
import { z } from 'zod';

const getSalesByPeriodSchema = z.object({
  startDate: z.string().max(30),
  endDate: z.string().max(30)
});

export type MonthlySalesData = {
  key: string;
  label: string;
  subtotal: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax: number;
  grand_total: number;
  invoice_count: number;
};

function getMonthsInRange(start: string, end: string): MonthlySalesData[] {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  
  const months: MonthlySalesData[] = [];
  let currentYear = startYear;
  let currentMonth = startMonth;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.push({
      key: monthStr,
      label: `${monthNames[currentMonth - 1]} ${currentYear}`,
      subtotal: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_tax: 0,
      grand_total: 0,
      invoice_count: 0
    });
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  return months;
}

export const getSalesByPeriod = createAuthenticatedAction(getSalesByPeriodSchema, async (input, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  const monthKey = sql<string>`to_char(${invoices.invoice_date}, 'YYYY-MM')`;

  const results = await db.select({
    month: monthKey,
    subtotal: sql<number>`sum(${invoices.subtotal_paise})`,
    total_cgst: sql<number>`sum(${invoices.total_cgst_paise})`,
    total_sgst: sql<number>`sum(${invoices.total_sgst_paise})`,
    total_igst: sql<number>`sum(${invoices.total_igst_paise})`,
    total_tax: sql<number>`sum(${invoices.total_tax_paise})`,
    grand_total: sql<number>`sum(${invoices.grand_total_paise})`,
    invoice_count: sql<number>`count(*)`
  })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, input.startDate, input.endDate)
  ))
  .groupBy(monthKey)
  .orderBy(monthKey);

  // Initialize with zeroed months
  const monthlyData = getMonthsInRange(input.startDate, input.endDate);
  const dataMap = new Map(monthlyData.map(m => [m.key, m]));

  for (const row of results) {
    const record = dataMap.get(row.month);
    if (record) {
      record.subtotal = paiseToRupees(Number(row.subtotal || 0));
      record.total_cgst = paiseToRupees(Number(row.total_cgst || 0));
      record.total_sgst = paiseToRupees(Number(row.total_sgst || 0));
      record.total_igst = paiseToRupees(Number(row.total_igst || 0));
      record.total_tax = paiseToRupees(Number(row.total_tax || 0));
      record.grand_total = paiseToRupees(Number(row.grand_total || 0));
      record.invoice_count = Number(row.invoice_count || 0);
    }
  }

  return monthlyData;
}, 'get-sales-by-period');
