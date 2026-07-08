import { z } from 'zod';
import { UNIT_OF_MEASUREMENT_OPTIONS } from '../gst/units';

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().or(z.literal('')),
  hsn_sac_code: z.string()
    .trim()
    .regex(/^(\d{4}|\d{6}|\d{8})$/, 'Enter a valid 4, 6, or 8-digit HSN/SAC code.'),
  unit_of_measurement: z.enum(UNIT_OF_MEASUREMENT_OPTIONS, {
    message: 'Please select a valid unit of measurement.',
  }),
  default_sale_price: z.coerce.number().min(0, 'Price must be 0 or greater'),
  default_tax_rate_id: z.string().uuid().optional().or(z.literal('')),
  stock_quantity: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative').optional().or(z.literal('')),
});

export type ProductInput = z.infer<typeof productSchema>;
