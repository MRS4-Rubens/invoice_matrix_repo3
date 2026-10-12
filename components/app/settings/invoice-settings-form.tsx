'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { invoiceSettingsSchema, InvoiceSettingsInput } from '@/lib/validations/invoice-settings';
import { saveInvoiceSettings } from '@/lib/actions/invoices/save-invoice-settings';
import { businesses, financialYears } from '@/lib/db/schema';
import { validateInvoiceNumberFormat, resolveInvoiceNumber, getResetGranularity } from '@/lib/invoices/number-format';
import { cn } from '@/lib/utils';
import {
  Check,
  Hash,
  FileText,
  Clock,
  Columns,
  Printer,
  Percent,
  ScrollText,
  Info,
  ReceiptText,
  Palette,
  Calculator,
  AlertCircle,
  Sparkles,
  Lock,
  Crown,
  ArrowRight,
} from 'lucide-react';
import { InvoiceFormatGuideModal } from './invoice-format-guide-modal';
import { canUseTemplate, canCustomizeInvoiceNumberFormat } from '@/lib/subscriptions/entitlements';
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal';
import { TemplateSelector } from '@/components/app/invoices/template-selector';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';

interface InvoiceSettingsFormProps {
  business: typeof businesses.$inferSelect | null;
  currentFy: typeof financialYears.$inferSelect | null;
}

// -- Styling Constants (Strict Floor-Integer Tailwind Classes) -----------------
const baseInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 h-9 text-sm text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 shadow-xs transition-all';
const inputBlueClass = `${baseInputClass} focus:ring-blue-900/15 focus:border-blue-900`;
const inputTealClass = `${baseInputClass} focus:ring-teal-900/15 focus:border-teal-900`;
const inputAmberClass = `${baseInputClass} focus:ring-amber-800/15 focus:border-amber-800`;

const baseTextareaClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 shadow-xs transition-all';
const textareaRoseClass = `${baseTextareaClass} focus:ring-rose-900/15 focus:border-rose-900`;

const labelClass = 'mb-1 flex items-center gap-2 text-sm font-semibold text-slate-700';
const sectionClass = 'border-b border-border pb-4 mb-4 last:border-0 last:mb-0 last:pb-0';
const errorClass = 'mt-1 text-xs font-semibold text-destructive';

const DEFAULT_TERMS =
  '1. Goods once sold will not be taken back.\n2. Payment to be made within 30 days from the date of invoice.\n3. Interest @ 24% per annum will be charged on overdue invoices until payment is received.';

// -- Reusable Toggle Switch (Strict Floor Integers) ----------------------------
function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-800/20 focus:ring-offset-2',
        checked ? 'bg-emerald-800' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export function InvoiceSettingsForm({ business, currentFy }: InvoiceSettingsFormProps) {
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isFormatGuideOpen, setIsFormatGuideOpen] = useState(false);
  const [showTemplateUpgradeModal, setShowTemplateUpgradeModal] = useState(false);
  const [showFormatUpgradeModal, setShowFormatUpgradeModal] = useState(false);

  const canCustomize = canCustomizeInvoiceNumberFormat(business).allowed;
  const initialFormat = business?.invoice_number_format
    ? business.invoice_number_format
    : canCustomize
    ? 'INV/{FY}/{SEQ:4}'
    : 'BMA/{FY}/{SEQ:4}';

  // Client-side UI toggles stored in localStorage
  const [discEnabled, setDiscEnabled] = useState(true);
  const [showHsn, setShowHsn] = useState(true);
  const [showNextNo, setShowNextNo] = useState(true);
  const [showSignatory, setShowSignatory] = useState(true);
  const [enableFixedRows, setEnableFixedRows] = useState(true);
  const [fixedRowsCount, setFixedRowsCount] = useState(13);
  const [defaultGst, setDefaultGst] = useState('18');

  // Load localStorage preferences on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bm_invoice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.discEnabled !== undefined) setDiscEnabled(parsed.discEnabled);
        if (parsed.showHsn !== undefined) setShowHsn(parsed.showHsn);
        if (parsed.showNextNo !== undefined) setShowNextNo(parsed.showNextNo);
        if (parsed.showSignatory !== undefined) setShowSignatory(parsed.showSignatory);
        if (parsed.enableFixedRows !== undefined) setEnableFixedRows(parsed.enableFixedRows);
        if (parsed.fixedRowsCount !== undefined) setFixedRowsCount(Number(parsed.fixedRowsCount) || 13);
        if (parsed.defaultGst !== undefined) setDefaultGst(parsed.defaultGst);
      }
    } catch (e) {
      console.error('Failed to load local invoice preferences:', e);
    }
  }, []);

  const rawTemplate = business?.default_invoice_template || 'template_1';
  const initialTemplate = canUseTemplate(business, rawTemplate).allowed
    ? (rawTemplate as 'template_1' | 'template_2' | 'template_3' | 'template_4')
    : 'template_1';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceSettingsInput>({
    resolver: zodResolver(invoiceSettingsSchema as never),
    defaultValues: {
      invoice_number_format: initialFormat,
      credit_note_number_prefix: business?.credit_note_number_prefix || 'CN',
      payment_due_days: business?.payment_due_days ?? 30,
      default_invoice_template: initialTemplate,
      default_gst_rate_type: business?.default_gst_rate_type || 'exclusive',
      invoice_terms: business?.invoice_terms || DEFAULT_TERMS,
    },
  });

  const watchedGstRateType = watch('default_gst_rate_type') || 'exclusive';
  const watchedTemplate = watch('default_invoice_template') || 'template_1';

  // Real-time GST Rule 46(b) live preview
  const watchedFormat = watch('invoice_number_format');
  let formatPreview: { generated: string; length: number } | null = null;
  let formatError: string | null = null;

  if (watchedFormat) {
    const validState = validateInvoiceNumberFormat(watchedFormat);
    if (!validState.valid) {
      formatError = validState.error;
    } else {
      try {
        const generated = resolveInvoiceNumber(watchedFormat, {
          invoiceDate: new Date(),
          fyLabel: currentFy?.label || '2026-27',
          sequenceValue: 1,
        });
        formatPreview = {
          generated,
          length: generated.length,
        };
      } catch (e: unknown) {
        formatError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  const handleSelectFormatPreset = (selectedFormat: string) => {
    if (!canCustomize && selectedFormat !== 'BMA/{FY}/{SEQ:4}') {
      setShowFormatUpgradeModal(true);
      return;
    }
    setValue('invoice_number_format', selectedFormat.toUpperCase(), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onSubmit = async (data: InvoiceSettingsInput) => {
    setSuccess(false);
    setGlobalError(null);

    // 1. Persist database-backed fields via Server Action
    const result = await saveInvoiceSettings(data);
    if (!result.success) {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages[0]) {
            setError(field as keyof InvoiceSettingsInput, { message: messages[0] });
          }
        });
      } else {
        setGlobalError(result.error.message);
      }
      return;
    }

    // 2. Persist UI display preferences to localStorage & trigger sync event
    try {
      const localPrefs = {
        discEnabled,
        showHsn,
        showNextNo,
        showSignatory,
        enableFixedRows,
        fixedRowsCount,
        defaultGst,
        // Also keep mirrored keys so existing templates stay fully backward-compatible
        invoicePrefix: data.credit_note_number_prefix,
        dueDays: String(data.payment_due_days),
        defaultTerms: data.invoice_terms,
      };
      localStorage.setItem('bm_invoice_settings', JSON.stringify(localPrefs));
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'bm_invoice_settings',
          newValue: JSON.stringify(localPrefs),
        })
      );
    } catch (e) {
      console.error('Failed to sync local preferences:', e);
    }

    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-5 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <ReceiptText className="size-5 text-slate-800 shrink-0" />
        <h2 className="text-xl font-bold font-heading text-slate-900 uppercase">Invoice Settings</h2>
      </div>
      <p className="mb-4 text-sm sm:text-base text-muted-foreground font-medium">
        Configure statutory invoice numbering, credit note prefixes, default templates, GST calculation rules, and terms.
      </p>

      {globalError && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* -- SECTION 1: Invoice & Credit Note Numbering (Dark Navy / Blue - blue-900) -- */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-900 text-[11px] font-black text-white shadow-xs">
                1
              </div>
              <Hash className="size-4 text-blue-900 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">
                Invoice &amp; Credit Note Numbering
              </h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">GST Rule 46(b) compliant sequence</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass} htmlFor="invoice_number_format">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Hash className="size-3.5 text-blue-900 shrink-0" />
                    <span>Invoice Number Format <span className="text-destructive">*</span></span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setIsFormatGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                  title="Open Invoice Format Guide & 100% Compliant Presets"
                >
                  <Sparkles className="size-3 text-blue-900 shrink-0" />
                  <span>Format Guide &amp; Presets</span>
                </button>
              </div>
              <div className="relative">
                <input
                  id="invoice_number_format"
                  type="text"
                  readOnly={!canCustomize}
                  className={cn(
                    inputBlueClass,
                    'font-mono uppercase',
                    !canCustomize && 'bg-slate-100/90 text-slate-700 border-slate-300 cursor-not-allowed select-none pr-36',
                    (errors.invoice_number_format || formatError) && 'border-destructive focus:ring-destructive/20'
                  )}
                  {...register('invoice_number_format', {
                    onChange: (e) => {
                      e.target.value = e.target.value.toUpperCase();
                    },
                  })}
                />
                {!canCustomize && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                    <Tooltip
                      content={
                        <div className="w-[360px] p-0.5 space-y-1.5 text-left">
                          <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-800/80">
                            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                              <Lock className="size-3 text-amber-400 shrink-0" />
                              <span>Free Tier Restriction</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowFormatUpgradeModal(true)}
                              className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer shrink-0 transition-colors"
                            >
                              <span>Upgrade to Pro</span>
                              <ArrowRight className="size-2.5" />
                            </button>
                          </div>
                          <p className="text-[11px] font-normal leading-relaxed text-slate-200">
                            Locked to standard <strong>BMA</strong> series (<code className="font-mono text-amber-300 bg-slate-800 px-1 py-0.2 rounded text-[10.5px]">BMA/{'{FY}'}/{'{SEQ:4}'}</code>). Upgrade to Essentials Pro to unlock custom brand initials (e.g. <code className="font-mono text-amber-300 bg-slate-800 px-1 py-0.2 rounded text-[10.5px]">MBS/{'{FY}'}/{'{SEQ:4}'}</code>), daily, and monthly series.
                          </p>
                        </div>
                      }
                      side="bottom"
                      sideOffset={6}
                      className="bg-slate-900 border border-slate-700 p-2 shadow-xl text-slate-100"
                    >
                      <button
                        type="button"
                        onClick={() => setShowFormatUpgradeModal(true)}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 px-2 py-0.5 text-[10px] font-black tracking-wide text-amber-800 dark:text-amber-300 cursor-pointer transition-colors shadow-2xs group"
                        title="Click to upgrade"
                      >
                        <Lock className="size-2.5 text-amber-600 dark:text-amber-400" />
                        <span>FREE DEFAULT</span>
                        <Info className="size-2.5 text-amber-600 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-200 shrink-0" />
                      </button>
                    </Tooltip>
                  </div>
                )}
              </div>
              {errors.invoice_number_format ? (
                <p className={errorClass}>{errors.invoice_number_format.message}</p>
              ) : formatError ? (
                <p className={errorClass}>{formatError}</p>
              ) : formatPreview ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800">
                    <span className="text-slate-500 font-sans font-medium">Preview:</span>
                    <span className="font-bold text-slate-900">{formatPreview.generated}</span>
                    <span className="text-slate-500 font-sans">({formatPreview.length}/16 characters)</span>
                  </div>
                  {watchedFormat && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-200">
                      Reset: {getResetGranularity(watchedFormat)}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div>
              <label className={labelClass} htmlFor="credit_note_number_prefix">
                <FileText className="size-3.5 text-blue-900 shrink-0" />
                <span>Credit Note Prefix <span className="text-destructive">*</span></span>
              </label>
              <input
                id="credit_note_number_prefix"
                type="text"
                className={cn(
                  inputBlueClass,
                  'font-mono uppercase',
                  errors.credit_note_number_prefix && 'border-destructive focus:ring-destructive/20'
                )}
                {...register('credit_note_number_prefix')}
              />
              {errors.credit_note_number_prefix && (
                <p className={errorClass}>{errors.credit_note_number_prefix.message}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Example: <span className="font-mono font-bold text-slate-800">CN</span> generates notes like CN/26-27/001
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="payment_due_days">
                <Clock className="size-3.5 text-blue-900 shrink-0" />
                <span>Default Payment Due (Days) <span className="text-destructive">*</span></span>
              </label>
              <input
                id="payment_due_days"
                type="number"
                min="0"
                max="365"
                className={cn(inputBlueClass, errors.payment_due_days && 'border-destructive focus:ring-destructive/20')}
                {...register('payment_due_days')}
              />
              {errors.payment_due_days && (
                <p className={errorClass}>{errors.payment_due_days.message}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Sets default invoice due date (e.g. 30 days from issue date).
              </p>
            </div>
          </div>
        </div>

        {/* -- SECTION 2: Template & Calculation Preferences (Teal - teal-900) -- */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-teal-900 text-[11px] font-black text-white shadow-xs">
                2
              </div>
              <Palette className="size-4 text-teal-900 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">
                Template &amp; Calculation Preferences
              </h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Print layout &amp; tax computation</span>
          </div>

          {/* Row 1: Side-by-Side Dropdowns for Template & Default GST Slab */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="default_invoice_template">
                <Palette className="size-3.5 text-teal-900 shrink-0" />
                <span>Default Print Template</span>
              </label>
              <TemplateSelector
                id="default_invoice_template"
                value={watchedTemplate}
                business={business}
                buttonClassName={inputTealClass}
                onChange={(chosen) => {
                  setValue('default_invoice_template', chosen as any, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                onUpgradeClick={() => {
                  setValue('default_invoice_template', 'template_1');
                  setShowTemplateUpgradeModal(true);
                }}
              />
              <input type="hidden" {...register('default_invoice_template')} />
              <p className="mt-1 text-xs text-slate-500">
                Determines default PDF design when generating customer invoices.
              </p>
            </div>

            <div>
              <label className={labelClass} htmlFor="defaultGst">
                <Percent className="size-3.5 text-teal-900 shrink-0" />
                <span>Default GST Slab Rate</span>
              </label>
              <select
                id="defaultGst"
                className={inputTealClass}
                value={defaultGst}
                onChange={(e) => setDefaultGst(e.target.value)}
              >
                {['0', '5', '12', '18', '28'].map((r) => (
                  <option key={r} value={r}>
                    {r}% Standard GST
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Pre-selected tax percentage when adding new items.
              </p>
            </div>
          </div>

          {/* Row 2: Full-Width Interactive Card Selectors for GST Calculation Scheme */}
          <div className="mt-4 pt-3 border-t border-border/40">
            <label className={labelClass}>
              <Calculator className="size-3.5 text-teal-900 shrink-0" />
              <span>Tax Calculation Scheme (Default Mode)</span>
            </label>
            <input type="hidden" {...register('default_gst_rate_type')} />
            <div className="grid gap-3 sm:grid-cols-2 mt-1.5">
              {/* GST Exclusive Option Card selector */}
              <button
                type="button"
                onClick={() => setValue('default_gst_rate_type', 'exclusive', { shouldValidate: true })}
                className={cn(
                  'flex flex-col text-left p-3 sm:px-4 sm:py-3 rounded-xl border-2 transition-all cursor-pointer shadow-xs',
                  watchedGstRateType === 'exclusive'
                    ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    GST Exclusive (Standard)
                  </span>
                  {watchedGstRateType === 'exclusive' && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-800 text-white">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-600 mt-1 font-medium leading-relaxed">
                  Tax is added on top of rates. Best for wholesale/B2B invoicing.
                </span>
              </button>

              {/* GST Inclusive Option Card selector */}
              <button
                type="button"
                onClick={() => setValue('default_gst_rate_type', 'inclusive', { shouldValidate: true })}
                className={cn(
                  'flex flex-col text-left p-3 sm:px-4 sm:py-3 rounded-xl border-2 transition-all cursor-pointer shadow-xs',
                  watchedGstRateType === 'inclusive'
                    ? 'border-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-800'
                    : 'border-slate-300 hover:border-slate-400 bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm sm:text-base text-slate-900">
                    GST Inclusive
                  </span>
                  {watchedGstRateType === 'inclusive' && (
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-800 text-white">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-xs sm:text-sm text-slate-600 mt-1 font-medium leading-relaxed">
                  Tax is already built into rates. Best for retail/B2C invoicing.
                </span>
              </button>
            </div>
            {errors.default_gst_rate_type && (
              <p className={errorClass}>{errors.default_gst_rate_type.message}</p>
            )}
          </div>
        </div>

        {/* -- SECTION 3: Line Item Columns (Dark Green - emerald-800) -- */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-[11px] font-black text-white shadow-xs">
                3
              </div>
              <Columns className="size-4 text-emerald-800 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">
                Line Item Columns
              </h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Invoice creation table fields</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Configure which input columns appear in the line items table when composing a new invoice.
          </p>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden shadow-xs">
            {/* HSN / SAC Code */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background">
              <div className="flex items-start gap-3">
                <Hash className="size-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">HSN / SAC Code Column</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Harmonised System of Nomenclature / Service Accounting Code for each product item.
                  </p>
                </div>
              </div>
              <Toggle checked={showHsn} onChange={setShowHsn} id="toggle-hsn" />
            </div>

            {/* Discount % Column */}
            <div
              className={cn(
                'flex items-center justify-between gap-4 px-4 py-3 transition-colors',
                discEnabled ? 'bg-emerald-50/50' : 'bg-background'
              )}
            >
              <div className="flex items-start gap-3">
                <Percent className="size-4 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-semibold text-slate-900">Discount % Column</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold transition-colors',
                        discEnabled ? 'bg-emerald-100 text-emerald-900' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {discEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                    Show a Disc% column in the items table. Disable this if your business bills at fixed trade rates with no line-item discounts.
                  </p>
                </div>
              </div>
              <Toggle checked={discEnabled} onChange={setDiscEnabled} id="toggle-disc" />
            </div>
          </div>

          <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3.5 py-2 flex items-start gap-2">
            <Info className="size-4 text-emerald-800 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Calculation Behavior:</span> When Discount % is{' '}
              <span className="font-semibold text-emerald-900">enabled</span>, line-item percentage discounts are deducted from taxable value before GST is calculated. When{' '}
              <span className="font-semibold text-slate-900">disabled</span>, GST is computed directly on Quantity &times; Unit Price.
            </p>
          </div>
        </div>

        {/* -- SECTION 4: Print & PDF Options (Dark Amber - amber-800) -- */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[11px] font-black text-white shadow-xs">
                4
              </div>
              <Printer className="size-4 text-amber-800 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">
                Print &amp; PDF Options
              </h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Document layout &amp; table padding</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            Control visual elements rendered on printed physical bills or exported PDF invoices.
          </p>

          <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden shadow-xs">
            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background">
              <div className="flex items-start gap-3">
                <Hash className="size-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">Show Invoice Running Number</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Display the sequential voucher counter clearly on the printed invoice header.
                  </p>
                </div>
              </div>
              <Toggle checked={showNextNo} onChange={setShowNextNo} id="toggle-nextno" />
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background">
              <div className="flex items-start gap-3">
                <Check className="size-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">Authorised Signatory Section</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Render an official signature and rubber-stamp area at the bottom right of the invoice.
                  </p>
                </div>
              </div>
              <Toggle checked={showSignatory} onChange={setShowSignatory} id="toggle-sig" />
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-3 bg-background">
              <div className="flex items-start gap-3">
                <Columns className="size-4 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">Fixed Table Rows (Table Padding)</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Keep a consistent row height and table size on paper prints even when invoices have few items.
                  </p>
                </div>
              </div>
              <Toggle checked={enableFixedRows} onChange={setEnableFixedRows} id="toggle-fixed-rows" />
            </div>
          </div>

          {enableFixedRows && (
            <div className="mt-3 sm:w-1/2">
              <label className={labelClass} htmlFor="fixedRowsCount">
                <Columns className="size-3.5 text-amber-800 shrink-0" />
                <span>Target Table Row Count</span>
              </label>
              <input
                id="fixedRowsCount"
                type="number"
                min={1}
                max={50}
                className={cn(inputAmberClass, 'font-mono')}
                value={fixedRowsCount}
                onChange={(e) => setFixedRowsCount(Math.max(1, Number(e.target.value) || 13))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Invoices with fewer line items will be padded with empty rows up to this count (Standard: 13).
              </p>
            </div>
          )}
        </div>

        {/* -- SECTION 5: Default Terms & Conditions (Maroon - rose-900) -- */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-900 text-[11px] font-black text-white shadow-xs">
                5
              </div>
              <ScrollText className="size-4 text-rose-900 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">
                Default Terms &amp; Conditions
              </h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Pre-filled statutory policies</span>
          </div>

          <label className={labelClass} htmlFor="invoice_terms">
            <ScrollText className="size-3.5 text-rose-900 shrink-0" />
            <span>Statutory Terms &amp; Conditions <span className="text-destructive">*</span></span>
          </label>
          <textarea
            id="invoice_terms"
            rows={4}
            className={cn(
              textareaRoseClass,
              'resize-y',
              errors.invoice_terms && 'border-destructive focus:ring-destructive/20'
            )}
            placeholder="Enter standard trade terms, return policies, and overdue interest clauses..."
            {...register('invoice_terms')}
          />
          {errors.invoice_terms && <p className={errorClass}>{errors.invoice_terms.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            These terms are automatically attached to generated invoices and printed in the footer. You can edit them individually on any invoice draft.
          </p>
        </div>

        {/* -- Form Actions & Feedback ----------------------------------- */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {success && (
              <span className="flex items-center text-sm font-bold text-emerald-800">
                <Check className="mr-1.5 size-4" /> Invoice settings saved successfully
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-800 px-4 py-2 h-9 text-sm font-bold text-white transition-all hover:bg-emerald-900 disabled:opacity-50 shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-2"
          >
            <Check className="size-4" />
            {isSubmitting ? 'Saving...' : 'Save Invoice Settings'}
          </button>
        </div>
      </form>

      <InvoiceFormatGuideModal
        isOpen={isFormatGuideOpen}
        onClose={() => setIsFormatGuideOpen(false)}
        onSelectPreset={handleSelectFormatPreset}
        currentFyLabel={currentFy?.label || '2026-27'}
        canCustomize={canCustomize}
        onUpgradeClick={() => setShowFormatUpgradeModal(true)}
      />

      <UpgradePromptModal
        isOpen={showTemplateUpgradeModal}
        onClose={() => setShowTemplateUpgradeModal(false)}
        title="Unlock Premium Print Templates"
        featureName="All 4 Traditional &amp; Book Depot Templates"
        description="Upgrade to Essentials Pro (₹399/mo) to unlock authentic Book Depot, Carbon Pad, and Modern GST invoice print templates."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />

      <UpgradePromptModal
        isOpen={showFormatUpgradeModal}
        onClose={() => setShowFormatUpgradeModal(false)}
        title="Unlock Custom Invoice Number Formats"
        featureName="Custom Invoice Series &amp; Brand Prefixes"
        description="Upgrade to Essentials Pro (₹399/mo) to personalize your invoice numbering with your own brand initials (e.g. MBS/{FY}/{SEQ:4}), compact dash, monthly dispatch, and daily walk-in series."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
      </div>
    </TooltipProvider>
  );
}
