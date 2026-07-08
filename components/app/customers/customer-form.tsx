'use client'

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { customerSchema, CustomerInput } from '@/lib/validations/customer';
import { createCustomer } from '@/lib/actions/customers/create-customer';
import { updateCustomer } from '@/lib/actions/customers/update-customer';
import { useState } from 'react';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { customers } from '@/lib/db/schema';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'
const sectionClass = 'border-b border-border pb-8 mb-8 last:border-0 last:mb-0 last:pb-0'
const errorClass = 'mt-1.5 text-xs text-destructive'

export function CustomerForm({ customer }: { customer?: typeof customers.$inferSelect }) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const isEdit = !!customer;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<CustomerInput>({
    resolver: zodResolver(
      // @hookform/resolvers (v5.4.0) / zod (v4.4.3) compatibility workaround
      customerSchema as never
    ),
    defaultValues: customer ? {
      name: customer.name,
      gstin: customer.gstin || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state_code: customer.state_code,
      pincode: customer.pincode || '',
    } : {
      name: '',
      gstin: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state_code: '',
      pincode: '',
    }
  });

  const onSubmit = async (data: CustomerInput) => {
    setSuccess(false);
    setGlobalError(null);
    
    const result = isEdit 
      ? await updateCustomer({ id: customer.id, ...data }) 
      : await createCustomer(data);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push('/customers');
      }, 1500);
    } else {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as Extract<keyof CustomerInput, string>, { message: messages[0] });
          }
        });
      } else {
        setGlobalError(result.error.message);
      }
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {globalError && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="size-4" />
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={sectionClass}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Customer Name <span className="text-destructive">*</span></label>
              <input type="text" className={cn(inputClass, errors.name && 'border-destructive focus:ring-destructive')} placeholder="e.g. Tech Solutions Pvt Ltd" {...register('name')} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            
            <div>
              <label className={labelClass}>GSTIN (Optional)</label>
              <input type="text" className={cn(inputClass, "font-mono uppercase", errors.gstin && 'border-destructive focus:ring-destructive')} placeholder="e.g. 29AABCU9603R1ZM" maxLength={15} {...register('gstin')} />
              {errors.gstin && <p className={errorClass}>{errors.gstin.message}</p>}
            </div>
            
            <div>
              <label className={labelClass}>Email (Optional)</label>
              <input type="email" className={cn(inputClass, errors.email && 'border-destructive focus:ring-destructive')} placeholder="contact@example.com" {...register('email')} />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
            
            <div>
              <label className={labelClass}>Phone (Optional)</label>
              <input type="tel" className={cn(inputClass, errors.phone && 'border-destructive focus:ring-destructive')} placeholder="9876543210" {...register('phone')} />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className="mb-4 text-sm font-semibold text-foreground">Address Details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address Line 1 (Optional)</label>
              <input type="text" className={cn(inputClass, errors.address_line1 && 'border-destructive focus:ring-destructive')} placeholder="Street address, building" {...register('address_line1')} />
              {errors.address_line1 && <p className={errorClass}>{errors.address_line1.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address Line 2 (Optional)</label>
              <input type="text" className={cn(inputClass, errors.address_line2 && 'border-destructive focus:ring-destructive')} placeholder="Apartment, suite, unit, etc." {...register('address_line2')} />
              {errors.address_line2 && <p className={errorClass}>{errors.address_line2.message}</p>}
            </div>
            <div>
              <label className={labelClass}>City (Optional)</label>
              <input type="text" className={cn(inputClass, errors.city && 'border-destructive focus:ring-destructive')} placeholder="City" {...register('city')} />
              {errors.city && <p className={errorClass}>{errors.city.message}</p>}
            </div>
            <div>
              <label className={labelClass}>State <span className="text-destructive">*</span></label>
              <select className={cn(inputClass, errors.state_code && 'border-destructive focus:ring-destructive')} {...register('state_code')}>
                <option value="">Select State</option>
                {INDIAN_GST_STATES.map((s) => (
                  <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                ))}
              </select>
              {errors.state_code && <p className={errorClass}>{errors.state_code.message}</p>}
            </div>
            <div>
              <label className={labelClass}>PIN (Optional)</label>
              <input type="text" className={cn(inputClass, errors.pincode && 'border-destructive focus:ring-destructive')} placeholder="560001" maxLength={6} {...register('pincode')} />
              {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            {success && (
              <span className="flex items-center text-sm font-medium text-success">
                <Check className="mr-1.5 size-4" /> {isEdit ? 'Customer updated successfully' : 'Customer saved successfully'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/customers">Cancel</Link>}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
