'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { subscriptionRequests, businesses, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const getPendingRequests = createAuthenticatedAction(
  z.object({}),
  async (_, context) => {
    // 1. Authorize user by checking session email against PLATFORM_ADMIN_EMAILS
    const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    const session = await auth.getSession();
    const userEmail = session?.data?.user?.email?.toLowerCase();

    if (!userEmail || !adminEmails.includes(userEmail)) {
      throw new ActionError('Unauthorized: Only Platform Admins can view pending requests.', {
        code: 'UNAUTHORIZED_ACCESS',
      });
    }

    // 2. Fetch pending requests
    const results = await db
      .select({
        id: subscriptionRequests.id,
        businessId: subscriptionRequests.business_id,
        businessName: businesses.legal_name,
        businessGstin: businesses.gstin,
        businessEmail: businesses.email,
        userId: subscriptionRequests.user_id,
        userName: users.display_name,
        planName: subscriptionRequests.plan_name,
        billingCycle: subscriptionRequests.billing_cycle,
        amountPaise: subscriptionRequests.amount_paise,
        paymentMethod: subscriptionRequests.payment_method,
        paymentReference: subscriptionRequests.payment_reference,
        screenshotStorageKey: subscriptionRequests.screenshot_storage_key,
        status: subscriptionRequests.status,
        createdAt: subscriptionRequests.created_at,
      })
      .from(subscriptionRequests)
      .innerJoin(businesses, eq(subscriptionRequests.business_id, businesses.id))
      .innerJoin(users, eq(subscriptionRequests.user_id, users.id))
      .where(eq(subscriptionRequests.status, 'pending'))
      .orderBy(desc(subscriptionRequests.created_at));

    return results;
  },
  'get-pending-requests'
);
