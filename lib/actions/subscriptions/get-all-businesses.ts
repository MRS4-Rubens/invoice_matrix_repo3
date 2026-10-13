'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { businesses, users, invoices } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq, sql, desc } from 'drizzle-orm';
import { z } from 'zod';

export const getAllBusinesses = createAuthenticatedAction(
  z.object({}),
  async (_, context) => {
    // 1. Authorize user
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
      // 2. Fetch businesses with subquery counts for invoices and users
      const results = await db
        .select({
          id: businesses.id,
          legalName: businesses.legal_name,
          tradeName: businesses.trade_name,
          gstin: businesses.gstin,
          email: businesses.email,
          phone: businesses.phone,
          subscriptionPlan: businesses.subscription_plan,
          subscriptionStatus: businesses.subscription_status,
          subscriptionEndsAt: businesses.subscription_ends_at,
          activeUtrNo: businesses.active_utr_no,
          createdAt: businesses.created_at,
          invoiceCount: sql<number>`(select coalesce(count(*), 0) from ${invoices} where ${invoices.business_id} = ${businesses.id})`,
          userCount: sql<number>`(select coalesce(count(*), 0) from ${users} where ${users.business_id} = ${businesses.id})`,
        })
        .from(businesses)
        .orderBy(desc(businesses.created_at));

      return results;
    } catch (err) {
      console.error('[getAllBusinesses] Failed to fetch directory:', err);
      throw new ActionError('Failed to fetch businesses directory.', {
        code: 'FETCH_FAILED',
      });
    }
  },
  'get-all-businesses'
);
