'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { invoiceDraftSchema, InvoiceDraftInput } from '@/lib/validations/invoice'
import { saveInvoiceDraft } from '@/lib/actions/invoices/save-invoice-draft'
import { finalizeInvoice } from '@/lib/actions/invoices/finalize-invoice'
import { calculateInvoiceTax } from '@/lib/gst/calculate'
import { TaxCalculationInput, TaxLineItemInput } from '@/lib/gst/types'
import { useRouter } from 'next/navigation'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvoiceForm({ 
  initialData, 
  customers, 
  products, 
  taxRates,
  businessStateCode,
  invoiceNumberFormatPreview,
  isDraft
}: { 
  initialData?: any; 
  customers: any[]; 
  products: any[]; 
  taxRates: any[];
  businessStateCode: string;
  invoiceNumberFormatPreview: string;
  isDraft: boolean;
}) {
  const router = useRouter();
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const defaultValues = initialData || {
    customer_id: '',
    notes: '',
    line_items: [{ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_of_measurement: 'NOS', unit_price: 0, discount: 0, tax_rate_id: taxRates[0]?.id || '' }]
  };

  const { register, control, handleSubmit, watch, setValue, formState: { isSubmitting, errors } } = useForm<InvoiceDraftInput>({
    resolver: zodResolver(invoiceDraftSchema as never),
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items"
  });

  const customerId = watch('customer_id');
  const lineItems = watch('line_items');
  const customer = customers.find(c => c.id === customerId);

  // Live Tax Calculation
  let taxResult = null;
  if (customer && lineItems.length > 0) {
    try {
      const taxLineItemInputs: TaxLineItemInput[] = lineItems.map(li => {
        const ratePct = taxRates.find(tr => tr.id === li.tax_rate_id)?.rate_percentage || 0;
        return {
          quantity: Number(li.quantity) || 0,
          unitPricePaise: Math.round((Number(li.unit_price) || 0) * 100),
          discountPaise: Math.round((Number(li.discount) || 0) * 100),
          taxRatePercentage: Number(ratePct)
        };
      });
      const taxCalcInput: TaxCalculationInput = {
        sellerStateCode: businessStateCode,
        placeOfSupplyStateCode: customer.state_code,
        lineItems: taxLineItemInputs
      };
      // Only calculate if quantities and prices are positive to avoid errors during partial typing
      if (taxLineItemInputs.every(li => li.quantity >= 0 && li.unitPricePaise >= 0)) {
        taxResult = calculateInvoiceTax(taxCalcInput);
      }
    } catch (e) {
      // Ignore intermediate calculation errors during typing
    }
  }

  const supplyType = taxResult ? taxResult.supplyType : 'intra_state';
  const totalTaxable = taxResult ? taxResult.subtotalPaise / 100 : 0;
  const totalCGST = taxResult ? taxResult.totalCgstPaise / 100 : 0;
  const totalSGST = taxResult ? taxResult.totalSgstPaise / 100 : 0;
  const totalIGST = taxResult ? taxResult.totalIgstPaise / 100 : 0;
  const totalGST = taxResult ? taxResult.totalTaxPaise / 100 : 0;
  const grandTotal = taxResult ? taxResult.grandTotalPaise / 100 : 0;

  const handleProductChange = (index: number, productId: string) => {
    if (!productId) return;
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setValue(`line_items.${index}.description`, prod.name);
      setValue(`line_items.${index}.hsn_sac_code`, prod.hsn_sac_code);
      setValue(`line_items.${index}.unit_of_measurement`, prod.unit_of_measurement);
      setValue(`line_items.${index}.unit_price`, prod.default_sale_price_paise / 100);
      if (prod.tax_rate_id) {
        setValue(`line_items.${index}.tax_rate_id`, prod.tax_rate_id);
      }
    }
  };

  const onSaveDraft = async (data: InvoiceDraftInput) => {
    setGlobalError(null);
    const res = await saveInvoiceDraft(data);
    if (res.success) {
      router.push(`/invoices/${res.data?.invoiceId}`);
    } else {
      setGlobalError(res.error.message);
    }
  };

  const onFinalize = async (data: InvoiceDraftInput) => {
    if (!confirm("Once finalized, this invoice cannot be edited — only corrected via a credit note. Continue?")) return;
    setIsFinalizing(true);
    setGlobalError(null);
    try {
      const draftRes = await saveInvoiceDraft(data);
      if (!draftRes.success) {
        setGlobalError(draftRes.error.message);
        setIsFinalizing(false);
        return;
      }
      const finRes = await finalizeInvoice({ id: draftRes.data?.invoiceId as string });
      if (finRes.success) {
        router.push(`/invoices/${finRes.data?.invoiceId}`);
      } else {
        setGlobalError(finRes.error.message);
      }
    } finally {
      setIsFinalizing(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";
  const labelCls = "mb-1.5 block text-xs font-medium text-muted-foreground";
  const sectionTitleCls = "flex items-center gap-2 mb-4";
  const sectionBarCls = "w-1 h-5 rounded-full bg-primary shrink-0";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-bold text-foreground">{isDraft ? 'Edit Draft Invoice' : 'New Invoice'}</h1>
        </div>
      </div>

      {globalError && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {globalError}
        </div>
      )}
      {errors.line_items?.root && (
        <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive font-medium">
          {errors.line_items.root.message}
        </div>
      )}

      <form className="flex flex-col gap-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Invoice Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}><span className={sectionBarCls} /><span className="text-sm font-semibold text-foreground">Invoice Details</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Invoice Number</label>
                <div className="relative">
                  <input type="text" readOnly value={invoiceNumberFormatPreview} className={cn(inputCls, 'pr-16 font-mono text-xs text-muted-foreground bg-muted')} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-success-subtle px-1.5 py-0.5 text-xs font-medium text-success">AUTO</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Will be generated on finalize</p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}><span className={sectionBarCls} /><span className="text-sm font-semibold text-foreground">Customer Details</span></div>
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Select Customer</label>
                <select className={cn(inputCls, errors.customer_id && 'border-destructive')} {...register('customer_id')}>
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.customer_id && <p className="mt-1 text-xs text-destructive">{errors.customer_id.message}</p>}
              </div>
              {customer && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>GSTIN</label>
                    <input type="text" readOnly value={customer.gstin || 'N/A'} className={cn(inputCls, 'font-mono text-xs uppercase bg-muted text-muted-foreground')} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input type="text" readOnly value={customer.state_code} className={cn(inputCls, 'bg-muted text-muted-foreground')} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className={cn(sectionTitleCls, 'mb-0')}><span className={sectionBarCls} /><span className="text-sm font-semibold text-foreground">Invoice Items</span></div>
            <p className="text-xs text-muted-foreground">GST auto-calculated server-side on save</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-48">Product (Optional)</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left min-w-[180px]">Description</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-20">HSN</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-20">Qty</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-20">Unit</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-24">Rate (₹)</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-20">Disc (₹)</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground text-left w-24">Tax Rate</th>
                  <th className="px-2 py-2.5 text-xs font-medium text-muted-foreground w-8"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id} className="border-b border-border/50 last:border-0">
                    <td className="px-2 py-2.5">
                      <select 
                        className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring")}
                        {...register(`line_items.${idx}.product_id`)}
                        onChange={(e) => {
                          register(`line_items.${idx}.product_id`).onChange(e);
                          handleProductChange(idx, e.target.value);
                        }}
                      >
                        <option value="">Ad-hoc Item</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <input type="text" placeholder="Description" className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.description && 'border-destructive')} {...register(`line_items.${idx}.description`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <input type="text" placeholder="HSN" className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.hsn_sac_code && 'border-destructive')} {...register(`line_items.${idx}.hsn_sac_code`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <input type="number" min="0" step="0.001" className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.quantity && 'border-destructive')} {...register(`line_items.${idx}.quantity`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <select className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" {...register(`line_items.${idx}.unit_of_measurement`)}>
                        <option value="NOS">NOS</option>
                        <option value="PCS">PCS</option>
                        <option value="KGS">KGS</option>
                        <option value="MTR">MTR</option>
                        <option value="OTH">OTH</option>
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <input type="number" min="0" step="0.01" className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.unit_price && 'border-destructive')} {...register(`line_items.${idx}.unit_price`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <input type="number" min="0" step="0.01" className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.discount && 'border-destructive')} {...register(`line_items.${idx}.discount`)} />
                    </td>
                    <td className="px-2 py-2.5">
                      <select className={cn("w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring", errors.line_items?.[idx]?.tax_rate_id && 'border-destructive')} {...register(`line_items.${idx}.tax_rate_id`)}>
                        {taxRates.map(tr => <option key={tr.id} value={tr.id}>{tr.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(idx)} className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => append({ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_of_measurement: 'NOS', unit_price: 0, discount: 0, tax_rate_id: taxRates[0]?.id || '' })} className="mt-3 flex items-center gap-1 text-sm text-primary transition-colors hover:text-primary/80">
            <Plus className="size-3.5" /> Add Item
          </button>
        </div>

        {/* Notes + Summary */}
        <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}><span className={sectionBarCls} /><span className="text-sm font-semibold text-foreground">Notes</span></div>
            <textarea rows={5} placeholder="Additional notes for the customer..." className={cn(inputCls, 'resize-none')} {...register('notes')} />
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className={sectionTitleCls}><span className={sectionBarCls} /><span className="text-sm font-semibold text-foreground">Invoice Summary (Live Estimate)</span></div>
            <div className="mb-4">
              <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', supplyType === 'intra_state' ? 'bg-success-subtle text-success' : 'bg-blue-100 text-blue-700')}>
                {supplyType === 'intra_state' ? 'Intra-state Supply — CGST + SGST' : 'Inter-state Supply — IGST'}
              </span>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="font-medium text-foreground">{formatINR(totalTaxable)}</span></div>
              {supplyType === 'intra_state' ? (
                <>
                  <div className="flex justify-between"><span className="text-primary">CGST</span><span className="text-foreground">{formatINR(totalCGST)}</span></div>
                  <div className="flex justify-between"><span className="text-primary">SGST</span><span className="text-foreground">{formatINR(totalSGST)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-primary">IGST</span><span className="text-foreground">{formatINR(totalIGST)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Total GST</span><span className="text-foreground">{formatINR(totalGST)}</span></div>
              <div className="my-1 border-t border-border" />
              <div className="flex justify-between"><span className="text-base font-bold text-foreground">Grand Total</span><span className="text-base font-bold text-primary">{formatINR(grandTotal)}</span></div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" size="sm" type="button" className="flex-1" disabled={isSubmitting || isFinalizing} onClick={handleSubmit(onSaveDraft)}>
                Save Draft
              </Button>
              <Button type="button" size="sm" className="flex-1" disabled={isSubmitting || isFinalizing} onClick={handleSubmit(onFinalize)}>
                <Send className="size-4" /> Finalize Invoice
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
