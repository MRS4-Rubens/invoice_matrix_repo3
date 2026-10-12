'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices } from '@/lib/db/schema';
import { eq, and, between, sql } from 'drizzle-orm';
import { paiseToRupees } from '@/lib/money';
import { z } from 'zod';

const getSalesByPeriodSchema = z.object({
  startDate: z.string().max(30),
  endDate: z.string().max(30),
  interval: z.enum(['auto', 'month', 'week']).optional(),
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

interface IntervalBucket extends MonthlySalesData {
  startDateStr: string;
  endDateStr: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getDailyIntervalsInRange(start: string, end: string): IntervalBucket[] {
  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  const intervals: IntervalBucket[] = [];
  
  let cur = new Date(startD);
  while (cur <= endD) {
    const curStr = cur.toISOString().slice(0, 10);
    const day = cur.getUTCDate();
    const month = MONTH_NAMES[cur.getUTCMonth()];
    
    intervals.push({
      key: curStr,
      label: `${day} ${month}`,
      startDateStr: curStr,
      endDateStr: curStr,
      subtotal: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_tax: 0,
      grand_total: 0,
      invoice_count: 0,
    });
    
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return intervals;
}

function getWeeklyIntervalsInRange(start: string, end: string): IntervalBucket[] {
  const startD = new Date(start + 'T00:00:00Z');
  const endD = new Date(end + 'T00:00:00Z');
  const intervals: IntervalBucket[] = [];
  
  let cur = new Date(startD);
  let weekIndex = 1;
  
  while (cur <= endD) {
    const curEnd = new Date(Math.min(cur.getTime() + 6 * 24 * 60 * 60 * 1000, endD.getTime()));
    
    const curStartStr = cur.toISOString().slice(0, 10);
    const curEndStr = curEnd.toISOString().slice(0, 10);
    
    const startDay = cur.getUTCDate();
    const endDay = curEnd.getUTCDate();
    const startMonth = MONTH_NAMES[cur.getUTCMonth()];
    const endMonth = MONTH_NAMES[curEnd.getUTCMonth()];
    
    let label = '';
    if (startMonth === endMonth) {
      if (startDay === endDay) {
        label = `${startDay} ${startMonth}`;
      } else {
        label = `${startDay}–${endDay} ${startMonth}`;
      }
    } else {
      label = `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
    }
    
    intervals.push({
      key: `W${weekIndex}_${curStartStr}`,
      label,
      startDateStr: curStartStr,
      endDateStr: curEndStr,
      subtotal: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_tax: 0,
      grand_total: 0,
      invoice_count: 0,
    });
    
    weekIndex++;
    cur = new Date(curEnd.getTime() + 24 * 60 * 60 * 1000);
  }
  
  return intervals;
}

function getMonthsInRange(start: string, end: string): MonthlySalesData[] {
  const [startYear, startMonth] = start.split('-').map(Number);
  const [endYear, endMonth] = end.split('-').map(Number);
  
  const months: MonthlySalesData[] = [];
  let currentYear = startYear;
  let currentMonth = startMonth;
  
  while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
    const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    months.push({
      key: monthStr,
      label: `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`,
      subtotal: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_tax: 0,
      grand_total: 0,
      invoice_count: 0,
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

  const startD = new Date(input.startDate + 'T00:00:00Z');
  const endD = new Date(input.endDate + 'T00:00:00Z');
  const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const useSubMonthlyIntervals = input.interval === 'week' || (input.interval !== 'month' && diffDays <= 35);

  if (useSubMonthlyIntervals) {
    const dayKey = sql<string>`to_char(${invoices.invoice_date}, 'YYYY-MM-DD')`;

    const results = await db.select({
      day: dayKey,
      subtotal: sql<number>`sum(${invoices.subtotal_paise})`,
      total_cgst: sql<number>`sum(${invoices.total_cgst_paise})`,
      total_sgst: sql<number>`sum(${invoices.total_sgst_paise})`,
      total_igst: sql<number>`sum(${invoices.total_igst_paise})`,
      total_tax: sql<number>`sum(${invoices.total_tax_paise})`,
      grand_total: sql<number>`sum(${invoices.grand_total_paise})`,
      invoice_count: sql<number>`count(*)`,
    })
    .from(invoices)
    .where(and(
      eq(invoices.business_id, businessId),
      eq(invoices.lifecycle_status, 'finalized'),
      between(invoices.invoice_date, input.startDate, input.endDate)
    ))
    .groupBy(dayKey)
    .orderBy(dayKey);

    const intervalBuckets = diffDays <= 7
      ? getDailyIntervalsInRange(input.startDate, input.endDate)
      : getWeeklyIntervalsInRange(input.startDate, input.endDate);

    const bucketPaise = intervalBuckets.map(() => ({
      subtotal: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_tax: 0,
      grand_total: 0,
      invoice_count: 0,
    }));

    for (const row of results) {
      const dayStr = row.day;
      if (!dayStr) continue;
      
      const bucketIndex = intervalBuckets.findIndex(
        (b) => dayStr >= b.startDateStr && dayStr <= b.endDateStr
      );
      
      if (bucketIndex !== -1) {
        bucketPaise[bucketIndex].subtotal += Number(row.subtotal || 0);
        bucketPaise[bucketIndex].total_cgst += Number(row.total_cgst || 0);
        bucketPaise[bucketIndex].total_sgst += Number(row.total_sgst || 0);
        bucketPaise[bucketIndex].total_igst += Number(row.total_igst || 0);
        bucketPaise[bucketIndex].total_tax += Number(row.total_tax || 0);
        bucketPaise[bucketIndex].grand_total += Number(row.grand_total || 0);
        bucketPaise[bucketIndex].invoice_count += Number(row.invoice_count || 0);
      }
    }

    return intervalBuckets.map((bucket, idx) => ({
      key: bucket.key,
      label: bucket.label,
      subtotal: paiseToRupees(bucketPaise[idx].subtotal),
      total_cgst: paiseToRupees(bucketPaise[idx].total_cgst),
      total_sgst: paiseToRupees(bucketPaise[idx].total_sgst),
      total_igst: paiseToRupees(bucketPaise[idx].total_igst),
      total_tax: paiseToRupees(bucketPaise[idx].total_tax),
      grand_total: paiseToRupees(bucketPaise[idx].grand_total),
      invoice_count: bucketPaise[idx].invoice_count,
    }));
  }

  // Monthly Rollup (for ranges > 35 days, such as FY or Multi-Month reports)
  const monthKey = sql<string>`to_char(${invoices.invoice_date}, 'YYYY-MM')`;

  const results = await db.select({
    month: monthKey,
    subtotal: sql<number>`sum(${invoices.subtotal_paise})`,
    total_cgst: sql<number>`sum(${invoices.total_cgst_paise})`,
    total_sgst: sql<number>`sum(${invoices.total_sgst_paise})`,
    total_igst: sql<number>`sum(${invoices.total_igst_paise})`,
    total_tax: sql<number>`sum(${invoices.total_tax_paise})`,
    grand_total: sql<number>`sum(${invoices.grand_total_paise})`,
    invoice_count: sql<number>`count(*)`,
  })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, input.startDate, input.endDate)
  ))
  .groupBy(monthKey)
  .orderBy(monthKey);

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
