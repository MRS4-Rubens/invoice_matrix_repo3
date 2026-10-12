"use client";

import { useState, useEffect } from 'react';
import { amountInWordsIndian } from '@/lib/pdf/number-to-words';
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money';
import { INDIAN_GST_STATES, getStateAbbrByCode } from '@/lib/gst/indian-states';
import { InvoiceTemplateProps } from './template-1';

// ============================================================================
// CONFIGURABLE DESIGN SYSTEM VARIABLES FOR TEMPLATE 4 (EXECUTIVE PREMIUM)
// Vertically optimized for A4 & A5 landscape printing with elevated font sizing
// ============================================================================
const PRINT_STYLES = {
  outerBorder: 'border-2 border-slate-800 p-3 bg-white text-slate-900 shadow-sm print:p-0 print:border-none print:shadow-none',

  // Header aesthetics
  badgeTaxInvoice: 'border border-slate-900 bg-white text-slate-950 text-[11px] font-black tracking-widest uppercase px-3.5 py-0.5 rounded-full inline-block',
  fontTitle: 'text-2xl font-black tracking-tight text-slate-900 leading-tight uppercase',
  fontSubtitle: 'text-[11px] font-extrabold text-slate-700 uppercase tracking-wide',
  fontAddress: 'text-[11px] text-slate-700 font-semibold leading-tight',
  fontContact: 'text-[11px] text-slate-800 font-bold',

  // Table aesthetics
  tableHeaderPrimary: 'bg-slate-900 text-white text-[11px] font-bold text-center uppercase tracking-wider p-1',
  tableHeaderSecondary: 'bg-slate-800 text-slate-200 text-[10px] font-bold text-center uppercase p-0.5',
  tableRowEven: 'bg-slate-100/60',
  tableRowHover: 'hover:bg-slate-100/50',
  tableBorder: 'border-collapse border border-slate-800',
  cellBorder: 'border border-slate-300',

  // Section Spacing
  spacingSection: 'mb-2',
};

export function InvoiceTemplate4({ invoice, businessStateCode, printSize, hasWatermark }: InvoiceTemplateProps) {
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

  const customerStateInfo = INDIAN_GST_STATES.find(s => s.code === invoice.place_of_supply_state_code);
  const customerStateName = customerStateInfo ? customerStateInfo.name : (invoice.place_of_supply_state_code || '—');
  const customerStateAbbr = getStateAbbrByCode(invoice.place_of_supply_state_code);

  const businessStateInfo = INDIAN_GST_STATES.find(s => s.code === businessStateCode);
  const businessStateName = businessStateInfo ? businessStateInfo.name : businessStateCode;

  // Calculate sum of quantities & discounts
  const totalQty = invoice.lineItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalDiscount = invoice.lineItems.reduce((sum, item) => sum + item.discount_paise, 0);

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
    <div className={`template-4-root ${PRINT_STYLES.outerBorder}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

        .template-4-root {
          font-family: 'Century Schoolbook', 'Century', 'Lora', 'TeX Gyre Schola', 'Libre Baskerville', serif !important;
        }

        @media print {
          @page { size: auto; margin: 0.6cm; }
          body { background-color: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* ==================================================================== */}
      {/* 1. TOP HEADER SECTION (COMPACT & MODERN)                            */}
      {/* ==================================================================== */}
      <div className={`relative flex flex-col items-center w-full ${PRINT_STYLES.spacingSection} min-h-[75px]`}>
        {/* Center: Business Branding Block (Nudged 7px left for balanced print breathing room) */}
        <div className="flex flex-col items-center text-center relative left-[-7px]">
          {/* TAX INVOICE Badge */}
          <div className="mb-[3px]">
            <span className={PRINT_STYLES.badgeTaxInvoice}>
              TAX INVOICE
            </span>
          </div>

          {/* Brand Block: Business Name + Tagline with Dynamic Logo Anchor */}
          <div className="relative inline-flex flex-col items-center">
            {logoSrc && (
              <div className={`absolute right-full mr-[7px] w-[140px] h-[64px] flex items-end justify-end p-0 select-none overflow-hidden ${invoice.nature_of_business ? 'bottom-[-4px]' : 'bottom-0'
                }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {/* Business Name */}
            <h1 className={`${PRINT_STYLES.fontTitle} whitespace-nowrap`}>{invoice.business_name}</h1>

            {/* Nature of Business */}
            {invoice.nature_of_business && (
              <p className={`${PRINT_STYLES.fontSubtitle} whitespace-nowrap mt-[2px]`}>
                ({invoice.nature_of_business})
              </p>
            )}
          </div>

          {/* Address */}
          <p className={`${PRINT_STYLES.fontAddress} mt-[4px]`}>
            {invoice.address_line1}
            {invoice.address_line2 ? `, ${invoice.address_line2}` : ''}
            {invoice.city ? `, ${invoice.city.toUpperCase()}` : ''}
            {invoice.pincode ? ` - ${invoice.pincode}` : ''}
          </p>

          {/* Contact Numbers */}
          {(invoice.phone || invoice.alternate_phone) && (
            <p className={`${PRINT_STYLES.fontContact} mt-[2px]`}>
              Ph No. : {invoice.phone || ''}
              {invoice.phone && invoice.alternate_phone ? ' | ' : ''}
              {invoice.alternate_phone || ''}
            </p>
          )}
        </div>

        {/* Top Right: Compact Elevated Invoice Meta Card */}
        <div className="absolute top-0 right-0 border border-slate-300 rounded-md bg-slate-50/90 px-2 py-1 text-[11px] font-semibold text-slate-800 text-left space-y-[2px] shrink-0 min-w-[205px] shadow-xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-[2px] gap-2">
            <span className="text-slate-700 font-extrabold uppercase text-[10px] whitespace-nowrap">Invoice No</span>
            <span className="font-mono font-black text-slate-900 text-[11px] whitespace-nowrap">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-200 pb-[2px] gap-2">
            <span className="text-slate-700 font-extrabold uppercase text-[10px] whitespace-nowrap">Date</span>
            <span className="font-bold text-slate-900 text-[11px] whitespace-nowrap">
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-700 font-extrabold uppercase text-[10px] whitespace-nowrap">GSTIN</span>
            <span className="font-mono font-bold text-slate-900 text-[11px] uppercase whitespace-nowrap">{invoice.seller_gstin_snapshot ? invoice.seller_gstin_snapshot.toUpperCase() : '—'}</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SINGLE FULL-WIDTH CARD: 2-LINE COMPACT CUSTOMER & SUPPLY DETAILS  */}
      {/* ==================================================================== */}
      <div className="border border-slate-300 rounded-md bg-white px-3 py-[7px] text-[11.5px] font-semibold text-slate-800 space-y-[5px] mb-2 shadow-xs">
        {/* Line 1: Name, GSTIN, Place of Supply */}
        <div className="flex justify-between items-center w-full">
          <div className="truncate pr-4 flex-1">
            <span className="text-slate-700 font-extrabold uppercase text-[11px]">BILL TO :</span>{' '}
            <span className="font-black text-slate-900 text-[12.5px]">{invoice.billing_name_snapshot || '—'}</span>
          </div>
          <div className="flex gap-6 shrink-0 text-[11.5px]">
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">GSTIN :</span>{' '}
              <span className="font-mono font-bold text-slate-900 uppercase">{invoice.billing_gstin_snapshot ? invoice.billing_gstin_snapshot.toUpperCase() : '—'}</span>
            </div>
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">Place of Supply :</span>{' '}
              <span className="font-bold text-slate-900">{customerStateName || '—'}</span>
            </div>
          </div>
        </div>

        {/* Line 2: Address, Reverse Charge, State Code */}
        <div className="flex justify-between items-center w-full border-t border-slate-100 pt-[3px] text-[11.5px]">
          <div className="truncate pr-4 flex-1">
            <span className="text-slate-700 font-extrabold uppercase text-[11px]">Address :</span>{' '}
            <span className="text-slate-800 font-semibold">
              {invoice.billing_address_snapshot?.replace(/\n/g, ', ') || '—'}
            </span>
          </div>
          <div className="flex gap-6 shrink-0 text-[11.5px]">
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">Reverse Charge :</span>{' '}
              <span className="font-bold text-slate-800">No</span>
            </div>
            <div>
              <span className="text-slate-700 font-extrabold uppercase text-[11px]">Code :</span>{' '}
              <span className="font-mono font-bold text-slate-900">{invoice.place_of_supply_state_code || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. COMPREHENSIVE LINE ITEMS TABLE                                   */}
      {/* ==================================================================== */}
      <div className="mb-0">
        <table className="w-full border-collapse">
          <thead className="border-x-2 border-t-2 border-slate-800">
            {/* Primary Header Row */}
            <tr className="bg-slate-200 text-slate-955 border-b border-slate-400">
              <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-8 whitespace-nowrap">#</th>
              <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-left pl-2 whitespace-nowrap">DESCRIPTION OF GOODS</th>
              {showHsn && (
                <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-16 whitespace-nowrap">HSN/SAC</th>
              )}
              <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-9 whitespace-nowrap">Qty</th>
              <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-right pr-1.5 w-16 whitespace-nowrap">Rate {invoice.gst_rate_type === 'inclusive' ? '(GST Incl)' : '(GST Excl)'}</th>

              {discEnabled && (
                <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-12 whitespace-nowrap">Disc%</th>
              )}

              <th rowSpan={2} className="border-r border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-right pr-1.5 w-20 whitespace-nowrap">Taxable Val</th>

              {isIntra ? (
                <>
                  <th colSpan={2} className="border-r border-slate-400 border-b border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-24 bg-slate-200/80 text-slate-900 whitespace-nowrap">CGST</th>
                  <th colSpan={2} className="border-r border-slate-400 border-b border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-24 bg-slate-200/80 text-slate-900 whitespace-nowrap">SGST</th>
                </>
              ) : (
                <th colSpan={2} className="border-r border-slate-400 border-b border-slate-400 p-0.5 text-[10.5px] font-extrabold uppercase text-center w-24 bg-slate-200/80 text-slate-900 whitespace-nowrap">IGST</th>
              )}

              <th rowSpan={2} className="p-0.5 text-[10.5px] font-extrabold uppercase text-right pr-1.5 w-22 whitespace-nowrap">Net Amount</th>
            </tr>

            {/* Sub-Header Row for Tax Rate & Amount */}
            <tr className="bg-slate-100 text-slate-800 border-b-2 border-slate-800 font-extrabold">
              {isIntra ? (
                <>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-center uppercase w-9">Rate</th>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-right pr-1 uppercase w-15">Amt</th>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-center uppercase w-9">Rate</th>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-right pr-1 uppercase w-15">Amt</th>
                </>
              ) : (
                <>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-center uppercase w-9">Rate</th>
                  <th className="border-r border-slate-400 p-0.5 text-[9.5px] font-extrabold text-right pr-1 uppercase w-15">Amt</th>
                </>
              )}
            </tr>
          </thead>

          <tbody className="border-x-2 border-slate-800">
            {invoice.lineItems.map((item: any, idx: number) => {
              const qty = Number(item.quantity);
              const grossPaise = qty * item.unit_price_paise;
              const discountPct = grossPaise > 0 ? (item.discount_paise / grossPaise) * 100 : 0;
              const isEven = idx % 2 === 1;

              return (
                <tr
                  key={item.id}
                  className={`border-b border-slate-300 text-[11px] font-semibold text-slate-900 ${isEven ? 'bg-slate-100/60' : 'bg-white'
                    }`}
                >
                  <td className="border-r border-slate-300 py-0.5 text-center text-slate-700 font-extrabold">{idx + 1}</td>
                  <td className="border-r border-slate-300 py-0.5 px-2 text-left font-black text-slate-950">{item.description}</td>
                  {showHsn && (
                    <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                      {item.hsn_sac_code || '—'}
                    </td>
                  )}
                  <td className="border-r border-slate-300 py-0.5 px-1 text-center font-bold">{item.quantity}</td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">
                    {formatPaiseAsInr(item.unit_price_paise)}
                  </td>
                  {discEnabled && (
                    <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">
                      {discountPct > 0 ? `${discountPct.toFixed(1)}%` : '0%'}
                    </td>
                  )}
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-900">
                    {formatPaiseAsInr(item.taxable_value_paise)}
                  </td>
                  {isIntra ? (
                    <>
                      <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">
                        {Number(item.tax_rate_percentage) / 2}%
                      </td>
                      <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">
                        {formatPaiseAsInr(item.cgst_paise)}
                      </td>
                      <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">
                        {Number(item.tax_rate_percentage) / 2}%
                      </td>
                      <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">
                        {formatPaiseAsInr(item.sgst_paise)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">
                        {Number(item.tax_rate_percentage)}%
                      </td>
                      <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">
                        {formatPaiseAsInr(item.igst_paise)}
                      </td>
                    </>
                  )}
                  <td className="py-0.5 px-2 text-right font-mono font-black text-slate-950">
                    {formatPaiseAsInr(item.line_total_paise)}
                  </td>
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
                    className={`border-b border-slate-300 text-[11px] font-semibold text-slate-900 ${isEven ? 'bg-slate-100/60' : 'bg-white'}`}
                  >
                    <td className="border-r border-slate-300 py-0.5 text-center text-slate-700 font-extrabold">{sNo}</td>
                    <td className="border-r border-slate-300 py-0.5 px-2 text-left font-black text-slate-955">&nbsp;</td>
                    {showHsn && (
                      <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-bold text-slate-700 whitespace-nowrap">&nbsp;</td>
                    )}
                    <td className="border-r border-slate-300 py-0.5 px-1 text-center font-bold">&nbsp;</td>
                    <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">&nbsp;</td>
                    {discEnabled && (
                      <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">&nbsp;</td>
                    )}
                    <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-900">&nbsp;</td>
                    {isIntra ? (
                      <>
                        <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">&nbsp;</td>
                        <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">&nbsp;</td>
                        <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">&nbsp;</td>
                        <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">&nbsp;</td>
                      </>
                    ) : (
                      <>
                        <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-semibold text-slate-700">&nbsp;</td>
                        <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold text-slate-800">&nbsp;</td>
                      </>
                    )}
                    <td className="py-0.5 px-2 text-right font-mono font-black text-slate-950">&nbsp;</td>
                  </tr>
                );
              });
            })()}

            {/* Total Row */}
            <tr className="border-b-2 border-slate-800 bg-slate-100 font-extrabold text-[11px] text-slate-900">
              <td colSpan={2} className="border-r border-slate-300 py-0.5 px-2 text-left uppercase">Total</td>
              {showHsn && <td className="border-r border-slate-300 py-0.5 px-1"></td>}
              <td className="border-r border-slate-300 py-0.5 px-1 text-center font-mono font-bold">
                {invoice.lineItems.reduce((acc, i) => acc + Number(i.quantity), 0)}
              </td>
              <td className="border-r border-slate-300 py-0.5 px-1"></td>
              {discEnabled && (
                <td className="border-r border-slate-300 py-0.5 px-1"></td>
              )}
              <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">
                {formatPaiseAsInr(invoice.subtotal_paise)}
              </td>
              {isIntra ? (
                <>
                  <td className="border-r border-slate-300 py-0.5 px-1"></td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">
                    {formatPaiseAsInr(invoice.total_cgst_paise)}
                  </td>
                  <td className="border-r border-slate-300 py-0.5 px-1"></td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">
                    {formatPaiseAsInr(invoice.total_sgst_paise)}
                  </td>
                </>
              ) : (
                <>
                  <td className="border-r border-slate-300 py-0.5 px-1"></td>
                  <td className="border-r border-slate-300 py-0.5 px-1.5 text-right font-mono font-bold">
                    {formatPaiseAsInr(invoice.total_igst_paise)}
                  </td>
                </>
              )}
              <td className="py-0.5 px-2 text-right font-mono font-black text-slate-950">
                {formatPaiseAsInr(invoice.grand_total_paise)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-b-2 border-slate-800 bg-white">
              {/* Left: Bank Details Card (Spanning precisely from # to Rate/Discount with ZERO left border) */}
              <td
                colSpan={(showHsn ? 1 : 0) + (discEnabled ? 1 : 0) + 4}
                className="py-[3px] px-1 text-[12px] font-bold text-slate-800 align-bottom border-r-2 border-slate-500 border-l-0"
              >
                <div className="space-y-[1px] text-[12px] text-slate-800">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-[1px] mb-[3px]">
                    <span className="text-[13px] font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">BANK &amp; PAYMENT DETAILS</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 whitespace-nowrap">VERIFIED</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-24 text-slate-700 font-extrabold uppercase text-[11px] shrink-0 whitespace-nowrap">Bank Name:</span>
                    <span className="font-bold text-slate-900 truncate">{invoice.bank_name || 'State Bank of India'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-24 text-slate-700 font-extrabold uppercase text-[11px] shrink-0 whitespace-nowrap">Account No.:</span>
                    <span className="font-mono font-black text-slate-900 tracking-wider whitespace-nowrap">{invoice.bank_account_number || '40013401425'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-24 text-slate-700 font-extrabold uppercase text-[11px] shrink-0 whitespace-nowrap">IFSC Code:</span>
                    <span className="font-mono font-black text-slate-900 whitespace-nowrap">{invoice.bank_ifsc || 'SBIN0002178'}</span>
                  </div>
                  <div className="text-[10px] text-slate-700 font-semibold pt-[3px] border-t border-slate-200 flex justify-between items-center whitespace-nowrap">
                    <span>Mode: <strong>NEFT / RTGS / UPI</strong></span>
                    <span>Scan &amp; Pay</span>
                  </div>
                </div>
              </td>

              {/* Right: Invoice Summary Box (Spanning precisely from TAXABLE VALUE to NET AMOUNT) */}
              <td
                colSpan={(isIntra ? 4 : 2) + 2}
                className="p-0 align-bottom border-r-2 border-slate-500"
              >
                {(() => {
                  const formatTaxSummary = (paise: number) => {
                    if (paise === 0) {
                      return <span className="text-slate-400 font-normal select-none">–</span>;
                    }
                    return paiseToRupees(paise).toFixed(2);
                  };

                  return (
                    <div className="w-full text-[11px] font-bold text-slate-800">
                      {/* Taxable Value */}
                      <div className="flex justify-between items-center px-2.5 py-[3px] border-b border-slate-200">
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wide">Taxable Amount</span>
                        <span className="font-mono font-black text-slate-900 text-[12px] whitespace-nowrap pl-3">
                          ₹{paiseToRupees(invoice.subtotal_paise).toFixed(2)}
                        </span>
                      </div>

                      {/* CGST & SGST (Intra-State) - Inline Breakdown beside label */}
                      {isIntra && (
                        <>
                          <div className="flex justify-between items-center px-2.5 py-[1px] border-b border-slate-200 bg-slate-50/40">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-[11px] font-bold text-slate-700 shrink-0">Add. CGST</span>
                              <div className="text-[9px] font-bold text-slate-700 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                {activeRates.length > 0 ? (
                                  activeRates.map((rate, i) => (
                                    <span key={rate} className="flex items-center gap-1.5">
                                      {i > 0 && <span className="text-slate-400">|</span>}
                                      <span>{rate / 2}%:{paiseToRupees(taxGroups[rate].cgst).toFixed(2)}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono font-black text-slate-900 text-[11px] whitespace-nowrap pl-3 shrink-0">
                              ₹{formatTaxSummary(invoice.total_cgst_paise)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center px-2.5 py-[1px] border-b border-slate-200 bg-slate-50/40">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-[11px] font-bold text-slate-700 shrink-0">Add. SGST</span>
                              <div className="text-[9px] font-bold text-slate-700 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                {activeRates.length > 0 ? (
                                  activeRates.map((rate, i) => (
                                    <span key={rate} className="flex items-center gap-1.5">
                                      {i > 0 && <span className="text-slate-400">|</span>}
                                      <span>{rate / 2}%:{paiseToRupees(taxGroups[rate].sgst).toFixed(2)}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono font-black text-slate-900 text-[11px] whitespace-nowrap pl-3 shrink-0">
                              ₹{formatTaxSummary(invoice.total_sgst_paise)}
                            </span>
                          </div>
                        </>
                      )}

                      {/* IGST (Inter-State) - Inline Breakdown beside label */}
                      {!isIntra && (
                        <div className="flex justify-between items-center px-2.5 py-[1px] border-b border-slate-200 bg-slate-50/40">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-[11px] font-bold text-slate-700 shrink-0">Add. IGST</span>
                            <div className="text-[9px] font-bold text-slate-700 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                              {activeRates.length > 0 ? (
                                activeRates.map((rate, i) => (
                                  <span key={rate} className="flex items-center gap-1.5">
                                    {i > 0 && <span className="text-slate-400">|</span>}
                                    <span>{rate}%:{paiseToRupees(taxGroups[rate].igst).toFixed(2)}</span>
                                  </span>
                                ))
                              ) : (
                                <span>-</span>
                              )}
                            </div>
                          </div>
                          <span className="font-mono font-black text-slate-900 text-[11px] whitespace-nowrap pl-3 shrink-0">
                            ₹{formatTaxSummary(invoice.total_igst_paise)}
                          </span>
                        </div>
                      )}

                      {/* Round Off */}
                      <div className="flex justify-between items-center px-2.5 py-[1px] border-b border-slate-200 text-slate-700">
                        <span className="text-[11px] italic font-bold">Round Off (+/-)</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap pl-3">
                          {(() => {
                            const diffPaise = invoice.grand_total_paise - (invoice.subtotal_paise + invoice.total_tax_paise);
                            const diffRupees = diffPaise / 100;
                            return diffRupees === 0 ? '0.00' : (diffRupees >= 0 ? "+" : "") + diffRupees.toFixed(2);
                          })()}
                        </span>
                      </div>

                      {/* Grand Total */}
                      <div className="bg-slate-200/80 text-slate-955 border-t border-slate-300 px-3 py-[5px] flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase tracking-wider">GRAND TOTAL</span>
                        <span className="text-[13px] font-black font-mono tracking-tight whitespace-nowrap pl-3">
                          {formatPaiseAsInr(invoice.grand_total_paise)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ==================================================================== */}
      {/* 5. AMOUNT IN WORDS RIBBON                                           */}
      {/* ==================================================================== */}
      <div className="bg-slate-100/90 border border-slate-300 rounded-md py-0.5 px-3 mb-[3px] text-[13px] font-bold text-slate-800 leading-tight">
        Amount in Words : <span className="italic font-extrabold text-slate-955">{amountInWordsIndian(Math.floor(invoice.grand_total_paise / 100), invoice.grand_total_paise % 100)}.</span>
      </div>

      {/* ==================================================================== */}
      {/* 6. TERMS & CONDITIONS & SIGNATURE FOOTER                            */}
      {/* ==================================================================== */}
      <div className="text-[11px] pt-[1px] font-bold text-slate-900">
        {/* Row 1: Header / Title */}
        <div className="flex justify-between items-start uppercase leading-tight mb-1">
          <span className="tracking-wider">Terms &amp; Conditions:</span>
          <span className="font-black">For {invoice.business_name}</span>
        </div>

        {/* Row 2: Other Terms & Stamp Placeholder */}
        <div className="flex justify-between items-end mb-[1px]">
          <div className="flex-1 pr-2">
            {otherTerms.length > 0 && (
              <ul className="list-none pl-0 space-y-[0.5px] text-[10px] font-semibold text-slate-800">
                {otherTerms.map((term, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="shrink-0 text-slate-700 font-extrabold select-none">→</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Dynamic Signature area / Stamp placeholder */}
          <div className="shrink-0 h-6 w-36 border border-dashed border-slate-400 rounded bg-slate-50/60 flex items-center justify-center select-none pointer-events-none ml-2">
            <span className="font-mono text-slate-600 font-bold text-[10px] tracking-wider uppercase whitespace-nowrap">STAMP / SIGNATURE</span>
          </div>
        </div>

        {/* Row 3: Last Term aligned with Dashed Signature Line */}
        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-800">
          <div className="flex-1 pr-2 flex items-start gap-1">
            <span className="shrink-0 text-slate-700 font-extrabold select-none">→</span>
            <span>{lastTerm}</span>
          </div>
          <div className="shrink-0 pl-2 flex justify-end">
            <div className="border-t border-dashed border-slate-800 w-36"></div>
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
