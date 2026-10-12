'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Printer, 
  Download, 
  CheckCircle, 
  Trash2, 
  AlertCircle, 
  Check, 
  Copy, 
  Receipt, 
  ShieldCheck, 
  ExternalLink,
  FileText,
  Ban,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreditNotePrintView, CreditNotePrintViewProps } from './credit-note-print-view';
import { VoidCreditNoteDialog } from './void-credit-note-dialog';
import { finalizeCreditNote } from '@/lib/actions/credit-notes/finalize-credit-note';
import { deleteCreditNoteDraft } from '@/lib/actions/credit-notes/delete-credit-note-draft';
import { getArchivedCreditNotePdfUrl } from '@/lib/actions/credit-notes/get-archived-credit-note-pdf-url';
import { useRouter } from 'next/navigation';
import { formatPaiseAsInr } from '@/lib/money';
import { getCreditNoteReasonLabel, VOID_CREDIT_NOTE_REASONS } from '@/lib/validations/credit-note';
import { INDIAN_GST_STATES } from '@/lib/gst/indian-states';
import { cn } from '@/lib/utils';

interface CreditNoteDetailProps {
  creditNote: CreditNotePrintViewProps['creditNote'] & {
    original_invoice_id: string;
    lifecycle_status: string;
    status?: string | null;
    voided_at?: string | Date | null;
    voided_by?: string | null;
    voided_by_name?: string | null;
    void_reason?: string | null;
    void_notes?: string | null;
    notes?: string | null;
    pdf_storage_key?: string | null;
    totalCreditedPaiseForInvoice?: number;
  };
}

export function CreditNoteDetail({ creditNote }: CreditNoteDetailProps) {
  const router = useRouter();
  const [printSize, setPrintSize] = useState<'A4' | 'A5'>('A4');
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isFinalized = creditNote.lifecycle_status === 'finalized';
  const isVoided = creditNote.status === 'voided';

  const handleCopyNumber = async () => {
    if (creditNote.credit_note_number) {
      try {
        await navigator.clipboard.writeText(creditNote.credit_note_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy credit note number:', err);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setMessage(null);
    try {
      const res = await getArchivedCreditNotePdfUrl({ id: creditNote.id });
      if (res.success) {
        window.open(res.data.url, '_blank');
      } else {
        // Fallback to browser print if not yet archived
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFinalize = () => {
    if (!window.confirm('Are you sure you want to finalize this Credit Note? Once finalized, it cannot be edited or deleted.')) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await finalizeCreditNote({ id: creditNote.id });
      if (res.success) {
        setMessage({ type: 'success', text: `Credit note finalized as ${res.data.creditNoteNumber}` });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: res.error.message });
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this draft credit note?')) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await deleteCreditNoteDraft({ id: creditNote.id });
      if (res.success) {
        router.push(`/invoices/${creditNote.original_invoice_id}`);
      } else {
        setMessage({ type: 'error', text: res.error.message });
      }
    });
  };

  const formattedDate = creditNote.issue_date
    ? new Date(creditNote.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Draft';

  const origInvoiceDate = creditNote.originalInvoice.invoice_date
    ? new Date(creditNote.originalInvoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';

  const reasonLabel = getCreditNoteReasonLabel(creditNote.reason);
  const originalBillPaise = Number(creditNote.originalInvoice.grand_total_paise || 0);
  const creditPaise = Number(creditNote.grand_total_paise || 0);
  const totalCreditedForInvoicePaise = Number(creditNote.totalCreditedPaiseForInvoice ?? creditPaise);
  const netAdjustedBillPaise = Math.max(0, originalBillPaise - totalCreditedForInvoicePaise);

  const posState = INDIAN_GST_STATES.find(
    s => s.code === (creditNote.originalInvoice.place_of_supply_state_code || '')
  )?.name || 'N/A';

  return (
    <div className="space-y-4">
      {/* Top Header Actions Block (Hidden during print) */}
      <div className="space-y-4 print:hidden">
        <div id="cn-controls" className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-3 border-b border-border">
          {/* Left: Back Arrow + Title + Metadata */}
          <div className="flex items-center gap-3">
            <Link 
              href="/invoices" 
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:bg-accent hover:text-foreground shadow-xs cursor-pointer"
              title="Back to Invoices & Credit Notes"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Credit Note {creditNote.credit_note_number || 'DRAFT'}
                </h1>
                {creditNote.credit_note_number && (
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="flex size-6 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
                    title="Copy credit note number"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                )}
                <span className={cn(
                  'text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs border',
                  isVoided
                    ? 'bg-rose-50 text-rose-700 border-rose-300 line-through dark:bg-rose-950 dark:text-rose-300'
                    : (isFinalized 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200')
                )}>
                  {isVoided ? 'VOIDED' : (isFinalized ? 'FINALIZED' : 'DRAFT')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                <span>Issued against invoice</span>
                <Link
                  href={`/invoices/${creditNote.originalInvoice.id}`}
                  className="font-mono font-semibold text-primary underline hover:text-primary/80 transition-colors"
                >
                  {creditNote.originalInvoice.invoice_number}
                </Link>
                <span>•</span>
                <span>{formattedDate}</span>
                <span>•</span>
                <span className="font-medium text-foreground">{reasonLabel}</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Print size toggle */}
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
              onClick={handlePrint}
              className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground transition-all hover:bg-accent shadow-xs cursor-pointer"
              title="Print Credit Note (System Dialog)"
            >
              <Printer className="size-[18px]" />
            </button>

            {isFinalized && !isVoided && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoidDialogOpen(true)}
                className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors cursor-pointer"
                title="Cancel / Void this Credit Note (Statutory Audit Trail)"
              >
                <Ban className="size-3.5" />
                <span>Void Note</span>
              </Button>
            )}

            {isFinalized && (
              <Button
                variant="outline"
                size="sm"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
                className="h-8 px-3 text-[14px] font-semibold flex items-center gap-1.5"
              >
                <Download className="size-[18px]" />
                {isDownloading ? 'Downloading...' : 'PDF'}
              </Button>
            )}

            {!isFinalized && (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={handleDelete}
                  className="h-7 text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Discard Draft
                </Button>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={handleFinalize}
                  className="h-7 text-xs flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                >
                  <CheckCircle className="size-3.5" />
                  Finalize & Lock
                </Button>
              </>
            )}
          </div>
        </div>

        {message && (
          <div
            className={cn(
              "p-3 text-sm rounded-md flex items-center gap-2 border",
              message.type === 'error'
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            )}
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Statutory Void Notice Banner if cancelled */}
        {isVoided && (
          <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-rose-500/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <ShieldAlert className="size-5 shrink-0" />
                <span>CANCELLED TAX DOCUMENT (CGST Rule 53 / GSTR-1 Table 13)</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-300">
                STATUTORILY VOIDED
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Voided At:</span>
                <span className="font-semibold text-foreground">
                  {creditNote.voided_at ? new Date(creditNote.voided_at).toLocaleString('en-IN') : 'Recorded'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Operator:</span>
                <span className="font-semibold text-foreground">
                  {creditNote.voided_by_name || 'Authorized Operator'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Statutory Reason:</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {VOID_CREDIT_NOTE_REASONS.find(r => r.id === creditNote.void_reason)?.label || creditNote.void_reason || 'Clerical Error'}
                </span>
              </div>
            </div>
            {creditNote.void_notes && (
              <p className="text-xs text-muted-foreground border-t border-rose-500/15 pt-1.5 leading-snug">
                <strong className="text-foreground">Audit Explanation:</strong> {creditNote.void_notes}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground/80 italic">
              Notice: Under CGST Rule 53, this document number remains preserved in your system sequence and is registered as a Cancelled Document in GSTR-1 Table 13. ₹{formatPaiseAsInr(creditNote.grand_total_paise)} has been restored to Invoice {creditNote.originalInvoice.invoice_number}.
            </p>
          </div>
        )}
      </div>

      {/* Main Dashboard Layout: Left Paper Sheet + Right 360px Sidebar */}
      <div id="cn-bg" className="flex flex-col lg:flex-row items-start gap-4">
        {/* Left Side: Credit Note Paper Preview Sheet (Flush Left, Max 860px on Screen) */}
        <div className="flex-1 min-w-0 w-full overflow-x-auto pb-2 flex justify-center">
          <div 
            id="cn-paper" 
            className="w-full mx-auto rounded-xl bg-white shadow-sm border border-border overflow-hidden transition-all print:border-none print:shadow-none print:m-0 print:p-0 print:max-w-none print:w-full relative" 
            style={{ 
              maxWidth: '860px', 
              fontFamily: 'inherit' 
            }}
          >
            {isVoided && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-10">
                <span className="text-8xl sm:text-9xl font-black text-rose-600 -rotate-45 uppercase select-none tracking-widest">
                  VOIDED
                </span>
              </div>
            )}
            <CreditNotePrintView creditNote={creditNote} printSize={printSize} />
          </div>
        </div>

        {/* Right Side: High-Density Sidebar */}
        <div id="cn-sidebar" className="w-full lg:w-[370px] xl:w-[390px] 2xl:w-[410px] shrink-0 space-y-2 print:hidden transition-all duration-200">
          
          {/* CARD 1: Original Invoice Reference */}
          <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="size-[18px] text-primary" />
                <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                  Original Invoice
                </h3>
              </div>
              <span className="font-mono text-[13px] font-bold text-primary">
                {creditNote.originalInvoice.invoice_number}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Recipient:</span>
                <span className="font-semibold text-[13px] text-foreground truncate max-w-[210px]">
                  {creditNote.originalInvoice.billing_name_snapshot || 'Cash Customer'}
                </span>
              </div>
              {creditNote.originalInvoice.billing_gstin_snapshot && (
                <div className="flex justify-between">
                  <span className="font-medium text-muted-foreground">GSTIN:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {creditNote.originalInvoice.billing_gstin_snapshot}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Invoice Date:</span>
                <span className="font-semibold text-foreground">{origInvoiceDate}</span>
              </div>
            </div>

            <Link href={`/invoices/${creditNote.originalInvoice.id}`}>
              <Button size="sm" variant="outline" className="h-8 w-full text-xs font-bold flex items-center justify-center gap-1.5 mt-1 cursor-pointer">
                <ExternalLink className="size-4" />
                View Original Invoice
              </Button>
            </Link>
          </div>

          {/* CARD 2: Financial Impact & Settlement Reversal */}
          <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-1 mb-1 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-[18px] text-emerald-600" />
                <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                  Settlement Effect
                </h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Tax Adjusted
              </span>
            </div>

            {/* 3-Column Settlement Balance Metric Strip */}
            <div className="grid grid-cols-3 gap-1.5 px-2 py-1 rounded-lg border border-border/80 bg-muted/20 text-center">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Original
                </span>
                <span className="font-mono text-[13px] sm:text-[14px] font-bold text-foreground mt-0.5 block">
                  {formatPaiseAsInr(originalBillPaise)}
                </span>
              </div>
              <div className="border-x border-border/80 px-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {totalCreditedForInvoicePaise > creditPaise ? 'This Note' : 'Credited'}
                </span>
                <span className="font-mono text-[13px] sm:text-[14px] font-bold text-red-600 mt-0.5 block">
                  -{formatPaiseAsInr(creditPaise)}
                </span>
                {totalCreditedForInvoicePaise > creditPaise && (
                  <span className="text-[10px] font-mono font-medium text-muted-foreground block">
                    Total: -{formatPaiseAsInr(totalCreditedForInvoicePaise)}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Net Bill
                </span>
                <span className="font-mono text-[13px] sm:text-[14px] font-bold text-emerald-600 mt-0.5 block">
                  {formatPaiseAsInr(netAdjustedBillPaise)}
                </span>
              </div>
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-1 text-xs pt-1 border-t border-border/60">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Taxable Value:</span>
                <span className="font-mono font-semibold text-foreground">{formatPaiseAsInr(creditNote.subtotal_paise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Output Tax Reversed:</span>
                <span className="font-mono font-bold text-red-600">
                  -{formatPaiseAsInr(creditNote.total_tax_paise)}
                </span>
              </div>
            </div>

            {/* Compliance Callout */}
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800">
              <p className="font-bold text-[12px] flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className="size-4 shrink-0" />
                CGST Rule 53 Compliant
              </p>
              <p className="text-muted-foreground text-[11px] leading-snug">
                Reduces taxable turnover and output GST liability for the respective tax period.
              </p>
            </div>
          </div>

          {/* CARD 3: Statutory Details & Reason */}
          <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-sm space-y-2">
            <div className="flex items-center gap-2 pb-1 mb-1 border-b border-border">
              <FileText className="size-[18px] text-primary" />
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">
                Statutory Details
              </h3>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Statutory Reason:</span>
                <span className="font-semibold text-foreground text-right">{reasonLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Place of Supply:</span>
                <span className="font-semibold text-foreground text-right">
                  {posState} ({creditNote.originalInvoice.place_of_supply_state_code || creditNote.business.state_code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted-foreground">Storage Archival:</span>
                <span className="font-semibold text-foreground">
                  {creditNote.pdf_storage_key ? 'Archived in S3' : 'Pending Archival'}
                </span>
              </div>
              {creditNote.notes && (
                <div className="pt-1 border-t border-border/60">
                  <span className="text-muted-foreground block text-[11px] font-semibold mb-0.5">Internal Remarks:</span>
                  <p className="text-foreground text-xs italic bg-muted/30 px-2 py-1 rounded border border-border/50">
                    &ldquo;{creditNote.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <VoidCreditNoteDialog
        isOpen={voidDialogOpen}
        onClose={() => setVoidDialogOpen(false)}
        creditNote={{
          id: creditNote.id,
          credit_note_number: creditNote.credit_note_number || '',
          grand_total_paise: creditNote.grand_total_paise,
          original_invoice_number: creditNote.originalInvoice.invoice_number,
        }}
        onSuccess={() => {
          setVoidDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
