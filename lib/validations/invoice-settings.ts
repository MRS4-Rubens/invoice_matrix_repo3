import { z } from 'zod';
import { validateInvoiceNumberFormat } from '@/lib/invoices/number-format';

export const invoiceSettingsSchema = z.object({
  invoice_number_format: z
    .string()
    .min(1, 'Invoice number format is required')
    .transform((val) => val.toUpperCase())
    .superRefine((val, ctx) => {
      const validState = validateInvoiceNumberFormat(val);
      if (!validState.valid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validState.error,
        });
      }
    }),
  credit_note_number_prefix: z
    .string()
    .min(1, 'Credit note prefix is required')
    .max(10, 'Prefix must be 10 characters or fewer')
    .regex(/^[A-Za-z0-9/-]+$/, 'Only letters, numbers, / and - are allowed'),
  payment_due_days: z.coerce.number().int().min(0, 'Must be 0 or greater').max(365, 'Must be 365 or fewer'),
  default_invoice_template: z.enum(['template_1', 'template_2', 'template_3', 'template_4']),
  default_gst_rate_type: z.enum(['inclusive', 'exclusive']),
  invoice_terms: z.string().max(2000, 'Terms must be 2000 characters or fewer'),
});

export type InvoiceSettingsInput = z.infer<typeof invoiceSettingsSchema>;
