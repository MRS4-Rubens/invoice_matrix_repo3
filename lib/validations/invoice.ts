import { z } from 'zod';
import { UNIT_OF_MEASUREMENT_OPTIONS } from '@/lib/gst/units';
import { GSTIN_REGEX } from '@/lib/validations/patterns';

export const invoiceLineItemSchema = z.object({
  product_id: z.string().uuid().optional().nullable().or(z.literal('')),
  description: z.string().min(1, 'Description is required').max(300, 'Description cannot exceed 300 characters'),
  hsn_sac_code: z.string().regex(/^\d{4}$|^\d{6}$|^\d{8}$/, 'HSN/SAC must be 4, 6, or 8 digits'),
  quantity: z.coerce.number().positive('Quantity must be greater than 0'),
  unit_of_measurement: z.enum(UNIT_OF_MEASUREMENT_OPTIONS),
  unit_price: z.coerce.number().min(0, 'Rate cannot be negative'),
  discount: z.coerce.number().int('Discount percentage must be an integer').min(0, 'Discount percentage cannot be negative').max(100, 'Discount percentage cannot exceed 100%').default(0),
  tax_rate_id: z.string().uuid('Select a valid GST Rate')
});

export const invoiceDraftSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional().nullable().or(z.literal('')),
  billing_name: z.string().min(1, 'Customer name is required').max(200),
  billing_gstin: z.string().transform((v) => v.toUpperCase()).pipe(z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format')).optional().nullable().or(z.literal('')),
  place_of_supply_state_code: z.string().length(2, 'Select a valid place of supply state'),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(1000).optional().or(z.literal('')),
  invoice_template: z.string().optional(),
  // Validation for active GST rate calculation type of this invoice (inclusive vs exclusive)
  gst_rate_type: z.enum(['inclusive', 'exclusive']).default('exclusive'),
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item')
});

export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
