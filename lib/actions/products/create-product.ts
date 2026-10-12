'use server';

import { createAuthenticatedAction } from '../_shared/create-action';
import { productSchema } from '@/lib/validations/product';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { products, businesses } from '@/lib/db/schema';
import { rupeesToPaise } from '@/lib/money';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { canAddProduct } from '@/lib/subscriptions/entitlements';

export const createProduct = createAuthenticatedAction(
  productSchema,
  async (data, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('Please complete your business profile in Settings before adding products.', { code: 'NOT_FOUND' });
    }

    // Quota check: Verify product limit for Free tier
    const bizResult = await db.select().from(businesses).where(eq(businesses.id, appUser.business_id)).limit(1);
    if (bizResult.length === 0) throw new ActionError('Business not found.', { code: 'NOT_FOUND' });

    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.business_id, appUser.business_id));
    const currentCount = Number(countResult[0]?.count || 0);

    const quotaCheck = canAddProduct(bizResult[0], currentCount);
    if (!quotaCheck.allowed) {
      throw new ActionError(quotaCheck.reason || 'Product quota exceeded.', {
        code: quotaCheck.code || 'PRODUCT_QUOTA_EXCEEDED',
      });
    }

    const { default_sale_price, default_tax_rate_id, stock_quantity, ...rest } = data;

    const insertedProduct = await db.insert(products).values({
      ...rest,
      business_id: appUser.business_id,
      default_sale_price_paise: rupeesToPaise(default_sale_price),
      default_tax_rate_id: default_tax_rate_id === '' ? null : default_tax_rate_id,
      stock_quantity: stock_quantity === '' || stock_quantity === undefined ? null : stock_quantity,
    }).returning();

    revalidatePath('/products');

    return insertedProduct[0];
  },
  'create-product'
);
