'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { db } from '@/lib/db/client';
import { invoices, payments } from '@/lib/db/schema';
import { eq, and, ne, between, sql } from 'drizzle-orm';
import { getCurrentMonthRange, getCurrentFinancialYearRange } from '@/lib/reports/period';
import { getDisplayInvoiceStatus } from '@/lib/invoices/status';
import { z } from 'zod';

export const getDashboardStats = createAuthenticatedAction(z.object({}), async (_, context) => {
  const businessId = context.appUser.business_id;
  if (!businessId) {
    throw new Error('Your account is not linked to a business profile.');
  }

  const monthRange = getCurrentMonthRange();
  const fyRange = getCurrentFinancialYearRange();

  const monthRevResult = await db.select({
    total: sql<number>`coalesce(sum(${invoices.grand_total_paise}), 0)`
  })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, monthRange.startDate, monthRange.endDate)
  ));

  const fyRevResult = await db.select({
    total: sql<number>`coalesce(sum(${invoices.grand_total_paise}), 0)`
  })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    between(invoices.invoice_date, fyRange.startDate, fyRange.endDate)
  ));

  const draftResult = await db.select({ count: sql<number>`count(*)` })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'draft')
  ));

  const finalizedResult = await db.select({ count: sql<number>`count(*)` })
  .from(invoices)
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized')
  ));

  const outstandingInvoices = await db.select({
    id: invoices.id,
    grand_total_paise: invoices.grand_total_paise,
    due_date: invoices.due_date,
    lifecycle_status: invoices.lifecycle_status,
    payment_status: invoices.payment_status,
    paid_amount: sql<number>`coalesce(sum(${payments.amount_paise}), 0)`.mapWith(Number)
  })
  .from(invoices)
  .leftJoin(payments, eq(invoices.id, payments.invoice_id))
  .where(and(
    eq(invoices.business_id, businessId),
    eq(invoices.lifecycle_status, 'finalized'),
    ne(invoices.payment_status, 'paid')
  ))
  .groupBy(invoices.id);

  let outstandingTotalPaise = 0;
  let overdueCount = 0;
  let overdueTotalPaise = 0;

  for (const inv of outstandingInvoices) {
    const balance = inv.grand_total_paise - inv.paid_amount;
    outstandingTotalPaise += balance;
    
    // This filtering deliberately happens in application code, not SQL, since the realistic number 
    // of open unpaid invoices for a business this size is always small — this is simple and fast enough 
    // without needing database-level date-comparison tricks.
    const status = getDisplayInvoiceStatus({
      lifecycle_status: inv.lifecycle_status,
      payment_status: inv.payment_status,
      due_date: inv.due_date
    });
    
    if (status === 'overdue') {
      overdueCount++;
      overdueTotalPaise += balance;
    }
  }

  return {
    revenueThisMonthPaise: Number(monthRevResult[0].total),
    revenueThisMonthLabel: monthRange.label,
    revenueThisFyPaise: Number(fyRevResult[0].total),
    revenueThisFyLabel: fyRange.label,
    outstandingTotalPaise,
    overdueCount,
    overdueTotalPaise,
    draftCount: Number(draftResult[0].count),
    totalFinalizedCount: Number(finalizedResult[0].count)
  };
}, 'get-dashboard-stats');
