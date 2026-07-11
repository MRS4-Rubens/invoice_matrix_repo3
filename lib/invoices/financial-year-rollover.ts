import { eq, and, ne } from 'drizzle-orm';
import { financialYears } from '@/lib/db/schema';
import { getIndianFinancialYearForDate } from './financial-year';
import { formatIstDateAsIso } from './ist-date';
import type { DbTransaction } from '@/lib/db/client';

/**
 * Resolves the financial_years row that `referenceDate` falls into for this business, 
 * creating it if it doesn't exist yet (this is how the app "rolls over" to a new financial 
 * year — lazily, the first time it's needed, rather than via a scheduled job). Also ensures 
 * exactly one row for this business has is_current = true, and that it's this one.
 *
 * Must always be called with a transaction (tx), since it can both read and write, and the 
 * caller's larger operation (saving a draft, finalizing an invoice) must not partially commit 
 * if this fails.
 */
export async function getOrCreateCurrentFinancialYear(
  tx: DbTransaction,
  businessId: string,
  referenceDate: Date
) {
  const { label, startDate, endDate } = getIndianFinancialYearForDate(referenceDate);

  // Try to create it first, using onConflictDoNothing to handle the (rare) race where two
  // finalizations straddle the FY boundary at almost the same instant — this avoids a
  // check-then-insert race condition on the (business_id, label) unique constraint.
  const inserted = await tx.insert(financialYears).values({
    business_id: businessId,
    label,
    start_date: formatIstDateAsIso(startDate),
    end_date: formatIstDateAsIso(endDate),
    invoice_sequence_counter: 0,
    credit_note_sequence_counter: 0,
    is_current: true,
  }).onConflictDoNothing({
    target: [financialYears.business_id, financialYears.label]
  }).returning();

  let fy = inserted[0];

  if (!fy) {
    // Someone else won the race, or it already existed from a prior call — fetch it.
    const existing = await tx.select().from(financialYears)
      .where(and(eq(financialYears.business_id, businessId), eq(financialYears.label, label)));
    if (existing.length === 0) {
      throw new Error(`Failed to get or create financial year "${label}" for business ${businessId}.`);
    }
    fy = existing[0];
  }

  if (!fy.is_current) {
    await tx.update(financialYears).set({ is_current: true }).where(eq(financialYears.id, fy.id));
    fy = { ...fy, is_current: true };
  }

  // Ensure no OTHER row for this business is still marked current.
  await tx.update(financialYears)
    .set({ is_current: false })
    .where(and(
      eq(financialYears.business_id, businessId),
      ne(financialYears.id, fy.id),
      eq(financialYears.is_current, true)
    ));

  return fy;
}
