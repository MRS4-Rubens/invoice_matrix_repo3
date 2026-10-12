'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { customerSchema, CustomerInput } from '@/lib/validations/customer'
import { GSTIN_REGEX } from '@/lib/validations/patterns'
import { createCustomer } from '@/lib/actions/customers/create-customer'
import { updateCustomer } from '@/lib/actions/customers/update-customer'
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states'
import { cn } from '@/lib/utils'
import {
  Building2,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Eye,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { customers } from '@/lib/db/schema'
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal'

interface CustomerFormProps {
  customer?: typeof customers.$inferSelect
  sellerStateCode?: string
}

export function CustomerForm({ customer, sellerStateCode }: CustomerFormProps) {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [showQuotaUpgradeModal, setShowQuotaUpgradeModal] = useState(false)

  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<CustomerInput>({
    resolver: zodResolver(
      // @hookform/resolvers (v5.4.0) / zod (v4.4.3) compatibility workaround
      customerSchema as never
    ),
    defaultValues: customer
      ? {
          name: customer.name,
          gstin: customer.gstin || '',
          email: customer.email || '',
          phone: customer.phone || '',
          address_line1: customer.address_line1 || '',
          address_line2: customer.address_line2 || '',
          city: customer.city || '',
          state_code: customer.state_code,
          pincode: customer.pincode || '',
        }
      : {
          name: '',
          gstin: '',
          email: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state_code: '',
          pincode: '',
        },
  })

  // Watch form values for live directory preview and intelligence checklist
  const watchedName = useWatch({ control, name: 'name' }) || ''
  const watchedGstin = useWatch({ control, name: 'gstin' }) || ''
  const watchedEmail = useWatch({ control, name: 'email' }) || ''
  const watchedPhone = useWatch({ control, name: 'phone' }) || ''
  const watchedStateCode = useWatch({ control, name: 'state_code' }) || ''

  // Auto-fill state if 15-char GSTIN is typed and state is not chosen
  useEffect(() => {
    if (watchedGstin && watchedGstin.length >= 2) {
      const gstinPrefix = watchedGstin.slice(0, 2)
      const matchingState = INDIAN_GST_STATES.find((s) => s.code === gstinPrefix)
      if (matchingState && (!watchedStateCode || watchedStateCode !== gstinPrefix)) {
        setValue('state_code', gstinPrefix)
      }
    }
  }, [watchedGstin, watchedStateCode, setValue])

  const onSubmit = useCallback(async (data: CustomerInput) => {
    setSuccess(false)
    setGlobalError(null)

    const result = isEdit
      ? await updateCustomer({ id: customer.id, ...data })
      : await createCustomer(data)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        router.push('/customers')
      }, 1200)
    } else {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as Extract<keyof CustomerInput, string>, { message: messages[0] })
          }
        })
      } else {
        setGlobalError(result.error.message)
        if (result.error.code === 'CUSTOMER_QUOTA_EXCEEDED' || result.error.code === 'QUOTA_EXCEEDED') {
          setShowQuotaUpgradeModal(true)
        }
      }
    }
  }, [customer, isEdit, router, setError])

  // Keyboard shortcut listeners (Ctrl+S to save, Esc to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSubmit(onSubmit)()
      }
      if (e.key === 'Escape') {
        router.push('/customers')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, onSubmit, router])

  // Computed live states for preview
  const liveState = INDIAN_GST_STATES.find((s) => s.code === watchedStateCode)
  const isGstinValid = watchedGstin ? GSTIN_REGEX.test(watchedGstin) : false
  const isB2B = Boolean(watchedGstin && watchedGstin.length === 15 && isGstinValid)
  const extractedPan = watchedGstin && watchedGstin.length >= 12 ? watchedGstin.substring(2, 12).toUpperCase() : 'N/A'

  const isIntrastate = Boolean(sellerStateCode && watchedStateCode && sellerStateCode === watchedStateCode)
  const taxTypeDisplay = !watchedStateCode
    ? 'State Not Selected'
    : isIntrastate
      ? 'CGST + SGST (Local)'
      : 'IGST (Inter-State)'

  const initials = watchedName.trim()
    ? watchedName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : 'CU'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
      {/* LEFT COLUMN: 3-Step Form (~62% width) */}
      <div className="lg:col-span-7 xl:col-span-8 rounded-xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-4.5 shadow-xs">
        {globalError && (
          <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-semibold">{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5 sm:space-y-5">
          {/* SECTION 1: Client & Business Identity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                  1
                </div>
                <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                  Client &amp; Business Identity
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Basic credentials</span>
            </div>

            {/* Hybrid Row: Wider Business Name (~58%), Compact GSTIN (~42%) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Customer Name */}
              <div className="md:col-span-7">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                  <Building2 className="size-3.5 text-indigo-600" />
                  Customer / Business Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Krishna Enterprises or Tech Solutions Pvt Ltd"
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                    errors.name && 'border-destructive focus:ring-destructive/20'
                  )}
                  {...register('name')}
                />
                {errors.name && <p className="mt-1 text-xs font-bold text-destructive">{errors.name.message}</p>}
              </div>

              {/* GSTIN */}
              <div className="md:col-span-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <CreditCard className="size-3.5 text-indigo-600" />
                    GSTIN
                  </label>
                  <span className="text-xs font-semibold text-muted-foreground/75">Optional for B2C</span>
                </div>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 29AABCU9603R1ZM"
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all tracking-wider',
                    errors.gstin && 'border-destructive focus:ring-destructive/20'
                  )}
                  {...register('gstin')}
                />
                {errors.gstin && <p className="mt-1 text-xs font-bold text-destructive">{errors.gstin.message}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 2: Contact Coordinates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                  2
                </div>
                <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                  Contact Coordinates
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">For invoice dispatch</span>
            </div>

            {/* Hybrid Row: Wider Email (~58%), Compact Phone (~42%) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                  <Mail className="size-3.5 text-indigo-600" />
                  Primary Billing Email
                </label>
                <input
                  type="email"
                  placeholder="accounts@clientcompany.com"
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                    errors.email && 'border-destructive focus:ring-destructive/20'
                  )}
                  {...register('email')}
                />
                {errors.email && <p className="mt-1 text-xs font-bold text-destructive">{errors.email.message}</p>}
              </div>

              <div className="md:col-span-5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                  <Phone className="size-3.5 text-indigo-600" />
                  Phone / Mobile (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                    errors.phone && 'border-destructive focus:ring-destructive/20'
                  )}
                  {...register('phone')}
                />
                {errors.phone && <p className="mt-1 text-xs font-bold text-destructive">{errors.phone.message}</p>}
              </div>
            </div>
          </div>

          {/* SECTION 3: Billing Address & GST Place of Supply */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                  3
                </div>
                <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                  Billing Address &amp; GST Place of Supply
                </h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Determines CGST/SGST vs IGST</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                    <MapPin className="size-3.5 text-indigo-600" />
                    Address Line 1 (Street, Building, Door No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #42, Commercial Street, 2nd Cross"
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                      errors.address_line1 && 'border-destructive focus:ring-destructive/20'
                    )}
                    {...register('address_line1')}
                  />
                  {errors.address_line1 && <p className="mt-1 text-xs font-bold text-destructive">{errors.address_line1.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    Address Line 2 (Area, Landmark, Suite)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Area, Phase 1"
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                      errors.address_line2 && 'border-destructive focus:ring-destructive/20'
                    )}
                    {...register('address_line2')}
                  />
                  {errors.address_line2 && <p className="mt-1 text-xs font-bold text-destructive">{errors.address_line2.message}</p>}
                </div>
              </div>

              {/* City, State & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                      errors.city && 'border-destructive focus:ring-destructive/20'
                    )}
                    {...register('city')}
                  />
                  {errors.city && <p className="mt-1 text-xs font-bold text-destructive">{errors.city.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">
                    State &amp; GST Jurisdiction <span className="text-destructive">*</span>
                  </label>
                  <select
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all cursor-pointer',
                      errors.state_code && 'border-destructive focus:ring-destructive/20'
                    )}
                    {...register('state_code')}
                  >
                    <option value="">Select State</option>
                    {INDIAN_GST_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                  {errors.state_code && <p className="mt-1 text-xs font-bold text-destructive">{errors.state_code.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 560001"
                    className={cn(
                      'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                      errors.pincode && 'border-destructive focus:ring-destructive/20'
                    )}
                    {...register('pincode')}
                  />
                  {errors.pincode && <p className="mt-1 text-xs font-bold text-destructive">{errors.pincode.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/customers"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3.5 py-1.5 h-9 text-sm font-bold text-foreground hover:bg-muted transition-all shadow-2xs"
            >
              <ArrowLeft className="size-3.5" />
              Back to Directory
            </Link>

            <div className="flex items-center gap-3">
              {success && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-4" />
                  {isEdit ? 'Customer updated!' : 'Customer added successfully!'}
                </span>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-4 rounded-lg font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md hover:shadow-lg cursor-pointer transition-all hover:-translate-y-px active:translate-y-px disabled:opacity-50"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : isEdit ? (
                  <>
                    <Check className="size-4 mr-1.5" /> Update Customer Details
                  </>
                ) : (
                  <>
                    <Check className="size-4 mr-1.5" /> Save &amp; Add Customer
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Live Directory Preview Sidebar (~38% width) (Image 3) */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 sticky top-6">
        {/* 1. Header with Eye icon & Real-time pill */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-bold text-foreground tracking-wider uppercase font-heading">
              Live Directory Preview
            </h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            Real-time
          </span>
        </div>

        {/* 2. Interactive Customer Card Preview (Matching established Image 2 format) */}
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold border border-border/50 shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-base text-foreground truncate block leading-snug">
                  {watchedName || 'Client Name Preview'}
                </h4>
                <p className="mt-0.5 text-sm font-mono text-muted-foreground truncate">
                  {watchedGstin || <span className="italic font-sans text-muted-foreground/75 text-xs">Unregistered Retail Account</span>}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 border',
                isB2B
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-slate-500/10 text-slate-600 border-slate-500/20'
              )}
            >
              {isB2B ? (
                <>
                  <ShieldCheck className="size-3 mr-1" /> B2B
                </>
              ) : (
                'Consumer'
              )}
            </span>
          </div>

          {/* Tax Status Alert Block */}
          <div className="rounded-lg border border-border/50 bg-background/50 p-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-bold tracking-wider uppercase">Tax Status:</span>
              <span
                className={cn(
                  'font-bold px-2 py-0.5 rounded text-xs',
                  isIntrastate
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                )}
              >
                {isIntrastate ? 'INTRASTATE (LOCAL)' : 'INTERSTATE (IGST)'}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {isB2B ? 'Registered Business Tax Account' : 'Unregistered Retail Account'}
            </p>
          </div>

          {/* Card Footer Info */}
          <div className="pt-1.5 border-t border-border/40 flex flex-col gap-1 text-sm text-muted-foreground font-medium">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="size-3.5 text-muted-foreground/80 shrink-0" />
                <span className="truncate">
                  {liveState ? `${liveState.name} (${liveState.code})` : 'State Not Selected'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Phone className="size-3 text-muted-foreground/80 shrink-0" />
                <span className="font-mono text-xs">{watchedPhone || 'No phone set'}</span>
              </div>
            </div>

            {watchedEmail && (
              <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground/80">
                <Mail className="size-3 text-muted-foreground/80 shrink-0" />
                <span className="truncate">{watchedEmail}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. GST Intelligence Checklist Card (Image 3) */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs space-y-2">
          <h4 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
            GST Intelligence Checklist
          </h4>

          <div className="divide-y divide-border/40 text-sm">
            <div className="py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Structure Validation:</span>
              <span className="font-bold text-foreground">
                {!watchedGstin ? (
                  <span className="text-muted-foreground/80 font-normal">Optional (Retail)</span>
                ) : isGstinValid ? (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <Check className="size-3.5" /> Valid 15-char Format
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">15 Characters Required</span>
                )}
              </span>
            </div>

            <div className="py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Extracted PAN:</span>
              <span className="font-mono font-bold text-foreground">{extractedPan}</span>
            </div>

            <div className="py-1.5 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Tax Type Applicable:</span>
              <span className="font-semibold text-foreground">{taxTypeDisplay}</span>
            </div>
          </div>
        </div>

        {/* 4. Keyboard Productivity Card (Image 3) */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs space-y-2">
          <h4 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
            Keyboard Productivity
          </h4>

          <div className="divide-y divide-border/40 text-sm">
            <div className="py-1 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Save Customer:</span>
              <kbd className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-mono font-bold text-foreground">
                Ctrl + S
              </kbd>
            </div>

            <div className="py-1 flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Cancel / Exit:</span>
              <kbd className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-mono font-bold text-foreground">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showQuotaUpgradeModal}
        onClose={() => setShowQuotaUpgradeModal(false)}
        title="Customer Limit Reached"
        featureName="Unlimited Customer Directory"
        description="You have reached your Free plan limit of 30 customer contacts. Upgrade to Essentials Pro (₹399/mo) to store unlimited customers and access full compliance."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </div>
  )
}
