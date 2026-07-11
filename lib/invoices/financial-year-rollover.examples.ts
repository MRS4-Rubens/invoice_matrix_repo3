import { db } from '@/lib/db/client';
import { businesses, financialYears } from '@/lib/db/schema';
import { getOrCreateCurrentFinancialYear } from './financial-year-rollover';
import { eq } from 'drizzle-orm';
import { getIndianFinancialYearForDate } from './financial-year';

async function run() {
  console.log('\n--- Running Financial Year Rollover Examples ---\n');

  // 1. Create a test business
  const [testBusiness] = await db.insert(businesses).values({
    legal_name: 'TEST BUSINESS - FY ROLLOVER',
    pan: 'ABCDE1234F',
    gstin: '29ABCDE1234F1Z5',
    state_code: '29',
    address_line1: '123 Test St',
    city: 'Bengaluru',
    pincode: '560001',
    invoice_number_format: 'INV/{FY}/{SEQ}'
  }).returning();

  const businessId = testBusiness.id;

  try {
    // Test 1: Create new FY
    const today = new Date();
    const todayLabel = getIndianFinancialYearForDate(today).label;

    const fy1 = await db.transaction(tx => getOrCreateCurrentFinancialYear(tx, businessId, today));

    const passed1 = fy1 && fy1.is_current === true && fy1.invoice_sequence_counter === 0 && fy1.label === todayLabel;
    console.log(`[${passed1 ? 'PASS' : 'FAIL'}] Initial FY Creation:`);
    console.log(`  Expected: is_current=true, sequence=0, label=${todayLabel}`);
    console.log(`  Actual: is_current=${fy1?.is_current}, sequence=${fy1?.invoice_sequence_counter}, label=${fy1?.label}\n`);

    if (!passed1) throw new Error('Test 1 failed');

    // Test 2: Fetch existing FY
    const fy2 = await db.transaction(tx => getOrCreateCurrentFinancialYear(tx, businessId, today));

    const passed2 = fy2 && fy2.id === fy1.id && fy2.is_current === true;
    console.log(`[${passed2 ? 'PASS' : 'FAIL'}] Idempotent Fetch (Same Day):`);
    console.log(`  Expected: SAME row ID (${fy1.id})`);
    console.log(`  Actual:   Row ID (${fy2?.id})\n`);

    if (!passed2) throw new Error('Test 2 failed');

    // Test 3: Rollover to next FY
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 366);
    const futureLabel = getIndianFinancialYearForDate(futureDate).label;

    const fy3 = await db.transaction(tx => getOrCreateCurrentFinancialYear(tx, businessId, futureDate));

    const oldFyQuery = await db.select().from(financialYears).where(eq(financialYears.id, fy1.id));
    const oldFyUpdated = oldFyQuery[0];

    const passed3 = fy3 && fy3.id !== fy1.id && fy3.is_current === true && fy3.label === futureLabel && oldFyUpdated.is_current === false;
    console.log(`[${passed3 ? 'PASS' : 'FAIL'}] Rollover to Future FY (+366 days):`);
    console.log(`  Expected: New row created, label=${futureLabel}, old row is_current=false`);
    console.log(`  Actual:   New row created (${fy3?.id !== fy1.id}), label=${fy3?.label}, old row is_current=${oldFyUpdated?.is_current}\n`);

    if (!passed3) throw new Error('Test 3 failed');

  } catch (error) {
    console.error('Error during examples:', error);
  } finally {
    // Clean up
    console.log('Cleaning up test data...');
    await db.delete(financialYears).where(eq(financialYears.business_id, businessId));
    await db.delete(businesses).where(eq(businesses.id, businessId));
    console.log('Done.\n');
    process.exit(0);
  }
}

run();
