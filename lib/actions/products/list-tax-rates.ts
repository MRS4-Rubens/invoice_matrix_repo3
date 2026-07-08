'use server';

import { db } from '@/lib/db/client';
import { z } from 'zod';
import { taxRates } from '@/lib/db/schema';
import { createAction } from '@/lib/actions/_shared/create-action';
import { eq } from 'drizzle-orm';

/**
 * Returns all active tax rates, ordered by rate_percentage ascending.
 * 
 * Note: GST rate slabs are national and not scoped to a specific business.
 * The rate_percentage column returns as a string (e.g. "18.00") from Drizzle 
 * because it is a Postgres numeric column; do not parseFloat it for display.
 */
export const listTaxRates = createAction(
  z.any(),
  async () => {
    const rates = await db.query.taxRates.findMany({
      where: eq(taxRates.is_active, true),
      orderBy: (taxRates, { asc }) => [asc(taxRates.rate_percentage)]
    });

    return rates;
  },
  'list-tax-rates'
);
