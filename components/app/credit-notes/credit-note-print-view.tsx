'use client';

import { amountInWordsIndian } from '@/lib/pdf/number-to-words';
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { getCreditNoteReasonLabel } from '@/lib/validations/credit-note';

export interface CreditNotePrintViewProps {
  creditNote: {
    id: string;
    credit_note_number: string;
    issue_date: string | Date | null;
    reason: string;
    subtotal_paise: number;
    total_cgst_paise: number;
    total_sgst_paise: number;
    total_igst_paise: number;
    total_tax_paise: number;
    grand_total_paise: number;
    business: {
      id?: string;
      legal_name: string;
      trade_name?: string | null;
      gstin: string;
      pan?: string | null;
      address_line1?: string | null;
      address_line2?: string | null;
      city?: string | null;
      state_code: string;
      pincode?: string | null;
      phone?: string | null;
      email?: string | null;
      logo_storage_key?: string | null;
    };
    originalInvoice: {
      id: string;
      invoice_number: string;
      invoice_date: string | Date | null;
      billing_name_snapshot?: string | null;
      billing_gstin_snapshot?: string | null;
      billing_address_snapshot?: string | null;
      place_of_supply_state_code?: string | null;
      grand_total_paise?: number;
    };
    lineItems: Array<{
      id: string;
      description: string;
      hsn_sac_code: string;
      quantity: string | number;
      unit_of_measurement: string;
      unit_price_paise: number;
      discount_paise: number;
      taxable_value_paise: number;
      tax_rate_percentage: string | number;
      cgst_paise: number;
      sgst_paise: number;
      igst_paise: number;
      line_total_paise: number;
    }>;
  };
  printSize?: 'A4' | 'A5';
}

export function CreditNotePrintView({ creditNote, printSize = 'A4' }: CreditNotePrintViewProps) {
  const biz = creditNote.business;
  const origInv = creditNote.originalInvoice;

  const sellerState = INDIAN_GST_STATES.find(s => s.code === biz.state_code)?.name || biz.state_code;
  const buyerStateCode = origInv.place_of_supply_state_code || biz.state_code;
  const buyerState = INDIAN_GST_STATES.find(s => s.code === buyerStateCode)?.name || buyerStateCode;

  const isIntraState = biz.state_code === buyerStateCode;
  const reasonLabel = getCreditNoteReasonLabel(creditNote.reason);

  const formattedDate = creditNote.issue_date
    ? new Date(creditNote.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const origInvoiceDate = origInv.invoice_date
    ? new Date(origInv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const logoUrl = biz.id && biz.logo_storage_key ? `/api/business/${biz.id}/logo` : null;

  return (
    <div
      className={`credit-note-root w-full bg-white text-black font-sans print:shadow-none print:m-0 print:border-none print:p-0 ${
        printSize === 'A5' ? 'pt-3 px-3 pb-2 text-xs' : 'pt-4 px-5 pb-3 text-sm'
      }`}
      style={{ boxSizing: 'border-box' }}
    >
      <style>{`
        @media print {
          @page { size: auto; margin: 0.6cm; }
          body { background-color: white !important; }
          #cn-paper,
          .credit-note-root {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      {/* Header (#1: pb-2, #2: mb-2) */}
      <div className="border-b-2 border-black pb-2 mb-2">
        <div className="flex justify-between items-start">
          {/* #0: gap-2 */}
          <div className="flex items-center gap-2">
            {logoUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="h-16 w-auto object-contain max-w-[120px]"
              />
            )}
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wide">{biz.legal_name}</h1>
              {biz.trade_name && biz.trade_name !== biz.legal_name && (
                <p className="text-xs text-gray-700 font-medium">({biz.trade_name})</p>
              )}
              <p className="text-xs text-gray-800">
                {[biz.address_line1, biz.address_line2, biz.city, biz.pincode].filter(Boolean).join(', ')}
              </p>
              <p className="text-xs font-semibold mt-0.5">
                GSTIN: <span className="font-mono">{biz.gstin}</span> | State: {sellerState} ({biz.state_code})
              </p>
              {biz.phone && <p className="text-xs text-gray-700">Phone: {biz.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-black text-white px-3 py-1 text-sm font-bold uppercase tracking-wider rounded-sm">
              CREDIT NOTE
            </span>
            <p className="text-[10px] text-gray-600 mt-1">Under Section 34 of CGST Act, 2017</p>
          </div>
        </div>
      </div>

      {/* Unified Reference & Recipient Details (Option 2: 3-Row Compact Box) */}
      <div className="border border-black rounded-sm mb-2 text-xs divide-y divide-gray-300 bg-white">
        {/* Row 1: Credit Note Metadata (Single Full-Width Flex Line) */}
        <div className="flex justify-between items-center px-3 py-1.5 gap-4">
          <div className="flex-1 min-w-0 truncate">
            <span className="text-gray-700 font-semibold">Credit Note No:</span>{' '}
            <strong className="font-mono text-sm font-bold text-black">{creditNote.credit_note_number}</strong>
          </div>
          <div className="shrink-0 text-center">
            <span className="text-gray-700 font-semibold">Date of Issue:</span>{' '}
            <span className="font-medium text-black">{formattedDate}</span>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-gray-700 font-semibold">Reason:</span>{' '}
            <span className="font-semibold text-red-700">{reasonLabel}</span>
          </div>
        </div>

        {/* Row 2: Original Invoice References */}
        <div className="flex justify-between items-center px-3 py-1.5 gap-4 bg-gray-50/50">
          <div className="flex-1 min-w-0 truncate">
            <span className="text-gray-700 font-semibold">Original Invoice No:</span>{' '}
            <strong className="font-mono text-black">{origInv.invoice_number}</strong>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-gray-700 font-semibold">Original Invoice Date:</span>{' '}
            <span className="font-medium text-black">{origInvoiceDate}</span>
          </div>
        </div>

        {/* Row 3: Recipient Details (Single Full-Width Flex Line) */}
        <div className="flex justify-between items-center px-3 py-1.5 gap-4">
          <div className="flex-1 min-w-0 truncate">
            <span className="text-gray-700 font-semibold uppercase text-[11px]">Issued To:</span>{' '}
            <strong className="font-bold text-black">{origInv.billing_name_snapshot || 'Cash Sale / Unregistered Customer'}</strong>
            {origInv.billing_address_snapshot && (
              <span className="text-gray-600 font-normal ml-1.5">({origInv.billing_address_snapshot})</span>
            )}
          </div>
          <div className="shrink-0 text-center">
            <span className="text-gray-700 font-semibold uppercase text-[11px]">GSTIN:</span>{' '}
            <span className="font-mono font-bold text-black">{origInv.billing_gstin_snapshot || '—'}</span>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-gray-700 font-semibold uppercase text-[11px]">Place of Supply:</span>{' '}
            <span className="font-medium text-black">{buyerState} ({buyerStateCode})</span>
          </div>
        </div>
      </div>

      {/* Items Table (#9: py-[3px], #10: py-[3px], #11: mb-2) */}
      <table className="w-full border-collapse border border-black mb-2 text-xs">
        <thead>
          <tr className="bg-gray-100 text-left border-b border-black">
            <th className="py-[3px] px-1.5 border-r border-black w-8 text-center">#</th>
            <th className="py-[3px] px-1.5 border-r border-black">Item Description</th>
            <th className="py-[3px] px-1.5 border-r border-black text-center w-20">HSN/SAC</th>
            <th className="py-[3px] px-1.5 border-r border-black text-right w-16">Qty</th>
            <th className="py-[3px] px-1.5 border-r border-black text-right w-20">Rate (₹)</th>
            <th className="py-[3px] px-1.5 border-r border-black text-right w-20">Taxable (₹)</th>
            {isIntraState ? (
              <>
                <th className="py-[3px] px-1.5 border-r border-black text-right w-16">CGST</th>
                <th className="py-[3px] px-1.5 border-r border-black text-right w-16">SGST</th>
              </>
            ) : (
              <th className="py-[3px] px-1.5 border-r border-black text-right w-20">IGST</th>
            )}
            <th className="py-[3px] px-1.5 text-right w-24">Credit (₹)</th>
          </tr>
        </thead>
        <tbody>
          {creditNote.lineItems.map((item, idx) => (
            <tr key={item.id || idx} className="border-b border-gray-300">
              <td className="py-[3px] px-1.5 border-r border-black text-center">{idx + 1}</td>
              <td className="py-[3px] px-1.5 border-r border-black font-medium">{item.description}</td>
              <td className="py-[3px] px-1.5 border-r border-black text-center font-mono">{item.hsn_sac_code}</td>
              <td className="py-[3px] px-1.5 border-r border-black text-right">
                {Number(item.quantity)} {item.unit_of_measurement}
              </td>
              <td className="py-[3px] px-1.5 border-r border-black text-right">{paiseToRupees(item.unit_price_paise)}</td>
              <td className="py-[3px] px-1.5 border-r border-black text-right">{paiseToRupees(item.taxable_value_paise)}</td>
              {isIntraState ? (
                <>
                  <td className="py-[3px] px-1.5 border-r border-black text-right font-mono text-[11px]">
                    {paiseToRupees(item.cgst_paise)}
                    <span className="block text-[9px] text-gray-500">
                      ({(Number(item.tax_rate_percentage) / 2).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="py-[3px] px-1.5 border-r border-black text-right font-mono text-[11px]">
                    {paiseToRupees(item.sgst_paise)}
                    <span className="block text-[9px] text-gray-500">
                      ({(Number(item.tax_rate_percentage) / 2).toFixed(1)}%)
                    </span>
                  </td>
                </>
              ) : (
                <td className="py-[3px] px-1.5 border-r border-black text-right font-mono text-[11px]">
                  {paiseToRupees(item.igst_paise)}
                  <span className="block text-[9px] text-gray-500">({Number(item.tax_rate_percentage)}%)</span>
                </td>
              )}
              <td className="py-[3px] px-1.5 text-right font-mono font-semibold">{paiseToRupees(item.line_total_paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Summary (No Outer Box, Right-Aligned) */}
      <div className="flex justify-end mb-1">
        <div className="w-80 space-y-0.5 text-xs text-right">
          <div className="flex justify-between py-0.5">
            <span className="text-gray-600 font-medium">Total Taxable Value:</span>
            <span className="font-mono font-medium">{formatPaiseAsInr(creditNote.subtotal_paise)}</span>
          </div>
          {isIntraState ? (
            <>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600 font-medium">Total CGST:</span>
                <span className="font-mono font-medium">{formatPaiseAsInr(creditNote.total_cgst_paise)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-gray-600 font-medium">Total SGST:</span>
                <span className="font-mono font-medium">{formatPaiseAsInr(creditNote.total_sgst_paise)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-0.5">
              <span className="text-gray-600 font-medium">Total IGST:</span>
              <span className="font-mono font-medium">{formatPaiseAsInr(creditNote.total_igst_paise)}</span>
            </div>
          )}
          {/* Top Line of Grand Total Credit */}
          <div className="flex justify-between border-t border-black pt-1 mt-0.5 font-bold">
            <span className="font-black text-sm uppercase">Grand Total Credit:</span>
            <span className="font-mono font-black text-sm text-red-700">
              {formatPaiseAsInr(creditNote.grand_total_paise)}
            </span>
          </div>
        </div>
      </div>

      {/* Extended Full-Width Line (Bottom Line of Grand Total Credit) */}
      <div className="border-b-2 border-black w-full" />

      {/* Credit Amount in Words & Note with Equal Minimal Spacing */}
      <div className="py-1.5 space-y-0.5">
        <p className="leading-tight text-[13px]">
          <span className="font-bold text-black">Credit Amount in Words : </span>
          <span className="italic font-bold text-black">
            {amountInWordsIndian(
              Math.floor(creditNote.grand_total_paise / 100),
              creditNote.grand_total_paise % 100
            )}.
          </span>
        </p>
        <p className="text-[11.5px] text-gray-700 leading-tight">
          <span className="font-semibold text-gray-900">Note:</span> This credit note reduces the taxable value and output tax liability for the corresponding tax period.
        </p>
      </div>

      {/* Signature Section */}
      <div className="flex justify-between items-end pt-2 border-t border-gray-300 text-xs">
        <div className="text-gray-500 text-[10px]">
          <p>Generated by Bill Matrix Billing System</p>
          <p>Subject to local jurisdiction</p>
        </div>
        <div className="text-right">
          <p className="font-bold mb-4">For {biz.legal_name}:</p>
          <p className="text-gray-600 border-t border-gray-400 pt-0.5">Authorized Signatory</p>
        </div>
      </div>
    </div>
  );
}
