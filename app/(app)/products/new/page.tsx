'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

export default function NewProductPage() {
  const [isService, setIsService] = useState(false)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a product or service to your catalogue
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
          {/* Service toggle */}
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
              className={inputClass}
              placeholder={isService ? 'e.g. Web Development' : 'e.g. Dell Laptop'}
            />
          </div>

          {/* HSN / SAC */}
          <div>
            <label className={labelClass}>
              {isService ? 'SAC' : 'HSN'} Code
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder={isService ? 'e.g. 998314' : 'e.g. 847130'}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isService
                ? 'Service Accounting Code'
                : 'Harmonised System of Nomenclature code'}
            </p>
          </div>

          {/* Unit + Rate */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Unit</label>
              <select className={inputClass}>
                {['PCS', 'KG', 'LTR', 'MTR', 'HRS', 'SQM', 'SET', 'BOX', 'PRS', 'DZN'].map(
                  (u) => (
                    <option key={u}>{u}</option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className={labelClass}>Default Rate (₹)</label>
              <input type="number" className={inputClass} placeholder="0.00" />
            </div>
          </div>

          {/* GST rate */}
          <div>
            <label className={labelClass}>GST Rate</label>
            <select className={inputClass}>
              {['0%', '5%', '12%', '18%', '28%'].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>
              Description{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Short description..." />
          </div>

          {/* Barcode */}
          <div>
            <label className={labelClass}>
              Barcode{' '}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <input type="text" className={inputClass} placeholder="e.g. 8901030591427" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/products">Cancel</Link>}
            />
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Product
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
