"use client";

import { useState, useEffect } from 'react';
import { amountInWordsIndian } from '@/lib/pdf/number-to-words';
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn_sac_code: string | null;
  quantity: string | number;
  unit_price_paise: number;
  discount_paise: number;
  taxable_value_paise: number;
  tax_rate_percentage: string | number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  line_total_paise: number;
}

export interface InvoiceTemplateProps {
  invoice: {
    business_name: string;
    city: string | null;
    seller_gstin_snapshot: string | null;
    phone: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_ifsc: string | null;
    invoice_terms: string | null;
    invoice_number: string;
    invoice_date: string | Date | null;
    billing_name_snapshot: string | null;
    billing_gstin_snapshot: string | null;
    billing_address_snapshot: string | null;
    place_of_supply_state_code: string | null;
    subtotal_paise: number;
    total_cgst_paise: number;
    total_sgst_paise: number;
    total_igst_paise: number;
    total_tax_paise: number;
    grand_total_paise: number;
    nature_of_business?: string | null;
    alternate_phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    gst_rate_type?: string | null;
    pincode?: string | null;
    logo_url?: string | null;
    logo_base64?: string | null;
    customer?: {
      phone?: string | null;
    } | null;
    lineItems: InvoiceLineItem[];
  };
  businessStateCode: string;
  printSize: 'A4' | 'A5';
  hasWatermark?: boolean;
}

export function InvoiceTemplate1({ invoice, businessStateCode, printSize, hasWatermark }: InvoiceTemplateProps) {
  const [settings, setSettings] = useState<{
    showHsn: boolean;
    enableFixedRows: boolean;
    fixedRowsCount: number;
  }>({
    showHsn: true,
    enableFixedRows: true,
    fixedRowsCount: 13,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bm_invoice_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({
          showHsn: parsed.showHsn ?? true,
          enableFixedRows: parsed.enableFixedRows ?? true,
          fixedRowsCount: Number(parsed.fixedRowsCount) || 13,
        });
      }
    } catch { }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bm_invoice_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings({
            showHsn: parsed.showHsn ?? true,
            enableFixedRows: parsed.enableFixedRows ?? true,
            fixedRowsCount: Number(parsed.fixedRowsCount) || 13,
          });
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const { showHsn, enableFixedRows, fixedRowsCount } = settings;
  const isIntra = invoice.total_igst_paise === 0;
  const supplyLabel = isIntra ? 'Intra-State' : 'Inter-State';

  const stateInfo = INDIAN_GST_STATES.find(s => s.code === businessStateCode);
  const businessStateName = stateInfo ? stateInfo.name : businessStateCode;

  const customerStateInfo = INDIAN_GST_STATES.find(s => s.code === invoice.place_of_supply_state_code);
  const customerStateName = customerStateInfo ? customerStateInfo.name : (invoice.place_of_supply_state_code || '—');

  // Split invoice terms into individual lines and separate last item, cleaning leading numbers
  const termsLines = (invoice.invoice_terms
    ? invoice.invoice_terms.split('\n')
    : [
        'Goods once sold will not be taken back.',
        'Payment to be made within 30 days from the date of invoice.',
        'Interest @ 24% per annum will be charged on overdue invoices until payment is received.'
      ]
  )
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  const otherTerms = termsLines.slice(0, -1);
  const lastTerm = termsLines[termsLines.length - 1] || '';

  const logoSrc = invoice.logo_base64 || invoice.logo_url || null;

  return (
    <div className="template-1-root bg-white border-2 border-slate-700 rounded-lg p-5 text-slate-900 shadow-xs print:p-0 print:border-none print:shadow-none">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

        .template-1-root {
          font-family: 'Century Schoolbook', 'Century', 'Lora', 'TeX Gyre Schola', 'Libre Baskerville', serif !important;
        }

        @media print {
          @page { size: auto; margin: 0.6cm; }
          body { background-color: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 1. HEADER & BUSINESS DETAILS (HIGH-CONTRAST & CRISP)                 */}
      {/* ==================================================================== */}
      <div className="flex justify-between items-start border-b-2 border-slate-300 pb-[8px] mb-[8px]">
        {/* Left: Business Info & Logo */}
        <div className="flex-1 pr-4">
          {/* Top Lockup: Logo (66px) + 3 Lines (Title + Tagline + Address) */}
          <div className="flex items-start gap-[3px] mb-[1px]">
            {logoSrc && (
              <div className="w-[66px] h-[66px] shrink-0 flex items-center justify-center p-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Business Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <div className="leading-tight space-y-[2px] flex-1">
              <h1 className="text-[25px] font-black tracking-tight text-slate-950 uppercase leading-tight">
                {invoice.business_name}
              </h1>
              {invoice.nature_of_business && (
                <p className="text-[11.5px] font-bold text-slate-700 uppercase tracking-wider">
                  ({invoice.nature_of_business})
                </p>
              )}
              <p className="text-[12px] text-slate-800 font-medium leading-tight pt-[1px]">
                {invoice.address_line1}
                {invoice.address_line2 ? `, ${invoice.address_line2}` : ''}
                {invoice.city ? `, ${invoice.city.toUpperCase()}` : ''}
                {invoice.pincode ? ` - ${invoice.pincode}` : ''}
              </p>
            </div>
          </div>

          {/* Line 4: GSTIN & State Line — Full-width baseline right below the logo block */}
          <div className="text-[12px] text-slate-900 flex flex-wrap gap-x-4 font-semibold pt-[1px]">
            <span>GSTIN: <strong className="font-mono font-black text-slate-950 uppercase">{invoice.seller_gstin_snapshot ? invoice.seller_gstin_snapshot.toUpperCase() : '—'}</strong></span>
            <span>State: <strong className="text-slate-950 font-bold">{businessStateName} ({businessStateCode})</strong></span>
            {invoice.phone && <span>Ph: <strong className="text-slate-950 font-bold">{invoice.phone}</strong></span>}
          </div>
        </div>

        {/* Right: TAX INVOICE Badge & Invoice Meta */}
        <div className="flex flex-col items-end shrink-0 space-y-[3px]">
          <div className="border-2 border-slate-900 px-4 py-[3px] text-[11px] font-black uppercase tracking-widest text-slate-950 bg-slate-100 rounded">
            TAX INVOICE
          </div>
          <div className="text-right text-[12px] space-y-[1.5px] pt-[2px] leading-tight">
            <p className="leading-tight"><span className="text-slate-700 font-bold">Invoice No:</span> <strong className="font-mono font-black text-slate-950 uppercase">{invoice.invoice_number}</strong></p>
            <p className="leading-tight"><span className="text-slate-700 font-bold">Date:</span> <strong className="text-slate-950 font-bold">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '—'}</strong></p>
            <p className="leading-tight"><span className="text-slate-700 font-bold">Supply:</span> <span className="font-black text-slate-900 bg-slate-200 border border-slate-300 px-2 py-0.2 rounded text-[11px] uppercase">{supplyLabel}</span></p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. BILL TO (CUSTOMER DETAILS) - SINGLE 1-LINE COMPACT BAR          */}
      {/* ==================================================================== */}
      <div className="bg-slate-100 border border-slate-400 rounded-md px-3.5 py-[4.5px] mb-[8px] text-[11.5px]">
        <div className="flex justify-between items-center w-full">
          <div className="truncate pr-4 flex-1">
            <span className="text-slate-700 font-extrabold uppercase text-[11px]">Bill To:</span>{' '}
            <strong className="text-slate-950 font-black text-[12.5px]">{invoice.billing_name_snapshot || '—'}</strong>
          </div>
          <div className="flex gap-6 shrink-0 text-[11.5px]">
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">GSTIN:</span>{' '}
              <strong className="font-mono font-black text-slate-950 uppercase">{invoice.billing_gstin_snapshot ? invoice.billing_gstin_snapshot.toUpperCase() : '—'}</strong>
            </div>
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">Place of Supply:</span>{' '}
              <strong className="text-slate-950 font-bold">{customerStateName}{invoice.place_of_supply_state_code ? ` (${invoice.place_of_supply_state_code})` : ''}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. LINE ITEMS TABLE (HIGH-CONTRAST HEADER & CRISP BORDERS)          */}
      {/* ==================================================================== */}
      <div className="border-2 border-slate-600 rounded-md overflow-hidden mb-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b-2 border-slate-400 text-[11px] font-black text-slate-950 uppercase tracking-wide">
              <th className="py-1.5 px-1.5 border-r border-slate-400 text-center w-10 whitespace-nowrap">S.No</th>
              <th className="py-1.5 px-2.5 border-r border-slate-400 text-left whitespace-nowrap">Description of Goods</th>
              {showHsn && (
                <th className="py-1.5 px-1.5 border-r border-slate-400 text-center w-20 whitespace-nowrap">HSN/SAC</th>
              )}
              <th className="py-1.5 px-1.5 border-r border-slate-400 text-center w-14 whitespace-nowrap">Qty</th>
              <th className="py-1.5 px-2 border-r border-slate-400 text-right w-24 whitespace-nowrap">Rate {invoice.gst_rate_type === 'inclusive' ? '(GST Incl)' : '(GST Excl)'}</th>
              <th className="py-1.5 px-2 border-r border-slate-400 text-right w-28 whitespace-nowrap">Taxable Value</th>
              <th className="py-1.5 px-2.5 text-right w-28 whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-[11.5px]">
            {invoice.lineItems.map((item: any, i: number) => {
              const isEven = i % 2 === 1;
              return (
                <tr key={item.id} className={isEven ? 'bg-slate-100/60' : 'bg-white'}>
                  <td className="py-1 px-1.5 border-r border-slate-300 text-center text-slate-700 font-bold">{i + 1}</td>
                  <td className="py-1 px-2.5 border-r border-slate-300 text-slate-955 font-bold">{item.description}</td>
                  {showHsn && (
                    <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-800">{item.hsn_sac_code || '—'}</td>
                  )}
                  <td className="py-1 px-1.5 border-r border-slate-300 text-center font-black text-slate-955">{item.quantity}</td>
                  <td className="py-1 px-2 border-r border-slate-300 text-right font-mono font-semibold text-slate-900">{formatPaiseAsInr(item.unit_price_paise)}</td>
                  <td className="py-1 px-2 border-r border-slate-300 text-right font-mono font-bold text-slate-955">{formatPaiseAsInr(item.taxable_value_paise)}</td>
                  <td className="py-1 px-2.5 text-right font-black text-slate-955 font-mono">{formatPaiseAsInr(item.line_total_paise)}</td>
                </tr>
              );
            })}
            {(() => {
              const actualRowsCount = invoice.lineItems.length;
              const padCount = enableFixedRows && actualRowsCount < fixedRowsCount ? fixedRowsCount - actualRowsCount : 0;
              return Array.from({ length: padCount }).map((_, i) => {
                const sNo = actualRowsCount + i + 1;
                const isEven = (actualRowsCount + i) % 2 === 1;
                return (
                  <tr key={`pad-${i}`} className={isEven ? 'bg-slate-100/60' : 'bg-white'}>
                    <td className="py-1 px-1.5 border-r border-slate-300 text-center text-slate-700 font-bold">{sNo}</td>
                    <td className="py-1 px-2.5 border-r border-slate-300 text-slate-955 font-bold">&nbsp;</td>
                    {showHsn && (
                      <td className="py-1 px-1.5 border-r border-slate-300 text-center font-mono font-bold text-slate-800">&nbsp;</td>
                    )}
                    <td className="py-1 px-1.5 border-r border-slate-300 text-center font-black text-slate-955">&nbsp;</td>
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono font-semibold text-slate-900">&nbsp;</td>
                    <td className="py-1 px-2 border-r border-slate-300 text-right font-mono font-bold text-slate-955">&nbsp;</td>
                    <td className="py-1 px-2.5 text-right font-black text-slate-955 font-mono">&nbsp;</td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* 4. BANK DETAILS & SUMMARY ROW                                        */}
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* 4. BANK DETAILS & SUMMARY ROW                                        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-12 gap-3 mb-3 items-start">
        {/* Left: Bank Details */}
        <div className="col-span-5 border border-slate-400 rounded-md py-[3px] px-1 bg-slate-100/70 text-[12px] space-y-[1px]">
          <p className="font-black text-slate-950 uppercase text-[13px] border-b border-slate-300 pb-[1px] mb-[3px]">Bank Details</p>
          <p><span className="text-slate-700 font-bold">Bank Name:</span> <strong className="text-slate-950 font-black truncate">{invoice.bank_name || 'State Bank of India'}</strong></p>
          <p><span className="text-slate-700 font-bold">A/c No:</span> <strong className="font-mono font-black text-slate-950">{invoice.bank_account_number || '40013401425'}</strong></p>
          <p><span className="text-slate-700 font-bold">IFSC Code:</span> <strong className="font-mono font-black text-slate-950 uppercase">{invoice.bank_ifsc || 'SBIN0002178'}</strong></p>
        </div>

        {/* Right: Invoice Summary (Expanded to col-span-7) */}
        <div className="col-span-7 border-2 border-slate-600 rounded-md overflow-hidden bg-white text-[11px]">
          <div className="flex justify-between py-[3px] px-3 border-b border-slate-300">
            <span className="text-slate-800 font-bold">Taxable Value</span>
            <span className="text-[12px] font-mono font-black text-slate-950 whitespace-nowrap pl-3">{formatPaiseAsInr(invoice.subtotal_paise)}</span>
          </div>
          {isIntra ? (
            <>
              <div className="flex justify-between py-[3px] px-3 border-b border-slate-300 bg-slate-50">
                <span className="text-slate-800 font-bold">CGST</span>
                <span className="font-mono font-black text-slate-950 whitespace-nowrap pl-3">{formatPaiseAsInr(invoice.total_cgst_paise)}</span>
              </div>
              <div className="flex justify-between py-[3px] px-3 border-b border-slate-300 bg-slate-50">
                <span className="text-slate-800 font-bold">SGST</span>
                <span className="font-mono font-black text-slate-950 whitespace-nowrap pl-3">{formatPaiseAsInr(invoice.total_sgst_paise)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-[3px] px-3 border-b border-slate-300 bg-slate-50">
              <span className="text-slate-800 font-bold">IGST</span>
              <span className="font-mono font-black text-slate-950 whitespace-nowrap pl-3">{formatPaiseAsInr(invoice.total_igst_paise)}</span>
            </div>
          )}

          {invoice.grand_total_paise !== (invoice.subtotal_paise + invoice.total_tax_paise) && (
            <div className="flex justify-between py-[3px] px-3 border-b border-slate-300 italic text-slate-800 font-semibold">
              <span>Rounded Off (+/-)</span>
              <span className="font-mono font-bold text-slate-900 whitespace-nowrap pl-3">
                {(() => {
                  const diffPaise = invoice.grand_total_paise - (invoice.subtotal_paise + invoice.total_tax_paise);
                  const diffRupees = diffPaise / 100;
                  return (diffRupees >= 0 ? "+" : "") + "₹" + diffRupees.toFixed(2);
                })()}
              </span>
            </div>
          )}

          <div className="flex justify-between py-[5px] px-3 bg-slate-200/80 font-black text-slate-950 border-t border-slate-400">
            <span className="uppercase text-[11px] tracking-wide">Grand Total</span>
            <span className="font-mono text-[13px] tracking-tight whitespace-nowrap pl-3">{formatPaiseAsInr(invoice.grand_total_paise)}</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. AMOUNT IN WORDS                                                  */}
      {/* ==================================================================== */}
      <div className="bg-slate-100 border border-slate-400 rounded px-3 py-0.5 mb-[5px] text-[13px] text-slate-900 leading-tight">
        <span className="font-black text-slate-955">Amount in Words: </span>
        <span className="italic font-bold text-slate-900">
          {amountInWordsIndian(Math.floor(invoice.grand_total_paise / 100), invoice.grand_total_paise % 100)}.
        </span>
      </div>
      {/* ==================================================================== */}
      {/* 6. TERMS & CONDITIONS & SIGNATURE FOOTER                            */}
      {/* ==================================================================== */}
      <div className="border-t-2 border-slate-300 pt-[1px] text-[11px]">
        {/* Row 1: Header / Title */}
        <div className="flex justify-between items-start uppercase leading-tight mb-1">
          <span className="tracking-wider">Terms &amp; Conditions:</span>
          <span className="font-black text-slate-955">For {invoice.business_name}</span>
        </div>

        {/* Row 2: Other Terms */}
        <div className="flex justify-between items-end mb-[1px]">
          <div className="flex-1 pr-2">
            {otherTerms.length > 0 && (
              <ul className="list-none pl-0 space-y-[0.5px] text-[10px] font-medium text-slate-800">
                {otherTerms.map((term, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="shrink-0 text-slate-500 font-bold select-none">→</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Leave right cell of Row 2 empty */}
          <div className="shrink-0 h-6 ml-2 w-36"></div>
        </div>

        {/* Row 3: Last Term aligned with Dashed Signature Line */}
        <div className="flex justify-between items-center text-[10px] font-medium text-slate-800">
          <div className="flex-1 pr-2 flex items-start gap-1">
            <span className="shrink-0 text-slate-500 font-bold select-none">→</span>
            <span>{lastTerm}</span>
          </div>
          <div className="shrink-0 pl-2 flex justify-end">
            <div className="border-t-2 border-dashed border-slate-700 w-36"></div>
          </div>
        </div>
      </div>

      {hasWatermark && (
        <div className="mt-2 pt-1 border-t border-slate-200 text-center select-none print:mt-1">
          <p className="text-[9px] font-medium text-slate-400 tracking-wider">
            Generated via Bill Matrix (Free Tier) — www.billmatrix.in
          </p>
        </div>
      )}
    </div>
  );
}
