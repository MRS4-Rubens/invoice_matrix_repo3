'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, ProductInput } from '@/lib/validations/product';
import { createProduct } from '@/lib/actions/products/create-product';
import { updateProduct } from '@/lib/actions/products/update-product';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { products, taxRates } from '@/lib/db/schema';
import { UNIT_OF_MEASUREMENT_OPTIONS } from '@/lib/gst/units';
import { paiseToRupees } from '@/lib/money';

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors';
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground';
const sectionClass = 'border-b border-border pb-8 mb-8 last:border-0 last:mb-0 last:pb-0';
const errorClass = 'mt-1.5 text-xs text-destructive';

export function ProductForm({ 
  product,
  taxRates: availableTaxRates 
}: { 
  product?: typeof products.$inferSelect;
  taxRates: (typeof taxRates.$inferSelect)[];
}) {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isService, setIsService] = useState(product?.hsn_sac_code?.startsWith('99') ?? false);
  
  const isEdit = !!product;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<ProductInput>({
    resolver: zodResolver(
      productSchema as never
    ),
    defaultValues: product ? {
      name: product.name,
      description: product.description || '',
      hsn_sac_code: product.hsn_sac_code,
      unit_of_measurement: product.unit_of_measurement as Extract<ProductInput['unit_of_measurement'], string>,
      default_sale_price: paiseToRupees(product.default_sale_price_paise),
      default_tax_rate_id: product.default_tax_rate_id || '',
      stock_quantity: product.stock_quantity ?? '',
    } : {
      name: '',
      description: '',
      hsn_sac_code: '',
      unit_of_measurement: 'PCS',
      default_sale_price: '' as unknown as number,
      default_tax_rate_id: '',
      stock_quantity: '',
    }
  });

  const onSubmit = async (data: ProductInput) => {
    setSuccess(false);
    setGlobalError(null);
    
    const result = isEdit 
      ? await updateProduct({ id: product.id, ...data }) 
      : await createProduct(data);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        router.push('/products');
      }, 1500);
    } else {
      if (result.error.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as Extract<keyof ProductInput, string>, { message: messages[0] });
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
          <div className="flex flex-col gap-5">
            {/* Service toggle (Local state only) */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Is this a Service?</p>
                <p className="text-xs text-muted-foreground">
                  Use SAC code instead of HSN
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsService(!isService)}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                  isService ? 'bg-success' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block size-5 transform rounded-full bg-white shadow transition-transform',
                    isService ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {/* Product name */}
            <div>
              <label className={labelClass}>
                {isService ? 'Service' : 'Product'} Name{' '}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={cn(inputClass, errors.name && 'border-destructive focus:ring-destructive')}
                placeholder={isService ? 'e.g. Web Development' : 'e.g. Dell Laptop'}
                {...register('name')}
              />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>

            {/* HSN / SAC */}
            <div>
              <label className={labelClass}>
                {isService ? 'SAC' : 'HSN'} Code{' '}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                className={cn(inputClass, errors.hsn_sac_code && 'border-destructive focus:ring-destructive')}
                placeholder={isService ? 'e.g. 998314' : 'e.g. 847130'}
                {...register('hsn_sac_code')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isService
                  ? 'Service Accounting Code (always 6 digits)'
                  : 'Harmonised System of Nomenclature code (4, 6, or 8 digits)'}
              </p>
              {errors.hsn_sac_code && <p className={errorClass}>{errors.hsn_sac_code.message}</p>}
            </div>

            {/* Unit + Rate */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  Unit <span className="text-destructive">*</span>
                </label>
                <select 
                  className={cn(inputClass, errors.unit_of_measurement && 'border-destructive focus:ring-destructive')}
                  {...register('unit_of_measurement')}
                >
                  {UNIT_OF_MEASUREMENT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                {errors.unit_of_measurement && <p className={errorClass}>{errors.unit_of_measurement.message}</p>}
              </div>
              <div>
                <label className={labelClass}>
                  Default Sale Price (₹) <span className="text-destructive">*</span>
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className={cn(inputClass, errors.default_sale_price && 'border-destructive focus:ring-destructive')} 
                  placeholder="0.00" 
                  {...register('default_sale_price')}
                />
                {errors.default_sale_price && <p className={errorClass}>{errors.default_sale_price.message}</p>}
              </div>
            </div>

            {/* GST rate & Stock */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>GST Rate</label>
                <select 
                  className={cn(inputClass, errors.default_tax_rate_id && 'border-destructive focus:ring-destructive')}
                  {...register('default_tax_rate_id')}
                >
                  <option value="">No rate assigned yet</option>
                  {availableTaxRates.map((r) => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                {errors.default_tax_rate_id && <p className={errorClass}>{errors.default_tax_rate_id.message}</p>}
              </div>
              <div>
                <label className={labelClass}>Stock Quantity (optional)</label>
                <input 
                  type="number" 
                  step="1" 
                  className={cn(inputClass, errors.stock_quantity && 'border-destructive focus:ring-destructive')} 
                  placeholder="0" 
                  {...register('stock_quantity')}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Leave blank if you don&apos;t track stock for this item.
                </p>
                {errors.stock_quantity && <p className={errorClass}>{errors.stock_quantity.message}</p>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                Description{' '}
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <textarea 
                rows={3} 
                className={cn(inputClass, "resize-none", errors.description && 'border-destructive focus:ring-destructive')} 
                placeholder="Short description..." 
                {...register('description')}
              />
              {errors.description && <p className={errorClass}>{errors.description.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {success && (
              <span className="flex items-center text-sm font-medium text-success">
                <Check className="mr-1.5 size-4" /> {isEdit ? 'Product updated successfully' : 'Product saved successfully'}
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/products">Cancel</Link>}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
