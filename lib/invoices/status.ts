import { getIstDateParts, formatIstDateAsIso } from './ist-date';

export type DisplayInvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue';

// This is a PURE, live-computed function — 'overdue' is intentionally never written to the database's payment_status column by this app. Computing it fresh on every read means the status is always accurate the instant it's viewed, with no dependency on any scheduled job having run recently. payment_status in the database only ever reflects real payment events (unpaid/partially_paid/paid).
export function getDisplayInvoiceStatus(
  invoice: { 
    lifecycle_status: 'draft' | 'finalized'; 
    payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue'; 
    due_date: string | Date | null 
  }, 
  asOfDate: Date = new Date()
): DisplayInvoiceStatus {
  if (invoice.lifecycle_status === 'draft') return 'draft';
  if (invoice.payment_status === 'paid') return 'paid';
  
  if (invoice.due_date) {
    const asOfParts = getIstDateParts(asOfDate);
    const asOfStr = `${asOfParts.year}-${String(asOfParts.month).padStart(2, '0')}-${String(asOfParts.day).padStart(2, '0')}`;
    
    // due_date from DB is usually a string 'YYYY-MM-DD'
    let dueStr: string;
    if (invoice.due_date instanceof Date) {
      dueStr = formatIstDateAsIso(invoice.due_date);
    } else {
      dueStr = invoice.due_date.toString();
      // If it has time component, just take the date part
      if (dueStr.includes('T')) {
        dueStr = dueStr.split('T')[0];
      }
    }
    
    // String comparison works perfectly for YYYY-MM-DD
    if (asOfStr > dueStr) {
      return 'overdue';
    }
  }
  
  if (invoice.payment_status === 'partially_paid') return 'partially_paid';
  
  return 'sent';
}

export function getDisplayStatusLabel(status: DisplayInvoiceStatus): { label: string; colorClass: string } {
  switch (status) {
    case 'draft':
      return { label: 'Draft', colorClass: 'bg-muted text-muted-foreground border border-border' };
    case 'sent':
      return { label: 'Sent', colorClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' };
    case 'partially_paid':
      return { label: 'Partially Paid', colorClass: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' };
    case 'paid':
      return { label: 'Paid', colorClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' };
    case 'overdue':
      return { label: 'Overdue', colorClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' };
    default:
      return { label: 'Unknown', colorClass: 'bg-muted text-muted-foreground border border-border' };
  }
}
