'use server';

import { createAuthenticatedAction } from '../_shared/create-action';
import { productSchema } from '@/lib/validations/product';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { rupeesToPaise } from '@/lib/money';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateSchema = productSchema.extend({
  id: z.string().uuid()
});

export const updateProduct = createAuthenticatedAction(
  updateSchema,
  async (data, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('Please complete your business profile in Settings before updating products.', { code: 'NOT_FOUND' });
    }

    const { id, default_sale_price, default_tax_rate_id, stock_quantity, ...rest } = data;

    const updatedProduct = await db.update(products).set({
      ...rest,
      default_sale_price_paise: rupeesToPaise(default_sale_price),
      default_tax_rate_id: default_tax_rate_id === '' ? null : default_tax_rate_id,
      stock_quantity: stock_quantity === '' || stock_quantity === undefined ? null : stock_quantity,
      updated_at: new Date()
    })
    .where(and(
      eq(products.id, id),
      eq(products.business_id, appUser.business_id)
    ))
    .returning();

    if (updatedProduct.length === 0) {
      throw new ActionError('Product not found.', { code: 'NOT_FOUND' });
    }

    revalidatePath('/products');
    revalidatePath(`/products/${id}/edit`);

    return updatedProduct[0];
  },
  'update-product'
);
