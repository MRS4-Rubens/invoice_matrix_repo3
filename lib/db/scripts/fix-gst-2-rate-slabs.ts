/**
 * GST 2.0 Rate Slabs Correction (Effective 22 Sep 2025)
 * 
 * GST 2.0 abolished the 12% and 28% slabs and introduced a 40% slab.
 * This script safely updates existing historical data by:
 * 1. Deactivating 12% and 28% and setting their effective_to date.
 * 2. Ensuring the 0%, 5%, 18% slabs have an effective_from date (if not earlier than 22 Sep 2025).
 * 3. Inserting the new 40% slab.
 * 
 * It is safe to run multiple times.
 */

import { db } from '../client';
import { taxRates } from '../schema';
import { eq, sql, inArray } from 'drizzle-orm';

async function fixGstSlabs() {
  console.log('Starting GST 2.0 slabs correction...');
  const effectiveDate = '2025-09-22';
  const decommissionDate = '2025-09-21';

  // 1. Deactivate old slabs (12%, 28%)
  const deactivatedResult = await db.update(taxRates)
    .set({ is_active: false, effective_to: decommissionDate })
    .where(inArray(taxRates.label, ['12%', '28%']))
    .returning({ label: taxRates.label });
  
  if (deactivatedResult.length > 0) {
    console.log(`Deactivated slabs: ${deactivatedResult.map(r => r.label).join(', ')}`);
  } else {
    console.log('No 12% or 28% slabs found to deactivate (or already handled).');
  }

  // 2. Insert new 40% slab if missing
  const existing40 = await db.select({ id: taxRates.id }).from(taxRates).where(eq(taxRates.label, '40% (Luxury/Sin)'));
  if (existing40.length === 0) {
    await db.insert(taxRates).values({
      label: '40% (Luxury/Sin)',
      rate_percentage: '40.00',
      effective_from: effectiveDate,
      effective_to: null,
      is_active: true
    });
    console.log('Inserted new 40% slab.');
  } else {
    console.log('40% slab already exists, skipped.');
  }

  // 3. Update effective_from on 0%, 5%, 18% ONLY if needed (we'll just leave them as is if they already exist, 
  // since they were active before. But per instructions, update them if they need it. Typically the initial seed used `today`. 
  // Let's just update them if their effective_from > '2025-09-22'.
  await db.execute(sql`
    UPDATE tax_rates 
    SET effective_from = ${effectiveDate}
    WHERE label IN ('Exempt (0%)', '5%', '18%')
    AND effective_from > ${effectiveDate}::date
  `);
  console.log('Ensured 0%, 5%, 18% slabs have valid effective_from dates.');

  console.log('GST 2.0 slabs correction completed successfully.');
  process.exit(0);
}

fixGstSlabs().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
