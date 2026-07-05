'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'

const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

type CustomerType = 'B2B' | 'B2C' | 'Export'
const customerTypes: CustomerType[] = ['B2B', 'B2C', 'Export']

export default function NewCustomerPage() {
  const [type, setType] = useState<CustomerType>('B2B')

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new customer to your directory
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5">
          {/* Customer type */}
          <div>
            <p className={labelClass}>Customer Type</p>
            <div className="flex gap-2">
              {customerTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                    type === t
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Customer name */}
          <div>
            <label className={labelClass}>
              Customer Name <span className="text-destructive">*</span>
            </label>
            <input type="text" className={inputClass} placeholder="e.g. Tech Solutions Pvt Ltd" />
          </div>

          {/* GSTIN */}
          <div>
            <label className={labelClass}>GSTIN</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. 29AABCU9603R1ZM"
              maxLength={15}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              15-character GSTIN. State will be auto-detected.
            </p>
          </div>

          {/* Phone + Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" className={inputClass} placeholder="9876543210" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} placeholder="contact@example.com" />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input type="text" className={inputClass} placeholder="Street address, building" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>City</label>
              <input type="text" className={inputClass} placeholder="City" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input type="text" className={inputClass} placeholder="State" />
            </div>
            <div>
              <label className={labelClass}>PIN</label>
              <input type="text" className={inputClass} placeholder="560001" maxLength={6} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<Link href="/customers">Cancel</Link>}
            />
            <button
              type="button"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Save Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
