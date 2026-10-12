'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, ProductInput } from '@/lib/validations/product'
import { createProduct } from '@/lib/actions/products/create-product'
import { updateProduct } from '@/lib/actions/products/update-product'
import { cn } from '@/lib/utils'
import {
  Check,
  AlertCircle,
  ArrowLeft,
  Eye,
  Package,
  Tag,
  Layers,
  Calculator,
  Boxes,
  FileText,
  Sparkles,
  Percent,
  Info,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'

import { products, taxRates } from '@/lib/db/schema'
import { UNIT_OF_MEASUREMENT_OPTIONS } from '@/lib/gst/units'
import { paiseToRupees, formatPaiseAsInr } from '@/lib/money'
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal'

export function ProductForm({
  product,
  taxRates: availableTaxRates,
  headerActions,
}: {
  product?: typeof products.$inferSelect
  taxRates: (typeof taxRates.$inferSelect)[]
  headerActions?: React.ReactNode
}) {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [showQuotaUpgradeModal, setShowQuotaUpgradeModal] = useState(false)
  const [isServiceManual, setIsServiceManual] = useState<boolean | null>(
    product?.hsn_sac_code ? product.hsn_sac_code.startsWith('99') : null
  )

  const isEdit = !!product

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ProductInput>({
    resolver: zodResolver(
      // @hookform/resolvers (v5.4.0) / zod (v4.4.3) compatibility workaround
      productSchema as never
    ),
    defaultValues: product
      ? {
          name: product.name,
          description: product.description || '',
          hsn_sac_code: product.hsn_sac_code,
          unit_of_measurement: product.unit_of_measurement as Extract<
            ProductInput['unit_of_measurement'],
            string
          >,
          default_sale_price: paiseToRupees(product.default_sale_price_paise),
          default_tax_rate_id: product.default_tax_rate_id || '',
          stock_quantity: product.stock_quantity ?? '',
        }
      : {
          name: '',
          description: '',
          hsn_sac_code: '',
          unit_of_measurement: 'PCS',
          default_sale_price: '' as unknown as number,
          default_tax_rate_id: '',
          stock_quantity: '',
        },
  })

  // Watch form fields in real-time for live preview and pricing intelligence
  const watchedName = useWatch({ control, name: 'name' }) || ''
  const watchedHsnSacCode = useWatch({ control, name: 'hsn_sac_code' }) || ''
  const watchedUnit = useWatch({ control, name: 'unit_of_measurement' }) || 'PCS'
  const watchedPrice = useWatch({ control, name: 'default_sale_price' })
  const watchedTaxRateId = useWatch({ control, name: 'default_tax_rate_id' }) || ''
  const watchedStock = useWatch({ control, name: 'stock_quantity' })
  const watchedDescription = useWatch({ control, name: 'description' }) || ''

  // Derive isService from manual toggle or auto-detect from 99 prefix
  const isService =
    isServiceManual !== null ? isServiceManual : watchedHsnSacCode.startsWith('99')

  const onSubmit = useCallback(
    async (data: ProductInput) => {
      setSuccess(false)
      setGlobalError(null)

      const result = isEdit
        ? await updateProduct({ id: product.id, ...data })
        : await createProduct(data)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          router.push('/products')
        }, 1200)
      } else {
        if (result.error.fieldErrors) {
          Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              setError(field as Extract<keyof ProductInput, string>, { message: messages[0] })
            }
          })
        } else {
          setGlobalError(result.error.message)
          if (result.error.code === 'PRODUCT_QUOTA_EXCEEDED' || result.error.code === 'QUOTA_EXCEEDED') {
            setShowQuotaUpgradeModal(true)
          }
        }
      }
    },
    [product, isEdit, router, setError]
  )

  // Keyboard shortcut listeners (Ctrl+S to save, Esc to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSubmit(onSubmit)()
      }
      if (e.key === 'Escape') {
        router.push('/products')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit, onSubmit, router])

  // Computed intelligence for live preview
  const selectedTaxRate = availableTaxRates.find((r) => r.id === watchedTaxRateId)
  const ratePercentage = selectedTaxRate ? parseFloat(selectedTaxRate.rate_percentage) : 0

  const numericPrice =
    typeof watchedPrice === 'number'
      ? watchedPrice
      : parseFloat(String(watchedPrice || 0)) || 0
  const priceInPaise = Math.round(numericPrice * 100)
  const taxAmountPerUnit = numericPrice * (ratePercentage / 100)
  const totalAmountPerUnit = numericPrice + taxAmountPerUnit

  const codePrefix = isService || watchedHsnSacCode.startsWith('99') ? 'SAC' : 'HSN'

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-5">
        {/* Top Header Row with Heading on Left and Item Classification Toggle on Right */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Left: Heading & Tagline */}
          <div className="flex flex-col gap-1 shrink-0">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
              {isEdit ? 'EDIT PRODUCT/SERVICE' : 'ADD PRODUCT/SERVICE'}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
              {isEdit ? (
                <>
                  Effortlessly Track, Organize, Maintain, and <br />
                  Update Product/Service in Your Catalogue
                </>
              ) : (
                <>
                  Effortlessly Track, Organize, Maintain, and <br />
                  Create a Product/Service in Your Catalogue
                </>
              )}
            </p>
          </div>

          {/* Right: Item Classification: Goods vs Service Toggle Box (+ optional headerActions in Edit mode) */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3.5 py-2 flex items-center justify-between gap-3 shadow-2xs">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                  <Package className="size-3.5 text-indigo-600" />
                  Classification: Goods vs Service
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Services: 6-digit SAC (99) • Goods: HSN
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-muted-foreground">
                  {isService ? 'Service' : 'Good'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isService
                    setIsServiceManual(next)
                    if (next && !watchedHsnSacCode) {
                      setValue('hsn_sac_code', '99')
                    }
                  }}
                  className={cn(
                    'relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                    isService ? 'bg-indigo-600' : 'bg-muted-foreground/30'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block size-4.5 transform rounded-full bg-white shadow-xs transition-transform',
                      isService ? 'translate-x-4.5' : 'translate-x-0'
                    )}
                  />
                </button>
                <span
                  className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded border',
                    isService
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  )}
                >
                  {isService ? 'SAC (Service)' : 'HSN (Physical Good)'}
                </span>
              </div>
            </div>

            {headerActions}
          </div>
        </div>

        {product && !product.is_active && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-600 dark:text-amber-400">
            This product is currently inactive and will not appear in dropdowns when creating invoices.
          </div>
        )}

        {/* Main 2-Column Grid: Form (Left) & Preview Sidebar (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* LEFT COLUMN: 3-Step Form (~62% width) */}
          <div className="lg:col-span-7 xl:col-span-8 rounded-xl border border-border bg-card px-5 py-4 sm:px-6 sm:py-4.5 shadow-xs">
            {globalError && (
              <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0" />
                <span className="font-semibold">{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4.5 sm:space-y-5">
              {/* SECTION 1: Classification & Identity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                      1
                    </div>
                    <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                      Classification &amp; Identity
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Type, naming &amp; GST code</span>
                </div>

                {/* Single Hybrid Row: Product Name (8 cols) + HSN/SAC Code (4 cols) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  {/* Product / Service Name - 8 cols */}
                  <div className="md:col-span-8">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                      <Package className="size-3.5 text-indigo-600" />
                      {isService ? 'Service' : 'Product'} Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={
                        isService
                          ? 'e.g. GST Filing & Accounting Consultancy or Software License'
                          : 'e.g. Dell Inspiron 15 Laptop or Industrial Ball Bearings'
                      }
                      className={cn(
                        'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                        errors.name && 'border-destructive focus:ring-destructive/20'
                      )}
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs font-bold text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {/* HSN/SAC Code - 4 cols with Tooltip */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Tag className="size-3.5 text-indigo-600" />
                        {codePrefix} Code <span className="text-destructive">*</span>
                      </label>
                      <Tooltip
                        content={
                          isService
                            ? 'Services use 6-digit SAC codes starting with chapter 99 (e.g. 998311 for Management Consulting).'
                            : 'Use 4 digits for turnover < ₹5 Cr, 6 digits for B2B > ₹5 Cr, or 8 digits for chemical/export items.'
                        }
                        side="top"
                        sideOffset={4}
                      >
                        <span
                          tabIndex={0}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-help transition-colors select-none"
                          title={
                            isService
                              ? 'Services use 6-digit SAC codes starting with chapter 99.'
                              : 'Use 4 digits for turnover < ₹5 Cr, 6 digits for B2B > ₹5 Cr, or 8 digits for chemical/export items.'
                          }
                        >
                          <span>{codePrefix} ({isService ? '6 digits' : '4, 6, 8d'})</span>
                          <Info className="size-3 text-indigo-500 shrink-0" />
                        </span>
                      </Tooltip>
                    </div>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder={isService ? 'e.g. 998314' : 'e.g. 84713000'}
                      className={cn(
                        'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono uppercase text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all tracking-wider',
                        errors.hsn_sac_code && 'border-destructive focus:ring-destructive/20'
                      )}
                      {...register('hsn_sac_code')}
                    />
                    {errors.hsn_sac_code && (
                      <p className="mt-1 text-xs font-bold text-destructive">
                        {errors.hsn_sac_code.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Pricing & Taxation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                      2
                    </div>
                    <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                      Pricing &amp; Taxation
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Standard rate &amp; GST slab</span>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Unit of measurement */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                        <Layers className="size-3.5 text-indigo-600" />
                        Unit of Measure <span className="text-destructive">*</span>
                      </label>
                      <select
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all cursor-pointer',
                          errors.unit_of_measurement && 'border-destructive focus:ring-destructive/20'
                        )}
                        {...register('unit_of_measurement')}
                      >
                        {UNIT_OF_MEASUREMENT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      {errors.unit_of_measurement && (
                        <p className="mt-1 text-xs font-bold text-destructive">
                          {errors.unit_of_measurement.message}
                        </p>
                      )}
                    </div>

                    {/* Sale Price with (i) Tooltip */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Percent className="size-3.5 text-indigo-600" />
                          Base Price (₹ Excl. Tax) <span className="text-destructive">*</span>
                        </label>
                        <Tooltip
                          content="Base price is tax-exclusive. On invoice generation, CGST + SGST (Local) or IGST (Interstate) is automatically added to this price."
                          side="top"
                          sideOffset={4}
                        >
                          <button
                            type="button"
                            className="inline-flex items-center text-muted-foreground hover:text-indigo-600 transition-colors cursor-help p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                            title="Base price is tax-exclusive. On invoice generation, CGST + SGST (Local) or IGST (Interstate) is automatically added to this price."
                          >
                            <Info className="size-3.5 text-indigo-500 shrink-0" />
                            <span className="sr-only">Tax calculation info</span>
                          </button>
                        </Tooltip>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                          errors.default_sale_price && 'border-destructive focus:ring-destructive/20'
                        )}
                        {...register('default_sale_price')}
                      />
                      {errors.default_sale_price && (
                        <p className="mt-1 text-xs font-bold text-destructive">
                          {errors.default_sale_price.message}
                        </p>
                      )}
                    </div>

                    {/* GST Rate */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                        <Tag className="size-3.5 text-indigo-600" />
                        GST Slab Rate
                      </label>
                      <select
                        className={cn(
                          'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all cursor-pointer',
                          errors.default_tax_rate_id && 'border-destructive focus:ring-destructive/20'
                        )}
                        {...register('default_tax_rate_id')}
                      >
                        <option value="">No rate assigned (0%)</option>
                        {availableTaxRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label} GST ({r.rate_percentage}%)
                          </option>
                        ))}
                      </select>
                      {errors.default_tax_rate_id && (
                        <p className="mt-1 text-xs font-bold text-destructive">
                          {errors.default_tax_rate_id.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Inventory & Specifications */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">
                      3
                    </div>
                    <h3 className="text-base font-bold text-foreground font-heading tracking-wide uppercase">
                      Inventory &amp; Specifications
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">Stock &amp; line item details</span>
                </div>

                <div className="space-y-3">
                  {/* Stock Quantity */}
                  <div className="max-w-xs">
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                      <Boxes className="size-3.5 text-indigo-600" />
                      Opening / Available Stock
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0"
                      className={cn(
                        'w-full rounded-lg border border-border bg-background px-3 py-1.5 h-9 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all',
                        errors.stock_quantity && 'border-destructive focus:ring-destructive/20'
                      )}
                      {...register('stock_quantity')}
                    />
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Optional. Leave blank or 0 for services or untracked stock items.
                    </p>
                    {errors.stock_quantity && (
                      <p className="mt-1 text-xs font-bold text-destructive">
                        {errors.stock_quantity.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-1">
                      <FileText className="size-3.5 text-indigo-600" />
                      Description / Specifications{' '}
                      <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Add item specifications, model numbers, warranty terms, or deliverables to automatically print under line items on invoices..."
                      className={cn(
                        'w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all resize-none',
                        errors.description && 'border-destructive focus:ring-destructive/20'
                      )}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="mt-1 text-xs font-bold text-destructive">
                        {errors.description.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Action Buttons - Border removed & spacing tightened */}
              <div className="!mt-2 flex items-center justify-between gap-3 flex-wrap">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3.5 py-1.5 h-9 text-sm font-bold text-foreground hover:bg-muted transition-all shadow-2xs"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to Catalogue
                </Link>

                <div className="flex items-center gap-3">
                  {success && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <Check className="size-4" />
                      {isEdit ? 'Product updated!' : 'Product added successfully!'}
                    </span>
                  )}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-9 px-4 rounded-lg font-bold text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-md hover:shadow-lg cursor-pointer transition-all hover:-translate-y-px active:translate-y-px disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      'Saving...'
                    ) : isEdit ? (
                      <>
                        <Check className="size-4 mr-1.5" /> Update Product Details
                      </>
                    ) : (
                      <>
                        <Check className="size-4 mr-1.5" /> Save &amp; Add Product
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
      </div>

      {/* RIGHT COLUMN: Live Catalogue Preview Sidebar (~38% width) */}
      <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 sticky top-6">
        {/* Header with Eye icon & Real-time pill */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-sm font-bold text-foreground tracking-wider uppercase font-heading">
              Live Catalogue Preview
            </h4>
          </div>
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            Real-time
          </span>
        </div>

        {/* 1. Interactive Product Card Preview (Matching Catalogue Format) */}
        <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs space-y-2.5">
          {/* Line 1: Name on Left, GST% on Right */}
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-bold text-base sm:text-lg text-foreground truncate block leading-snug flex-1">
              {watchedName.trim() || (isService ? 'Service Name Preview' : 'Product Name Preview')}
            </h4>

            <div className="shrink-0 flex items-center gap-1.5">
              {selectedTaxRate ? (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {selectedTaxRate.label} GST
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  No rate
                </span>
              )}
            </div>
          </div>

          {/* Line 2: Rate/Price + Unit + (HSN/SAC Code) on left, optional stock on right */}
          <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-sm text-muted-foreground font-medium gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-lg sm:text-xl font-extrabold text-foreground font-heading">
                {formatPaiseAsInr(priceInPaise)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground/80">
                / {watchedUnit}
              </span>
              <span className="text-sm font-mono font-medium text-muted-foreground">
                ({codePrefix}: {watchedHsnSacCode || '------'})
              </span>
            </div>

            {watchedStock !== '' && watchedStock !== undefined && watchedStock !== null && (
              <span className="shrink-0 text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                Stock: {watchedStock}
              </span>
            )}
          </div>

          {/* Optional description preview */}
          {watchedDescription && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 italic pt-1.5 border-t border-border/30">
              &quot;{watchedDescription}&quot;
            </p>
          )}
        </div>

        {/* 2. Pricing & Tax Intelligence Card */}
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
            <Calculator className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h5 className="text-base font-bold text-foreground tracking-wider uppercase font-heading">
              Pricing &amp; Tax Intelligence
            </h5>
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Taxable Base Price</span>
              <span className="font-mono font-bold text-foreground">
                ₹{numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Applicable Tax Slab</span>
              <span className="font-semibold text-foreground">
                {selectedTaxRate ? `${selectedTaxRate.label} (${ratePercentage}%)` : '0% (Exempt / Untaxed)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">Estimated Tax / Unit</span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                + ₹{taxAmountPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {ratePercentage > 0 && (
              <div className="rounded-md bg-muted/40 px-2 py-1.5 text-xs space-y-0.5 text-muted-foreground font-medium">
                <div className="flex justify-between">
                  <span>Intrastate (Local):</span>
                  <span className="font-mono font-semibold">
                    CGST {(ratePercentage / 2).toFixed(1)}% + SGST {(ratePercentage / 2).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Interstate:</span>
                  <span className="font-mono font-semibold">IGST {ratePercentage.toFixed(1)}%</span>
                </div>
              </div>
            )}

            <div className="pt-1.5 border-t border-border/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-foreground block">Customer MRP / Unit</span>
                <span className="text-xs text-muted-foreground">Inclusive of estimated GST</span>
              </div>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono font-heading">
                ₹{totalAmountPerUnit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Productivity Shortcuts Card */}
        <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-amber-500" />
            <h5 className="text-sm font-bold text-foreground uppercase tracking-wider font-heading">
              Productivity Shortcuts
            </h5>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between py-0.5 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Quick Save &amp; Commit</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-bold text-foreground border border-border">
                Ctrl + S
              </kbd>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground font-medium">Cancel &amp; Exit</span>
              <kbd className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-bold text-foreground border border-border">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showQuotaUpgradeModal}
        onClose={() => setShowQuotaUpgradeModal(false)}
        title="Product Catalog Limit Reached"
        featureName="Unlimited Product Catalog"
        description="You have reached your Free plan limit of 30 catalog items. Upgrade to Essentials Pro (₹399/mo) to add unlimited products and maintain comprehensive inventory."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </TooltipProvider>
  )
}
