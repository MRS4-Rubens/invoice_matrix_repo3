// These are official CBIC-prescribed Unit Quantity Codes (UQC), required exactly as spelled for GSTR-1 HSN summaries and e-invoicing (CGST Rule 46(i)). This is a closed list — do not invent new codes. If a product's real-world unit isn't covered, use OTH.

export const UNIT_OF_MEASUREMENT_OPTIONS = [
  'NOS',  // Numbers - individually counted items
  'PCS',  // Pieces
  'KGS',  // Kilograms (was incorrectly "KG")
  'LTR',  // Litres
  'MTR',  // Metres
  'SQM',  // Square Metres
  'SET',  // Sets
  'BOX',  // Box
  'PAC',  // Packs
  'PRS',  // Pairs
  'DOZ',  // Dozen (was incorrectly "DZN")
  'OTH',  // Others - required fallback for anything not on this list
] as const;

export type UnitOfMeasurement = typeof UNIT_OF_MEASUREMENT_OPTIONS[number];
