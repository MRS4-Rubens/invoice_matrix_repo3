"use client";

import { useState, useEffect } from 'react';
import { amountInWordsIndian } from '@/lib/pdf/number-to-words';
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money';
import { INDIAN_GST_STATES, getStateAbbrByCode } from '@/lib/gst/indian-states';
import { InvoiceTemplateProps } from './template-1';

// ============================================================================
// CONFIGURABLE DESIGN SYSTEM VARIABLES FOR TEMPLATE 2 (BOOK DEPOT)
// Edit these constants to change layout style, borders, sizing, or colors
// ============================================================================
const PRINT_STYLES = {
  outerBorder: 'border border-black p-4 bg-white text-black shadow-sm print:p-0 print:border-none print:shadow-none',
  tableBorder: 'border-collapse border border-black',
  cellBorder: 'border border-black',

  // Font sizes
  fontTitle: 'text-2xl font-extrabold tracking-tight leading-tight',
  fontSubtitle: 'text-[12px] font-semibold text-gray-700',
  fontLabel: 'text-[11px] font-bold text-black uppercase',
  fontValue: 'text-[11px] text-black font-semibold',
  fontTableHead: 'text-[10px] font-bold text-black text-center uppercase p-1',
  fontTableBody: 'text-[10px] text-black font-medium p-1',

  // Padding & Margin spacing
  spacingSection: 'mb-[5px]',
  spacingGrid: 'p-3',
};

export function InvoiceTemplate2({ invoice, businessStateCode, printSize, hasWatermark }: InvoiceTemplateProps) {
  const [settings, setSettings] = useState<{
    discEnabled: boolean;
    showHsn: boolean;
    enableFixedRows: boolean;
    fixedRowsCount: number;
  }>({
    discEnabled: true,
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
          discEnabled: parsed.discEnabled ?? true,
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
            discEnabled: parsed.discEnabled ?? true,
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

  const { discEnabled, showHsn, enableFixedRows, fixedRowsCount } = settings;
  const isIntra = invoice.total_igst_paise === 0;

  const customerStateAbbr = getStateAbbrByCode(invoice.place_of_supply_state_code);

  // Dynamically group line items by active GST rate
  const taxGroups: Record<number, { taxable: number; cgst: number; sgst: number; igst: number }> = {};

  invoice.lineItems.forEach((item: any) => {
    const rate = Number(item.tax_rate_percentage) || 0;
    const taxable = item.taxable_value_paise || 0;
    const cgst = item.cgst_paise || 0;
    const sgst = item.sgst_paise || 0;
    const igst = item.igst_paise || 0;

    if (rate > 0 && (cgst > 0 || sgst > 0 || igst > 0)) {
      if (!taxGroups[rate]) {
        taxGroups[rate] = { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      }
      taxGroups[rate].taxable += taxable;
      taxGroups[rate].cgst += cgst;
      taxGroups[rate].sgst += sgst;
      taxGroups[rate].igst += igst;
    }
  });

  // Sort active rates numerically in ascending order
  const activeRates = Object.keys(taxGroups)
    .map(Number)
    .sort((a, b) => a - b);

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
    <div className={`template-2-root ${PRINT_STYLES.outerBorder}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

        .template-2-root {
          font-family: 'Century Schoolbook', 'Century', 'Lora', 'TeX Gyre Schola', 'Libre Baskerville', serif !important;
        }

        @media print {
          @page { size: auto; margin: 0.6cm; }
          body { background-color: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Header Info */}
      <div className={`relative flex flex-col items-center w-full ${PRINT_STYLES.spacingSection}`}>
        {/* Top Left: GSTIN (Borderless, 0px padding, Left-Justified, 12px) */}
        <div className="absolute top-0 left-0 p-0 text-[12px] font-bold text-slate-800 text-left leading-tight">
          GSTIN : <span className="font-mono font-black text-slate-950 uppercase">{invoice.seller_gstin_snapshot ? invoice.seller_gstin_snapshot.toUpperCase() : '—'}</span>
        </div>

        {/* Top Right Invoice Meta (Borderless, 0px padding, Right-Justified, 12px) */}
        <div className="absolute top-0 right-0 p-0 text-[12px] font-bold text-slate-800 text-right space-y-[2.5px] leading-tight">
          <div>Invoice No : <span className="font-bold font-mono text-slate-950 uppercase">{invoice.invoice_number}</span></div>
          <div>Date : <span className="font-black text-slate-950">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '—'}</span></div>
        </div>

        {/* Centered 5-Line Info Block (Shifted 1cm to the left) */}
        <div className="flex flex-col items-center text-center" style={{ transform: 'translateX(-1cm)' }}>
          {/* Line 1: TAX INVOICE Badge */}
          <h2 className="text-sm font-black tracking-widest border border-black inline-block px-4 py-[3px] mb-[5px] uppercase">
            TAX INVOICE
          </h2>

          {/* Brand Block: Business Name + Tagline with Logo Bottom-Aligned to Tagline */}
          <div className="relative inline-flex flex-col items-center">
            {logoSrc && (
              <div className={`absolute right-full mr-[7px] w-[140px] h-[70px] flex items-end justify-end p-0 select-none overflow-hidden ${
                invoice.nature_of_business ? 'bottom-[-4.5px]' : 'bottom-0'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            {/* Line 2: Business Name */}
            <h1 className={`${PRINT_STYLES.fontTitle} whitespace-nowrap`}>{invoice.business_name}</h1>

            {/* Line 3: Nature of the Business (Conditional) */}
            {invoice.nature_of_business && (
              <p className="text-[11px] font-semibold text-black uppercase mt-[5px] leading-tight whitespace-nowrap">
                ({invoice.nature_of_business})
              </p>
            )}
          </div>

          {/* Line 4: Single-Line Address */}
          <p className="text-[11px] font-medium mt-[5px] leading-tight">
            {invoice.address_line1}
            {invoice.address_line2 ? `, ${invoice.address_line2}` : ''}
            , {invoice.city ? invoice.city.toUpperCase() : ''} - {invoice.pincode || ''}.
          </p>

          {/* Line 5: Phone Numbers (Phone & Alternate Phone) */}
          {(invoice.phone || invoice.alternate_phone) && (
            <p className="text-[11px] font-medium mt-[5px] leading-tight">
              Ph No. : {invoice.phone || ''}
              {invoice.phone && invoice.alternate_phone ? ', ' : ''}
              {invoice.alternate_phone || ''}
            </p>
          )}
        </div>
      </div>

      {/* Buyer Info & Address Box (Attached to Main Table) */}
      <div className="border-x-2 border-t-2 border-black mb-0 px-3 py-[7px] text-[12px] font-semibold text-black bg-white">
        <div className="flex justify-between items-center w-full">
          <div className="truncate pr-4 flex-1">
            BILL TO : <span className="font-bold">{invoice.billing_name_snapshot || '—'}</span>
          </div>
          <div className="flex gap-6 shrink-0">
            <div>
              GSTIN : <span className="font-mono font-bold uppercase">{invoice.billing_gstin_snapshot ? invoice.billing_gstin_snapshot.toUpperCase() : '—'}</span>
            </div>
            <div>
              State : <span className="font-mono font-bold uppercase">{customerStateAbbr ? customerStateAbbr.toUpperCase() : '—'}</span>
            </div>
            <div>
              Code : <span className="font-mono font-bold">{invoice.place_of_supply_state_code || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Items Table (Attached to Sub-Middle) */}
      <table className="w-full border-collapse mb-0">
        <thead className="border-x-2 border-t-2 border-black">
          <tr className="bg-slate-50 border-b border-black">
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-10 whitespace-nowrap">S.No</th>
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase whitespace-nowrap">DESCRIPTION OF GOODS</th>
            {showHsn && (
              <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-16 whitespace-nowrap">HSN/SAC</th>
            )}
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-10 whitespace-nowrap">Qty</th>
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-18 whitespace-nowrap">Rate {invoice.gst_rate_type === 'inclusive' ? '(GST Incl)' : '(GST Excl)'}</th>
            {discEnabled && (
              <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-12 whitespace-nowrap">Disc(%)</th>
            )}
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-30 whitespace-nowrap">Taxable Value</th>
            <th className="border-r border-black p-1.5 text-[11px] font-bold text-black text-center uppercase w-14 whitespace-nowrap">GST %</th>
            <th className="p-1.5 text-[11px] font-bold text-black text-center uppercase w-24 whitespace-nowrap">Net Amount</th>
          </tr>
        </thead>
        <tbody className="border-x-2 border-black">
          {invoice.lineItems.map((item: any, idx: number) => {
            const qty = Number(item.quantity);
            const grossPaise = qty * item.unit_price_paise;
            const discountPct = grossPaise > 0 ? (item.discount_paise / grossPaise) * 100 : 0;
            const isEven = idx % 2 === 1;

            return (
              <tr
                key={item.id}
                className={`border-b border-slate-300 hover:bg-slate-50/50 ${isEven ? 'bg-slate-100/60' : 'bg-white'
                  }`}
              >
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center">{idx + 1}</td>
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black font-bold">{item.description}</td>
                {showHsn && (
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-mono whitespace-nowrap">{item.hsn_sac_code}</td>
                )}
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-bold">{item.quantity}</td>
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-right">{formatPaiseAsInr(item.unit_price_paise)}</td>
                {discEnabled && (
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center">{discountPct > 0 ? `${discountPct.toFixed(1)}%` : '0%'}</td>
                )}
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-right">{formatPaiseAsInr(item.taxable_value_paise)}</td>
                <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-mono">{Number(item.tax_rate_percentage)}%</td>
                <td className="py-0.5 px-1.5 text-[11px] text-black text-right font-bold">{formatPaiseAsInr(item.line_total_paise)}</td>
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
                <tr
                  key={`pad-${i}`}
                  className={`border-b border-slate-300 hover:bg-slate-50/50 ${isEven ? 'bg-slate-100/60' : 'bg-white'}`}
                >
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center">{sNo}</td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black font-bold">&nbsp;</td>
                  {showHsn && (
                    <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-mono whitespace-nowrap">&nbsp;</td>
                  )}
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-bold">&nbsp;</td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-right">&nbsp;</td>
                  {discEnabled && (
                    <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center">&nbsp;</td>
                  )}
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-right">&nbsp;</td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-[11px] text-black text-center font-mono">&nbsp;</td>
                  <td className="py-0.5 px-1.5 text-[11px] text-black text-right font-bold">&nbsp;</td>
                </tr>
              );
            });
          })()}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-b-2 border-black">
            {/* Left: Bank Details (Spanning from S.No to Qty with ZERO left border) */}
            <td
              colSpan={(showHsn ? 1 : 0) + 3}
              className="py-[3px] px-1 text-[12px] font-bold text-black align-bottom border-r-2 border-slate-500 border-l-0"
            >
              <div className="space-y-[1px]">
                <span className="text-[13px] font-black border-b border-black pb-[1px] mb-[3px] inline-block uppercase whitespace-nowrap">
                  BANK DETAILS:
                </span>
                <div className="whitespace-nowrap">Bank Name : <span className="font-semibold truncate">{invoice.bank_name || 'State Bank of India'}</span></div>
                <div className="whitespace-nowrap">Account No. : <span className="font-semibold">{invoice.bank_account_number || '40013401425'}</span></div>
                <div className="whitespace-nowrap">IFSC Code : <span className="font-mono font-bold">{invoice.bank_ifsc || 'SBIN0002178'}</span></div>
              </div>
            </td>

            {/* Right: Invoice Summary Box (Spanning precisely from RATE to NET AMOUNT) */}
            <td colSpan={(discEnabled ? 1 : 0) + 4} className="p-0 align-bottom border-r-2 border-slate-500">
              {(() => {
                const formatTaxSummary = (paise: number) => {
                  if (paise === 0) {
                    return <span className="text-slate-400 font-normal select-none">–</span>;
                  }
                  return paiseToRupees(paise).toFixed(2);
                };

                return (
                  <table className="w-full text-[11px] font-bold text-black border-collapse">
                    <tbody>
                      {/* Taxable Value */}
                      <tr className="border-b border-black">
                        <td colSpan={2} className="py-[3px] px-1 text-[11px] font-bold uppercase text-black">TAXABLE VALUE</td>
                        <td className="py-[3px] pr-2 pl-1 text-right text-[12px] font-black text-black whitespace-nowrap">
                          {paiseToRupees(invoice.subtotal_paise).toFixed(2)}
                        </td>
                      </tr>

                      {/* Add CGST & SGST (Intra State Only) */}
                      {isIntra && (
                        <>
                          <tr className="border-b border-black bg-slate-50/50">
                            <td colSpan={2} className="py-[3px] px-1">
                              <div className="flex items-center gap-[6px]">
                                <span className="shrink-0 font-bold">Add. CGST</span>
                                <div className="text-[9px] font-semibold flex flex-wrap items-center gap-[4px] text-gray-700 whitespace-nowrap">
                                  {activeRates.length > 0 ? (
                                    activeRates.map((rate, i) => (
                                      <span key={rate} className="flex items-center gap-[4px]">
                                        {i > 0 && <span className="text-gray-300 font-normal">|</span>}
                                        <span>{rate / 2}%:{paiseToRupees(taxGroups[rate].cgst).toFixed(2)}</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-[3px] pr-2 pl-3 text-right text-black font-black font-mono whitespace-nowrap">
                              {formatTaxSummary(invoice.total_cgst_paise)}
                            </td>
                          </tr>
                          <tr className="border-b border-black bg-slate-50/50">
                            <td colSpan={2} className="py-[3px] px-1">
                              <div className="flex items-center gap-[6px]">
                                <span className="shrink-0 font-bold">Add. SGST</span>
                                <div className="text-[9px] font-semibold flex flex-wrap items-center gap-[4px] text-gray-700 whitespace-nowrap">
                                  {activeRates.length > 0 ? (
                                    activeRates.map((rate, i) => (
                                      <span key={rate} className="flex items-center gap-[4px]">
                                        {i > 0 && <span className="text-gray-300 font-normal">|</span>}
                                        <span>{rate / 2}%:{paiseToRupees(taxGroups[rate].sgst).toFixed(2)}</span>
                                      </span>
                                    ))
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-[3px] pr-2 pl-3 text-right text-black font-black font-mono whitespace-nowrap">
                              {formatTaxSummary(invoice.total_sgst_paise)}
                            </td>
                          </tr>
                        </>
                      )}

                      {/* Add IGST (Inter State Only) */}
                      {!isIntra && (
                        <tr className="border-b border-black">
                          <td colSpan={2} className="py-[3px] px-1">
                            <div className="flex items-center gap-[6px]">
                              <span className="shrink-0 font-bold">Add. IGST</span>
                              <div className="text-[9px] font-semibold flex flex-wrap items-center gap-[4px] text-gray-700 whitespace-nowrap">
                                {activeRates.length > 0 ? (
                                  activeRates.map((rate, i) => (
                                    <span key={rate} className="flex items-center gap-[4px]">
                                      {i > 0 && <span className="text-gray-300 font-normal">|</span>}
                                      <span>{rate}%:{paiseToRupees(taxGroups[rate].igst).toFixed(2)}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-[3px] pr-2 pl-3 text-right text-black font-black font-mono whitespace-nowrap">
                            {formatTaxSummary(invoice.total_igst_paise)}
                          </td>
                        </tr>
                      )}

                      {/* Round Off */}
                      <tr className="border-b border-black">
                        <td colSpan={2} className="py-[3px] px-1 italic font-semibold text-gray-800">Rounded off (+/-)</td>
                        <td className="py-[3px] pr-2 pl-1 text-right font-black text-black whitespace-nowrap">
                          {(() => {
                            const diffPaise = invoice.grand_total_paise - (invoice.subtotal_paise + invoice.total_tax_paise);
                            const diffRupees = diffPaise / 100;
                            return diffRupees === 0 ? '0.00' : (diffRupees >= 0 ? "+" : "") + diffRupees.toFixed(2);
                          })()}
                        </td>
                      </tr>

                      {/* Grand Total */}
                      <tr className="bg-slate-100 font-black">
                        <td colSpan={2} className="py-[5px] px-1.5 text-[11px] font-black uppercase text-black">GRAND TOTAL</td>
                        <td className="py-[5px] pr-2 pl-1.5 text-right text-[13px] font-extrabold text-black font-mono whitespace-nowrap">
                          {formatPaiseAsInr(invoice.grand_total_paise)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                );
              })()}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Full-width Attached Amount in Words Row */}
      <div className="py-0.5 text-[13px] font-bold text-black leading-tight border-b-2 border-black mb-[3px]">
        Amount in Words : <span className="italic font-bold">{amountInWordsIndian(Math.floor(invoice.grand_total_paise / 100), invoice.grand_total_paise % 100)}.</span>
      </div>

      {/* Footer Info & Signatures */}
      <div className="text-[11px] font-bold text-black pt-[1px]">
        {/* Row 1: Header / Title */}
        <div className="flex justify-between items-start uppercase leading-tight mb-1">
          <span className="tracking-wider">Terms &amp; Conditions:</span>
          <span className="font-black">For {invoice.business_name}</span>
        </div>

        {/* Row 2: Other Terms & Stamp Placeholder */}
        <div className="flex justify-between items-end mb-[1px]">
          <div className="flex-1 pr-2">
            {otherTerms.length > 0 && (
              <ul className="list-none pl-0 space-y-[0.5px] text-[10px] font-medium text-black">
                {otherTerms.map((term, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="shrink-0 text-slate-500 font-bold select-none">→</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Dynamic Signature area / Stamp placeholder */}
          <div className="shrink-0 h-6 w-36 flex items-center justify-center select-none pointer-events-none ml-2">
            <span className="font-mono text-zinc-300 border border-zinc-200 text-[10px] px-2 py-0.5 rounded tracking-wider uppercase whitespace-nowrap">STAMP / SIGNATURE</span>
          </div>
        </div>

        {/* Row 3: Last Term aligned with Dashed Signature Line */}
        <div className="flex justify-between items-center text-[10px] font-medium text-black">
          <div className="flex-1 pr-2 flex items-start gap-1">
            <span className="shrink-0 text-slate-500 font-bold select-none">→</span>
            <span>{lastTerm}</span>
          </div>
          <div className="shrink-0 pl-2 flex justify-end">
            <div className="border-t border-dashed border-black w-36"></div>
          </div>
        </div>
      </div>

      {hasWatermark && (
        <div className="mt-2 pt-1 border-t border-slate-300 text-center select-none print:mt-1">
          <p className="text-[9px] font-medium text-slate-500 tracking-wider">
            Generated via Bill Matrix (Free Tier) — www.billmatrix.in
          </p>
        </div>
      )}
    </div>
  );
}
