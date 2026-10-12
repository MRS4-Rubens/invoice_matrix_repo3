'use client';

import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, 
  AlertTriangle, 
  X, 
  Loader2, 
  Ban, 
  Receipt,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPaiseAsInr } from '@/lib/money';
import { VOID_CREDIT_NOTE_REASONS } from '@/lib/validations/credit-note';
import { voidCreditNote } from '@/lib/actions/credit-notes/void-credit-note';

export interface VoidableCreditNote {
  id: string;
  credit_note_number: string;
  grand_total_paise: number;
  original_invoice_number: string;
}

interface VoidCreditNoteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: VoidableCreditNote | null;
  onSuccess?: () => void;
}

const emptySubscribe = () => () => {};

function VoidCreditNoteDialogModal({
  onClose,
  creditNote,
  onSuccess,
}: Omit<VoidCreditNoteDialogProps, 'isOpen'> & { creditNote: VoidableCreditNote }) {
  const [reason, setReason] = useState<string>('clerical_error');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Please acknowledge the statutory cancellation checkbox before proceeding.');
      return;
    }

    if (notes.trim().length < 3) {
      setError('Please provide an explanation of at least 3 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await voidCreditNote({
        id: creditNote.id,
        reason,
        notes: notes.trim(),
        confirm: true
      });

      if (!res.success) {
        setError(res.error.message || 'Failed to void credit note.');
        setIsSubmitting(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-cn-dialog-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 id="void-cn-dialog-title" className="text-[15px] font-bold text-foreground tracking-tight">
                Void Credit Note
              </h2>
              <p className="text-xs text-muted-foreground leading-tight">
                CGST Rule 53 &amp; GSTR-1 Table 13 Statutory Cancellation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-2 overflow-y-auto">
          {/* Statutory Compliance Callout */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-snug">
              <span className="font-bold">Permanent Audit Trail Notice:</span>
              <p className="text-muted-foreground">
                Under <strong>CGST Rule 53</strong>, credit note number <span className="font-mono font-bold text-foreground">{creditNote.credit_note_number}</span> will <strong>not</strong> be deleted from records. It will be permanently marked as <strong>CANCELLED</strong> in your GSTR-1 Table 13 register, and the original invoice balance will be automatically restored.
              </p>
            </div>
          </div>

          {/* Credit Note Summary Card */}
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between border-b border-border/60 pb-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="size-4" />
                <span className="text-[13px] font-semibold">Credit Note:</span>
              </div>
              <span className="font-mono font-bold text-[14px] text-red-600">
                {creditNote.credit_note_number}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-border/60 pb-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Receipt className="size-4" />
                <span className="text-[13px] font-semibold">Original Invoice:</span>
              </div>
              <span className="font-mono font-bold text-[13px] text-foreground">
                {creditNote.original_invoice_number}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted-foreground">Amount to Restore:</span>
              <span className="font-mono font-black text-[15px] text-emerald-600">
                +{formatPaiseAsInr(creditNote.grand_total_paise)}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Dropdown */}
          <div className="space-y-1">
            <label htmlFor="void-cn-reason" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Statutory Void Reason <span className="text-destructive">*</span>
            </label>
            <select
              id="void-cn-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all cursor-pointer font-medium"
            >
              {VOID_CREDIT_NOTE_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Justification / Notes */}
          <div className="space-y-1">
            <label htmlFor="void-cn-notes" className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Audit Explanation / Remarks <span className="text-destructive">*</span>
            </label>
            <textarea
              id="void-cn-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Entered wrong return quantity (entered 10 items instead of 2 items). Issuing revised credit note."
              disabled={isSubmitting}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all resize-none font-sans"
            />
            <p className="text-[11px] text-muted-foreground/70">
              Minimum 3 characters. Stamped into immutable statutory audit logs.
            </p>
          </div>

          {/* Mandatory Confirmation Checkbox */}
          <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 rounded border-border text-destructive focus:ring-destructive/20 size-4 cursor-pointer"
            />
            <span className="text-xs text-muted-foreground leading-snug">
              I acknowledge that this credit note will be permanently cancelled, cannot be un-voided, and will restore <strong className="text-foreground font-mono text-[13px] font-bold">{formatPaiseAsInr(creditNote.grand_total_paise)}</strong> to Invoice <strong className="text-foreground font-mono text-[13px] font-bold">{creditNote.original_invoice_number}</strong>.
            </span>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 text-[13px] font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={isSubmitting || !confirmed || notes.trim().length < 3}
              className="h-8 px-3 text-[13px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Voiding Credit Note...</span>
                </>
              ) : (
                <>
                  <Ban className="size-4" />
                  <span>Confirm Void</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function VoidCreditNoteDialog(props: VoidCreditNoteDialogProps) {
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isHydrated || !props.isOpen || !props.creditNote) {
    return null;
  }

  return createPortal(
    <VoidCreditNoteDialogModal
      onClose={props.onClose}
      creditNote={props.creditNote}
      onSuccess={props.onSuccess}
    />,
    document.body
  );
}
