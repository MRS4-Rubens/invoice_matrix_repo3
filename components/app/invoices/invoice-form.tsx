'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Send, ChevronDown, User, Receipt, ListTodo, ClipboardEdit, AlertCircle, Calendar, Percent, Eye, Printer, GripVertical, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { invoiceDraftSchema, InvoiceDraftInput } from '@/lib/validations/invoice'
import { saveInvoiceDraft } from '@/lib/actions/invoices/save-invoice-draft'
import { finalizeInvoice } from '@/lib/actions/invoices/finalize-invoice'
import { getNextSequenceForDate } from '@/lib/actions/invoices/get-next-sequence'
import { calculateInvoiceTax } from '@/lib/gst/calculate'
import { TaxCalculationInput, TaxLineItemInput } from '@/lib/gst/types'
import { useRouter } from 'next/navigation'
import { formatIstDateAsIso, parseIsoDateToIstDate } from '@/lib/invoices/ist-date'
import { getIndianFinancialYearForDate } from '@/lib/invoices/financial-year'
import { resolveInvoiceNumber } from '@/lib/invoices/number-format'
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states'
import { InvoicePrintView } from './invoice-print-view'
import { canUseTemplate } from '@/lib/subscriptions/entitlements'
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal'
import { TemplateSelector } from './template-selector'

function formatINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvoiceForm({
  initialData,
  customers,
  products,
  taxRates,
  business,
  activeFys,
  isDraft
}: {
  initialData?: any;
  customers: any[];
  products: any[];
  taxRates: any[];
  business: any;
  activeFys: any[];
  isDraft: boolean;
}) {
  const router = useRouter()
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [previewSequence, setPreviewSequence] = useState<number | null>(null)

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false)
  const [showTemplateUpgradeModal, setShowTemplateUpgradeModal] = useState(false)
  const [showQuotaUpgradeModal, setShowQuotaUpgradeModal] = useState(false)

  // Preview and verification states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewVerified, setIsPreviewVerified] = useState(false)
  const [showPreviewWarning, setShowPreviewWarning] = useState(false)
  const [previewPrintSize, setPreviewPrintSize] = useState<'A4' | 'A5'>('A5')

  // Load invoice settings (discEnabled, showHsn)
  const [settings, setSettings] = useState<{
    discEnabled: boolean
    showHsn: boolean
  }>({
    discEnabled: true,
    showHsn: true
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('bm_invoice_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        setSettings({
          discEnabled: parsed.discEnabled ?? true,
          showHsn: parsed.showHsn ?? true
        })
      }
    } catch (e) {
      console.error('Failed to load invoice settings:', e)
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'bm_invoice_settings' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          setSettings({
            discEnabled: parsed.discEnabled ?? true,
            showHsn: parsed.showHsn ?? true
          })
        } catch { }
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const defaultValues = {
    customer_id: '',
    billing_name: '',
    billing_gstin: '',
    place_of_supply_state_code: business.state_code,
    invoice_date: formatIstDateAsIso(new Date()),
    notes: '',
    invoice_template: canUseTemplate(business, initialData?.invoice_template || business?.default_invoice_template).allowed
      ? (initialData?.invoice_template || business?.default_invoice_template || 'template_1')
      : 'template_1',
    // Default GST rate type selection (inclusive vs exclusive) inherited from business profile settings
    gst_rate_type: business.default_gst_rate_type || 'exclusive',
    line_items: [{ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_of_measurement: 'NOS', unit_price: 0, discount: 0, tax_rate_id: '' }],
    ...initialData
  }

  const { register, control, handleSubmit, watch, setValue, formState: { isSubmitting, errors } } = useForm<InvoiceDraftInput>({
    resolver: zodResolver(invoiceDraftSchema as never),
    defaultValues
  })

  const sortedTaxRates = [...taxRates].sort((a, b) => Number(a.rate_percentage) - Number(b.rate_percentage))

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "line_items"
  })

  const customerId = watch('customer_id')
  const lineItems = watch('line_items')
  const invoiceDateVal = watch('invoice_date')
  const billingNameVal = watch('billing_name') || ''
  const placeOfSupplyStateCodeVal = watch('place_of_supply_state_code')
  // Watch active GST rate type of this invoice to adapt headers and backward calculation math
  const gstRateTypeVal = watch('gst_rate_type') || 'exclusive'

  const customer = customers.find(c => c.id === customerId)

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(billingNameVal.toLowerCase())
  )

  const handleSelectCustomer = (cust: any) => {
    setValue('customer_id', cust.id)
    setValue('billing_name', cust.name)
    setValue('billing_gstin', cust.gstin || '')
    setValue('place_of_supply_state_code', cust.state_code)
    setIsSuggestionsOpen(false)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setValue('billing_name', val)
    setValue('customer_id', '') // Reset customer_id for ad-hoc customer typing
    setIsSuggestionsOpen(true)
  }

  // Description Autocomplete States
  const [suggestIdx, setSuggestIdx] = useState<number | null>(null)
  const [isProdSuggestionsOpen, setIsProdSuggestionsOpen] = useState(false)
  const [activeInputRect, setActiveInputRect] = useState<{ top: number, left: number, width: number, height: number } | null>(null)
  const [activeInputRef, setActiveInputRef] = useState<HTMLInputElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const updateInputRect = (el: HTMLInputElement | null) => {
    if (el) {
      setActiveInputRef(el)
      const rect = el.getBoundingClientRect()
      setActiveInputRect({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      })
    } else {
      setActiveInputRef(null)
      setActiveInputRect(null)
    }
  }

  useEffect(() => {
    if (!activeInputRef) return

    const handleUpdate = () => {
      const rect = activeInputRef.getBoundingClientRect()
      setActiveInputRect({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      })
    }

    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)

    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [activeInputRef])

  // NET Amount Input Raw Overrides
  const [netAmtInputValues, setNetAmtInputValues] = useState<Record<string, string>>({})

  // Line Items Drag & Drop Reordering State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null)
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null)

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setIsProdSuggestionsOpen(false)
    updateInputRect(null)
    setDraggedIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))

    // Set the drag ghost image to the entire row if supported
    const tr = (e.currentTarget as HTMLElement).closest('tr')
    if (tr && e.dataTransfer.setDragImage) {
      const rect = tr.getBoundingClientRect()
      e.dataTransfer.setDragImage(tr, e.clientX - rect.left, e.clientY - rect.top)
    }
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIdx === null || draggedIdx === idx) {
      if (dropTargetIdx !== null) {
        setDropTargetIdx(null)
        setDropPosition(null)
      }
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'top' : 'bottom'

    if (dropTargetIdx !== idx || dropPosition !== position) {
      setDropTargetIdx(idx)
      setDropPosition(position)
    }
  }

  const handleDragLeave = (e: React.DragEvent, idx: number) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (dropTargetIdx === idx) {
      setDropTargetIdx(null)
      setDropPosition(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null)
      setDropTargetIdx(null)
      setDropPosition(null)
      return
    }

    const from = draggedIdx
    let to = targetIdx
    if (from < targetIdx) {
      to = dropPosition === 'top' ? targetIdx - 1 : targetIdx
    } else if (from > targetIdx) {
      to = dropPosition === 'top' ? targetIdx : targetIdx + 1
    }

    to = Math.max(0, Math.min(fields.length - 1, to))

    if (from !== to) {
      move(from, to)
    }

    setDraggedIdx(null)
    setDropTargetIdx(null)
    setDropPosition(null)
  }

  const handleDragEnd = () => {
    setDraggedIdx(null)
    setDropTargetIdx(null)
    setDropPosition(null)
  }

  const handleGroupByGst = () => {
    if (fields.length <= 1) return
    const currentItems = [...lineItems]
    // Group descending by tax rate percentage (18%, 12%, 5%, 0%)
    const sorted = [...currentItems].sort((a, b) => {
      const pctA = Number(taxRates.find(tr => tr.id === a.tax_rate_id)?.rate_percentage || 0)
      const pctB = Number(taxRates.find(tr => tr.id === b.tax_rate_id)?.rate_percentage || 0)
      return pctB - pctA
    })
    setValue('line_items', sorted)
  }

  const handleSelectProduct = (idx: number, prod: any) => {
    setValue(`line_items.${idx}.product_id`, prod.id)
    setValue(`line_items.${idx}.description`, prod.name)
    setValue(`line_items.${idx}.hsn_sac_code`, prod.hsn_sac_code || '')
    setValue(`line_items.${idx}.unit_of_measurement`, prod.unit_of_measurement || 'NOS')
    setValue(`line_items.${idx}.unit_price`, prod.default_sale_price_paise / 100)
    if (prod.tax_rate_id) {
      setValue(`line_items.${idx}.tax_rate_id`, prod.tax_rate_id)
    }
    setIsProdSuggestionsOpen(false)
  }

  const handleDescChange = (idx: number, val: string) => {
    setValue(`line_items.${idx}.description`, val)
    setValue(`line_items.${idx}.product_id`, '') // Clear product_id for ad-hoc typing
    setSuggestIdx(idx)
    setIsProdSuggestionsOpen(true)
  }

  // Fetch sequence value dynamically from DB when date changes
  useEffect(() => {
    if (!invoiceDateVal) return
    let active = true

    async function fetchSequence() {
      try {
        const res = await getNextSequenceForDate({ dateStr: invoiceDateVal })
        if (active && res.success && res.data) {
          setPreviewSequence(res.data.nextSequence)
        }
      } catch (e) {
        console.error('Failed to load dynamic sequence preview:', e)
      }
    }

    fetchSequence()

    return () => {
      active = false
    }
  }, [invoiceDateVal])

  // Live Invoice Number Preview Calculation
  let invoiceNumberFormatPreview = 'DRAFT'
  if (business && invoiceDateVal) {
    try {
      const parsedDate = parseIsoDateToIstDate(invoiceDateVal)
      const currentLabel = getIndianFinancialYearForDate(parsedDate).label
      const activeFy = activeFys.find(fy => fy.label === currentLabel)
      const sequenceValue = previewSequence !== null ? previewSequence : (activeFy ? activeFy.invoice_sequence_counter + 1 : 1)

      invoiceNumberFormatPreview = resolveInvoiceNumber(business.invoice_number_format, {
        invoiceDate: parsedDate,
        fyLabel: activeFy ? activeFy.label : currentLabel,
        sequenceValue
      })
    } catch (e) { }
  }

  // Live Tax Calculation
  let taxResult = null
  if (lineItems.length > 0) {
    try {
      const taxLineItemInputs: TaxLineItemInput[] = lineItems.map(li => {
        const ratePct = taxRates.find(tr => tr.id === li.tax_rate_id)?.rate_percentage || 0
        return {
          quantity: Number(li.quantity) || 0,
          unitPricePaise: Math.round((Number(li.unit_price) || 0) * 100),
          discountPaise: Math.round((Number(li.quantity) || 0) * Math.round((Number(li.unit_price) || 0) * 100) * ((Number(li.discount) || 0) / 100)),
          taxRatePercentage: Number(ratePct)
        }
      })
      const taxCalcInput: TaxCalculationInput = {
        sellerStateCode: business.state_code,
        placeOfSupplyStateCode: placeOfSupplyStateCodeVal || business.state_code,
        lineItems: taxLineItemInputs,
        // Pass calculation mode to standard calculator routine
        gstRateType: gstRateTypeVal
      }
      if (taxLineItemInputs.every(li => li.quantity >= 0 && li.unitPricePaise >= 0)) {
        taxResult = calculateInvoiceTax(taxCalcInput)
      }
    } catch (e) {
      // Ignore intermediate calculation errors during typing
    }
  }

  const supplyType = taxResult ? taxResult.supplyType : 'intra_state'
  const totalTaxable = taxResult ? taxResult.subtotalPaise / 100 : 0
  const totalCGST = taxResult ? taxResult.totalCgstPaise / 100 : 0
  const totalSGST = taxResult ? taxResult.totalSgstPaise / 100 : 0
  const totalIGST = taxResult ? taxResult.totalIgstPaise / 100 : 0

  const rawTotalAmountPaise = taxResult ? taxResult.grandTotalPaise : 0
  const roundedGrandTotalPaise = Math.round(rawTotalAmountPaise / 100) * 100
  const roundOffPaise = roundedGrandTotalPaise - rawTotalAmountPaise

  const roundOff = roundOffPaise / 100
  const grandTotal = roundedGrandTotalPaise / 100

  // Dynamic GST Rate-wise Breakdown Grouping
  interface GstRateRow {
    ratePercentage: number
    taxableValuePaise: number
    cgstPaise: number
    sgstPaise: number
    igstPaise: number
  }

  const gstBreakdownMap: Record<number, GstRateRow> = {}

  // Initialize the map with ALL active tax rates from DB so they always render in order
  for (const tr of sortedTaxRates) {
    const rate = Number(tr.rate_percentage)
    if (!gstBreakdownMap[rate]) {
      gstBreakdownMap[rate] = {
        ratePercentage: rate,
        taxableValuePaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
      }
    }
  }

  if (taxResult && taxResult.lineItems) {
    for (const item of taxResult.lineItems) {
      const rate = Number(item.taxRatePercentage)
      if (!gstBreakdownMap[rate]) {
        gstBreakdownMap[rate] = {
          ratePercentage: rate,
          taxableValuePaise: 0,
          cgstPaise: 0,
          sgstPaise: 0,
          igstPaise: 0,
        }
      }
      gstBreakdownMap[rate].taxableValuePaise += item.taxableValuePaise
      gstBreakdownMap[rate].cgstPaise += item.cgstPaise
      gstBreakdownMap[rate].sgstPaise += item.sgstPaise
      gstBreakdownMap[rate].igstPaise += item.igstPaise
    }
  }

  const sortedGstRates = Object.keys(gstBreakdownMap)
    .map(Number)
    .sort((a, b) => a - b)

  // Collect all validation errors to display in a clean summary banner
  const getValidationErrors = () => {
    const errorList: string[] = []

    if (errors.billing_name?.message) {
      errorList.push(`Customer Name: ${errors.billing_name.message}`)
    }
    if (errors.billing_gstin?.message) {
      errorList.push(`Customer GSTIN: ${errors.billing_gstin.message}`)
    }
    if (errors.place_of_supply_state_code?.message) {
      errorList.push(`Place of Supply: ${errors.place_of_supply_state_code.message}`)
    }
    if (errors.invoice_date?.message) {
      errorList.push(`Invoice Date: ${errors.invoice_date.message}`)
    }
    if (errors.notes?.message) {
      errorList.push(`Notes: ${errors.notes.message}`)
    }

    if (Array.isArray(errors.line_items)) {
      errors.line_items.forEach((itemError: any, idx: number) => {
        if (!itemError) return
        const prefix = `Item Row #${idx + 1}`
        if (itemError.description?.message) {
          errorList.push(`${prefix}: ${itemError.description.message}`)
        }
        if (itemError.hsn_sac_code?.message) {
          errorList.push(`${prefix}: ${itemError.hsn_sac_code.message}`)
        }
        if (itemError.quantity?.message) {
          errorList.push(`${prefix}: ${itemError.quantity.message}`)
        }
        if (itemError.unit_price?.message) {
          errorList.push(`${prefix}: ${itemError.unit_price.message}`)
        }
        if (itemError.discount?.message) {
          errorList.push(`${prefix}: ${itemError.discount.message}`)
        }
        if (itemError.tax_rate_id?.message) {
          errorList.push(`${prefix}: ${itemError.tax_rate_id.message}`)
        }
      })
    }

    if (errors.line_items?.root?.message) {
      errorList.push(`Line Items: ${errors.line_items.root.message}`)
    }

    return errorList
  }

  const validationErrors = getValidationErrors()

  const watchTemplate = watch('invoice_template') || 'template_1'
  const watchLineItems = watch('line_items') || []
  const watchPlaceOfSupplyState = watch('place_of_supply_state_code') || business.state_code
  const watchNotes = watch('notes') || ''
  const watchBillingName = watch('billing_name') || ''
  const watchBillingGstin = watch('billing_gstin') || ''
  const watchInvoiceDate = watch('invoice_date') || ''

  // Recalculate invoice totals and taxes in real-time for preview props
  const previewInvoiceData = (() => {
    // 1. Prepare tax calculation input
    const taxLineItemInputs: TaxLineItemInput[] = watchLineItems.map(li => {
      const tr = taxRates.find(r => r.id === li.tax_rate_id);
      const ratePct = tr ? Number(tr.rate_percentage) : 0;
      return {
        quantity: Number(li.quantity) || 0,
        unitPricePaise: Math.round((Number(li.unit_price) || 0) * 100),
        discountPaise: Math.round((Number(li.quantity) || 0) * Math.round((Number(li.unit_price) || 0) * 100) * ((Number(li.discount) || 0) / 100)),
        taxRatePercentage: ratePct
      };
    });

    const taxResult = calculateInvoiceTax({
      sellerStateCode: business.state_code,
      placeOfSupplyStateCode: watchPlaceOfSupplyState,
      lineItems: taxLineItemInputs,
      // Map setting to live calculation context
      gstRateType: gstRateTypeVal
    });

    // 2. Map line items to format expected by templates
    const lineItemsMapped = watchLineItems.map((li, idx) => {
      const calcLi = taxResult.lineItems[idx] || {
        taxableValuePaise: 0,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: 0,
        lineTotalPaise: 0,
        taxRatePercentage: 0
      };

      const tr = taxRates.find(r => r.id === li.tax_rate_id);
      const ratePct = tr ? Number(tr.rate_percentage) : 0;

      return {
        id: `item-${idx}`,
        description: li.description || '',
        hsn_sac_code: li.hsn_sac_code || '',
        quantity: li.quantity || 0,
        unit_of_measurement: li.unit_of_measurement || 'NOS',
        unit_price_paise: Math.round((Number(li.unit_price) || 0) * 100),
        discount_paise: Math.round((Number(li.quantity) || 0) * Math.round((Number(li.unit_price) || 0) * 100) * ((Number(li.discount) || 0) / 100)),
        taxable_value_paise: calcLi.taxableValuePaise,
        tax_rate_percentage: ratePct,
        cgst_paise: calcLi.cgstPaise,
        sgst_paise: calcLi.sgstPaise,
        igst_paise: calcLi.igstPaise,
        line_total_paise: calcLi.lineTotalPaise,
      };
    });

    let billingAddressSnapshot: string | null = null;
    if (customer) {
      const cityStatePincode = [customer.city, customer.state_code, customer.pincode].filter(Boolean).join(', ');
      billingAddressSnapshot = [
        customer.address_line1,
        customer.address_line2,
        cityStatePincode
      ].filter(Boolean).join('\n');
    }

    return {
      id: initialData?.id || 'draft-id',
      business_id: business.id,
      logo_storage_key: business.logo_storage_key,
      business_name: business.legal_name,
      city: business.city,
      seller_gstin_snapshot: business.gstin ? business.gstin.toUpperCase() : null,
      phone: business.phone,
      nature_of_business: business.nature_of_business || null,
      alternate_phone: business.alternate_phone || null,
      address_line1: business.address_line1,
      address_line2: business.address_line2 || null,
      pincode: business.pincode,
      bank_name: business.bank_name,
      bank_account_number: business.bank_account_number,
      bank_ifsc: business.bank_ifsc ? business.bank_ifsc.toUpperCase() : null,
      invoice_terms: business.invoice_terms,
      invoice_number: invoiceNumberFormatPreview,
      invoice_date: watchInvoiceDate,
      billing_name_snapshot: watchBillingName,
      billing_gstin_snapshot: watchBillingGstin ? watchBillingGstin.toUpperCase() : null,
      billing_address_snapshot: billingAddressSnapshot,
      place_of_supply_state_code: watchPlaceOfSupplyState,
      subtotal_paise: taxResult.subtotalPaise,
      total_cgst_paise: taxResult.totalCgstPaise,
      total_sgst_paise: taxResult.totalSgstPaise,
      total_igst_paise: taxResult.totalIgstPaise,
      total_tax_paise: taxResult.totalTaxPaise,
      grand_total_paise: Math.round(taxResult.grandTotalPaise / 100) * 100,
      invoice_template: watchTemplate,
      // Set rate type snapshot on mapped preview metadata object
      gst_rate_type: gstRateTypeVal,
      subscription_plan: business.subscription_plan,
      subscription_status: business.subscription_status,
      trial_ends_at: business.trial_ends_at,
      customer: customer ? { phone: customer.phone } : null,
      lineItems: lineItemsMapped
    };
  })();

  const onSaveDraft = async (data: InvoiceDraftInput) => {
    setGlobalError(null)
    const res = await saveInvoiceDraft(data)
    if (res.success) {
      router.push(`/invoices/${res.data?.invoiceId}`)
    } else {
      setGlobalError(res.error.message)
      if (res.error.code === 'INVOICE_QUOTA_EXCEEDED' || res.error.code === 'QUOTA_EXCEEDED') {
        setShowQuotaUpgradeModal(true)
      }
    }
  }

  const onFinalize = async (data: InvoiceDraftInput) => {
    if (!isPreviewVerified) {
      setShowPreviewWarning(true)
      setGlobalError("Please open the Invoice Preview and verify the layout before finalization.")
      const pBtn = document.getElementById("draft-preview-btn")
      if (pBtn) pBtn.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }

    if (!confirm("Once finalized, this invoice cannot be edited — only corrected via a credit note. Continue?")) return
    setIsFinalizing(true)
    setGlobalError(null)
    try {
      const draftRes = await saveInvoiceDraft(data)
      if (!draftRes.success) {
        setGlobalError(draftRes.error.message)
        if (draftRes.error.code === 'INVOICE_QUOTA_EXCEEDED' || draftRes.error.code === 'QUOTA_EXCEEDED') {
          setShowQuotaUpgradeModal(true)
        }
        setIsFinalizing(false)
        return
      }
      const finRes = await finalizeInvoice({ id: draftRes.data?.invoiceId as string })
      if (finRes.success) {
        router.push(`/invoices/${finRes.data?.invoiceId}`)
      } else {
        setGlobalError(finRes.error.message)
        if (finRes.error.code === 'INVOICE_QUOTA_EXCEEDED' || finRes.error.code === 'QUOTA_EXCEEDED') {
          setShowQuotaUpgradeModal(true)
        }
      }
    } finally {
      setIsFinalizing(false)
    }
  }

  const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all hover:border-muted-foreground/30 shadow-sm"
  const tableInputCls = "w-full rounded-md border border-border bg-background px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring hover:border-muted-foreground/20 shadow-sm transition-all"
  const labelCls = "mb-1 block text-xs font-bold text-muted-foreground uppercase tracking-wider"
  const sectionTitleCls = "flex items-center gap-2 mb-2 pb-1.5 border-b border-border"

  const colStyles = {
    drag: { width: '28px', minWidth: '28px', textAlign: 'left' } as const,
    sNo: { width: '42px', minWidth: '42px', textAlign: 'left' } as const,
    // Slightly reduced from 340px to give other columns header wrapping clearance
    description: { width: '100%', minWidth: '250px' } as const,
    hsn: { width: '76px', minWidth: '76px', textAlign: 'center' } as const,
    qty: { width: '64px', minWidth: '64px', textAlign: 'center' } as const,
    uqc: { width: '72px', minWidth: '72px', textAlign: 'center' } as const,
    // Expanded from 84px to 125px to prevent "Rate (GST Incl)" column header wrapping
    rate: { width: '110px', minWidth: '110px', textAlign: 'right' } as const,
    disc: { width: '64px', minWidth: '64px', textAlign: 'right' } as const,
    gst: { width: '80px', minWidth: '80px', textAlign: 'center' } as const,
    netAmt: { width: '100px', minWidth: '100px', textAlign: 'right' } as const,
    action: { width: '40px', minWidth: '40px', textAlign: 'center' } as const,
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3.5 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-sm">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight font-heading text-foreground">{isDraft ? 'Edit Draft Invoice' : 'New Invoice'}</h1>
        </div>

        {globalError && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium animate-shake">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div>{globalError}</div>
          </div>
        )}
        {validationErrors.length > 0 && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium animate-shake">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="font-bold text-xs uppercase tracking-wider">Please resolve the following validation issues:</div>
              <ul className="list-disc pl-4 space-y-1 text-xs">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="leading-relaxed font-semibold">{err}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form className="flex flex-col gap-3.5">
          {/* Hidden calculation mode input registered in Hook Form */}
          <input type="hidden" {...register('gst_rate_type')} />
          <div className="grid gap-3.5 lg:grid-cols-12">
            {/* Invoice Details */}
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm lg:col-span-7">
              <div className={sectionTitleCls}>
                <ClipboardEdit className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Invoice Info</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 items-end">
                <div>
                  <label className={labelCls}>Invoice Number</label>
                  <div className="relative">
                    <input type="text" readOnly value={invoiceNumberFormatPreview} className={cn(inputCls, 'pr-16 font-mono text-xs text-muted-foreground bg-muted/50 border-dashed')} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-success-subtle px-1.5 py-0.5 text-[10px] font-bold text-success border border-success/20">AUTO</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Will lock to a formal series on finalize</p>
                </div>
                <div>
                  <label className={labelCls}>Invoice Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={cn(inputCls, 'pr-10', errors.invoice_date && 'border-destructive focus:ring-destructive/30 animate-shake')}
                      {...register('invoice_date')}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-muted-foreground" />
                  </div>
                  {errors.invoice_date ? (
                    <p className="mt-1 text-xs text-destructive font-medium">{errors.invoice_date.message}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">Select the legal date of this invoice</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Print Preview</label>
                  <button
                    id="draft-preview-btn"
                    type="button"
                    onClick={() => {
                      setIsPreviewOpen(true);
                      setShowPreviewWarning(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 px-3 py-1.5 border rounded-lg text-sm font-semibold transition-all h-[34px] shadow-sm",
                      showPreviewWarning
                        ? "border-destructive text-destructive bg-destructive/10 ring-2 ring-destructive/20 animate-shake"
                        : "border-input bg-background hover:bg-accent text-foreground hover:text-accent-foreground"
                    )}
                  >
                    <Eye className="size-4" /> Preview Invoice
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">Verification check required</p>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm lg:col-span-5">
              <div className={sectionTitleCls}>
                <User className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Customer Details</span>
              </div>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <label className={labelCls}>Customer Name</label>
                  <input
                    type="text"
                    placeholder="Type to search or enter ad-hoc name..."
                    className={cn(inputCls, errors.billing_name && 'border-destructive focus:ring-destructive/30 animate-shake')}
                    {...register('billing_name')}
                    onChange={handleNameChange}
                    onFocus={() => setIsSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 200)}
                  />
                  {errors.billing_name && <p className="mt-1 text-xs text-destructive font-medium">{errors.billing_name.message}</p>}

                  {isSuggestionsOpen && billingNameVal.trim().length > 0 && filteredCustomers.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover py-1.5 shadow-lg animate-fadeIn text-popover-foreground">
                      {filteredCustomers.map(cust => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors font-medium flex justify-between items-center border-b border-border/40 last:border-b-0"
                        >
                          <span>{cust.name}</span>
                          {cust.gstin && <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{cust.gstin}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>GSTIN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 29ABCDE1234F1Z5"
                      className={cn(inputCls, 'font-mono text-xs uppercase', errors.billing_gstin && 'border-destructive focus:ring-destructive/30 animate-shake')}
                      {...register('billing_gstin')}
                    />
                    {errors.billing_gstin && <p className="mt-1 text-xs text-destructive font-medium">{errors.billing_gstin.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Place of Supply State</label>
                    <div className="relative">
                      <select
                        className={cn(inputCls, 'appearance-none pr-9', errors.place_of_supply_state_code && 'border-destructive focus:ring-destructive/30 animate-shake')}
                        {...register('place_of_supply_state_code')}
                      >
                        {INDIAN_GST_STATES.map(s => (
                          <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-muted-foreground" />
                    </div>
                    {errors.place_of_supply_state_code && <p className="mt-1 text-xs text-destructive font-medium">{errors.place_of_supply_state_code.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
            <div className="mb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <ListTodo className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Invoice Line Items</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={handleGroupByGst}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-primary bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-md border border-border/60 transition-colors ml-1 cursor-pointer"
                    title="Automatically sort and group items by GST tax bracket (18%, 12%, 5%, 0%)"
                  >
                    <ArrowUpDown className="size-3" />
                    <span>Group by GST</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">GST is calculated automatically in the estimate below</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10">
                    <th className="pl-2 pr-0 py-1.5" style={colStyles.drag} aria-label="Reorder"></th>
                    <th className="pl-3 pr-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left" style={colStyles.sNo}>S.No</th>
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-left" style={colStyles.description}>Description</th>
                    {settings.showHsn && <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.hsn}>HSN/SAC</th>}
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.qty}>Qty</th>
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.uqc}>UQC</th>
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center select-none whitespace-nowrap" style={colStyles.rate}>
                      {/* Native title tooltip wrapper to guarantee no absolute layout clipping within overflow containers */}
                      <div
                        className="flex items-center justify-end gap-1 cursor-help"
                        title={gstRateTypeVal === 'inclusive'
                          ? "Prices entered are inclusive of GST. Tax will be extracted from this rate during calculations."
                          : "Prices entered are exclusive of GST. Tax will be added on top of this rate during calculations."
                        }
                      >
                        <span>Rate ({gstRateTypeVal === 'inclusive' ? 'GST Incl' : 'GST Excl'})</span>
                        <span className="text-xs text-muted-foreground font-bold font-sans flex items-center justify-center border border-muted-foreground/30 rounded-full size-3.5 select-none transition-colors hover:border-primary hover:text-primary">i</span>
                      </div>
                    </th>
                    {settings.discEnabled && <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.disc}>Disc (%)</th>}
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.gst}>GST Rate</th>
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.netAmt}>Net Amount</th>
                    <th className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider text-center" style={colStyles.action}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {fields.map((field, idx) => {
                    const qty = Number(watch(`line_items.${idx}.quantity`)) || 0
                    const rate = Number(watch(`line_items.${idx}.unit_price`)) || 0
                    const disc = Number(watch(`line_items.${idx}.discount`)) || 0
                    const trId = watch(`line_items.${idx}.tax_rate_id`)
                    const trPct = Number(taxRates.find(tr => tr.id === trId)?.rate_percentage || 0)

                    const lineGross = rate * qty
                    const discountAmount = lineGross * (disc / 100)
                    // If inclusive, line total before roundoff is simply the gross value after discount
                    const currentNetAmt = gstRateTypeVal === 'inclusive'
                      ? (lineGross - discountAmount)
                      : (lineGross - discountAmount) * (1 + trPct / 100)
                    const lineItemId = field.id

                    const displayNetAmt = netAmtInputValues[lineItemId] !== undefined
                      ? netAmtInputValues[lineItemId]
                      : (currentNetAmt > 0 ? currentNetAmt.toFixed(2) : '0.00')

                    const onNetAmtChange = (valStr: string) => {
                      setNetAmtInputValues(prev => ({ ...prev, [lineItemId]: valStr }))

                      const val = parseFloat(valStr)
                      if (!isNaN(val) && val >= 0) {
                        if (qty > 0) {
                          const discountFactor = 1 - (disc / 100)
                          if (discountFactor > 0) {
                            let calculatedRate = 0
                            if (gstRateTypeVal === 'inclusive') {
                              // Case 4 (Inclusive Backward): Extract rate directly from Net Amount without backing out tax
                              calculatedRate = val / (qty * discountFactor)
                            } else {
                              // Case 2 (Exclusive Backward): Back out the tax first, then extract rate
                              const amtBeforeGst = val / (1 + trPct / 100)
                              calculatedRate = amtBeforeGst / (qty * discountFactor)
                            }
                            setValue(`line_items.${idx}.unit_price`, parseFloat(calculatedRate.toFixed(2)))
                          }
                        }
                      }
                    }

                    const onNetAmtBlur = () => {
                      setNetAmtInputValues(prev => {
                        const copy = { ...prev }
                        delete copy[lineItemId]
                        return copy
                      })
                    }

                    const descVal = watch(`line_items.${idx}.description`) || ''
                    const filteredProducts = products.filter(p =>
                      p.name.toLowerCase().includes(descVal.toLowerCase())
                    )

                    const isDragging = draggedIdx === idx
                    const isDropTop = dropTargetIdx === idx && dropPosition === 'top' && draggedIdx !== idx
                    const isDropBottom = dropTargetIdx === idx && dropPosition === 'bottom' && draggedIdx !== idx

                    return (
                      <tr
                        key={field.id}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragLeave={(e) => handleDragLeave(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        className={cn(
                          "group transition-colors relative",
                          isDragging && "opacity-40 bg-muted/40 select-none",
                          !isDragging && "hover:bg-muted/5",
                          isDropTop && "bg-slate-200/75 dark:bg-slate-800/80 [box-shadow:inset_0_3px_0_0_#334155] dark:[box-shadow:inset_0_3px_0_0_#94a3b8]",
                          isDropBottom && "bg-slate-200/75 dark:bg-slate-800/80 [box-shadow:inset_0_-3px_0_0_#334155] dark:[box-shadow:inset_0_-3px_0_0_#94a3b8]"
                        )}
                      >
                        {/* Drag Handle */}
                        <td className="pl-2 pr-0 py-1.5 align-middle" style={colStyles.drag}>
                          <div
                            draggable={fields.length > 1}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={cn(
                              "flex items-center justify-center w-[20px] h-6 rounded transition-all select-none",
                              fields.length > 1
                                ? "cursor-grab active:cursor-grabbing text-muted-foreground/35 hover:text-foreground hover:bg-muted/80 active:scale-95"
                                : "opacity-20 cursor-default"
                            )}
                            title={fields.length > 1 ? "Drag to reorder row" : undefined}
                          >
                            <GripVertical className="size-3.5" />
                          </div>
                        </td>

                        {/* S.No */}
                        <td className="pl-3 pr-2 py-1.5 text-xs font-mono text-muted-foreground text-left" style={colStyles.sNo}>
                          {String(idx + 1).padStart(3, '0')}
                        </td>

                        {/* Description with autocomplete */}
                        <td className="px-2 py-1.5 relative" style={colStyles.description}>
                          <input
                            type="text"
                            placeholder="Description"
                            className={cn(tableInputCls, errors.line_items?.[idx]?.description && 'border-destructive focus:ring-destructive/30 animate-shake')}
                            style={colStyles.description}
                            {...register(`line_items.${idx}.description`)}
                            onChange={(e) => {
                              handleDescChange(idx, e.target.value)
                              updateInputRect(e.target)
                            }}
                            onFocus={(e) => {
                              setSuggestIdx(idx)
                              setIsProdSuggestionsOpen(true)
                              updateInputRect(e.target)
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setIsProdSuggestionsOpen(false)
                                updateInputRect(null)
                              }, 200)
                            }}
                          />
                          {mounted && isProdSuggestionsOpen && suggestIdx === idx && descVal.trim().length > 0 && filteredProducts.length > 0 && activeInputRect && (
                            createPortal(
                              <div
                                style={{
                                  position: 'absolute',
                                  top: activeInputRect.top + 4,
                                  left: activeInputRect.left,
                                  width: activeInputRect.width,
                                  zIndex: 9999,
                                }}
                                className="max-h-48 overflow-y-auto rounded-lg border border-border bg-popover py-1.5 shadow-lg animate-fadeIn text-popover-foreground"
                              >
                                {filteredProducts.map(prod => (
                                  <button
                                    key={prod.id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectProduct(idx, prod)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors font-medium flex justify-between items-center border-b border-border/40 last:border-b-0"
                                  >
                                    <span>{prod.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded animate-fadeIn">
                                      {prod.hsn_sac_code || 'N/A'} | Rs.{(prod.default_sale_price_paise / 100).toFixed(2)}
                                    </span>
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )
                          )}
                        </td>

                        {/* HSN/SAC */}
                        {settings.showHsn && (
                          <td className="px-2 py-1.5" style={colStyles.hsn}>
                            <input
                              type="text"
                              placeholder="HSN"
                              className={cn(tableInputCls, 'font-mono text-center', errors.line_items?.[idx]?.hsn_sac_code && 'border-destructive focus:ring-destructive/30 animate-shake')}
                              style={colStyles.hsn}
                              {...register(`line_items.${idx}.hsn_sac_code`)}
                            />
                          </td>
                        )}

                        {/* Qty */}
                        <td className="px-2 py-1.5" style={colStyles.qty}>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            className={cn(tableInputCls, 'text-center font-semibold', errors.line_items?.[idx]?.quantity && 'border-destructive focus:ring-destructive/30 animate-shake')}
                            style={colStyles.qty}
                            {...register(`line_items.${idx}.quantity`)}
                          />
                        </td>

                        {/* UQC */}
                        <td className="px-2 py-1.5" style={colStyles.uqc}>
                          <div className="relative" style={colStyles.uqc}>
                            <select
                              className="w-full appearance-none rounded-md border border-border bg-background pl-2.5 pr-6 py-1 text-sm font-medium text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:border-muted-foreground/20 shadow-sm transition-all"
                              style={colStyles.uqc}
                              {...register(`line_items.${idx}.unit_of_measurement`)}
                            >
                              <option value="NOS">NOS</option>
                              <option value="PCS">PCS</option>
                              <option value="KGS">KGS</option>
                              <option value="MTR">MTR</option>
                              <option value="OTH">OTH</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none size-3 text-muted-foreground" />
                          </div>
                        </td>

                        {/* Rate */}
                        <td className="px-2 py-1.5" style={colStyles.rate}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={cn(tableInputCls, 'text-right', errors.line_items?.[idx]?.unit_price && 'border-destructive focus:ring-destructive/30 animate-shake')}
                            style={colStyles.rate}
                            {...register(`line_items.${idx}.unit_price`)}
                          />
                        </td>

                        {/* Disc */}
                        {settings.discEnabled && (
                          <td className="px-2 py-1.5" style={colStyles.disc}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              className={cn(tableInputCls, 'text-right', errors.line_items?.[idx]?.discount && 'border-destructive focus:ring-destructive/30 animate-shake')}
                              style={colStyles.disc}
                              {...register(`line_items.${idx}.discount`)}
                            />
                          </td>
                        )}

                        {/* GST Rate */}
                        <td className="px-2 py-1.5" style={colStyles.gst}>
                          <div className="relative" style={colStyles.gst}>
                            <select
                              className={cn("w-full appearance-none rounded-md border border-border bg-background pl-2.5 pr-6 py-1 text-xs text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:border-muted-foreground/20 shadow-sm transition-all", errors.line_items?.[idx]?.tax_rate_id && 'border-destructive focus:ring-destructive/30 animate-shake')}
                              style={colStyles.gst}
                              title={taxRates.find(tr => tr.id === trId)?.label || 'Select GST Rate'}
                              {...register(`line_items.${idx}.tax_rate_id`)}
                            >
                              <option value="" disabled>SELECT</option>
                              {sortedTaxRates.map(tr => (
                                <option key={tr.id} value={tr.id} title={tr.label}>
                                  {Number(tr.rate_percentage)}%
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none size-3 text-muted-foreground" />
                          </div>
                        </td>

                        {/* NET Amount */}
                        <td className="px-2 py-1.5" style={colStyles.netAmt}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={cn(tableInputCls, 'text-right font-semibold text-primary focus:ring-primary/20')}
                            style={colStyles.netAmt}
                            value={displayNetAmt}
                            onChange={(e) => onNetAmtChange(e.target.value)}
                            onBlur={onNetAmtBlur}
                          />
                        </td>

                        {/* Action */}
                        <td className="px-2 py-1.5 text-center" style={colStyles.action}>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(idx)}
                              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 shadow-sm md:opacity-0 group-hover:opacity-100"
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
            <button type="button" onClick={() => append({ product_id: '', description: '', hsn_sac_code: '', quantity: 1, unit_of_measurement: 'NOS', unit_price: 0, discount: 0, tax_rate_id: '' })} className="mt-2.5 flex items-center gap-1.5 text-sm font-bold text-primary transition-all hover:text-primary/80 hover:translate-x-0.5">
              <Plus className="size-4" /> Add Item Row
            </button>
          </div>

          {/* Notes + Summary */}
          <div className="grid gap-3.5 lg:grid-cols-[1fr_1.3fr_1fr]">
            {/* Internal Notes */}
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm flex flex-col h-full">
              <div className={sectionTitleCls}>
                <ClipboardEdit className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Internal Notes</span>
              </div>
              <textarea
                rows={3}
                placeholder="Provide payment instructions or extra notes to display on the invoice..."
                className={cn(inputCls, 'resize-none flex-1 mt-1.5')}
                {...register('notes')}
              />
            </div>

            {/* GST Rate-wise Breakdown Card */}
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm flex flex-col h-full">
              <div className={sectionTitleCls}>
                <Percent className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">GST Rate-wise Breakdown</span>
              </div>
              <div className="overflow-x-auto flex-1 mt-1">
                {(() => {
                  const formatTaxBreakdown = (paise: number) => {
                    if (paise === 0) {
                      return <span className="text-zinc-300 dark:text-zinc-700 font-normal select-none">–</span>;
                    }
                    return formatINR(paise / 100);
                  };

                  return (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="px-3 py-1 text-left font-bold text-muted-foreground uppercase tracking-wider text-xs">GST Rate</th>
                          <th className="px-3 py-1 text-right font-bold text-muted-foreground uppercase tracking-wider text-xs">Taxable Value</th>
                          <th className="px-3 py-1 text-right font-bold text-muted-foreground uppercase tracking-wider text-xs">CGST</th>
                          <th className="px-3 py-1 text-right font-bold text-muted-foreground uppercase tracking-wider text-xs">SGST</th>
                          <th className="px-3 py-1 text-right font-bold text-muted-foreground uppercase tracking-wider text-xs">IGST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {sortedGstRates.map(rate => {
                          const row = gstBreakdownMap[rate];
                          return (
                            <tr key={rate} className="hover:bg-muted/5 transition-colors">
                              <td className="px-3 py-1 text-left font-semibold text-foreground">{rate}%</td>
                              <td className="px-3 py-1 text-right text-foreground">{formatINR(row.taxableValuePaise / 100)}</td>
                              <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(row.cgstPaise)}</td>
                              <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(row.sgstPaise)}</td>
                              <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(row.igstPaise)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border font-bold bg-muted/5">
                          <td className="px-3 py-1 text-left text-foreground">Total</td>
                          <td className="px-3 py-1 text-right text-foreground">{formatINR(totalTaxable)}</td>
                          <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(taxResult ? taxResult.totalCgstPaise : 0)}</td>
                          <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(taxResult ? taxResult.totalSgstPaise : 0)}</td>
                          <td className="px-3 py-1 text-right text-foreground">{formatTaxBreakdown(taxResult ? taxResult.totalIgstPaise : 0)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* Summary & GST Breakdown */}
            <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm flex flex-col h-full">
              <div className={sectionTitleCls}>
                <Receipt className="size-4 text-primary" />
                <span className="text-sm font-bold text-foreground uppercase tracking-wider">Summary &amp; GST Breakdown</span>
              </div>
              <div className="mb-1">
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border', supplyType === 'intra_state' ? 'bg-success-subtle text-success border-success/20' : 'bg-blue-100/60 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900')}>
                  {supplyType === 'intra_state' ? 'Intra-state Supply (CGST + SGST)' : 'Inter-state Supply (IGST)'}
                </span>
              </div>
              <div className="flex flex-col flex-1 justify-between mt-1">
                <div className="divide-y divide-zinc-150 dark:divide-zinc-800/40 text-sm border-b border-zinc-150 dark:border-zinc-800/40 mb-2.5">
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted-foreground/90 font-semibold">Taxable Value</span>
                    <span className="font-bold text-foreground">{formatINR(totalTaxable)}</span>
                  </div>
                  {supplyType === 'intra_state' ? (
                    <>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground/90 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                          CGST
                        </span>
                        <span className="font-bold text-foreground">{formatINR(totalCGST)}</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground/90 font-semibold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                          SGST
                        </span>
                        <span className="font-bold text-foreground">{formatINR(totalSGST)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground/90 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                        IGST
                      </span>
                      <span className="font-bold text-foreground">{formatINR(totalIGST)}</span>
                    </div>
                  )}

                  {/* Rounded Off Row */}
                  <div className="flex justify-between py-0.5 italic text-muted-foreground/90">
                    <span className="font-semibold">Rounded Off</span>
                    <span className="font-bold">
                      {roundOff >= 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="rounded-xl bg-gradient-to-r from-primary/[0.05] to-primary/[0.015] dark:from-primary/[0.04] dark:to-transparent border-2 border-primary/30 dark:border-primary/20 px-3.5 py-2 flex justify-between items-center shadow-[0_0_20px_rgba(59,130,246,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] dark:shadow-[0_0_25px_rgba(59,130,246,0.09),inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-primary/50 hover:shadow-[0_0_28px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300">
                    <span className="text-base font-bold text-foreground/90">Grand Total</span>
                    <span className="text-xl font-black text-primary font-heading">{formatINR(grandTotal)}</span>
                  </div>

                  <div className="mt-2.5 flex gap-2.5">
                    <Button variant="outline" size="sm" type="button" className="flex-1 shadow-sm font-bold text-sm" disabled={isSubmitting || isFinalizing} onClick={handleSubmit(onSaveDraft)}>
                      Save Draft
                    </Button>
                    <Button type="button" size="sm" className="flex-1 shadow-sm font-bold text-sm hover:glow-btn" disabled={isSubmitting || isFinalizing} onClick={handleSubmit(onFinalize)}>
                      <Send className="size-4" /> {isFinalizing ? 'Finalizing...' : 'Finalize Invoice'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Dynamic Live Print Preview Modal Overlay */}
      {mounted && isPreviewOpen && (() => {
        // Calculate elastic page and modal widths dynamically based on active columns
        const templateWidth = 780 + (settings.showHsn ? 70 : 0) + (settings.discEnabled ? 70 : 0);
        const previewMaxWidth = `${templateWidth}px`;
        const modalMaxWidth = `${templateWidth + 80}px`;

        return createPortal(
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-fadeIn print:hidden">
            <div
              className="bg-background rounded-xl border border-border shadow-2xl w-full h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
              style={{ maxWidth: modalMaxWidth }}
            >
              {/* Modal Header */}
              <div className="px-6 py-2.5 border-b border-border flex flex-row items-center justify-between gap-4 bg-muted/20">
                {/* Left Side: Title */}
                <div className="flex items-center gap-2">
                  <Eye className="size-5 text-primary" />
                  <span className="text-sm font-bold text-foreground uppercase tracking-wider whitespace-nowrap">Invoice Print Preview</span>
                </div>

                {/* Right Side: Grouped Controls */}
                <div className="flex items-center gap-3">
                  {/* 4. Template Selector synced with form */}
                  <TemplateSelector
                    value={watchTemplate}
                    business={business}
                    compact
                    onChange={(chosen) => {
                      setValue('invoice_template', chosen);
                    }}
                    onUpgradeClick={() => {
                      setValue('invoice_template', 'template_1');
                      setShowTemplateUpgradeModal(true);
                    }}
                  />

                  {/* 3. Print size/orientation toggle with Print Button */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex overflow-hidden rounded-md border border-primary/25 text-[13px] shadow-[0_0_8px_rgba(59,130,246,0.06)] bg-card">
                      {(['A4', 'A5'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPreviewPrintSize(s)}
                          className={cn(
                            "px-3 py-1 transition-all cursor-pointer font-bold",
                            previewPrintSize === s
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'bg-background text-muted-foreground hover:bg-accent font-semibold first:border-r first:border-border'
                          )}
                          title={`${s} Paper Layout`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex size-8 items-center justify-center rounded-md border border-primary/25 bg-background text-muted-foreground hover:text-foreground transition-all hover:bg-accent shadow-[0_0_8px_rgba(59,130,246,0.06)] cursor-pointer"
                      title="Print Invoice (System Dialog)"
                    >
                      <Printer className="size-[18px]" />
                    </button>
                  </div>

                  {/* Group containing checkbox and close button with exact 7px gap */}
                  <div className="flex items-center gap-[7px]">
                    {/* 2. Preview Verified Checkbox */}
                    <label className={cn(
                      "flex items-center gap-2 cursor-pointer bg-card rounded-md px-3 py-1.5 text-xs font-bold transition-all select-none border",
                      isPreviewVerified
                        ? "border-success/30 dark:border-success/20 shadow-[0_0_10px_rgba(16,185,129,0.08)] hover:border-success/50"
                        : "border-border shadow-sm hover:border-muted-foreground/30"
                    )}>
                      <input
                        type="checkbox"
                        checked={isPreviewVerified}
                        onChange={(e) => {
                          setIsPreviewVerified(e.target.checked);
                          if (e.target.checked) setShowPreviewWarning(false);
                        }}
                        className="rounded border-border text-success focus:ring-success accent-success size-4 cursor-pointer"
                      />
                      <span className={cn(
                        "transition-colors",
                        isPreviewVerified
                          ? "text-success font-bold"
                          : "text-muted-foreground font-semibold"
                      )}>
                        Preview Verified
                      </span>
                    </label>

                    {/* 1. Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(false)}
                      className="rounded-lg p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all border border-red-500/25 shadow-[0_0_8px_rgba(239,68,68,0.12)] hover:border-red-500/45"
                    >
                      <span className="sr-only">Close</span>
                      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-100 dark:bg-zinc-900/60 flex justify-center select-text">
                <div
                  className="w-full bg-white shadow-md border border-border transition-all print:p-0 print:border-none print:shadow-none print:rounded-none"
                  style={{
                    maxWidth: previewMaxWidth,
                    fontFamily: 'inherit'
                  }}
                >
                  <InvoicePrintView
                    invoice={previewInvoiceData}
                    businessStateCode={business.state_code}
                    printSize={previewPrintSize}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      })()}

      {/* Hidden print container for preview rendering in draft mode */}
      {isPreviewOpen && (
        <div className="hidden print:block bg-white text-slate-900">
          <InvoicePrintView
            invoice={previewInvoiceData}
            businessStateCode={business.state_code}
            printSize={previewPrintSize}
          />
        </div>
      )}

      <UpgradePromptModal
        isOpen={showTemplateUpgradeModal}
        onClose={() => setShowTemplateUpgradeModal(false)}
        title="Unlock Premium Print Templates"
        featureName="Traditional &amp; Book Depot Print Templates"
        description="Upgrade to Essentials Pro (₹399/mo) to unlock authentic Book Depot, Carbon Pad, and Modern GST invoice print templates."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />

      <UpgradePromptModal
        isOpen={showQuotaUpgradeModal}
        onClose={() => setShowQuotaUpgradeModal(false)}
        title="Monthly Invoice Limit Reached"
        featureName="Unlimited Monthly Invoicing"
        description="You have reached your Free plan limit of 30 invoices this calendar month. Upgrade to Essentials Pro (₹399/mo) for unlimited invoices and full statutory compliance."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </div>
  )
}
