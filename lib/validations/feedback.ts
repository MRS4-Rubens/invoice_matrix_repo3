import { z } from 'zod';

export const FEEDBACK_CATEGORIES = ['bug', 'feature_request', 'ui_ux', 'general'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_SEVERITIES = ['low', 'medium', 'critical'] as const;
export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export const MAX_ATTACHMENT_COUNT = 4;
export const MAX_FILE_SIZE_BYTES = 2.5 * 1024 * 1024; // 2.5 MB per file
export const MAX_TOTAL_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB total

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
] as const;

export const feedbackAttachmentSchema = z.object({
  filename: z.string().min(1, 'File name is required').max(150, 'File name is too long'),
  contentBase64: z.string().min(1, 'File content cannot be empty'),
  mimeType: z.string().refine(
    (mime) => ALLOWED_MIME_TYPES.includes(mime as (typeof ALLOWED_MIME_TYPES)[number]),
    { message: 'Only PNG, JPEG, WebP, and PDF files are allowed.' }
  ),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES, 'Each file must be 2.5 MB or smaller'),
});

export type FeedbackAttachment = z.infer<typeof feedbackAttachmentSchema>;

export const feedbackDiagnosticsSchema = z.object({
  currentUrl: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  screenResolution: z.string().optional(),
  submittedAt: z.string().optional(),
});

export type FeedbackDiagnostics = z.infer<typeof feedbackDiagnosticsSchema>;

export const sendFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES, {
    error: 'Please choose a feedback category (Bug, Feature, UI/UX, or General).',
  }),
  severity: z.enum(FEEDBACK_SEVERITIES).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z
    .string()
    .min(3, 'Please provide a title of at least 3 characters')
    .max(120, 'Title is too long (maximum 120 characters)')
    .transform((t) => t.trim()),
  description: z
    .string()
    .min(10, 'Please write at least 10 characters describing your feedback')
    .max(4000, 'Description cannot exceed 4000 characters')
    .transform((d) => d.trim()),
  diagnostics: feedbackDiagnosticsSchema.optional(),
  attachments: z
    .array(feedbackAttachmentSchema)
    .max(MAX_ATTACHMENT_COUNT, `You can attach at most ${MAX_ATTACHMENT_COUNT} files`)
    .default([])
    .refine(
      (files) => files.reduce((sum, f) => sum + f.sizeBytes, 0) <= MAX_TOTAL_SIZE_BYTES,
      { message: 'Total combined attachment size must be 10 MB or smaller' }
    ),
});

export type SendFeedbackInput = z.infer<typeof sendFeedbackSchema>;
