'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { businesses, subscriptionRequests, auditLog } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const updateSubscriptionSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
  subscription_plan: z.string().min(1),
  subscription_status: z.enum(['trial', 'active', 'expired', 'suspended']),
  subscription_ends_at: z.string().nullable().or(z.literal('')), // ISO String or null
});

export const updateBusinessSubscription = createAuthenticatedAction(
  updateSubscriptionSchema,
  async (input, context) => {
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

    const endsAtDate = input.subscription_ends_at ? new Date(input.subscription_ends_at) : null;
    const now = new Date();

    try {
      await db.transaction(async (tx) => {
        // A. Update the business subscription values
        await tx
          .update(businesses)
          .set({
            subscription_plan: input.subscription_plan,
            subscription_status: input.subscription_status,
            subscription_ends_at: endsAtDate,
            updated_at: now,
          })
          .where(eq(businesses.id, input.business_id));

        // B. Log this manual override in the audit logs
        await tx.insert(auditLog).values({
          business_id: input.business_id,
          user_id: context.appUser.id,
          entity_type: 'business',
          entity_id: input.business_id,
          action: 'subscription_manual_override',
          metadata: {
            updated_by: userEmail,
            subscription_plan: input.subscription_plan,
            subscription_status: input.subscription_status,
            subscription_ends_at: endsAtDate ? endsAtDate.toISOString() : null,
            overridden_at: now.toISOString(),
          },
        });

        // C. Record a system approval/adjustment request inside subscription_requests for full ledger completeness
        await tx.insert(subscriptionRequests).values({
          business_id: input.business_id,
          user_id: context.appUser.id,
          plan_name: input.subscription_plan,
          billing_cycle: 'manual_override',
          amount_paise: 0,
          payment_method: 'manual_override',
          payment_reference: `MANUAL-${now.getTime()}`,
          status: 'approved',
          reject_reason: `Manual Override by Platform Admin (${userEmail})`,
          approved_at: now,
        });
      });
    } catch (err) {
      console.error('[updateBusinessSubscription] Override transaction failed:', err);
      throw new ActionError('Failed to manually update business subscription.', {
        code: 'OVERRIDE_FAILED',
      });
    }

    // 2. Revalidate cache
    revalidatePath('/admin');
    revalidatePath('/checkout');
    revalidatePath('/dashboard');

    return {
      businessId: input.business_id,
      status: input.subscription_status,
    };
  },
  'update-business-subscription'
);
