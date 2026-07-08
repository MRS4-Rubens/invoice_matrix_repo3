'use server';

import { createAuthenticatedAction } from '../_shared/create-action';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { products, taxRates } from '@/lib/db/schema';
import { eq, and, ilike, or, asc } from 'drizzle-orm';
import { z } from 'zod';

const listProductsSchema = z.object({
  search: z.string().optional(),
  includeInactive: z.boolean().optional().default(false)
});

export const listProducts = createAuthenticatedAction(
  listProductsSchema,
  async (data, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('Please complete your business profile in Settings before viewing products.', { code: 'NOT_FOUND' });
    }

    const conditions: (ReturnType<typeof eq> | undefined)[] = [
      eq(products.business_id, appUser.business_id)
    ];

    if (!data.includeInactive) {
      conditions.push(eq(products.is_active, true));
    }

    if (data.search) {
      const searchTerm = `%${data.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.hsn_sac_code, searchTerm)
        )
      );
    }

    const results = await db
      .select({
        product: products,
        taxRate: taxRates
      })
      .from(products)
      .leftJoin(taxRates, eq(products.default_tax_rate_id, taxRates.id))
      .where(and(...conditions))
      .orderBy(asc(products.name));

    return results;
  },
  'list-products'
);
