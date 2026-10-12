'use client'

import Link from 'next/link'
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  Mail, 
  BellRing, 
  Check, 
  Copy, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Receipt,
  Ban,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useState, useTransition, useEffect } from 'react'
import { formatPaiseAsInr } from '@/lib/money'
import { emailInvoice } from '@/lib/actions/invoices/email-invoice'
import { sendPaymentReminder } from '@/lib/actions/invoices/send-payment-reminder'
import { getArchivedPdfUrl } from '@/lib/actions/invoices/get-archived-pdf-url'
import { getDisplayInvoiceStatus, getDisplayStatusLabel } from '@/lib/invoices/status'
import { PaymentSection } from './payment-section'
import { cn } from '@/lib/utils'
import { InvoicePrintView, type InvoicePrintViewProps } from './invoice-print-view'
import { generateWhatsAppInvoiceUrl } from '@/lib/subscriptions/whatsapp'
import { resolveSubscriptionPlan } from '@/lib/subscriptions/entitlements'
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.477-.15-.678.15-.201.3-.778.978-.954 1.179-.176.2-.351.225-.652.075-.301-.15-1.27-.468-2.42-1.494-.894-.799-1.498-1.786-1.674-2.087-.176-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.176.201-.301.301-.502.101-.201.05-.376-.025-.526-.075-.15-.678-1.631-.93-2.235-.244-.589-.493-.509-.678-.518-.176-.009-.377-.01-.578-.01-.201 0-.527.075-.803.376s-1.054 1.029-1.054 2.509 1.079 2.91 1.23 3.111c.15.201 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.635.722.23 1.38.197 1.9-.12.579-.086 1.78-.727 2.031-1.43.251-.703.251-1.304.176-1.43-.075-.126-.276-.201-.577-.351zM12.042 2C6.502 2 2.01 6.49 2.01 12.029c0 1.99.585 3.844 1.597 5.407L2 22l4.712-1.553c1.516.945 3.3 1.488 5.33 1.488 5.54 0 10.032-4.49 10.032-10.03 0-5.54-4.492-10.03-10.032-10.03z"/>
    </svg>
  )
}

interface InvoiceDetailProps {
  invoice: InvoicePrintViewProps['invoice'] & {
    lifecycle_status: 'finalized' | 'draft'
    payment_status: 'paid' | 'partially_paid' | 'overdue' | 'unpaid'
    due_date: string | Date | null
    created_at?: string | Date | null
    finalized_at?: string | Date | null
    notes?: string | null
    archival_status?: string | null
    pdf_storage_key?: string | null
    emailed_at?: string | Date | null
    email_send_count?: number
    customer?: { email?: string | null; phone?: string | null; name?: string | null } | null
    customer_name?: string | null
    customer_email?: string | null
    customer_phone?: string | null
    upi_id?: string | null
    line_items?: unknown[]
    [key: string]: unknown
  }
  payments?: Array<{
    id: string
    amount_paise: number
    payment_date: string | Date
    payment_method: string
    reference_number?: string | null
    notes?: string | null
    [key: string]: unknown
  }>
  creditNotes?: Array<{
    id: string
    credit_note_number: string
    issue_date: string | Date | null
    reason: string
    lifecycle_status: string
    grand_total_paise: number
    status?: string | null
    voided_at?: string | Date | null
    void_reason?: string | null
    void_notes?: string | null
    [key: string]: unknown
  }>
  businessStateCode: string
  business?: {
    id?: string
    legal_name?: string
    trade_name?: string | null
    subscription_plan?: string | null
    subscription_status?: string | null
    trial_ends_at?: Date | string | null
    upi_id?: string | null
    [key: string]: unknown
  } | null
}

export function InvoiceDetail({ invoice, payments = [], creditNotes = [], businessStateCode, business }: InvoiceDetailProps) {
  const [printSize, setPrintSize] = useState<'A4' | 'A5'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const sizeParam = params.get('size')
      if (sizeParam === 'A4' || sizeParam === 'A5') {
        return sizeParam
      }
    }
    return 'A5'
  })
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showWhatsAppUpgradeModal, setShowWhatsAppUpgradeModal] = useState(false)

  const canUseWhatsApp = (() => {
    if (!business) return false
    const plan = resolveSubscriptionPlan(business)
    return plan.tier !== 'free'
  })()

  const handleWhatsAppDispatch = () => {
    if (!canUseWhatsApp) {
      setShowWhatsAppUpgradeModal(true)
      return
    }

    const customerPhone = (invoice.customer_phone as string) || invoice.customer?.phone || null
    const customerName = (invoice.billing_name_snapshot as string) || (invoice.customer_name as string) || null
    const businessName = (invoice.business_name as string) || (business?.trade_name || business?.legal_name || 'Bill Matrix Merchant')

    const shareUrl = generateWhatsAppInvoiceUrl({
      customerName,
      customerPhone,
      invoiceNumber: (invoice.invoice_number as string) || 'INV-DRAFT',
      invoiceDate: invoice.invoice_date,
      dueDate: invoice.due_date,
      grandTotalPaise: Number(invoice.grand_total_paise || 0),
      businessName,
      payeeUpiId: (invoice.upi_id as string) || business?.upi_id || null,
      invoiceUrl: typeof window !== 'undefined' ? window.location.href : null,
    })

    window.open(shareUrl, '_blank', 'noopener,noreferrer')
  }

  // Calculations for financial settlement including credit notes
  const totalCreditedPaise = creditNotes
    .filter(note => note.lifecycle_status === 'finalized' && (note.status || 'active') === 'active')
    .reduce((acc, note) => acc + Number(note.grand_total_paise || 0), 0)
  const netBillPaise = Math.max(0, Number(invoice.grand_total_paise || 0) - totalCreditedPaise)
  const activePayments = payments.filter(p => (p.status || 'active') === 'active')
  const existingSum = activePayments.reduce((acc, p) => acc + Number(p.amount_paise || 0), 0)
  const balanceDue = netBillPaise - existingSum
  const settlementPercentage = netBillPaise > 0 
    ? Math.min(100, Math.round((existingSum / netBillPaise) * 100))
    : 100

  // Handle auto-printing if query param set
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('print') === 'true') {
        window.print()
      }
    }
  }, [])

  const handleCopyNumber = async () => {
    if (invoice.invoice_number) {
      try {
        await navigator.clipboard.writeText(invoice.invoice_number)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy invoice number:', err)
      }
    }
  }

  async function handleDownloadArchived() {
    setIsDownloading(true)
    setDownloadError(null)
    const res = await getArchivedPdfUrl({ id: invoice.id })
    if (res.success) {
      window.open(res.data.url, '_blank')
    } else {
      setDownloadError(res.error.message)
    }
    setIsDownloading(false)
  }

  function handleEmailInvoice() {
    if (!window.confirm('Send this invoice to the customer?')) return
    setActionMessage(null)
    startTransition(async () => {
      const res = await emailInvoice({ invoiceId: invoice.id })
      if (res.success) {
        setActionMessage({ text: 'Invoice emailed successfully.', type: 'success' })
      } else {
        setActionMessage({ text: res.error.message, type: 'error' })
      }
    })
  }

  function handleSendReminder() {
    if (!window.confirm('Send a payment reminder to the customer?')) return
    setActionMessage(null)
    startTransition(async () => {
      const res = await sendPaymentReminder({ invoiceId: invoice.id })
      if (res.success) {
        setActionMessage({ text: 'Payment reminder sent.', type: 'success' })
      } else {
        setActionMessage({ text: res.error.message, type: 'error' })
      }
    })
  }

  // 4-step modern lifecycle pipeline
  const validPaymentDates = activePayments
    .map((p) => (p.payment_date ? new Date(p.payment_date).getTime() : NaN))
    .filter((t) => !isNaN(t))
  const latestPaymentDate = validPaymentDates.length > 0 ? new Date(Math.max(...validPaymentDates)) : null

  const lifecycleSteps = [
    {
      step: 1,
      name: 'Drafted',
      subtext: 'Created in catalog',
      date: invoice.created_at,
      isCompleted: true,
      isCurrent: invoice.lifecycle_status === 'draft',
      icon: FileText
    },
    {
      step: 2,
      name: 'Finalized',
      subtext: invoice.lifecycle_status === 'finalized' ? 'Locked & sequenced' : 'Pending lock',
      date: invoice.finalized_at,
      isCompleted: invoice.lifecycle_status === 'finalized',
      isCurrent: invoice.lifecycle_status === 'finalized' && !invoice.emailed_at && invoice.payment_status !== 'paid',
      icon: CheckCircle2
    },
    {
      step: 3,
      name: 'Dispatched',
      subtext: invoice.emailed_at ? `Sent (${invoice.email_send_count || 1}x)` : 'Pending email',
      date: invoice.emailed_at,
      isCompleted: !!invoice.emailed_at,
      isCurrent: !!invoice.emailed_at && invoice.payment_status !== 'paid',
      icon: Mail
    },
    {
      step: 4,
      name: 'Settled',
      subtext: invoice.payment_status === 'paid' ? 'Paid in full' : (existingSum > 0 ? 'Partially settled' : 'Balance unpaid'),
      date: invoice.payment_status === 'paid' ? latestPaymentDate : null,
      isCompleted: invoice.payment_status === 'paid',
      isCurrent: invoice.payment_status === 'paid',
      icon: ShieldCheck
    }
  ]

  const status = getDisplayInvoiceStatus(invoice)
  const { label: statusLabel, colorClass: statusColorClass } = getDisplayStatusLabel(status)

  return (
    <div className="space-y-4">
      <div className="space-y-4 print:hidden">
        {/* Top Header Actions Block */}
        <div id="inv-controls" className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <Link 
              href="/invoices" 
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-xs cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Invoice {invoice.invoice_number || 'DRAFT'}
                </h1>
                {invoice.invoice_number && (
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="flex size-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                    title="Copy invoice number"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                )}
                <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs', statusColorClass)}>
                  {statusLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-muted-foreground">Preview dashboard &amp; billing events catalog</p>
                {invoice.archival_status === 'pending' && (
                  <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                    Archiving copy...
                  </span>
                )}
                {invoice.archival_status === 'failed' && (
                  <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded border border-destructive/20">
                    Archival retry pending
                  </span>
                )}
                {invoice.emailed_at && (
                  <span className="text-[9px] bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900 font-semibold">
                    Emailed ({invoice.email_send_count}x)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {actionMessage && (
              <span className={cn('text-xs font-bold', actionMessage.type === 'error' ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400')}>
                {actionMessage.text}
              </span>
            )}
            {downloadError && <span className="text-xs text-destructive font-semibold">{downloadError}</span>}
            
            <div className="flex flex-wrap items-center gap-2">
              {invoice.lifecycle_status === 'finalized' && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleWhatsAppDispatch} 
                  className={cn(
                    "shadow-xs font-semibold cursor-pointer gap-1.5",
                    canUseWhatsApp
                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                      : "border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
                  )}
                  title={canUseWhatsApp ? "Share on WhatsApp with Dynamic UPI Link" : "Unlock WhatsApp Invoicing (Essentials Pro)"}
                >
                  <WhatsAppIcon className="size-4 text-[#25D366]" />
                  <span>WhatsApp</span>
                  {!canUseWhatsApp && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-2xs">
                      <Crown className="size-2.5 text-amber-500" />
                      PRO
                    </span>
                  )}
                </Button>
              )}

              {invoice.lifecycle_status === 'finalized' && invoice.archival_status === 'archived' && (
                <>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    onClick={handleEmailInvoice} 
                    disabled={isPending || !invoice.customer_email}
                    className="shadow-xs font-semibold cursor-pointer"
                  >
                    <Mail className="size-4" /> {isPending ? 'Sending...' : 'Email'}
                  </Button>
                  {status === 'overdue' && (
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      onClick={handleSendReminder} 
                      disabled={isPending || !invoice.customer_email}
                      className="shadow-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900 bg-amber-500/5 cursor-pointer"
                    >
                      <BellRing className="size-4" /> {isPending ? 'Sending...' : 'Reminder'}
                    </Button>
                  )}
                </>
              )}
              {invoice.archival_status === 'archived' && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDownloadArchived} 
                  disabled={isDownloading} 
                  className="shadow-xs font-semibold cursor-pointer"
                >
                  <Download className="size-4" /> {isDownloading ? 'Loading...' : 'Download PDF'}
                </Button>
              )}

              {invoice.lifecycle_status === 'finalized' && (
                <Link href={`/invoices/${invoice.id}/credit-note/new`}>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline" 
                    className="h-8 px-3 text-[14px] shadow-xs font-semibold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                  >
                    <FileText className="size-4" /> Issue Credit Note
                  </Button>
                </Link>
              )}
              {/* Print size/orientation toggle with Print Button */}
              <div className="flex items-center gap-1.5">
                <div className="flex overflow-hidden rounded-md border border-border text-[13px] shadow-xs bg-card">
                  {(['A4', 'A5'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPrintSize(s)}
                      className={cn(
                        "px-3 py-1 transition-all cursor-pointer font-bold",
                        printSize === s
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-background text-muted-foreground hover:bg-accent font-semibold first:border-r first:border-border"
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
                  className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-all hover:bg-accent shadow-xs cursor-pointer"
                  title="Print Invoice (System Dialog)"
                >
                  <Printer className="size-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Layout: Flexible Invoice Paper + Proportional Responsive Sidebar */}
        <div id="inv-bg" className="flex flex-col lg:flex-row items-start gap-4">
          {/* Left Side: Invoice Paper Preview Sheet */}
          <div className="flex-1 min-w-0 w-full overflow-x-auto pb-2 flex justify-center">
            <div 
              id="inv-paper" 
              className="w-full mx-auto rounded-xl bg-white shadow-sm border border-border overflow-hidden transition-all" 
              style={{ 
                maxWidth: '860px', 
                fontFamily: 'inherit' 
              }}
            >
              <InvoicePrintView 
                invoice={invoice} 
                businessStateCode={businessStateCode} 
                printSize={printSize} 
              />
            </div>
          </div>

          {/* Right Side: Proportional Responsive Sidebar Hub */}
          <div id="inv-sidebar" className="w-full lg:w-[370px] xl:w-[390px] 2xl:w-[410px] shrink-0 space-y-2 print:hidden transition-all duration-200">
            
            {/* COMBINED CARD 1: Lifecycle Pipeline & Financial Settlement Hub */}
            <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-1 mb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Receipt className="size-[18px] text-primary" />
                  <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                    Lifecycle &amp; Settlement
                  </h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {settlementPercentage}% Settled
                </span>
              </div>

              {/* Modern Horizontal 4-Step Lifecycle Pipeline */}
              <div className="grid grid-cols-4 gap-1 sm:gap-2 relative mb-2">
                {lifecycleSteps.map((step, idx) => {
                  const Icon = step.icon
                  const isLast = idx === lifecycleSteps.length - 1
                  return (
                    <div key={step.step} className="relative flex flex-col items-center text-center">
                      {/* Connector Line behind nodes */}
                      {!isLast && (
                        <div 
                          className={cn(
                            "absolute top-3.5 left-1/2 w-full h-0.5 z-0 transition-colors",
                            lifecycleSteps[idx + 1].isCompleted 
                              ? "bg-emerald-500" 
                              : (step.isCompleted ? "bg-primary/40" : "bg-border")
                          )} 
                        />
                      )}

                      {/* Step Node Indicator */}
                      <div 
                        className={cn(
                          "relative z-10 flex size-7 items-center justify-center rounded-full border text-[11px] font-bold shadow-xs transition-all",
                          step.isCompleted
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                            : step.isCurrent
                            ? "bg-primary text-primary-foreground border-primary ring-3 ring-primary/20"
                            : "bg-background text-muted-foreground border-border"
                        )}
                        title={step.name}
                      >
                        {step.isCompleted ? (
                          <Check className="size-4 stroke-[2.5]" />
                        ) : (
                          <Icon className="size-[15px]" />
                        )}
                      </div>

                      {/* Step Labels */}
                      <div className="mt-1.5 w-full">
                        <p className={cn(
                          "text-xs font-bold leading-tight truncate",
                          step.isCompleted ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.name}
                        </p>
                        {step.date ? (
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {new Date(step.date as string | Date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                            Pending
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 3-Column Settlement Balance Metric Strip */}
              <div className="grid grid-cols-3 gap-2 px-2 py-1 rounded-lg border border-border/80 bg-muted/20">
                <div>
                  <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {totalCreditedPaise > 0 ? 'Net Billed' : 'Total'}
                  </span>
                  <span className="text-[13px] sm:text-[15px] font-bold text-foreground">
                    {formatPaiseAsInr(netBillPaise)}
                  </span>
                  {totalCreditedPaise > 0 && (
                    <span className="block text-[10px] text-red-600 dark:text-red-400 font-semibold">
                      (-{formatPaiseAsInr(totalCreditedPaise)} CN)
                    </span>
                  )}
                </div>
                <div className="border-x border-border px-1">
                  <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Settled
                  </span>
                  <span className={cn("text-[13px] sm:text-[15px] font-bold", existingSum > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                    {formatPaiseAsInr(existingSum)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {balanceDue < 0 ? 'Refund Due' : 'Due'}
                  </span>
                  <span className={cn(
                    "text-[13px] sm:text-[15px] font-black",
                    balanceDue > 0 ? "text-destructive" : (balanceDue < 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400")
                  )}>
                    {formatPaiseAsInr(Math.abs(balanceDue))}
                  </span>
                </div>
              </div>
            </div>

            {/* COMBINED CARD 2: Settlement Payment Center & Transaction History */}
            <PaymentSection invoice={invoice} payments={payments} totalCreditedPaise={totalCreditedPaise} />

            {/* COMBINED CARD 3: Credit Notes & Returns */}
            <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="size-[18px] text-red-600 dark:text-red-400" />
                  <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                    Credit Notes &amp; Returns
                  </h3>
                </div>
                {creditNotes.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                    {creditNotes.filter(n => (n.status || 'active') === 'active').length} Active
                    {creditNotes.some(n => n.status === 'voided') && ` • ${creditNotes.filter(n => n.status === 'voided').length} Voided`}
                  </span>
                )}
              </div>

              {creditNotes.length === 0 ? (
                <div className="text-center py-3 text-[13px] text-muted-foreground space-y-2">
                  <p>No credit notes issued for this invoice.</p>
                  {invoice.lifecycle_status === 'finalized' && (
                    <Link href={`/invoices/${invoice.id}/credit-note/new`}>
                      <Button size="sm" variant="outline" className="text-[13px] font-semibold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20">
                        Issue Credit Note
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {creditNotes.map((note) => {
                    const isVoided = note.status === 'voided';
                    return (
                      <div 
                        key={note.id} 
                        className={cn(
                          "px-2 py-1.5 rounded-lg border transition-colors flex items-center justify-between gap-2 text-[13px]",
                          isVoided
                            ? "border-rose-200/60 bg-rose-50/20 dark:border-rose-950/40 dark:bg-rose-950/10 opacity-80"
                            : "border-border bg-muted/10"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className={cn("font-mono font-bold", isVoided ? "line-through text-muted-foreground" : "text-foreground")}>
                              {note.credit_note_number}
                            </strong>
                            {isVoided ? (
                              <Tooltip
                                content={
                                  <div className="space-y-1 text-left max-w-[280px]">
                                    <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs border-b border-slate-700/80 pb-1">
                                      <Ban className="size-3.5" />
                                      <span>VOIDED CREDIT NOTE</span>
                                    </div>
                                    <div className="text-[11px] text-slate-300">
                                      <span className="text-slate-400">Reason:</span> {note.void_reason || 'Cancelled'}
                                    </div>
                                    {note.void_notes && (
                                      <div className="text-[11px] text-slate-400 italic">
                                        &ldquo;{note.void_notes}&rdquo;
                                      </div>
                                    )}
                                    <div className="text-[10px] text-amber-300/90 pt-0.5">
                                      ₹{formatPaiseAsInr(note.grand_total_paise)} restored to invoice balance.
                                    </div>
                                  </div>
                                }
                                side="top"
                              >
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 cursor-help">
                                  <Ban className="size-2.5" /> VOIDED
                                </span>
                              </Tooltip>
                            ) : (
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase",
                                note.lifecycle_status === 'finalized'
                                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border border-green-200 dark:border-green-800"
                                  : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
                              )}>
                                {note.lifecycle_status}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {note.issue_date ? new Date(note.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Draft'} • {note.reason}
                            {isVoided && (
                              <span className="text-rose-600 dark:text-rose-400 font-semibold ml-1.5 inline-flex items-center gap-0.5">
                                • Cancelled (Restored to balance)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2 shrink-0">
                          <span className={cn("font-mono font-bold", isVoided ? "line-through text-muted-foreground/60" : "text-red-600 dark:text-red-400")}>
                            -{formatPaiseAsInr(note.grand_total_paise)}
                          </span>
                          <Link href={`/credit-notes/${note.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[13px] text-primary hover:underline">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {invoice.lifecycle_status === 'finalized' && (
                    <div className="pt-1 text-right">
                      <Link href={`/invoices/${invoice.id}/credit-note/new`}>
                        <Button size="sm" variant="outline" className="w-full text-[13px] font-semibold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20">
                          + Issue Another Credit Note
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Dynamic Print View rendered only for printing */}
      <div className="hidden print:block bg-white text-slate-900">
        <InvoicePrintView 
          invoice={invoice} 
          businessStateCode={businessStateCode} 
          printSize={printSize} 
        />
      </div>

      <UpgradePromptModal
        isOpen={showWhatsAppUpgradeModal}
        onClose={() => setShowWhatsAppUpgradeModal(false)}
        title="Unlock 1-Click WhatsApp Invoicing"
        featureName="1-Click WhatsApp Direct Share with Dynamic UPI Links"
        description="Upgrade to Essentials Pro (₹399/mo) to send formatted invoice summaries directly to your customer's WhatsApp with dynamic UPI payment links and instant digital bills."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </div>
  )
}
