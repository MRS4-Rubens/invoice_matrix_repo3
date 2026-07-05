'use client'

import Link from 'next/link'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, use } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  slNo: number
  description: string
  hsn: string
  qty: number
  rate: number
  taxable: number
  gstPct: number
  gstAmt: number
  amount: number
}

interface Invoice {
  invoiceNo: string
  date: string
  supplyType: 'Intra' | 'Inter'
  business: {
    name: string
    gstin: string
    phone: string
    address: string
    state: string
  }
  customer: {
    name: string
    gstin: string
    state: string
  }
  items: InvoiceItem[]
  taxableTotal: number
  cgst: number
  sgst: number
  igst: number
  totalGst: number
  grandTotal: number
  terms: string[]
}

// ── Amount in words ───────────────────────────────────────────────────────────
function amountInWords(amount: number): string {
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function convertHundreds(n: number): string {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertHundreds(n % 100) : '')
  }

  const intPart = Math.floor(amount)
  const decPart = Math.round((amount - intPart) * 100)

  function convert(n: number): string {
    if (n === 0) return 'Zero'
    let result = ''
    let rem = n
    if (rem >= 10000000) { result += convert(Math.floor(rem / 10000000)) + ' Crore '; rem %= 10000000 }
    if (rem >= 100000)   { result += convert(Math.floor(rem / 100000)) + ' Lakh '; rem %= 100000 }
    if (rem >= 1000)     { result += convert(Math.floor(rem / 1000)) + ' Thousand '; rem %= 1000 }
    result += convertHundreds(rem)
    return result.trim()
  }

  let words = convert(intPart) + ' Rupees'
  if (decPart > 0) words += ' and ' + convert(decPart) + ' Paise'
  return words + ' Only'
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtINR(n: number): string {
  return '₹' + fmt(n)
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const TERMS = [
  'Goods once sold will not be taken back.',
  'Payment to be made within 30 days from the date of invoice.',
  'Interest @ 24% per annum will be charged on overdue invoices until payment is received.',
  'All disputes subject to Karnataka jurisdiction only.',
]

const INVOICES: Record<string, Invoice> = {
  '005': {
    invoiceNo: 'INV-25/06/25/005', date: '25/06/2025', supplyType: 'Inter',
    business: { name: 'Acme Trading Co.', gstin: '29AABCU9603R1ZM', phone: '9876543210', address: '12, MG Road, Bengaluru', state: 'Karnataka (29)' },
    customer: { name: 'Tech Solutions Pvt Ltd', gstin: '27AAPFU0939F1ZV', state: 'Maharashtra (27)' },
    items: [
      { slNo: 1, description: 'Web Development Services', hsn: '998314', qty: 10, rate: 1500, taxable: 15000, gstPct: 18, gstAmt: 2700, amount: 17700 },
      { slNo: 2, description: 'Server Hosting (Annual)',  hsn: '998315', qty: 1,  rate: 3000, taxable: 3000,  gstPct: 18, gstAmt: 540,  amount: 3540  },
    ],
    taxableTotal: 18000, cgst: 0, sgst: 0, igst: 3240, totalGst: 3240, grandTotal: 21240, terms: TERMS,
  },
  '004': {
    invoiceNo: 'INV-25/06/25/004', date: '24/06/2025', supplyType: 'Intra',
    business: { name: 'Acme Trading Co.', gstin: '29AABCU9603R1ZM', phone: '9876543210', address: '12, MG Road, Bengaluru', state: 'Karnataka (29)' },
    customer: { name: 'Mehta Traders', gstin: '', state: 'Karnataka (29)' },
    items: [
      { slNo: 1, description: 'Printer Paper A4 Ream', hsn: '480256', qty: 20, rate: 350, taxable: 7000, gstPct: 12, gstAmt: 840, amount: 7840 },
    ],
    taxableTotal: 7000, cgst: 420, sgst: 420, igst: 0, totalGst: 840, grandTotal: 7840, terms: TERMS,
  },
  '003': {
    invoiceNo: 'INV-25/06/25/003', date: '23/06/2025', supplyType: 'Inter',
    business: { name: 'Acme Trading Co.', gstin: '29AABCU9603R1ZM', phone: '9876543210', address: '12, MG Road, Bengaluru', state: 'Karnataka (29)' },
    customer: { name: 'Sunrise Exports', gstin: '24AABCU9603R1ZM', state: 'Gujarat (24)' },
    items: [
      { slNo: 1, description: 'Export Goods (Exempt)', hsn: '570110', qty: 50, rate: 648, taxable: 32400, gstPct: 0, gstAmt: 0, amount: 32400 },
    ],
    taxableTotal: 32400, cgst: 0, sgst: 0, igst: 0, totalGst: 0, grandTotal: 32400, terms: TERMS,
  },
  '002': {
    invoiceNo: 'INV-25/06/25/002', date: '22/06/2025', supplyType: 'Intra',
    business: { name: 'Acme Trading Co.', gstin: '29AABCU9603R1ZM', phone: '9876543210', address: '12, MG Road, Bengaluru', state: 'Karnataka (29)' },
    customer: { name: 'Patel Fabrics', gstin: '29AABCU9603R1ZM', state: 'Karnataka (29)' },
    items: [
      { slNo: 1, description: 'Cotton Fabric Roll', hsn: '520811', qty: 8, rate: 1150, taxable: 9200, gstPct: 12, gstAmt: 1104, amount: 10304 },
    ],
    taxableTotal: 9200, cgst: 552, sgst: 552, igst: 0, totalGst: 1104, grandTotal: 10304, terms: TERMS,
  },
  '001': {
    invoiceNo: 'INV-25/06/25/001', date: '21/06/2025', supplyType: 'Intra',
    business: { name: 'Acme Trading Co.', gstin: '29AABCU9603R1ZM', phone: '9876543210', address: '12, MG Road, Bengaluru', state: 'Karnataka (29)' },
    customer: { name: 'Rajesh Electronics', gstin: '29BBBFU1234R1ZP', state: 'Karnataka (29)' },
    items: [
      { slNo: 1, description: 'LED Monitor 24"',         hsn: '852872', qty: 3, rate: 4200, taxable: 12600, gstPct: 18, gstAmt: 2268, amount: 14868 },
      { slNo: 2, description: 'Wireless Keyboard & Mouse', hsn: '847160', qty: 3, rate: 1000, taxable: 3000, gstPct: 18, gstAmt: 540,  amount: 3540  },
    ],
    taxableTotal: 15600, cgst: 1404, sgst: 1404, igst: 0, totalGst: 2808, grandTotal: 18408, terms: TERMS,
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function InvoicePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [printSize, setPrintSize] = useState<'A4' | 'A5'>('A4')
  const invoice = INVOICES[id]

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-foreground">Invoice not found</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Invoice &quot;{id}&quot; does not exist in the system.
        </p>
        <Link href="/invoices" className="mt-6 text-sm text-primary underline-offset-4 hover:underline">
          &larr; Back to Invoices
        </Link>
      </div>
    )
  }

  const isIntra = invoice.supplyType === 'Intra'
  const supplyLabel = isIntra ? 'Intra-State' : 'Inter-State'

  return (
    <>
      {/* ── Print CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          #inv-controls { display: none !important; }
          .flex.h-screen { display: block !important; overflow: visible !important; }
          main { overflow: visible !important; padding: 0 !important; }
          #inv-bg { background: none !important; padding: 0 !important; }
          #inv-paper {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            padding: 1.2cm 1.5cm !important;
            margin: 0 !important;
            border: none !important;
          }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* ── Toolbar (hidden on print) ──────────────────────────────────────── */}
      <div id="inv-controls" className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Invoice Preview</h1>
            <p className="text-xs text-muted-foreground">{invoice.invoiceNo}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Size toggle */}
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            {(['A4', 'A5'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrintSize(s)}
                className={
                  printSize === s
                    ? 'bg-primary px-3 py-1.5 font-medium text-primary-foreground'
                    : 'bg-background px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent first:border-r first:border-border'
                }
              >
                {s}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm">
            <Download className="size-4" />
            PDF
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print {printSize}
          </Button>
        </div>
      </div>

      {/* ── Paper wrapper ─────────────────────────────────────────────────── */}
      <div id="inv-bg" className="rounded-xl bg-slate-100 p-6">
        <div
          id="inv-paper"
          className="mx-auto rounded bg-white shadow-md"
          style={{
            maxWidth: printSize === 'A4' ? '860px' : '620px',
            fontFamily: 'inherit',
          }}
        >
          {/* ── INNER PADDED CONTENT ────────────────────────────────────── */}
          <div className="px-10 pt-8 pb-6">

            {/* ── Business header ─────────────────────────────────────── */}
            <div className="mb-2 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#1a2e52' }}>
                {invoice.business.name}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">{invoice.business.address}</p>
              <p className="mt-0.5 text-sm" style={{ color: '#1a5fa8' }}>
                GSTIN: {invoice.business.gstin} | Contact: {invoice.business.phone}
              </p>
              <p className="text-sm" style={{ color: '#1a5fa8' }}>
                State: {invoice.business.state}
              </p>
            </div>

            {/* ── Thick divider ────────────────────────────────────────── */}
            <div className="my-4 border-t-2 border-gray-900" />

            {/* ── TAX INVOICE banner ───────────────────────────────────── */}
            <div className="mb-5 flex justify-center">
              <span
                className="px-10 py-1.5 text-sm font-bold tracking-[0.2em] uppercase"
                style={{ border: '1.5px solid #1a2e52', color: '#1a2e52' }}
              >
                Tax Invoice
              </span>
            </div>

            {/* ── Bill To + Invoice meta — 2-column, 3-row aligned grid ── */}
            <div className="mb-5 grid grid-cols-2 gap-x-6">
              {/* LEFT: Bill To block */}
              <div className="flex flex-col gap-1">
                {/* Row 1 */}
                <p className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-800">Bill To:</span>{' '}
                  <span className="font-bold text-gray-900">{invoice.customer.name}</span>
                </p>
                {/* Row 2 */}
                <p className="text-sm font-mono" style={{ color: '#1a5fa8' }}>
                  GSTIN:{' '}
                  {invoice.customer.gstin
                    ? <span className="font-semibold">{invoice.customer.gstin}</span>
                    : <span className="text-gray-400 not-italic">N/A</span>
                  }
                </p>
                {/* Row 3 */}
                <p className="text-sm" style={{ color: '#1a5fa8' }}>
                  State: {invoice.customer.state}
                </p>
              </div>

              {/* RIGHT: Invoice meta block — same 3-row alignment */}
              <div className="flex flex-col gap-1 text-right">
                {/* Row 1 — Invoice No */}
                <p className="text-sm text-gray-600">
                  Invoice No:{' '}
                  <span className="font-bold" style={{ color: '#c07000' }}>
                    {invoice.invoiceNo}
                  </span>
                </p>
                {/* Row 2 — Date */}
                <p className="text-sm text-gray-600">
                  Date:{' '}
                  <span className="font-bold" style={{ color: '#c07000' }}>
                    {invoice.date}
                  </span>
                </p>
                {/* Row 3 — Supply Type */}
                <p className="text-sm text-gray-600">
                  Supply Type:{' '}
                  <span className="font-bold" style={{ color: '#1a5fa8' }}>
                    {supplyLabel}
                  </span>
                </p>
              </div>
            </div>

            {/* ── Items table ──────────────────────────────────────────── */}
            <div className="mb-5 overflow-hidden rounded-sm border border-gray-300">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#f1f5ff', borderBottom: '1px solid #d0d8e8' }}>
                    {[
                      { label: 'S.No',        cls: 'text-center w-10' },
                      { label: 'Description', cls: 'text-left' },
                      { label: 'HSN',         cls: 'text-left w-20' },
                      { label: 'Qty',         cls: 'text-center w-12' },
                      { label: 'Rate',        cls: 'text-right w-20' },
                      { label: 'Taxable',     cls: 'text-right w-24' },
                      { label: 'GST%',        cls: 'text-center w-14' },
                      { label: 'GST Amt',     cls: 'text-right w-20' },
                      { label: 'Amount',      cls: 'text-right w-24' },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className={`px-3 py-2 text-xs font-semibold text-gray-600 ${col.cls}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, i) => (
                    <tr
                      key={item.slNo}
                      className="border-b border-gray-200 last:border-0"
                      style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafbff' }}
                    >
                      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{item.slNo}</td>
                      <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{item.hsn}</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">{item.qty}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.rate)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.taxable)}</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">{item.gstPct}%</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: '#1a5fa8' }}>{fmt(item.gstAmt)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {/* Filler rows — 5 min visible rows */}
                  {Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map((_, i) => (
                    <tr key={`filler-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafbff', borderBottom: '1px solid #e5e9f0' }}>
                      <td colSpan={9} className="px-3 py-3">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals block ─────────────────────────────────────────── */}
            <div className="mb-5 flex justify-end">
              <div className="w-72">
                <TotalRow label="Taxable Value"  value={fmtINR(invoice.taxableTotal)} colored />
                {isIntra ? (
                  <>
                    <TotalRow label="CGST" value={fmtINR(invoice.cgst)} colored />
                    <TotalRow label="SGST" value={fmtINR(invoice.sgst)} colored />
                  </>
                ) : (
                  <TotalRow label="IGST" value={fmtINR(invoice.igst)} colored />
                )}
                <TotalRow label="Total GST"     value={fmtINR(invoice.totalGst)} colored />
                {/* Grand total with top border */}
                <div className="mt-1 border-t-2 border-gray-900 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-bold text-gray-900">Grand Total</span>
                    <span className="text-base font-bold" style={{ color: '#1a2e52' }}>
                      {fmtINR(invoice.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Amount in words ──────────────────────────────────────── */}
            <div className="mb-5 border-t border-b border-gray-200 py-2.5">
              <span className="text-sm font-bold text-gray-800">Amount in words: </span>
              <span className="text-sm italic" style={{ color: '#1a5fa8' }}>
                {amountInWords(invoice.grandTotal)}
              </span>
            </div>

            {/* ── Footer: Terms + Signatory ─────────────────────────── */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between gap-8">
                {/* Terms */}
                <div className="flex-1">
                  <p className="mb-2 text-xs font-bold text-gray-800">Terms &amp; Conditions:</p>
                  {invoice.terms.map((term, i) => (
                    <p key={i} className="text-xs leading-relaxed" style={{ color: '#1a5fa8' }}>
                      {i + 1}. {term}
                    </p>
                  ))}
                </div>
                {/* Signatory */}
                <div className="w-44 shrink-0 text-right">
                  <p className="text-sm font-bold text-gray-900">For {invoice.business.name}</p>
                  <div className="my-10 border-b border-gray-300" />
                  <p className="text-xs text-gray-500">Authorised Signatory</p>
                </div>
              </div>
            </div>

            {/* ── Computer-generated notice ─────────────────────────── */}
            <p className="mt-4 text-center text-xs text-gray-400">
              This is a computer-generated invoice
            </p>

          </div>{/* end padded content */}
        </div>{/* end paper */}
      </div>{/* end bg */}
    </>
  )
}

// ── Helper subcomponent ───────────────────────────────────────────────────────
function TotalRow({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span style={colored ? { color: '#1a5fa8' } : undefined} className="font-medium">
        {value}
      </span>
    </div>
  )
}
