'use client'

import Link from 'next/link'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { paiseToRupees } from '@/lib/money'

function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
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
  return (n / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtINR(n: number): string {
  return '₹' + fmt(n)
}

function TotalRow({ label, value, colored }: { label: string; value: string; colored?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-600">{label}</span>
      <span style={colored ? { color: '#1a5fa8' } : undefined} className="font-medium">{value}</span>
    </div>
  )
}

export function InvoiceDetail({ invoice }: { invoice: any }) {
  const [printSize, setPrintSize] = useState<'A4' | 'A5'>('A4')

  const isIntra = invoice.total_igst_paise === 0;
  const supplyLabel = isIntra ? 'Intra-State' : 'Inter-State'

  return (
    <>
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

      <div id="inv-controls" className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Invoice Preview</h1>
            <p className="text-xs text-muted-foreground">{invoice.invoice_number}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            {(['A4', 'A5'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setPrintSize(s)} className={printSize === s ? 'bg-primary px-3 py-1.5 font-medium text-primary-foreground' : 'bg-background px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent first:border-r first:border-border'}>
                {s}
              </button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print {printSize}
          </Button>
        </div>
      </div>

      <div id="inv-bg" className="rounded-xl bg-slate-100 p-6">
        <div id="inv-paper" className="mx-auto rounded bg-white shadow-md" style={{ maxWidth: printSize === 'A4' ? '860px' : '620px', fontFamily: 'inherit' }}>
          <div className="px-10 pt-8 pb-6">
            <div className="mb-2 text-center">
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: '#1a2e52' }}>{invoice.business_name}</h2>
              <p className="mt-0.5 text-sm text-gray-500">GSTIN: {invoice.seller_gstin_snapshot}</p>
            </div>

            <div className="my-4 border-t-2 border-gray-900" />
            <div className="mb-5 flex justify-center">
              <span className="px-10 py-1.5 text-sm font-bold tracking-[0.2em] uppercase" style={{ border: '1.5px solid #1a2e52', color: '#1a2e52' }}>Tax Invoice</span>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-x-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-700"><span className="font-semibold text-gray-800">Bill To:</span> <span className="font-bold text-gray-900">{invoice.billing_name_snapshot}</span></p>
                <p className="text-sm font-mono" style={{ color: '#1a5fa8' }}>
                  GSTIN: {invoice.billing_gstin_snapshot ? <span className="font-semibold">{invoice.billing_gstin_snapshot}</span> : <span className="text-gray-400 not-italic">N/A</span>}
                </p>
                <p className="text-sm" style={{ color: '#1a5fa8' }}>State: {invoice.place_of_supply_state_code}</p>
                <p className="text-xs text-gray-600 whitespace-pre-line">{invoice.billing_address_snapshot}</p>
              </div>

              <div className="flex flex-col gap-1 text-right">
                <p className="text-sm text-gray-600">Invoice No: <span className="font-bold" style={{ color: '#c07000' }}>{invoice.invoice_number}</span></p>
                <p className="text-sm text-gray-600">Date: <span className="font-bold" style={{ color: '#c07000' }}>{new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</span></p>
                <p className="text-sm text-gray-600">Supply Type: <span className="font-bold" style={{ color: '#1a5fa8' }}>{supplyLabel}</span></p>
              </div>
            </div>

            <div className="mb-5 overflow-hidden rounded-sm border border-gray-300">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#f1f5ff', borderBottom: '1px solid #d0d8e8' }}>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-10">S.No</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-left">Description</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-left w-20">HSN</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-12">Qty</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right w-20">Rate</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right w-24">Taxable</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center w-14">GST%</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right w-20">GST Amt</th>
                    <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item: any, i: number) => (
                    <tr key={item.id} className="border-b border-gray-200 last:border-0" style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafbff' }}>
                      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{item.hsn_sac_code}</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.unit_price_paise)}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{fmt(item.taxable_value_paise)}</td>
                      <td className="px-3 py-2.5 text-center text-gray-700">{item.tax_rate_percentage}%</td>
                      <td className="px-3 py-2.5 text-right" style={{ color: '#1a5fa8' }}>{fmt(item.cgst_paise + item.sgst_paise + item.igst_paise)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">{fmt(item.line_total_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-5 flex justify-end">
              <div className="w-72">
                <TotalRow label="Taxable Value" value={fmtINR(invoice.subtotal_paise)} colored />
                {isIntra ? (
                  <>
                    <TotalRow label="CGST" value={fmtINR(invoice.total_cgst_paise)} colored />
                    <TotalRow label="SGST" value={fmtINR(invoice.total_sgst_paise)} colored />
                  </>
                ) : (
                  <TotalRow label="IGST" value={fmtINR(invoice.total_igst_paise)} colored />
                )}
                <TotalRow label="Total GST" value={fmtINR(invoice.total_tax_paise)} colored />
                <div className="mt-1 border-t-2 border-gray-900 pt-2">
                  <div className="flex justify-between"><span className="text-base font-bold text-gray-900">Grand Total</span><span className="text-base font-bold" style={{ color: '#1a2e52' }}>{fmtINR(invoice.grand_total_paise)}</span></div>
                </div>
              </div>
            </div>

            <div className="mb-5 border-t border-b border-gray-200 py-2.5">
              <span className="text-sm font-bold text-gray-800">Amount in words: </span>
              <span className="text-sm italic" style={{ color: '#1a5fa8' }}>{amountInWords(paiseToRupees(invoice.grand_total_paise))}</span>
            </div>
            
            {invoice.notes && (
              <div className="mb-5 text-sm text-gray-700">
                <span className="font-bold">Notes:</span>
                <p className="whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            
            <p className="mt-4 text-center text-xs text-gray-400">This is a computer-generated invoice</p>
          </div>
        </div>
      </div>
    </>
  )
}
