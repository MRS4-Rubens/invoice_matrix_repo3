'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Printer, Pencil, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/app/empty-state'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id: string
  invoiceNo: string
  date: string
  dateISO: string
  customer: string
  gstin: string
  taxable: number
  gst: number
  grandTotal: number
  supplyType: 'Intra' | 'Inter' | 'Exempt'
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_INVOICES: Invoice[] = [
  {
    id: '005',
    invoiceNo: 'INV-25/06/25/005',
    date: '25/06/2025',
    dateISO: '2025-06-25',
    customer: 'Tech Solutions Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    taxable: 18000,
    gst: 3240,
    grandTotal: 21240,
    supplyType: 'Inter',
  },
  {
    id: '004',
    invoiceNo: 'INV-25/06/25/004',
    date: '24/06/2025',
    dateISO: '2025-06-24',
    customer: 'Mehta Traders',
    gstin: '',
    taxable: 7500,
    gst: 1350,
    grandTotal: 8850,
    supplyType: 'Intra',
  },
  {
    id: '003',
    invoiceNo: 'INV-25/06/25/003',
    date: '23/06/2025',
    dateISO: '2025-06-23',
    customer: 'Sunrise Exports',
    gstin: '24AABCU9603R1ZM',
    taxable: 32400,
    gst: 0,
    grandTotal: 32400,
    supplyType: 'Exempt',
  },
  {
    id: '002',
    invoiceNo: 'INV-25/06/25/002',
    date: '22/06/2025',
    dateISO: '2025-06-22',
    customer: 'Patel Fabrics',
    gstin: '29AABCU9603R1ZM',
    taxable: 9200,
    gst: 1104,
    grandTotal: 10304,
    supplyType: 'Intra',
  },
  {
    id: '001',
    invoiceNo: 'INV-25/06/25/001',
    date: '21/06/2025',
    dateISO: '2025-06-21',
    customer: 'Rajesh Electronics',
    gstin: '29BBBFU1234R1ZP',
    taxable: 15600,
    gst: 2808,
    grandTotal: 18408,
    supplyType: 'Intra',
  },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = 2025
const YEARS = [2025, 2024, 2023, 2022]

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const supplyTypeBadge: Record<Invoice['supplyType'], string> = {
  Intra: 'bg-primary text-primary-foreground',
  Inter: 'border border-primary text-primary bg-transparent',
  Exempt: 'bg-muted text-muted-foreground',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(5) // 0-indexed, default June
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [appliedMonth, setAppliedMonth] = useState(5)
  const [appliedYear, setAppliedYear] = useState(CURRENT_YEAR)

  function handleApply() {
    setAppliedMonth(selectedMonth)
    setAppliedYear(selectedYear)
  }

  function handleClear() {
    setSearch('')
    setSelectedMonth(5)
    setSelectedYear(CURRENT_YEAR)
    setAppliedMonth(5)
    setAppliedYear(CURRENT_YEAR)
  }

  const filtered = MOCK_INVOICES.filter((inv) => {
    const invDate = new Date(inv.dateISO)
    const matchesMonth =
      invDate.getMonth() === appliedMonth && invDate.getFullYear() === appliedYear
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q) ||
      inv.gstin.toLowerCase().includes(q)
    return matchesMonth && matchesSearch
  })

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-5 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track all your GST tax invoices
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, invoice #, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Month / Year / Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <Button variant="outline" size="sm" type="button" onClick={handleApply}>
            Apply
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={handleClear}>
            Clear
          </Button>

          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href="/invoices/new" className="flex items-center gap-1.5">
                <Plus className="size-4" />
                New Invoice
              </Link>
            }
          />
        </div>
      </div>

      {/* ── Count ── */}
      <p className="mb-3 text-sm text-muted-foreground">
        Showing {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} for{' '}
        <span className="font-medium text-foreground">
          {MONTHS[appliedMonth]} {appliedYear}
        </span>
      </p>

      {/* ── Table or Empty ── */}
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
                  {[
                    { label: 'Invoice #', align: 'left' },
                    { label: 'Date', align: 'left' },
                    { label: 'Customer', align: 'left' },
                    { label: 'GSTIN', align: 'left' },
                    { label: 'Taxable', align: 'right' },
                    { label: 'GST', align: 'right' },
                    { label: 'Grand Total', align: 'right' },
                    { label: 'Type', align: 'left' },
                    { label: 'Actions', align: 'center' },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className={cn(
                        'px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.align === 'left' && 'text-left',
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-muted/20"
                  >
                    {/* Invoice # — clickable primary link */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-mono text-xs font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {inv.date}
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground">
                      {inv.customer}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {inv.gstin || '—'}
                    </td>

                    <td className="px-4 py-3 text-right text-foreground">
                      {formatINR(inv.taxable)}
                    </td>

                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatINR(inv.gst)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatINR(inv.grandTotal)}
                    </td>

                    {/* Supply Type badge */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
                          supplyTypeBadge[inv.supplyType],
                        )}
                      >
                        {inv.supplyType}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/invoices/${inv.id}`}
                          title="Print / Preview"
                          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Printer className="size-3.5" />
                        </Link>
                        <button
                          type="button"
                          title="Edit Invoice"
                          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete Invoice"
                          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
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
