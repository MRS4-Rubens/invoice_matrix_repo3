export function getIndianFinancialYearForDate(date: Date): { label: string; startDate: Date; endDate: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed, so 3 = April
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const startDate = new Date(Date.UTC(startYear, 3, 1)); // April 1
  const endDate = new Date(Date.UTC(endYear, 2, 31)); // March 31
  const label = `${startYear}-${String(endYear).slice(-2)}`; // e.g. "2026-27"
  return { label, startDate, endDate };
}

// This is the single source of truth for Indian financial-year boundaries. Phase 9 (invoice numbering rollover) will import and reuse this exact function rather than redefining it — do not duplicate this logic elsewhere.
