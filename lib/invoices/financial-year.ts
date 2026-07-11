import { getIstDateParts } from './ist-date';

export function getIndianFinancialYearForDate(date: Date): { label: string; startDate: Date; endDate: Date } {
  const { year, month } = getIstDateParts(date); // month is 1-12 here, NOT 0-indexed
  const startYear = month >= 4 ? year : year - 1; // April = month 4 in this 1-indexed scheme
  const endYear = startYear + 1;
  const startDate = new Date(Date.UTC(startYear, 3, 1));
  const endDate = new Date(Date.UTC(endYear, 2, 31));
  const label = `${startYear}-${String(endYear).slice(-2)}`;
  return { label, startDate, endDate };
}

// This is the single source of truth for Indian financial-year boundaries. Phase 9 (invoice numbering rollover) will import and reuse this exact function rather than redefining it — do not duplicate this logic elsewhere.
