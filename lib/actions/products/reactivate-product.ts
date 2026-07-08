'use server';

import { createAuthenticatedAction } from '../_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const reactivateSchema = z.object({
  id: z.string().uuid()
});

export const reactivateProduct = createAuthenticatedAction(
  reactivateSchema,
  async ({ id }, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('Please complete your business profile in Settings before updating products.', { code: 'NOT_FOUND' });
    }

    const result = await db.update(products)
      .set({ 
        is_active: true,
        updated_at: new Date()
      })
      .where(and(
        eq(products.id, id),
        eq(products.business_id, appUser.business_id)
      ))
      .returning();

    if (result.length === 0) {
      throw new ActionError('Product not found.', { code: 'NOT_FOUND' });
    }

    revalidatePath('/products');
    revalidatePath(`/products/${id}/edit`);

    return result[0];
  },
  'reactivate-product'
);
