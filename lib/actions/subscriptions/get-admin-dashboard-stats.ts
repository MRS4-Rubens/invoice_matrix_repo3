'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { subscriptionRequests, businesses, invoices } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

export const getAdminDashboardStats = createAuthenticatedAction(
  z.object({}),
  async (_, context) => {
    // 1. Authorize user against PLATFORM_ADMIN_EMAILS
    const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    const session = await auth.getSession();
    const userEmail = session?.data?.user?.email?.toLowerCase();

    if (!userEmail || !adminEmails.includes(userEmail)) {
      throw new ActionError('Unauthorized: Access denied.', {
        code: 'UNAUTHORIZED_ACCESS',
      });
    }

    try {
      // 2. Query aggregate stats
      const totalBusinessesResult = await db.select({ count: sql<number>`count(*)` }).from(businesses);
      const activeSubsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(businesses)
        .where(eq(businesses.subscription_status, 'active'));

      const totalRevenueResult = await db
        .select({ total: sql<number>`coalesce(sum(${subscriptionRequests.amount_paise}), 0)` })
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, 'approved'));

      const pendingRequestsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, 'pending'));

      const platformInvoicesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(invoices);

      // 3. Query plan distribution
      const planDistributionResult = await db
        .select({
          plan: businesses.subscription_plan,
          count: sql<number>`count(*)`,
        })
        .from(businesses)
        .groupBy(businesses.subscription_plan);

      const planMap: Record<string, number> = {
        trial: 0,
        free: 0,
        essentials: 0,
        professional: 0,
      };

      for (const row of planDistributionResult) {
        if (row.plan) {
          planMap[row.plan.toLowerCase()] = Number(row.count || 0);
        }
      }

      // 4. Monthly revenue trend for the last 6 calendar months
      const monthlyRevenueRows = await db
        .select({
          monthSort: sql<string>`to_char(${subscriptionRequests.created_at}, 'YYYY-MM')`,
          revenuePaise: sql<number>`coalesce(sum(${subscriptionRequests.amount_paise}), 0)`,
          claimCount: sql<number>`count(*)`,
        })
        .from(subscriptionRequests)
        .where(eq(subscriptionRequests.status, 'approved'))
        .groupBy(sql`to_char(${subscriptionRequests.created_at}, 'YYYY-MM')`);

      const revenueByMonthSort = new Map<string, { revenuePaise: number; claimCount: number }>();
      for (const row of monthlyRevenueRows) {
        revenueByMonthSort.set(row.monthSort, {
          revenuePaise: Number(row.revenuePaise || 0),
          claimCount: Number(row.claimCount || 0),
        });
      }

      const now = new Date();
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });
        const monthSort = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const match = revenueByMonthSort.get(monthSort);

        last6Months.push({
          month: `${monthLabel} ${d.getFullYear() % 100}`,
          revenuePaise: match ? match.revenuePaise : 0,
          claimCount: match ? match.claimCount : 0,
        });
      }

      return {
        totalBusinesses: Number(totalBusinessesResult[0]?.count || 0),
        activeSubscriptions: Number(activeSubsResult[0]?.count || 0),
        totalRevenuePaise: Number(totalRevenueResult[0]?.total || 0),
        pendingRequestsCount: Number(pendingRequestsResult[0]?.count || 0),
        platformInvoiceCount: Number(platformInvoicesResult[0]?.count || 0),
        planDistribution: planMap,
        monthlyRevenue: last6Months,
      };
    } catch (err) {
      console.error('[getAdminDashboardStats] Failed to retrieve admin stats:', err);
      throw new ActionError('Failed to fetch admin dashboard statistics.', {
        code: 'STATS_FETCH_FAILED',
      });
    }
  },
  'get-admin-dashboard-stats'
);
