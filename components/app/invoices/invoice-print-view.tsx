import { amountInWordsIndian } from '@/lib/pdf/number-to-words';
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn_sac_code: string | null;
  quantity: string | number;
  unit_price_paise: number;
  taxable_value_paise: number;
  tax_rate_percentage: string | number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  line_total_paise: number;
}

export interface InvoicePrintViewProps {
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
    place_of_supply_state_code: string | null;
    subtotal_paise: number;
    total_cgst_paise: number;
    total_sgst_paise: number;
    total_igst_paise: number;
    total_tax_paise: number;
    grand_total_paise: number;
    lineItems: InvoiceLineItem[];
  };
  businessStateCode: string;
}

export function InvoicePrintView({ invoice, businessStateCode }: InvoicePrintViewProps) {
  const isIntra = invoice.total_igst_paise === 0;
  const supplyLabel = isIntra ? 'Intra-State' : 'Inter-State';
  const stateInfo = INDIAN_GST_STATES.find(s => s.code === businessStateCode);
  const businessStateName = stateInfo ? stateInfo.name : businessStateCode;
  
  const customerStateInfo = INDIAN_GST_STATES.find(s => s.code === invoice.place_of_supply_state_code);
  const customerStateName = customerStateInfo ? customerStateInfo.name : invoice.place_of_supply_state_code;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border p-8 print:p-0 print:border-none print:shadow-none print:rounded-none">
      <style>{`
        @media print {
          @page { size: A4; margin: 1cm; }
          body { background-color: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold" style={{ color: '#1e3a5f' }}>{invoice.business_name}</h1>
        <p className="text-sm text-slate-500 mt-1">{invoice.city || ''}</p>
        <p className="text-sm font-medium mt-1">GSTIN: {invoice.seller_gstin_snapshot} | Contact: {invoice.phone || 'N/A'}</p>
        <p className="text-sm font-medium">State: {businessStateName} ({businessStateCode})</p>
      </div>

      <hr className="border-t-2 border-slate-800 mb-6" />

      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className="border-2 border-slate-800 px-6 py-1.5 font-bold tracking-widest uppercase">
          TAX INVOICE
        </div>
      </div>

      {/* Two Columns */}
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <p className="mb-1"><span className="font-semibold text-slate-600">Bill To:</span> <span className="font-bold text-slate-900">{invoice.billing_name_snapshot}</span></p>
          {invoice.billing_gstin_snapshot && (
            <p className="text-sm mb-1 font-mono text-slate-700 font-semibold">GSTIN: {invoice.billing_gstin_snapshot}</p>
          )}
          <p className="text-sm text-slate-700">State: {customerStateName} ({invoice.place_of_supply_state_code})</p>
        </div>
        <div className="w-1/2 pl-4 text-right">
          <p className="mb-1 text-slate-600">Invoice No: <span className="font-bold text-slate-900">{invoice.invoice_number}</span></p>
          <p className="mb-1 text-slate-600">Date: <span className="font-bold text-slate-900">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-IN') : 'N/A'}</span></p>
          <p className="text-slate-600">Supply Type: <span className="font-bold text-slate-900">{supplyLabel}</span></p>
        </div>
      </div>

      {/* Table */}
      <div className="mb-6 border border-slate-300">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="px-2 py-2 border-r border-slate-300 text-center font-semibold text-slate-700 w-12">S.No</th>
              <th className="px-2 py-2 border-r border-slate-300 text-left font-semibold text-slate-700">Description</th>
              <th className="px-2 py-2 border-r border-slate-300 text-left font-semibold text-slate-700 w-24">HSN</th>
              <th className="px-2 py-2 border-r border-slate-300 text-center font-semibold text-slate-700 w-16">Qty</th>
              <th className="px-2 py-2 border-r border-slate-300 text-right font-semibold text-slate-700 w-24">Rate</th>
              <th className="px-2 py-2 border-r border-slate-300 text-right font-semibold text-slate-700 w-24">Taxable</th>
              
              {!isIntra ? (
                <>
                  <th className="px-2 py-2 border-r border-slate-300 text-center font-semibold text-slate-700 w-16">GST%</th>
                  <th className="px-2 py-2 border-r border-slate-300 text-right font-semibold text-slate-700 w-24">GST Amt</th>
                </>
              ) : (
                <>
                  <th className="px-2 py-2 border-r border-slate-300 text-center font-semibold text-slate-700 w-16">CGST%</th>
                  <th className="px-2 py-2 border-r border-slate-300 text-right font-semibold text-slate-700 w-24">CGST Amt</th>
                  <th className="px-2 py-2 border-r border-slate-300 text-center font-semibold text-slate-700 w-16">SGST%</th>
                  <th className="px-2 py-2 border-r border-slate-300 text-right font-semibold text-slate-700 w-24">SGST Amt</th>
                </>
              )}
              
              <th className="px-2 py-2 text-right font-semibold text-slate-700 w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item: any, i: number) => (
              <tr key={item.id} className="border-b border-slate-200 last:border-0">
                <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-600">{i + 1}</td>
                <td className="px-2 py-2 border-r border-slate-200 text-slate-800">{item.description}</td>
                <td className="px-2 py-2 border-r border-slate-200 text-slate-600 font-mono text-xs">{item.hsn_sac_code}</td>
                <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-800">{item.quantity}</td>
                <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-800">{formatPaiseAsInr(item.unit_price_paise)}</td>
                <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-800">{formatPaiseAsInr(item.taxable_value_paise)}</td>
                
                {!isIntra ? (
                  <>
                    <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-800">{item.tax_rate_percentage}%</td>
                    <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-800">{formatPaiseAsInr(item.igst_paise)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-800">{Number(item.tax_rate_percentage) / 2}%</td>
                    <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-800">{formatPaiseAsInr(item.cgst_paise)}</td>
                    <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-800">{Number(item.tax_rate_percentage) / 2}%</td>
                    <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-800">{formatPaiseAsInr(item.sgst_paise)}</td>
                  </>
                )}
                
                <td className="px-2 py-2 text-right font-bold text-slate-900">{formatPaiseAsInr(item.line_total_paise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="flex justify-between mb-8">
        {/* Bank Details */}
        <div className="w-1/2 pr-4">
          {invoice.bank_name && (
            <div className="border border-slate-300 p-3 rounded-sm text-sm">
              <p className="font-bold text-slate-800 mb-1">Our Bank Details:</p>
              <p><span className="text-slate-600">Bank Name:</span> {invoice.bank_name}</p>
              <p><span className="text-slate-600">A/c No:</span> {invoice.bank_account_number}</p>
              <p><span className="text-slate-600">IFSC:</span> {invoice.bank_ifsc}</p>
            </div>
          )}
        </div>
        
        {/* Totals */}
        <div className="w-80 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Taxable Value</span>
            <span className="font-medium text-slate-900">{formatPaiseAsInr(invoice.subtotal_paise)}</span>
          </div>
          {!isIntra ? (
            <div className="flex justify-between py-1">
              <span className="text-slate-600">IGST</span>
              <span className="font-medium text-slate-900">{formatPaiseAsInr(invoice.total_igst_paise)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">CGST</span>
                <span className="font-medium text-slate-900">{formatPaiseAsInr(invoice.total_cgst_paise)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">SGST</span>
                <span className="font-medium text-slate-900">{formatPaiseAsInr(invoice.total_sgst_paise)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-1">
            <span className="text-slate-600">Total GST</span>
            <span className="font-medium text-slate-900">{formatPaiseAsInr(invoice.total_tax_paise)}</span>
          </div>
          <div className="border-t-2 border-slate-800 mt-1 pt-1 pb-1">
            <div className="flex justify-between">
              <span className="text-base font-bold text-slate-900">Grand Total</span>
              <span className="text-base font-bold text-slate-900">{formatPaiseAsInr(invoice.grand_total_paise)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in words */}
      <div className="mb-8">
        <p className="text-sm">
          <span className="font-bold text-slate-800">Amount in words: </span>
          <span className="italic font-medium" style={{ color: '#1e3a5f' }}>
            {amountInWordsIndian(Math.floor(invoice.grand_total_paise / 100), invoice.grand_total_paise % 100)}
          </span>
        </p>
      </div>

      <hr className="border-t border-slate-300 mb-6" />

      {/* Footer / Terms */}
      <div className="flex justify-between text-sm mb-12">
        <div className="w-1/2 pr-4">
          <p className="font-bold text-slate-800 mb-2">Terms &amp; Conditions:</p>
          <ul className="list-decimal pl-4 space-y-1 text-slate-700 text-xs">
            {invoice.invoice_terms ? invoice.invoice_terms.split('\n').map((line: string, idx: number) => {
              // Strip numbering from start if any
              const cleanLine = line.replace(/^\d+\.\s*/, '');
              return cleanLine ? <li key={idx}>{cleanLine}</li> : null;
            }) : null}
          </ul>
        </div>
        <div className="w-1/2 pl-4 text-right flex flex-col justify-between">
          <p className="font-bold text-slate-800">For {invoice.business_name}</p>
          <div className="h-16"></div> {/* Space for signature */}
          <p className="font-medium text-slate-600">Authorized Signatory</p>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400">
        This is a computer-generated invoice.
      </div>
    </div>
  );
}
