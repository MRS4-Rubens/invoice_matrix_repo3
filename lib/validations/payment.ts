import { z } from 'zod';

export const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  payment_date: z.string().min(1, 'Payment date is required'),
  payment_method: z.enum(['cash', 'upi', 'bank_transfer', 'cheque', 'card', 'other']),
  reference_number: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const VOID_PAYMENT_REASONS = [
  { code: 'bounced_cheque', label: 'Bounced Cheque / Failed Bank Transfer' },
  { code: 'clerical_error', label: 'Clerical / Data Entry Mistake' },
  { code: 'wrong_invoice', label: 'Recorded on Wrong Invoice' },
  { code: 'customer_dispute', label: 'Customer Dispute / Reversal' },
  { code: 'chargeback_refund', label: 'Customer Refund / Chargeback' },
  { code: 'other', label: 'Other (Reason specified in notes)' },
] as const;

export type VoidPaymentReasonCode = typeof VOID_PAYMENT_REASONS[number]['code'];

export const voidPaymentSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
  reason: z.enum([
    'bounced_cheque',
    'clerical_error',
    'wrong_invoice',
    'customer_dispute',
    'chargeback_refund',
    'other',
  ]),
  notes: z.string().min(3, 'Please provide an explanation (min 3 characters)').max(300),
});

export type VoidPaymentInput = z.infer<typeof voidPaymentSchema>;
