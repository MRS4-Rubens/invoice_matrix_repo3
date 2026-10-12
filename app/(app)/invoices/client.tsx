'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Plus, Printer, Pencil, FileText, ChevronDown, Eye, Download, ArrowDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/app/empty-state'
import { cn } from '@/lib/utils'
import { getDisplayInvoiceStatus, getDisplayStatusLabel } from '@/lib/invoices/status'
import { getArchivedPdfUrl } from '@/lib/actions/invoices/get-archived-pdf-url'
import { getArchivedCreditNotePdfUrl } from '@/lib/actions/credit-notes/get-archived-credit-note-pdf-url'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]

function formatINR(amount: number): string {
  return '₹' + (amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateInput: string | Date | null) {
  if (!dateInput) return '—'
  const date = new Date(dateInput)
  const day = String(date.getDate()).padStart(2, '0')
  const month = MONTHS[date.getMonth()]
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

function getInitials(name: string) {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name: string) {
  const colors = [
    'bg-gradient-to-br from-orange-500 to-amber-500',
    'bg-gradient-to-br from-emerald-500 to-teal-600',
    'bg-gradient-to-br from-violet-500 to-indigo-600',
    'bg-gradient-to-br from-sky-500 to-cyan-600',
    'bg-gradient-to-br from-pink-500 to-rose-500',
    'bg-gradient-to-br from-fuchsia-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

interface InvoiceItem {
  id: string
  invoice_number: string | null
  invoice_date: string | Date | null
  grand_total_paise: number
  lifecycle_status: 'draft' | 'finalized'
  payment_status: 'unpaid' | 'partially_paid' | 'paid' | 'overdue'
  due_date: string | Date | null
  customer_name: string
  place_of_supply_state_code: string | null
}

export interface CreditNoteItem {
  id: string
  credit_note_number: string
  credit_note_sequence: number | null
  reason: string
  lifecycle_status: 'draft' | 'finalized'
  status?: string | null
  voided_at?: Date | string | null
  void_reason?: string | null
  void_notes?: string | null
  issue_date: string | Date | null
  subtotal_paise: number
  total_tax_paise: number
  grand_total_paise: number
  created_at: Date | string
  original_invoice_id: string
  original_invoice_number: string
  original_invoice_date: string | Date | null
  billing_name_snapshot: string | null
  billing_gstin_snapshot: string | null
}

export function InvoicesClient({
  initialInvoices,
  initialCreditNotes = [],
  businessStateCode
}: {
  initialInvoices: InvoiceItem[]
  initialCreditNotes?: CreditNoteItem[]
  businessStateCode: string
}) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'credit_notes'>('invoices')
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

  const filteredInvoices = initialInvoices.filter((inv) => {
    const invDate = inv.invoice_date ? new Date(inv.invoice_date) : new Date()
    const matchesMonth = invDate.getMonth() === appliedMonth && invDate.getFullYear() === appliedYear
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q)) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q))
    return matchesMonth && matchesSearch
  })

  const filteredCreditNotes = initialCreditNotes.filter((note) => {
    const noteDate = note.issue_date ? new Date(note.issue_date) : new Date(note.created_at)
    const matchesMonth = noteDate.getMonth() === appliedMonth && noteDate.getFullYear() === appliedYear
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      (note.credit_note_number && note.credit_note_number.toLowerCase().includes(q)) ||
      (note.original_invoice_number && note.original_invoice_number.toLowerCase().includes(q)) ||
      (note.billing_name_snapshot && note.billing_name_snapshot.toLowerCase().includes(q)) ||
      (note.reason && note.reason.toLowerCase().includes(q))
    return matchesMonth && matchesSearch
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        {/* Left Side: Heading & Justified Tagline */}
        <div className="flex flex-col gap-1 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
            INVOICES
          </h1>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
            Effortlessly Track, Organize, Maintain, and <br />
            Download All Your Tax Invoices in One Place
          </p>
        </div>

        {/* Right Side: Filter and Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-card p-3 rounded-xl border border-border/70 shadow-[0_1px_3px_rgba(99,102,241,0.03),0_8px_16px_-8px_rgba(99,102,241,0.08)] flex-1 lg:max-w-4xl w-full">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm max-w-xs focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'invoices' ? "Search by customer, invoice #..." : "Search by CN #, invoice #, customer..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="appearance-none rounded-lg border border-border bg-background pl-3 pr-8 h-9 text-[13px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[96px] shadow-sm font-semibold hover:bg-accent/40 transition-colors"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-muted-foreground/80" />
            </div>

            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none rounded-lg border border-border bg-background pl-3 pr-8 h-9 text-[13px] sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer min-w-[86px] shadow-sm font-semibold hover:bg-accent/40 transition-colors"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-muted-foreground/80" />
            </div>

            <Button
              onClick={handleApply}
              className="h-9 px-4 text-[13px] sm:text-sm font-bold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
            >
              Apply
            </Button>
            <Button
              variant="outline"
              onClick={handleClear}
              className="h-9 px-4 text-[13px] sm:text-sm font-semibold shadow-sm hover:bg-accent cursor-pointer"
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: Tax Invoices vs Credit Notes & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={cn(
              "px-4 py-2 text-[14px] sm:text-[15px] font-bold rounded-lg transition-all cursor-pointer border",
              activeTab === 'invoices'
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Tax Invoices ({filteredInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credit_notes')}
            className={cn(
              "px-4 py-2 text-[14px] sm:text-[15px] font-bold rounded-lg transition-all cursor-pointer border flex items-center gap-1.5",
              activeTab === 'credit_notes'
                ? "bg-red-600 text-white border-red-700 shadow-xs"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Credit Notes ({filteredCreditNotes.length})
          </button>
        </div>

        <Link href="/invoices/new">
          <Button
            className="shadow-md bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-[13px] sm:text-sm font-bold h-9 px-4 rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-px active:translate-y-px flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'invoices' ? (
        <div>
          <p className="text-[13px] sm:text-sm text-muted-foreground px-1 mb-1.5 font-medium">
            Showing {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} for <span className="font-semibold text-foreground">{MONTHS[appliedMonth]} {appliedYear}</span>
          </p>

          {filteredInvoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="size-6" />}
              title="No invoices found"
              description={`No invoices registered for ${MONTHS[appliedMonth]} ${appliedYear}. Try a different period or create one.`}
              action={{ label: 'Create Invoice', href: '/invoices/new' }}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Invoice #</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Date</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Customer</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Supply Type</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Grand Total</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Status</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const isIntra = inv.place_of_supply_state_code === businessStateCode
                      return (
                        <tr key={inv.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/10">
                          <td className="px-3.5 py-[3px]">
                            <div className="relative -left-[3px]">
                              {inv.lifecycle_status === 'draft' ? (
                                <span className="inline-flex items-center rounded bg-muted/60 px-2 py-0.5 font-mono text-[13px] font-bold text-muted-foreground border border-border/50 uppercase tracking-wide">
                                  DRAFT
                                </span>
                              ) : (
                                <Link href={`/invoices/${inv.id}`}>
                                  <span className="inline-flex items-center rounded-md bg-indigo-100/70 px-2 py-[1px] font-mono text-[15px] font-bold tracking-wide text-indigo-700 ring-1 ring-indigo-200 transition-all duration-200 hover:bg-indigo-200/70">
                                    {inv.invoice_number}
                                  </span>
                                </Link>
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-1 text-[13px] text-muted-foreground whitespace-nowrap font-medium">
                            {formatDate(inv.invoice_date)}
                          </td>
                          <td className="px-3.5 py-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-xs',
                                  getAvatarColor(inv.customer_name)
                                )}
                              >
                                {getInitials(inv.customer_name)}
                              </div>
                              <span className="text-[13px] font-semibold text-foreground truncate max-w-[170px]">
                                {inv.customer_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-1">
                            <span
                              className={cn(
                                'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider border shadow-2xs leading-tight',
                                isIntra
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              )}
                            >
                              {isIntra ? 'Intra-State' : 'Inter-State'}
                            </span>
                          </td>
                          <td className="px-3.5 py-1 text-right font-mono text-[13px] sm:text-[14px] font-bold text-foreground">
                            {formatINR(inv.grand_total_paise)}
                          </td>
                          <td className="px-3.5 py-1">
                            {(() => {
                              const displayStatus = getDisplayInvoiceStatus(inv)
                              const { label, colorClass } = getDisplayStatusLabel(displayStatus)
                              return (
                                <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-2xs leading-tight', colorClass)}>
                                  {label}
                                </span>
                              )
                            })()}
                          </td>
                          <td className="px-3.5 py-1">
                            <div className="flex items-center justify-center gap-1">
                              {inv.lifecycle_status === 'draft' ? (
                                <Link
                                  href={`/invoices/${inv.id}`}
                                  title="Edit Draft"
                                  className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm"
                                >
                                  <Pencil className="size-3.5" />
                                </Link>
                              ) : (
                                <>
                                  <Link
                                    href={`/invoices/${inv.id}`}
                                    title="View Invoice"
                                    className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm"
                                  >
                                    <Eye className="size-3.5" />
                                  </Link>
                                  <button
                                    onClick={async (e) => {
                                      e.preventDefault()
                                      const res = await getArchivedPdfUrl({ id: inv.id })
                                      if (res.success) {
                                        window.open(res.data.url, '_blank')
                                      } else {
                                        alert(res.error.message)
                                      }
                                    }}
                                    title="Download PDF"
                                    className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm cursor-pointer"
                                  >
                                    <Download className="size-3.5" />
                                  </button>
                                  <Link
                                    href={`/invoices/${inv.id}?print=true`}
                                    title="Print Invoice"
                                    className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm"
                                  >
                                    <Printer className="size-3.5" />
                                  </Link>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Credit Notes Tab */
        <div>
          <p className="text-[13px] sm:text-sm text-muted-foreground px-1 mb-1.5 font-medium">
            Showing {filteredCreditNotes.length} credit note{filteredCreditNotes.length !== 1 ? 's' : ''} for <span className="font-semibold text-foreground">{MONTHS[appliedMonth]} {appliedYear}</span>
          </p>

          {filteredCreditNotes.length === 0 ? (
            <EmptyState
              icon={<ArrowDownRight className="size-6 text-red-500" />}
              title="No credit notes found"
              description={`No credit notes issued for ${MONTHS[appliedMonth]} ${appliedYear}. To issue a credit note, open any finalized invoice and click 'Issue Credit Note'.`}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Credit Note #</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Date</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Original Invoice</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Customer</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Reason</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Credit Amount</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left">Status</th>
                      <th className="px-3.5 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCreditNotes.map((note) => {
                      const isFinalized = note.lifecycle_status === 'finalized'
                      const isVoided = note.status === 'voided'
                      return (
                        <tr key={note.id} className={cn("border-b border-border last:border-0 transition-colors", isVoided ? "bg-muted/30 opacity-75 hover:opacity-90" : "hover:bg-muted/10")}>
                          <td className="px-3.5 py-[3px]">
                            <Link href={`/credit-notes/${note.id}`}>
                              <span className={cn(
                                "inline-flex items-center rounded-md px-2 py-[1px] font-mono text-[14px] font-bold tracking-wide transition-all duration-200",
                                isVoided
                                  ? "bg-slate-100 text-slate-500 line-through ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800"
                                  : "bg-red-100/70 text-red-700 ring-1 ring-red-200 hover:bg-red-200/70"
                              )}>
                                {note.credit_note_number}
                              </span>
                            </Link>
                          </td>
                          <td className="px-3.5 py-1 text-[13px] text-muted-foreground whitespace-nowrap font-medium">
                            {formatDate(note.issue_date || note.created_at)}
                          </td>
                          <td className="px-3.5 py-1">
                            <Link href={`/invoices/${note.original_invoice_id}`} className="font-mono text-[13px] font-bold text-primary hover:underline">
                              {note.original_invoice_number}
                            </Link>
                          </td>
                          <td className="px-3.5 py-1">
                            <span className="text-[13px] font-semibold text-foreground truncate max-w-[170px] block">
                              {note.billing_name_snapshot || 'Cash Customer'}
                            </span>
                          </td>
                          <td className="px-3.5 py-1 text-[13px] text-muted-foreground">
                            {note.reason}
                            {isVoided && note.void_reason && (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold block text-[11px]">
                                Voided ({note.void_reason})
                              </span>
                            )}
                          </td>
                          <td className={cn(
                            "px-3.5 py-1 text-right font-mono text-[13px] sm:text-[14px] font-bold",
                            isVoided ? "line-through text-muted-foreground/60" : "text-red-600 dark:text-red-400"
                          )}>
                            -{formatINR(note.grand_total_paise)}
                          </td>
                          <td className="px-3.5 py-1">
                            <span className={cn(
                              "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider shadow-2xs border leading-tight",
                              isVoided
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300"
                                : isFinalized
                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300"
                                : "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300"
                            )}>
                              {isVoided ? 'VOIDED' : (isFinalized ? 'Finalized' : 'Draft')}
                            </span>
                          </td>
                          <td className="px-3.5 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <Link
                                href={`/credit-notes/${note.id}`}
                                title="View Credit Note"
                                className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm"
                              >
                                <Eye className="size-3.5" />
                              </Link>
                              {isFinalized && (
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault()
                                    const res = await getArchivedCreditNotePdfUrl({ id: note.id })
                                    if (res.success) {
                                      window.open(res.data.url, '_blank')
                                    } else {
                                      alert(res.error.message)
                                    }
                                  }}
                                  title="Download PDF"
                                  className="flex size-7.5 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm cursor-pointer"
                                >
                                  <Download className="size-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
