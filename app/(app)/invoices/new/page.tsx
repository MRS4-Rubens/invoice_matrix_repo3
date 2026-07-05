'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: number
  name: string
  hsn: string
  qty: number
  rate: number
  discountPct: number
  gstRate: number
}

interface CustomerState {
  name: string
  gstin: string
  address: string
}

type SupplyType = 'Intra' | 'Inter'

// ── Constants ─────────────────────────────────────────────────────────────────
const BUSINESS_STATE_CODE = '29' // Karnataka
const GST_RATES = [0, 5, 12, 18, 28]

// ── Helpers ──────────────────────────────────────────────────────────────────
function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTodayInvoiceNo(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `INV-${dd}/${mm}/${yy}/001`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function getStateCodeFromGstin(gstin: string): string {
  return gstin.trim().length >= 2 ? gstin.trim().substring(0, 2) : ''
}

function detectSupplyType(customerGstin: string): SupplyType {
  const code = getStateCodeFromGstin(customerGstin)
  if (!code) return 'Intra'
  return code === BUSINESS_STATE_CODE ? 'Intra' : 'Inter'
}

function calcItem(item: LineItem, supplyType: SupplyType) {
  const grossAmt = round2(item.qty * item.rate)
  const discAmt = round2(grossAmt * (item.discountPct / 100))
  const taxableAmt = round2(grossAmt - discAmt)
  const gstAmt = round2(taxableAmt * (item.gstRate / 100))
  const cgstAmt = supplyType === 'Intra' ? round2(gstAmt / 2) : 0
  const sgstAmt = supplyType === 'Intra' ? round2(gstAmt / 2) : 0
  const igstAmt = supplyType === 'Inter' ? gstAmt : 0
  const finalAmt = round2(taxableAmt + gstAmt)
  return { grossAmt, discAmt, taxableAmt, gstAmt, cgstAmt, sgstAmt, igstAmt, finalAmt }
}

let nextId = 2

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const [customer, setCustomer] = useState<CustomerState>({ name: '', gstin: '', address: '' })
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, name: '', hsn: '', qty: 1, rate: 0, discountPct: 0, gstRate: 18 },
  ])
  const [notes, setNotes] = useState('')

  // Read disc% column toggle from Invoice Settings
  const [discEnabled, setDiscEnabled] = useState(true)
  useEffect(() => {
    function readSetting() {
      try {
        const s = localStorage.getItem('bm_invoice_settings')
        if (s) {
          const parsed = JSON.parse(s)
          if (typeof parsed.discEnabled === 'boolean') setDiscEnabled(parsed.discEnabled)
        }
      } catch {}
    }
    readSetting()
    // React when settings are saved in another tab / the Settings page dispatches StorageEvent
    window.addEventListener('storage', readSetting)
    return () => window.removeEventListener('storage', readSetting)
  }, [])

  // Derived
  const supplyType: SupplyType = detectSupplyType(customer.gstin)
  const isValidGstin = customer.gstin.trim().length === 15

  // Calc per-item and invoice totals
  const calcItems = items.map((item) => ({ item, calc: calcItem(item, supplyType) }))
  const totalTaxable = round2(calcItems.reduce((s, { calc }) => s + calc.taxableAmt, 0))
  const totalCGST    = round2(calcItems.reduce((s, { calc }) => s + calc.cgstAmt, 0))
  const totalSGST    = round2(calcItems.reduce((s, { calc }) => s + calc.sgstAmt, 0))
  const totalIGST    = round2(calcItems.reduce((s, { calc }) => s + calc.igstAmt, 0))
  const totalGST     = round2(totalCGST + totalSGST + totalIGST)
  const grandTotal   = round2(totalTaxable + totalGST)

  // Item handlers
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: nextId++, name: '', hsn: '', qty: 1, rate: 0, discountPct: 0, gstRate: 18 },
    ])
  }

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateItem = useCallback(
    <K extends keyof LineItem>(id: number, key: K, value: LineItem[K]) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [key]: value } : i)))
    },
    [],
  )

  // Reusable CSS strings
  const inputCls =
    'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
  const labelCls = 'mb-1.5 block text-xs font-medium text-muted-foreground'
  const sectionTitleCls = 'flex items-center gap-2 mb-4'
  const sectionBarCls = 'w-1 h-5 rounded-full bg-primary shrink-0'

  return (
    <div>
      {/* ── Page header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">New Invoice</h1>
        </div>
        <Button type="button" size="sm">
          <Save className="size-4" />
          Save Invoice
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {/* ── Row 1: Invoice Details + Customer Details ── */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Invoice Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}>
              <span className={sectionBarCls} />
              <span className="text-sm font-semibold text-foreground">Invoice Details</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Invoice Number — auto-generated, readonly */}
              <div>
                <label className={labelCls}>Invoice Number</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={getTodayInvoiceNo()}
                    className={cn(inputCls, 'pr-16 font-mono text-xs')}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success">
                    AUTO
                  </span>
                </div>
                <p className="mt-1 text-xs text-success">&#10003; Valid</p>
              </div>

              {/* Invoice Date */}
              <div>
                <label className={labelCls}>Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}>
              <span className={sectionBarCls} />
              <span className="text-sm font-semibold text-foreground">Customer Details</span>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Customer Name</label>
                <input
                  type="text"
                  placeholder="Type to search or enter name..."
                  value={customer.name}
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    value={customer.gstin}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, gstin: e.target.value.toUpperCase() }))
                    }
                    className={cn(inputCls, 'font-mono text-xs uppercase')}
                    maxLength={15}
                  />
                  {customer.gstin.length > 0 && (
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        isValidGstin ? 'text-success' : 'text-muted-foreground',
                      )}
                    >
                      {isValidGstin
                        ? `\u2713 ${supplyType === 'Intra' ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}`
                        : `${customer.gstin.length}/15 characters`}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <input
                    type="text"
                    placeholder="Customer address"
                    value={customer.address}
                    onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Invoice Items ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className={cn(sectionTitleCls, 'mb-0')}>
              <span className={sectionBarCls} />
              <span className="text-sm font-semibold text-foreground">Invoice Items</span>
            </div>
            <p className="text-xs text-muted-foreground">
              GST auto-calculated per item
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    { label: 'S.No', cls: 'text-center w-10', alwaysShow: true },
                    { label: 'Item / Description', cls: 'text-left min-w-[180px]', alwaysShow: true },
                    { label: 'HSN', cls: 'text-left', alwaysShow: true },
                    { label: 'Qty', cls: 'text-left', alwaysShow: true },
                    { label: 'Rate (₹)', cls: 'text-left', alwaysShow: true },
                    { label: 'Disc %', cls: 'text-left', alwaysShow: false },
                    { label: 'GST %', cls: 'text-left', alwaysShow: true },
                    { label: 'Taxable', cls: 'text-right', alwaysShow: true },
                    { label: 'Final Amt (₹)', cls: 'text-right', alwaysShow: true },
                    { label: '', cls: 'w-8', alwaysShow: true },
                  ].filter((col) => col.alwaysShow || discEnabled).map((col) => (
                    <th
                      key={col.label}
                      className={cn(
                        'px-2 py-2.5 text-xs font-medium text-muted-foreground',
                        col.cls,
                      )}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const { calc } = calcItems[idx]
                  return (
                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2.5 text-center text-sm text-muted-foreground">
                        {idx + 1}
                      </td>

                      <td className="px-2 py-2.5">
                        <input
                          type="text"
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>

                      <td className="px-2 py-2.5">
                        <input
                          type="text"
                          placeholder="HSN"
                          value={item.hsn}
                          onChange={(e) => updateItem(item.id, 'hsn', e.target.value)}
                          className="w-20 rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>

                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(item.id, 'qty', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>

                      <td className="px-2 py-2.5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>

                      {discEnabled && (
                        <td className="px-2 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discountPct}
                            onChange={(e) =>
                              updateItem(item.id, 'discountPct', parseFloat(e.target.value) || 0)
                            }
                            className="w-16 rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                      )}

                      <td className="px-2 py-2.5">
                        <select
                          value={item.gstRate}
                          onChange={(e) =>
                            updateItem(item.id, 'gstRate', parseFloat(e.target.value))
                          }
                          className="rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>{r}%</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-2 py-2.5 text-right text-xs text-muted-foreground">
                        {formatINR(calc.taxableAmt)}
                      </td>

                      <td className="px-2 py-2.5 text-right font-medium text-foreground">
                        {formatINR(calc.finalAmt)}
                      </td>

                      <td className="px-2 py-2.5 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80"
          >
            <Plus className="size-3.5" />
            Add Item
          </button>
        </div>

        {/* ── Row 3: Notes + Invoice Summary ── */}
        <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
          {/* Notes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}>
              <span className={sectionBarCls} />
              <span className="text-sm font-semibold text-foreground">Notes</span>
            </div>
            <textarea
              rows={5}
              placeholder="Additional notes for the customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          {/* Invoice Summary */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}>
              <span className={sectionBarCls} />
              <span className="text-sm font-semibold text-foreground">Invoice Summary</span>
            </div>

            {/* GST type pill */}
            <div className="mb-4">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                  supplyType === 'Intra'
                    ? 'bg-success-subtle text-success'
                    : 'bg-blue-100 text-blue-700',
                )}
              >
                {supplyType === 'Intra'
                  ? 'Intra-state Supply — CGST + SGST'
                  : 'Inter-state Supply — IGST'}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable Value</span>
                <span className="font-medium text-foreground">{formatINR(totalTaxable)}</span>
              </div>

              {supplyType === 'Intra' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-primary">CGST</span>
                    <span className="text-foreground">{formatINR(totalCGST)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-primary">SGST</span>
                    <span className="text-foreground">{formatINR(totalSGST)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-primary">IGST</span>
                  <span className="text-foreground">{formatINR(totalIGST)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Total GST</span>
                <span className="text-foreground">{formatINR(totalGST)}</span>
              </div>

              <div className="my-1 border-t border-border" />

              <div className="flex justify-between">
                <span className="text-base font-bold text-foreground">Grand Total</span>
                <span className="text-base font-bold text-primary">{formatINR(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="sm" type="button" className="flex-1">
                Save as Draft
              </Button>
              <Button type="button" size="sm" className="flex-1">
                <Save className="size-4" />
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
