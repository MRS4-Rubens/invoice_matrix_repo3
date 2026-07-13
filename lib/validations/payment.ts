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
