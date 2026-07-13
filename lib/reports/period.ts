import { getIstDateParts, formatIstDateAsIso } from '@/lib/invoices/ist-date';
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year';

// Centralizing period-range logic here means Phase 15's ITR/GST Excel export reuses these exact same functions rather than recalculating date ranges independently.

export function getMonthRange(year: number, month: number): { startDate: string; endDate: string; label: string } {
  // Month is 1-12
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = `${monthNames[month - 1]} ${year}`;
  
  return { startDate, endDate, label };
}

export function getCurrentMonthRange(asOfDate: Date = new Date()): { startDate: string; endDate: string; label: string } {
  const { year, month } = getIstDateParts(asOfDate);
  return getMonthRange(year, month);
}

export function getCurrentFinancialYearRange(asOfDate: Date = new Date()): { startDate: string; endDate: string; label: string } {
  const fy = getIndianFinancialYearForDate(asOfDate);
  // fy.label is like "2025-26"
  // startYear is the first part of the label
  const startYear = parseInt(fy.label.split('-')[0], 10);
  const endYear = startYear + 1;
  
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${endYear}-03-31`,
    label: `FY ${fy.label}`
  };
}
