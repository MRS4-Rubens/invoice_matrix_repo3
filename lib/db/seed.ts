// These are common historical GST rate slabs provided as starting placeholders only. Confirm the exact current rates applicable to your products with your CA before relying on these for real invoices.
// NOTE: GST 2.0 (effective 22 Sep 2025) abolished the 12% and 28% slabs and introduced a 40% slab.
// This seed provides the current 4 slabs (0%, 5%, 18%, 40%). Additional rates can be added later through the Settings UI.
import { db } from './client';
import { taxRates } from './schema';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('Checking for existing tax rates...');
  
  const existingRates = await db.select({ count: sql<number>`count(*)` }).from(taxRates);
  const count = Number(existingRates[0]?.count || 0);

  if (count > 0) {
    console.log('Tax rates already exist, skipped.');
    process.exit(0);
  }

  console.log('Seeding tax rates...');
  // For a brand new install, effective_from can just be the GST 2.0 start date (or earlier if desired).
  const effectiveDate = '2025-09-22';

  await db.insert(taxRates).values([
    {
      label: 'Exempt (0%)',
      rate_percentage: '0.00',
      effective_from: effectiveDate,
      effective_to: null,
      is_active: true
    },
    {
      label: '5%',
      rate_percentage: '5.00',
      effective_from: effectiveDate,
      effective_to: null,
      is_active: true
    },
    {
      label: '18%',
      rate_percentage: '18.00',
      effective_from: effectiveDate,
      effective_to: null,
      is_active: true
    },
    {
      label: '40% (Luxury/Sin)',
      rate_percentage: '40.00',
      effective_from: effectiveDate,
      effective_to: null,
      is_active: true
    }
  ]);

  console.log('Seeded 4 tax rates successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
