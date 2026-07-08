/**
 * Money handling utilities
 * 
 * In this application, all monetary amounts are stored in the database as an integer number of paise
 * (e.g., ₹19.99 is stored as 1999) to avoid floating-point errors during calculations.
 * 
 * - `paise`: Always an integer representing the smallest currency unit.
 * - `rupees`: Always a plain JavaScript number (can have decimals).
 */

/**
 * Converts a rupee amount (e.g. from a form input) to an integer number of paise.
 * Uses Math.round to avoid floating-point drift (e.g. 19.99 * 100).
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Converts an integer number of paise to rupees for pre-filling form inputs or calculations.
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats an integer number of paise as a display string using Indian digit grouping
 * and the ₹ symbol (e.g. 150050 -> "₹1,500.50").
 */
export function formatPaiseAsInr(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
