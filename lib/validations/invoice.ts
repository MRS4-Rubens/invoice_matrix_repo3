import { z } from 'zod';
import { UNIT_OF_MEASUREMENT_OPTIONS } from '@/lib/gst/units';

export const invoiceLineItemSchema = z.object({
  product_id: z.string().uuid().optional(),
  description: z.string().min(1).max(300),
  hsn_sac_code: z.string().regex(/^\d{4}$|^\d{6}$|^\d{8}$/),
  quantity: z.coerce.number().positive(),
  unit_of_measurement: z.enum(UNIT_OF_MEASUREMENT_OPTIONS),
  unit_price: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
  tax_rate_id: z.string().uuid()
});

export const invoiceDraftSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  notes: z.string().max(1000).optional().or(z.literal('')),
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item')
});

export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
