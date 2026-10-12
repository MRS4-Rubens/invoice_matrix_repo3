import { sql, eq } from 'drizzle-orm';
import { financialYears } from '@/lib/db/schema';
import { ActionError } from '@/lib/actions/_shared/errors';
import type { DbTransaction } from '@/lib/db/client';

export interface NextCreditNoteNumberResult {
  creditNoteNumber: string;
  sequence: number;
}

/**
 * Generates the next sequential, GST Rule 53-compliant Credit Note number.
 * Format: CN/26-27/001 (prefix/short-FY/seq)
 * Enforces strictly <= 16 characters and financial-year resets.
 */
export async function getNextCreditNoteNumber(
  tx: DbTransaction,
  params: {
    businessId: string;
    financialYearId: string;
    fyLabel: string; // e.g. "2026-27"
    prefix?: string; // e.g. "CN"
  }
): Promise<NextCreditNoteNumberResult> {
  const { financialYearId, fyLabel, prefix = 'CN' } = params;

  // 1. Atomically increment the credit_note_sequence_counter on financial_years
  const updatedFy = await tx
    .update(financialYears)
    .set({ credit_note_sequence_counter: sql`${financialYears.credit_note_sequence_counter} + 1` })
    .where(eq(financialYears.id, financialYearId))
    .returning({ counter: financialYears.credit_note_sequence_counter });

  if (!updatedFy || updatedFy.length === 0) {
    throw new ActionError('Failed to increment credit note sequence counter.', { code: 'SEQUENCE_ERROR' });
  }

  const sequence = updatedFy[0].counter;

  // 2. Format: CN/26-27/001
  const cleanPrefix = prefix.trim().toUpperCase() || 'CN';
  const shortFy = fyLabel.length >= 5 ? fyLabel.slice(-5) : fyLabel;
  const seqStr = String(sequence).padStart(3, '0');
  const creditNoteNumber = `${cleanPrefix}/${shortFy}/${seqStr}`;

  // 3. GST Rule 53 compliance checks
  if (creditNoteNumber.length > 16) {
    throw new ActionError(
      `Generated credit note number "${creditNoteNumber}" exceeds the 16-character limit under CGST Rule 53. Please adjust prefix or counter settings.`,
      { code: 'NUMBER_TOO_LONG' }
    );
  }

  if (!/^[A-Za-z0-9\-/]+$/.test(creditNoteNumber)) {
    throw new ActionError(
      `Credit note number "${creditNoteNumber}" contains invalid characters. Only letters, numbers, hyphens, and slashes are allowed.`,
      { code: 'INVALID_CHARACTERS' }
    );
  }

  return { creditNoteNumber, sequence };
}
