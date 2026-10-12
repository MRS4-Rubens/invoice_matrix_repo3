'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessProfileSchema, BusinessProfileInput } from '@/lib/validations/business';
import { saveBusinessProfile } from '@/lib/actions/business/save-business-profile';
import { useState, useEffect } from 'react';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { cn } from '@/lib/utils';
import { 
  Check, 
  AlertCircle, 
  Building2, 
  Store, 
  FileSpreadsheet, 
  CreditCard, 
  ShieldCheck, 
  Phone, 
  PhoneCall, 
  Mail, 
  Briefcase, 
  MapPin, 
  Navigation, 
  Globe, 
  Hash, 
  Landmark, 
  UserCheck, 
  QrCode, 
  ReceiptText,
  ArrowRight,
  Calendar,
  Sparkles
} from 'lucide-react';
import { businesses, financialYears } from '@/lib/db/schema';
import { ProfileSpotlightTour } from './profile-spotlight-tour';

const baseInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 h-9 text-sm text-slate-900 font-medium placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-2 shadow-2xs transition-all'
const inputGreenClass = `${baseInputClass} focus:ring-emerald-800/15 focus:border-emerald-800`
const inputAmberClass = `${baseInputClass} focus:ring-amber-800/15 focus:border-amber-800`
const inputRoseClass = `${baseInputClass} focus:ring-rose-900/15 focus:border-rose-900`

const labelClass = 'mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700'
const sectionClass = 'border-b border-border pb-4 mb-4 sm:pb-4.5 sm:mb-4.5 last:border-0 last:mb-0 last:pb-0'
const errorClass = 'mt-1 text-xs font-semibold text-destructive'

export function BusinessProfileForm({
  business,
  currentFy,
  onSwitchTab,
}: {
  business: typeof businesses.$inferSelect | null;
  currentFy: typeof financialYears.$inferSelect | null;
  onSwitchTab?: (tab: string) => void;
}) {
  const isNewBusiness = !business || !business.id;
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(isNewBusiness);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, watch, setValue } = useForm<BusinessProfileInput>({
    resolver: zodResolver(
      // @hookform/resolvers (v5.4.0) relies on a slightly older Zod v4 draft signature
      // where _zod.version.minor was 3. Zod v4.4.3 bumped it to 4, breaking the TS structural match.
      // https://github.com/react-hook-form/resolvers/issues/720
      businessProfileSchema as never
    ),
    defaultValues: business ? {
      legal_name: business.legal_name,
      trade_name: business.trade_name || '',
      gstin: business.gstin,
      pan: business.pan || '',
      registration_type: business.registration_type,
      address_line1: business.address_line1,
      address_line2: business.address_line2 || '',
      city: business.city,
      state_code: business.state_code,
      pincode: business.pincode,
      phone: business.phone || '',
      alternate_phone: business.alternate_phone || '',
      email: business.email || '',
      nature_of_business: business.nature_of_business || '',
      bank_account_name: business.bank_account_name || '',
      bank_account_number: business.bank_account_number || '',
      bank_ifsc: business.bank_ifsc || '',
      bank_name: business.bank_name || '',
    } : {
      legal_name: '',
      trade_name: '',
      gstin: '',
      pan: '',
      registration_type: 'regular',
      address_line1: '',
      address_line2: '',
      city: '',
      state_code: '',
      pincode: '',
      phone: '',
      alternate_phone: '',
      email: '',
      nature_of_business: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      bank_name: '',
    }
  });

  // Smart Auto-fill: When GSTIN is typed, automatically extract PAN and pre-fill State code
  const watchedGstin = watch('gstin');
  useEffect(() => {
    if (!watchedGstin) return;
    const clean = watchedGstin.trim().toUpperCase();

    // 1. Auto extract State code (first 2 digits)
    if (clean.length >= 2) {
      const stateCode = clean.slice(0, 2);
      if (INDIAN_GST_STATES.some((s) => s.code === stateCode)) {
        setValue('state_code', stateCode, { shouldValidate: true });
      }
    }

    // 2. Auto extract PAN (10 chars: chars 2 to 12)
    if (clean.length >= 12) {
      const extractedPan = clean.slice(2, 12);
      setValue('pan', extractedPan, { shouldValidate: true });
    }
  }, [watchedGstin, setValue]);

  const onSubmit = async (data: BusinessProfileInput) => {
    setSuccess(false);
    setGlobalError(null);
    const result = await saveBusinessProfile(data);
    
    if (result.success) {
      setSuccess(true);
      if (isNewBusiness) {
        // Trigger celebratory confetti modal and automatic redirect to dashboard
        setShowCelebration(true);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } else {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as keyof BusinessProfileInput, { message: messages[0] });
          }
        });
      } else {
        setGlobalError(result.error.message);
      }
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-4.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-slate-800 shrink-0" />
          <h2 className="text-xl font-bold font-heading text-slate-900 uppercase">Business Profile</h2>
        </div>
        
        {/* Guided Tour Trigger Button */}
        <button
          type="button"
          onClick={() => setIsTourOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
          title="Launch interactive setup tour"
        >
          <Sparkles className="size-3.5" />
          <span>{isNewBusiness ? 'Guided Setup Tour' : 'Replay Tour'}</span>
        </button>
      </div>
      <p className="mb-3.5 text-sm sm:text-base text-muted-foreground font-medium">Manage your business information and tax details.</p>

      {globalError && (
        <div className="mb-3.5 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="size-4" />
          {globalError}
        </div>
      )}

      {currentFy ? (
        <div className="mb-3.5 rounded-lg bg-emerald-50/60 px-3.5 py-2.5 border border-emerald-200/80 flex items-center gap-2.5">
          <Calendar className="size-4 text-emerald-800 shrink-0" />
          <p className="text-sm sm:text-base font-semibold text-emerald-950">Current Financial Year: {currentFy.label}</p>
        </div>
      ) : isNewBusiness ? (
        <div className="mb-3.5 rounded-lg bg-emerald-50/80 px-3.5 py-2.5 border border-emerald-200 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-emerald-800 shrink-0" />
            <p className="text-xs sm:text-sm font-semibold text-emerald-950">
              Welcome! Register your business details below to unlock all invoicing, inventory, and reporting features.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="shrink-0 text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
          >
            Start Guided Tour
          </button>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* SECTION 1: General Details (Dark Green - emerald-800) */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-[11px] font-black text-white shadow-xs">
                1
              </div>
              <Building2 className="size-4 text-emerald-800 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">General Details</h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Identity &amp; GST registration</span>
          </div>

          <div className="space-y-3">
            {/* Row 1: Business Names (2 cols) */}
            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
              {/* TOUR STEP 1: Legal Business Name */}
              <div data-tour-step="1" className="relative scroll-mt-28">
                <label className={labelClass}>
                  <Building2 className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Legal Business Name <span className="text-destructive">*</span></span>
                </label>
                <input type="text" className={cn(inputGreenClass, errors.legal_name && 'border-destructive focus:ring-destructive/20')} {...register('legal_name')} />
                {errors.legal_name && <p className={errorClass}>{errors.legal_name.message}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  <Store className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Trade Name (Optional)</span>
                </label>
                <input type="text" className={cn(inputGreenClass, errors.trade_name && 'border-destructive focus:ring-destructive/20')} {...register('trade_name')} />
                {errors.trade_name && <p className={errorClass}>{errors.trade_name.message}</p>}
              </div>
            </div>

            {/* Row 2: 4 Equal-Width Fields (GSTIN + PAN + Registration Type + Nature of Business) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* TOUR STEP 2: GSTIN */}
              <div data-tour-step="2" className="min-w-0 relative scroll-mt-28">
                <label className={labelClass}>
                  <FileSpreadsheet className="size-3.5 text-emerald-800 shrink-0" />
                  <span>GSTIN <span className="text-destructive">*</span></span>
                </label>
                <input type="text" maxLength={15} className={cn(inputGreenClass, "font-mono uppercase tracking-wider", errors.gstin && 'border-destructive focus:ring-destructive/20')} {...register('gstin')} />
                {errors.gstin && <p className={errorClass}>{errors.gstin.message}</p>}
              </div>

              {/* 2. PAN */}
              <div className="min-w-0">
                <label className={labelClass}>
                  <CreditCard className="size-3.5 text-emerald-800 shrink-0" />
                  <span>PAN</span>
                </label>
                <input type="text" maxLength={10} className={cn(inputGreenClass, "font-mono uppercase tracking-wider", errors.pan && 'border-destructive focus:ring-destructive/20')} {...register('pan')} />
                {errors.pan && <p className={errorClass}>{errors.pan.message}</p>}
              </div>

              {/* TOUR STEP 3: Registration Type */}
              <div data-tour-step="3" className="min-w-0 relative scroll-mt-28">
                <label className={labelClass}>
                  <ShieldCheck className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Registration Type</span>
                </label>
                <select className={cn(inputGreenClass, errors.registration_type && 'border-destructive focus:ring-destructive/20')} {...register('registration_type')}>
                  <option value="regular">Regular</option>
                  <option value="composition">Composition</option>
                </select>
                {errors.registration_type && <p className={errorClass}>{errors.registration_type.message}</p>}
              </div>

              {/* 4. Nature of Business */}
              <div className="min-w-0">
                <label className={labelClass}>
                  <Briefcase className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Nature of Business</span>
                </label>
                <input type="text" placeholder="e.g. Wholesale & Retail" className={cn(inputGreenClass, errors.nature_of_business && 'border-destructive focus:ring-destructive/20')} {...register('nature_of_business')} />
                {errors.nature_of_business && <p className={errorClass}>{errors.nature_of_business.message}</p>}
              </div>
            </div>

            {/* Row 3: Contact Details (Email 50%, Phone 25%, Alt Phone 25%) */}
            <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* TOUR STEP 4: Email */}
              <div data-tour-step="4" className="min-w-0 sm:col-span-2 lg:col-span-2 relative scroll-mt-28">
                <label className={labelClass}>
                  <Mail className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Email (Optional)</span>
                </label>
                <input type="email" placeholder="billing@yourbusiness.com" className={cn(inputGreenClass, errors.email && 'border-destructive focus:ring-destructive/20')} {...register('email')} />
                {errors.email && <p className={errorClass}>{errors.email.message}</p>}
              </div>

              {/* TOUR STEP 5: Phone */}
              <div data-tour-step="5" className="min-w-0 sm:col-span-1 lg:col-span-1 relative scroll-mt-28">
                <label className={labelClass}>
                  <Phone className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Phone (Optional)</span>
                </label>
                <input type="tel" placeholder="e.g. 9848069599" className={cn(inputGreenClass, errors.phone && 'border-destructive focus:ring-destructive/20')} {...register('phone')} />
                {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
              </div>

              {/* 3. Alt Phone */}
              <div className="min-w-0 sm:col-span-1 lg:col-span-1">
                <label className={labelClass}>
                  <PhoneCall className="size-3.5 text-emerald-800 shrink-0" />
                  <span>Alt Phone (Optional)</span>
                </label>
                <input type="tel" placeholder="e.g. 9848537068" className={cn(inputGreenClass, errors.alternate_phone && 'border-destructive focus:ring-destructive/20')} {...register('alternate_phone')} />
                {errors.alternate_phone && <p className={errorClass}>{errors.alternate_phone.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Registered Address (Dark Orange / Amber - amber-800) */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[11px] font-black text-white shadow-xs">
                2
              </div>
              <MapPin className="size-4 text-amber-800 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">Registered Address</h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Principal place of business</span>
          </div>

          <div className="space-y-3">
            {/* Row 1: Address Line 1 & Line 2 (2 cols) */}
            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
              {/* TOUR STEP 6: Address Line 1 */}
              <div data-tour-step="6" className="relative scroll-mt-28">
                <label className={labelClass}>
                  <MapPin className="size-3.5 text-amber-800 shrink-0" />
                  <span>Address Line 1 <span className="text-destructive">*</span></span>
                </label>
                <input type="text" className={cn(inputAmberClass, errors.address_line1 && 'border-destructive focus:ring-destructive/20')} {...register('address_line1')} />
                {errors.address_line1 && <p className={errorClass}>{errors.address_line1.message}</p>}
              </div>

              <div>
                <label className={labelClass}>
                  <MapPin className="size-3.5 text-amber-800 shrink-0" />
                  <span>Address Line 2 (Optional)</span>
                </label>
                <input type="text" className={cn(inputAmberClass, errors.address_line2 && 'border-destructive focus:ring-destructive/20')} {...register('address_line2')} />
                {errors.address_line2 && <p className={errorClass}>{errors.address_line2.message}</p>}
              </div>
            </div>

            {/* Row 2: City, State, Pincode (3 cols) */}
            <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-12">
              {/* TOUR STEP 7: City */}
              <div data-tour-step="7" className="sm:col-span-5 relative scroll-mt-28">
                <label className={labelClass}>
                  <Navigation className="size-3.5 text-amber-800 shrink-0" />
                  <span>City <span className="text-destructive">*</span></span>
                </label>
                <input type="text" className={cn(inputAmberClass, errors.city && 'border-destructive focus:ring-destructive/20')} {...register('city')} />
                {errors.city && <p className={errorClass}>{errors.city.message}</p>}
              </div>

              {/* TOUR STEP 8: State */}
              <div data-tour-step="8" className="sm:col-span-4 relative scroll-mt-28">
                <label className={labelClass}>
                  <Globe className="size-3.5 text-amber-800 shrink-0" />
                  <span>State <span className="text-destructive">*</span></span>
                </label>
                <select className={cn(inputAmberClass, errors.state_code && 'border-destructive focus:ring-destructive/20')} {...register('state_code')}>
                  <option value="">Select State</option>
                  {INDIAN_GST_STATES.map((s) => (
                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                  ))}
                </select>
                {errors.state_code && <p className={errorClass}>{errors.state_code.message}</p>}
              </div>

              {/* TOUR STEP 9: Pincode */}
              <div data-tour-step="9" className="sm:col-span-3 relative scroll-mt-28">
                <label className={labelClass}>
                  <Hash className="size-3.5 text-amber-800 shrink-0" />
                  <span>Pincode <span className="text-destructive">*</span></span>
                </label>
                <input type="text" maxLength={6} className={cn(inputAmberClass, "font-mono", errors.pincode && 'border-destructive focus:ring-destructive/20')} {...register('pincode')} />
                {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Bank Details (Optional) - TOUR STEP 10 */}
        <div data-tour-step="10" className={cn(sectionClass, 'relative scroll-mt-28')}>
          <div className="flex items-center justify-between pb-2 border-b border-border/50 mb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-rose-900 text-[11px] font-black text-white shadow-xs">
                3
              </div>
              <Landmark className="size-4 text-rose-900 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 font-heading tracking-wide uppercase">Bank Details (Optional)</h3>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Payouts &amp; invoice bank imprint</span>
          </div>

          <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                <Landmark className="size-3.5 text-rose-900 shrink-0" />
                <span>Bank Name</span>
              </label>
              <input type="text" className={cn(inputRoseClass, errors.bank_name && 'border-destructive focus:ring-destructive/20')} {...register('bank_name')} />
              {errors.bank_name && <p className={errorClass}>{errors.bank_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                <UserCheck className="size-3.5 text-rose-900 shrink-0" />
                <span>Account Name</span>
              </label>
              <input type="text" className={cn(inputRoseClass, errors.bank_account_name && 'border-destructive focus:ring-destructive/20')} {...register('bank_account_name')} />
              {errors.bank_account_name && <p className={errorClass}>{errors.bank_account_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                <CreditCard className="size-3.5 text-rose-900 shrink-0" />
                <span>Account Number</span>
              </label>
              <input type="text" className={cn(inputRoseClass, "font-mono", errors.bank_account_number && 'border-destructive focus:ring-destructive/20')} {...register('bank_account_number')} />
              {errors.bank_account_number && <p className={errorClass}>{errors.bank_account_number.message}</p>}
            </div>
            <div>
              <label className={labelClass}>
                <QrCode className="size-3.5 text-rose-900 shrink-0" />
                <span>IFSC Code</span>
              </label>
              <input type="text" maxLength={11} className={cn(inputRoseClass, "font-mono uppercase tracking-wider", errors.bank_ifsc && 'border-destructive focus:ring-destructive/20')} {...register('bank_ifsc')} />
              {errors.bank_ifsc && <p className={errorClass}>{errors.bank_ifsc.message}</p>}
            </div>
          </div>
        </div>

        {/* Informational Callout: Invoice Settings Location */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white shadow-xs">
              <ReceiptText className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Invoice Numbering, Templates &amp; Trade Terms
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Statutory invoice number formatting (GST Rule 46(b)), credit note prefix, payment due days, invoice templates, and footer terms are now managed under the dedicated <span className="font-semibold text-blue-900">Invoice Settings</span> tab.
              </p>
            </div>
          </div>
          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('Invoice Settings')}
              className="shrink-0 rounded-lg bg-blue-900 px-3 py-2 text-xs sm:text-sm font-bold text-white transition-all hover:bg-blue-950 cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <span>Go to Invoice Settings</span>
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>

        {/* Form Footer Actions & TOUR STEP 11: Save Profile Button */}
        <div className="flex items-center justify-between pt-1">
          <div>
            {success && (
              <span className="flex items-center text-sm font-bold text-emerald-800">
                <Check className="mr-1.5 size-4" /> Profile saved successfully
              </span>
            )}
          </div>
          {/* TOUR STEP 11: Save Profile Button */}
          <button
            data-tour-step="11"
            type="submit"
            disabled={isSubmitting}
            className="relative scroll-mt-28 rounded-lg bg-emerald-800 px-4 py-2 h-9 text-sm font-bold text-white transition-all hover:bg-emerald-900 disabled:opacity-50 shadow-xs hover:shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Check className="size-4" />
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* On-Screen Registration / Setup Spotlight Tour Component */}
      <ProfileSpotlightTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        showCelebration={showCelebration}
        onCelebrationDismiss={() => setShowCelebration(false)}
      />
    </div>
  );
}
