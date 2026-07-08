'use server';

import { createAuthenticatedAction } from '../_shared/create-action';
import { productSchema } from '@/lib/validations/product';
import { ActionError } from '@/lib/actions/_shared/errors';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { rupeesToPaise } from '@/lib/money';
import { revalidatePath } from 'next/cache';

export const createProduct = createAuthenticatedAction(
  productSchema,
  async (data, { appUser }) => {
    if (!appUser.business_id) {
      throw new ActionError('Please complete your business profile in Settings before adding products.', { code: 'NOT_FOUND' });
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
