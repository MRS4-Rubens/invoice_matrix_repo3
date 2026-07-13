'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Printer, Pencil, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/app/empty-state'
import { cn } from '@/lib/utils'
import { getDisplayInvoiceStatus, getDisplayStatusLabel } from '@/lib/invoices/status'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]

function formatINR(amount: number): string {
  return '₹' + (amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [appliedMonth, setAppliedMonth] = useState(new Date().getMonth())
  const [appliedYear, setAppliedYear] = useState(CURRENT_YEAR)

  function handleApply() {
    setAppliedMonth(selectedMonth)
    setAppliedYear(selectedYear)
  }

  function handleClear() {
    setSearch('')
    setSelectedMonth(new Date().getMonth())
    setSelectedYear(CURRENT_YEAR)
    setAppliedMonth(new Date().getMonth())
    setAppliedYear(CURRENT_YEAR)
  }

  const filtered = initialInvoices.filter((inv) => {
    // If we only have draft invoices without dates, they might not filter well by month.
    // For now, filter by created_at or invoice_date.
    const invDate = inv.invoice_date ? new Date(inv.invoice_date) : new Date();
    const matchesMonth = invDate.getMonth() === appliedMonth && invDate.getFullYear() === appliedYear
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
    return matchesMonth && matchesSearch
  })

  return (
    <div>
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">Manage and track all your GST tax invoices</p>
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {MONTHS.map((m, i) => (<option key={m} value={i}>{m}</option>))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            {YEARS.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <Button variant="outline" size="sm" type="button" onClick={handleApply}>Apply</Button>
          <Button variant="ghost" size="sm" type="button" onClick={handleClear}>Clear</Button>
          <Button size="sm" nativeButton={false} render={<Link href="/invoices/new"><Plus className="size-4" />New Invoice</Link>} />
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        Showing {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} for <span className="font-medium text-foreground">{MONTHS[appliedMonth]} {appliedYear}</span>
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-6" />}
          title="No invoices found"
          description={`No invoices for ${MONTHS[appliedMonth]} ${appliedYear}. Try a different month or create a new invoice.`}
          action={{ label: 'Create Invoice', href: '/invoices/new' }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-left">Invoice #</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-left">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-left">Customer</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-right">Grand Total</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-left">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline">
                        {inv.invoice_number || 'DRAFT'}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {inv.customer_name}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatINR(inv.grand_total_paise)}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const status = getDisplayInvoiceStatus(inv);
                        const { label, colorClass } = getDisplayStatusLabel(status);
                        return (
                          <span className={cn('inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold', colorClass)}>
                            {label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/invoices/${inv.id}`} title={inv.lifecycle_status === 'draft' ? "Edit Draft" : "View / Print"} className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                          {inv.lifecycle_status === 'draft' ? <Pencil className="size-3.5" /> : <Printer className="size-3.5" />}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
