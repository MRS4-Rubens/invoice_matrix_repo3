// These are common historical GST rate slabs provided as starting placeholders only. Confirm the exact current rates applicable to your products with your CA before relying on these for real invoices — government-set rates can change. Additional rates can be added later through the Settings UI once it exists.
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
  const today = new Date().toISOString().split('T')[0];

  await db.insert(taxRates).values([
    {
      label: 'Exempt (0%)',
      rate_percentage: '0.00',
      effective_from: today,
      effective_to: null,
      is_active: true
    },
    {
      label: '5%',
      rate_percentage: '5.00',
      effective_from: today,
      effective_to: null,
      is_active: true
    },
    {
      label: '12%',
      rate_percentage: '12.00',
      effective_from: today,
      effective_to: null,
      is_active: true
    },
    {
      label: '18%',
      rate_percentage: '18.00',
      effective_from: today,
      effective_to: null,
      is_active: true
    },
    {
      label: '28%',
      rate_percentage: '28.00',
      effective_from: today,
      effective_to: null,
      is_active: true
    }
  ]);

  console.log('Seeded 5 tax rates successfully.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
