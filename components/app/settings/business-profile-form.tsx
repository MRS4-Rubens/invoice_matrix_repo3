'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessProfileSchema, BusinessProfileInput } from '@/lib/validations/business';
import { saveBusinessProfile } from '@/lib/actions/business/save-business-profile';
import { useState } from 'react';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'
const sectionClass = 'border-b border-border pb-8 mb-8 last:border-0 last:mb-0 last:pb-0'
const errorClass = 'mt-1.5 text-xs text-destructive'

export function BusinessProfileForm({ business, currentFy }: { business: any, currentFy: any }) {
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<BusinessProfileInput>({
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
      email: business.email || '',
      bank_account_name: business.bank_account_name || '',
      bank_account_number: business.bank_account_number || '',
      bank_ifsc: business.bank_ifsc || '',
      bank_name: business.bank_name || '',
      invoice_number_prefix: business.invoice_number_prefix,
      credit_note_number_prefix: business.credit_note_number_prefix,
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
      email: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_ifsc: '',
      bank_name: '',
      invoice_number_prefix: 'INV',
      credit_note_number_prefix: 'CN',
    }
  });

  const onSubmit = async (data: BusinessProfileInput) => {
    setSuccess(false);
    setGlobalError(null);
    const result = await saveBusinessProfile(data);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as any, { message: messages[0] });
          }
        });
      } else {
        setGlobalError(result.error.message);
      }
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-1 text-lg font-semibold text-foreground">Business Profile</h2>
      <p className="mb-6 text-sm text-muted-foreground">Manage your business information and tax details.</p>

      {globalError && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="size-4" />
          {globalError}
        </div>
      )}

      {currentFy && (
        <div className="mb-6 rounded-lg bg-primary/5 p-4 border border-primary/10">
          <p className="text-sm font-medium text-foreground">Current Financial Year: {currentFy.label}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={sectionClass}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">General Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Legal Business Name</label>
              <input type="text" className={cn(inputClass, errors.legal_name && 'border-destructive focus:ring-destructive')} {...register('legal_name')} />
              {errors.legal_name && <p className={errorClass}>{errors.legal_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Trade Name (Optional)</label>
              <input type="text" className={cn(inputClass, errors.trade_name && 'border-destructive focus:ring-destructive')} {...register('trade_name')} />
              {errors.trade_name && <p className={errorClass}>{errors.trade_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>GSTIN</label>
              <input type="text" className={cn(inputClass, "font-mono uppercase", errors.gstin && 'border-destructive focus:ring-destructive')} {...register('gstin')} />
              {errors.gstin && <p className={errorClass}>{errors.gstin.message}</p>}
            </div>
            <div>
              <label className={labelClass}>PAN (Optional)</label>
              <input type="text" className={cn(inputClass, "font-mono uppercase", errors.pan && 'border-destructive focus:ring-destructive')} {...register('pan')} />
              {errors.pan && <p className={errorClass}>{errors.pan.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Registration Type</label>
              <select className={cn(inputClass, errors.registration_type && 'border-destructive focus:ring-destructive')} {...register('registration_type')}>
                <option value="regular">Regular</option>
                <option value="composition">Composition</option>
              </select>
              {errors.registration_type && <p className={errorClass}>{errors.registration_type.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone (Optional)</label>
              <input type="tel" className={cn(inputClass, errors.phone && 'border-destructive focus:ring-destructive')} {...register('phone')} />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email (Optional)</label>
              <input type="email" className={cn(inputClass, errors.email && 'border-destructive focus:ring-destructive')} {...register('email')} />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Registered Address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address Line 1</label>
              <input type="text" className={cn(inputClass, errors.address_line1 && 'border-destructive focus:ring-destructive')} {...register('address_line1')} />
              {errors.address_line1 && <p className={errorClass}>{errors.address_line1.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address Line 2 (Optional)</label>
              <input type="text" className={cn(inputClass, errors.address_line2 && 'border-destructive focus:ring-destructive')} {...register('address_line2')} />
              {errors.address_line2 && <p className={errorClass}>{errors.address_line2.message}</p>}
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input type="text" className={cn(inputClass, errors.city && 'border-destructive focus:ring-destructive')} {...register('city')} />
              {errors.city && <p className={errorClass}>{errors.city.message}</p>}
            </div>
            <div>
              <label className={labelClass}>State</label>
              <select className={cn(inputClass, errors.state_code && 'border-destructive focus:ring-destructive')} {...register('state_code')}>
                <option value="">Select State</option>
                {INDIAN_GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
              {errors.state_code && <p className={errorClass}>{errors.state_code.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input type="text" className={cn(inputClass, errors.pincode && 'border-destructive focus:ring-destructive')} {...register('pincode')} />
              {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Bank Details (Optional)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Bank Name</label>
              <input type="text" className={cn(inputClass, errors.bank_name && 'border-destructive focus:ring-destructive')} {...register('bank_name')} />
              {errors.bank_name && <p className={errorClass}>{errors.bank_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Account Name</label>
              <input type="text" className={cn(inputClass, errors.bank_account_name && 'border-destructive focus:ring-destructive')} {...register('bank_account_name')} />
              {errors.bank_account_name && <p className={errorClass}>{errors.bank_account_name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Account Number</label>
              <input type="text" className={cn(inputClass, errors.bank_account_number && 'border-destructive focus:ring-destructive')} {...register('bank_account_number')} />
              {errors.bank_account_number && <p className={errorClass}>{errors.bank_account_number.message}</p>}
            </div>
            <div>
              <label className={labelClass}>IFSC Code</label>
              <input type="text" className={cn(inputClass, "font-mono uppercase", errors.bank_ifsc && 'border-destructive focus:ring-destructive')} {...register('bank_ifsc')} />
              {errors.bank_ifsc && <p className={errorClass}>{errors.bank_ifsc.message}</p>}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Document Prefixes</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Invoice Prefix</label>
              <input type="text" className={cn(inputClass, errors.invoice_number_prefix && 'border-destructive focus:ring-destructive')} {...register('invoice_number_prefix')} />
              {errors.invoice_number_prefix && <p className={errorClass}>{errors.invoice_number_prefix.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Credit Note Prefix</label>
              <input type="text" className={cn(inputClass, errors.credit_note_number_prefix && 'border-destructive focus:ring-destructive')} {...register('credit_note_number_prefix')} />
              {errors.credit_note_number_prefix && <p className={errorClass}>{errors.credit_note_number_prefix.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {success && (
              <span className="flex items-center text-sm font-medium text-success">
                <Check className="mr-1.5 size-4" /> Profile saved successfully
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
