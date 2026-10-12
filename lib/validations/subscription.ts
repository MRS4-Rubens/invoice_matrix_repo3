import { z } from 'zod';

export const subscriptionClaimSchema = z.object({
  plan_name: z.string().min(1, 'Please select a plan'),
  billing_cycle: z.enum(['monthly', 'yearly']),
  amount_paise: z.number().int().positive('Amount must be positive'),
  payment_method: z.enum(['upi_qr', 'upi_id', 'bank_transfer']),
  payment_reference: z.string()
    .min(6, 'Transaction reference/UTR must be at least 6 characters')
    .max(50, 'Transaction reference/UTR is too long')
    .regex(/^[A-Za-z0-9/-]+$/, 'Reference can only contain letters, numbers, / and -')
    .transform((val) => val.trim().toUpperCase()),
  screenshot_base64: z.string().optional().or(z.literal('')),
  screenshot_mime: z.string().optional().or(z.literal('')),
});

export type SubscriptionClaimInput = z.infer<typeof subscriptionClaimSchema>;
