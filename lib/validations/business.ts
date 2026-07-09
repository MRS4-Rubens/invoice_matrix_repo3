import { z } from 'zod';
import { GSTIN_REGEX, PAN_REGEX, IFSC_REGEX, PINCODE_REGEX } from './patterns';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { validateInvoiceNumberFormat } from '@/lib/invoices/number-format';

export const businessProfileSchema = z.object({
  legal_name: z.string().min(1, 'Legal business name is required').max(200),
  trade_name: z.string().max(200).optional().or(z.literal('')),
  gstin: z.string().transform((v) => v.toUpperCase()).pipe(z.string().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN')),
  pan: z.string().transform((v) => v.toUpperCase()).pipe(z.string().regex(PAN_REGEX, 'Enter a valid 10-character PAN')).optional().or(z.literal('')),
  registration_type: z.enum(['regular', 'composition']),
  address_line1: z.string().min(1, 'Address is required').max(300),
  address_line2: z.string().max(300).optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100),
  state_code: z.string().min(2).max(2),
  pincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'),
  phone: z.string().max(15).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  bank_account_name: z.string().max(200).optional().or(z.literal('')),
  bank_account_number: z.string().max(30).optional().or(z.literal('')),
  bank_ifsc: z.string().transform((v) => v.toUpperCase()).pipe(z.string().regex(IFSC_REGEX, 'Enter a valid IFSC code')).optional().or(z.literal('')),
  bank_name: z.string().max(200).optional().or(z.literal('')),
  invoice_number_format: z.string().min(1).superRefine((val, ctx) => {
    const validState = validateInvoiceNumberFormat(val);
    if (!validState.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validState.error,
      });
    }
  }),
  credit_note_number_prefix: z.string().min(1).max(10).regex(/^[A-Za-z0-9/-]+$/, 'Only letters, numbers, / and - are allowed'),
}).refine(
  (data) => INDIAN_GST_STATES.some((s) => s.code === data.state_code),
  { message: 'Select a valid state', path: ['state_code'] }
).refine(
  (data) => data.gstin.slice(0, 2) === data.state_code,
  { message: 'The GSTIN\'s state code does not match the selected registered state', path: ['gstin'] }
);

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
