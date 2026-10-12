import { z } from 'zod';
import { UNIT_OF_MEASUREMENT_OPTIONS } from '@/lib/gst/units';

export const CREDIT_NOTE_REASONS = [
  { code: '01-sales-return', label: '01 - Sales Return' },
  { code: '02-post-sale-discount', label: '02 - Post-Sale Discount / Price Adjustment' },
  { code: '03-defective-goods', label: '03 - Defective / Damaged Goods' },
  { code: '04-cancellation', label: '04 - Order Cancellation / Correction' },
  { code: '05-other', label: '05 - Other Adjustment' },
] as const;

export const CREDIT_NOTE_REASON_CODES = [
  '01-sales-return',
  '02-post-sale-discount',
  '03-defective-goods',
  '04-cancellation',
  '05-other'
] as const;

export type CreditNoteReasonCode = (typeof CREDIT_NOTE_REASON_CODES)[number];

export function getCreditNoteReasonLabel(code: string): string {
  const found = CREDIT_NOTE_REASONS.find(r => r.code === code);
  return found ? found.label : code;
}

export const creditNoteLineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable().or(z.literal('')),
  description: z.string().min(1, 'Description is required').max(300, 'Description cannot exceed 300 characters'),
  hsn_sac_code: z.string().regex(/^\d{4}$|^\d{6}$|^\d{8}$/, 'HSN/SAC must be 4, 6, or 8 digits'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit_of_measurement: z.enum(UNIT_OF_MEASUREMENT_OPTIONS),
  unit_price: z.coerce.number().min(0, 'Rate cannot be negative'), // in Rupees
  discount: z.coerce.number().min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100%').default(0),
  tax_rate_id: z.string().uuid('Select a valid GST Rate'),
  sort_order: z.number().int().optional().default(0)
});

export const creditNoteDraftSchema = z.object({
  id: z.string().uuid().optional(),
  original_invoice_id: z.string().uuid('Original invoice ID is required'),
  reason: z.enum(CREDIT_NOTE_REASON_CODES),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(1000).optional().nullable().or(z.literal('')),
  line_items: z.array(creditNoteLineItemSchema).min(1, 'Credit note must have at least one line item')
});

export const finalizeCreditNoteSchema = z.object({
  id: z.string().uuid('Credit note ID is required')
});

export const VOID_CREDIT_NOTE_REASONS = [
  { id: 'clerical_error', label: 'Clerical Error in Amount / Items' },
  { id: 'wrong_recipient', label: 'Wrong Customer / Recipient Selected' },
  { id: 'duplicate_issue', label: 'Duplicate Credit Note Issued' },
  { id: 'cancelled_by_mutual_agreement', label: 'Cancelled by Mutual Customer Agreement' },
  { id: 'other', label: 'Other Statutory Reason' },
] as const;

export const voidCreditNoteSchema = z.object({
  id: z.string().uuid('Credit note ID is required'),
  reason: z.string().min(1, 'Please select a reason for voiding this credit note'),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional().nullable(),
  confirm: z.boolean().refine(val => val === true, 'You must acknowledge the cancellation')
});

export type CreditNoteDraftInput = z.infer<typeof creditNoteDraftSchema>;
export type CreditNoteLineItemInput = z.infer<typeof creditNoteLineItemSchema>;
export type VoidCreditNoteInput = z.infer<typeof voidCreditNoteSchema>;
