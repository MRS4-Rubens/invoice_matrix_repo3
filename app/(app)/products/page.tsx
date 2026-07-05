'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tabs = ['Products', 'Services'] as const
type Tab = (typeof tabs)[number]

const products = [
  {
    name: 'Web Development Services',
    hsn: '998314',
    rate: '₹2,500',
    unit: 'HRS',
    gst: '18%',
    type: 'Services',
  },
  {
    name: 'Dell Laptop Inspiron',
    hsn: '847130',
    rate: '₹65,000',
    unit: 'PCS',
    gst: '18%',
    type: 'Products',
  },
  {
    name: 'Printer Paper A4',
    hsn: '480256',
    rate: '₹350',
    unit: 'PKT',
    gst: '12%',
    type: 'Products',
  },
]

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Products')

  const filtered = products.filter((p) => p.type === activeTab)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your product and service catalogue
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/products/new" className="flex items-center gap-1.5">
              <Plus className="size-4" />
              Add Product
            </Link>
          }
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-2 text-sm transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <Search className="size-4 shrink-0" />
        <input
          type="text"
          placeholder="Search products..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Product cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <div key={p.name} className="relative rounded-xl border border-border bg-card p-5">
            {/* Edit/Delete */}
            <div className="absolute right-4 top-4 flex gap-1">
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <p className="pr-14 font-semibold text-foreground">{p.name}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              HSN: {p.hsn}
            </p>

            <p className="mt-3 text-lg font-bold text-foreground">
              {p.rate}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {p.unit}
              </span>
            </p>

            <div className="mt-3">
              <span className="rounded-full bg-success-subtle px-2 py-0.5 text-xs font-medium text-success">
                {p.gst} GST
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
