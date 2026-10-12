'use server';

import { createAuthenticatedAction } from '@/lib/actions/_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { users, businesses } from '@/lib/db/schema';
import { auth } from '@/lib/auth/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const getAllUsers = createAuthenticatedAction(
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
      // 2. Query users with their business names (left join)
      const results = await db
        .select({
          id: users.id,
          displayName: users.display_name,
          role: users.role,
          createdAt: users.created_at,
          businessId: users.business_id,
          businessName: businesses.legal_name,
        })
        .from(users)
        .leftJoin(businesses, eq(users.business_id, businesses.id))
        .orderBy(desc(users.created_at));

      return results;
    } catch (err: any) {
      console.error('[getAllUsers] Failed to fetch users directory:', err);
      throw new ActionError('Failed to fetch platform users directory.', {
        code: 'FETCH_FAILED',
      });
    }
  },
  'get-all-users'
);
