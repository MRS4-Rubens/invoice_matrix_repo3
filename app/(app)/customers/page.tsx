import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/app/empty-state'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Customers' }

const customers = [
  {
    initials: 'TS',
    name: 'Tech Solutions Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    city: 'Mumbai',
    state: 'MH',
    outstanding: '₹7,500',
    hasOutstanding: true,
    type: 'B2B',
  },
  {
    initials: 'MT',
    name: 'Mehta Traders',
    gstin: null,
    city: 'Delhi',
    state: 'DL',
    outstanding: '₹0',
    hasOutstanding: false,
    type: 'B2B',
  },
  {
    initials: 'PN',
    name: 'Priya Nair Designs',
    gstin: null,
    city: 'Chennai',
    state: 'TN',
    outstanding: '₹2,200',
    hasOutstanding: true,
    type: 'B2C',
  },
]

export default function CustomersPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customer directory
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/customers/new">
              <Plus className="size-4" />
              Add Customer
            </Link>
          }
        />
      </div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        <Search className="size-4 shrink-0" />
        <input
          type="text"
          placeholder="Search customers..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Customer cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <div key={c.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {c.initials}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{c.name}</p>
                  {c.gstin ? (
                    <p className="font-mono text-xs text-muted-foreground">
                      {c.gstin}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No GSTIN</p>
                  )}
                </div>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {c.type}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {c.city}, {c.state}
              </p>
              <p
                className={
                  c.hasOutstanding
                    ? 'text-sm font-medium text-destructive'
                    : 'text-sm font-medium text-muted-foreground'
                }
              >
                {c.outstanding}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state below */}
      <div className="mt-6">
        <EmptyState
          icon={<Users className="size-5" />}
          title="No more customers"
          description="Add your next customer to build your directory."
          action={{ label: 'Add Customer', href: '/customers/new' }}
        />
      </div>
    </div>
  )
}
