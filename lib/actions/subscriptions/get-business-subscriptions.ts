'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { subscriptionRequests, users } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

const getBusinessSubscriptionsSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
});

export const getBusinessSubscriptions = createAuthenticatedAction(
  getBusinessSubscriptionsSchema,
  async (input, context) => {
    // 1. Authorize user by checking session email against PLATFORM_ADMIN_EMAILS or verifying user belongs to the business
    const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    const session = await auth.getSession();
    const userEmail = session?.data?.user?.email?.toLowerCase();

    const isPlatformAdmin = Boolean(userEmail && adminEmails.includes(userEmail));
    const isBusinessMember = context.appUser.business_id === input.business_id;

    if (!isPlatformAdmin && !isBusinessMember) {
      throw new ActionError('Unauthorized: Access denied.', {
        code: 'UNAUTHORIZED_ACCESS',
      });
    }

    // 2. Query all requests for the business
    const results = await db
      .select({
        id: subscriptionRequests.id,
        planName: subscriptionRequests.plan_name,
        billingCycle: subscriptionRequests.billing_cycle,
        amountPaise: subscriptionRequests.amount_paise,
        paymentMethod: subscriptionRequests.payment_method,
        paymentReference: subscriptionRequests.payment_reference,
        screenshotStorageKey: subscriptionRequests.screenshot_storage_key,
        status: subscriptionRequests.status,
        rejectReason: subscriptionRequests.reject_reason,
        approvedAt: subscriptionRequests.approved_at,
        createdAt: subscriptionRequests.created_at,
        userName: users.display_name,
      })
      .from(subscriptionRequests)
      .leftJoin(users, eq(subscriptionRequests.user_id, users.id))
      .where(eq(subscriptionRequests.business_id, input.business_id))
      .orderBy(desc(subscriptionRequests.created_at));

    return results;
  },
  'get-business-subscriptions'
);
