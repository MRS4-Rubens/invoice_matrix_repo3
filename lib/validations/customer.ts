import { z } from 'zod';
import { GSTIN_REGEX, PINCODE_REGEX } from './patterns';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  gstin: z.string().transform((v) => v.toUpperCase()).pipe(z.string().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN')).optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().max(15).optional().or(z.literal('')),
  address_line1: z.string().max(300).optional().or(z.literal('')),
  address_line2: z.string().max(300).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state_code: z.string().min(2).max(2),
  pincode: z.string().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode').optional().or(z.literal('')),
}).refine(
  (data) => INDIAN_GST_STATES.some((s) => s.code === data.state_code),
  { message: 'Select a valid state', path: ['state_code'] }
).refine(
  (data) => {
    if (data.gstin && data.state_code) {
      return data.gstin.slice(0, 2) === data.state_code;
    }
    return true;
  },
  { message: 'The GSTIN\'s state code does not match the selected state', path: ['gstin'] }
);

export type CustomerInput = z.infer<typeof customerSchema>;
