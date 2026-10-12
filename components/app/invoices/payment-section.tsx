'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordPaymentSchema, RecordPaymentInput, VOID_PAYMENT_REASONS } from '@/lib/validations/payment';
import { recordPayment } from '@/lib/actions/payments/record-payment';
import { VoidPaymentDialog, VoidablePayment } from './void-payment-dialog';
import { Button } from '@/components/ui/button';
import { formatPaiseAsInr, paiseToRupees } from '@/lib/money';
import {
  Ban,
  Wallet2,
  History,
  CreditCard,
  Building2,
  QrCode,
  Banknote,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ChevronDown,
  Check,
  ShieldAlert,
  Hash,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip';

export interface PaymentItem {
  id: string;
  amount_paise: number;
  payment_date: string | Date;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  status?: string | null;
  void_reason?: string | null;
  void_notes?: string | null;
  voided_at?: string | Date | null;
  voided_by_name?: string | null;
  [key: string]: unknown;
}

interface PaymentSectionProps {
  invoice: {
    id: string;
    grand_total_paise: number;
    invoice_number?: string | null;
    [key: string]: unknown;
  };
  payments: PaymentItem[];
  totalCreditedPaise?: number;
}

const PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { id: 'upi', label: 'UPI / QR', icon: QrCode },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: FileCheck },
] as const;

export function PaymentSection({ invoice, payments, totalCreditedPaise = 0 }: PaymentSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentToVoid, setPaymentToVoid] = useState<VoidablePayment | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter active vs voided payments for financial ledger correctness
  const activePayments = payments.filter((p) => (p.status || 'active') === 'active');
  const voidedPayments = payments.filter((p) => p.status === 'voided');

  const creditedPaise = Number(totalCreditedPaise || 0);
  const netBillPaise = Math.max(0, Number(invoice.grand_total_paise || 0) - creditedPaise);
  const existingSum = activePayments.reduce((acc, p) => acc + Number(p.amount_paise || 0), 0);
  const balanceDue = netBillPaise - existingSum;
  const balanceDueRupees = paiseToRupees(balanceDue > 0 ? balanceDue : 0);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema as never),
    defaultValues: {
      invoice_id: invoice.id,
      amount: balanceDue > 0 ? balanceDueRupees : 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: ''
    }
  });

  const selectedMethod = watch('payment_method');
  const currentMethod = PAYMENT_METHODS.find((m) => m.id === selectedMethod) || PAYMENT_METHODS[0];
  const CurrentIcon = currentMethod.icon;

  // Handle click outside and Escape key to close the custom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const onSubmit = async (data: RecordPaymentInput) => {
    setIsSubmitting(true);
    setError(null);
    const result = await recordPayment(data);
    if (!result.success) {
      setError(result.error.message || 'Failed to record payment');
    } else {
      const remainingPaise = result.data.remaining_balance_paise;
      reset({
        invoice_id: invoice.id,
        amount: remainingPaise > 0 ? paiseToRupees(remainingPaise) : 0,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: data.payment_method,
        reference_number: '',
        notes: ''
      });
    }
    setIsSubmitting(false);
  };

  const handleOpenVoidDialog = (payment: PaymentItem) => {
    setPaymentToVoid({
      id: payment.id,
      amount_paise: payment.amount_paise,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
    });
    setVoidDialogOpen(true);
  };

  const handleSetAmount = (amount: number) => {
    setValue('amount', amount, { shouldValidate: true, shouldDirty: true });
  };

  const inputCls = "w-full h-8 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:border-muted-foreground/30 shadow-xs";

  const halfBalanceRupees = Number((balanceDueRupees / 2).toFixed(2));

  return (
    <div className="space-y-2">
      {/* If Invoice is Fully Settled */}
      {balanceDue <= 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-emerald-500/10 px-3 py-2 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <ShieldCheck className="size-[26px]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-foreground">Invoice Settled in Full</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> Reconciled
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Total {formatPaiseAsInr(existingSum)} collected across {activePayments.length} transaction{activePayments.length === 1 ? '' : 's'}. Zero balance remaining.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Record Payment Form Card */
        <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xs">
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border">
            <div className="flex items-center gap-2">
              <CreditCard className="size-[18px] text-primary" />
              <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Record Payment</h3>
            </div>
            <div className="flex items-center gap-1.5 text-right">
              <span className="text-[13px] font-semibold text-muted-foreground">
                Balance: <span className="font-bold text-destructive">{formatPaiseAsInr(balanceDue)}</span>
              </span>
              {creditedPaise > 0 && (
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/60 hidden sm:inline-block">
                  (-{formatPaiseAsInr(creditedPaise)} CN)
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-2.5 flex items-center gap-2 text-[13px] text-destructive font-semibold bg-destructive/10 p-2 rounded-lg border border-destructive/20">
              <AlertCircle className="size-[18px] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
            {/* Row 1: Amount (with Quick Presets) & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <div className="flex items-center justify-between mb-1 h-5 gap-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Amount (₹)</label>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetAmount(balanceDueRupees)}
                      className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/15 active:scale-95 cursor-pointer whitespace-nowrap"
                      title={`Pay Full: ₹${balanceDueRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                    >
                      <Sparkles className="size-3" />
                      Pay Full
                    </button>
                    {balanceDueRupees > 500 && (
                      <button
                        type="button"
                        onClick={() => handleSetAmount(halfBalanceRupees)}
                        className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-all hover:bg-muted active:scale-95 cursor-pointer whitespace-nowrap"
                        title={`Half (50%): ₹${halfBalanceRupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}
                      >
                        50%
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={cn(inputCls, "pl-7 font-bold text-[13px] sm:text-[15px]", errors.amount && 'border-destructive focus:ring-destructive/30')}
                    {...register('amount')}
                  />
                </div>
                {errors.amount && <p className="mt-1 text-[11px] text-destructive font-semibold">{errors.amount.message}</p>}
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center mb-1 h-5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Date</label>
                </div>
                <input
                  type="date"
                  className={cn(inputCls, errors.payment_date && 'border-destructive focus:ring-destructive/30')}
                  {...register('payment_date')}
                />
                {errors.payment_date && <p className="mt-1 text-[11px] text-destructive font-semibold">{errors.payment_date.message}</p>}
              </div>
            </div>

            {/* Row 2: Payment Mode Dropdown & Reference / TXN # (Equal 50/50 Split) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center mb-1 h-5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Mode</label>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={cn(
                      inputCls,
                      "flex items-center justify-between cursor-pointer text-left transition-all",
                      isDropdownOpen && "ring-2 ring-primary/20 border-primary"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <CurrentIcon className="size-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground text-[13px]">{currentMethod.label}</span>
                    </span>
                    <ChevronDown className={cn("size-4 text-muted-foreground transition-transform shrink-0", isDropdownOpen && "rotate-180")} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border border-border bg-card p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                      {PAYMENT_METHODS.map((method) => {
                        const MethodIcon = method.icon;
                        const isSelected = method.id === selectedMethod;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => {
                              setValue('payment_method', method.id);
                              setIsDropdownOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer text-foreground hover:bg-muted",
                              isSelected && "bg-primary/10 text-primary font-bold hover:bg-primary/15"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <MethodIcon className={cn("size-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                              <span>{method.label}</span>
                            </span>
                            {isSelected && <Check className="size-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center mb-1 h-5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Reference / TXN #</label>
                </div>
                <input
                  type="text"
                  placeholder="UTR, Cheque #, etc."
                  className={inputCls}
                  {...register('reference_number')}
                />
              </div>
            </div>

            {/* Row 3: Notes & Submit Button */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-7">
                <div className="flex items-center mb-1 h-5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Notes (Optional)</label>
                </div>
                <input
                  type="text"
                  placeholder="Remarks or payer name"
                  className={inputCls}
                  {...register('notes')}
                />
              </div>

              <div className="sm:col-span-5">
                <div className="flex items-center mb-1 h-5">
                  <span className="sr-only">Submit Payment</span>
                </div>
                <Button
                  type="submit"
                  className="w-full h-8 px-3 py-1 font-bold shadow-xs cursor-pointer text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Payment & Audit Ledger */}
      <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="size-[18px] text-primary" />
            <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wider">Payment & Audit Ledger</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {activePayments.length} Active
            </span>
            {voidedPayments.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {voidedPayments.length} Voided
              </span>
            )}
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-3">
            <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-1.5">
              <Wallet2 className="size-[18px]" />
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">No payments recorded yet</p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">Use the form above to record incoming settlements.</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                    <th className="pb-1 pr-1 w-[62px] whitespace-nowrap">Date</th>
                    <th className="pb-1 pr-1 w-[165px] whitespace-nowrap">Ref No. / Remarks</th>
                    <th className="pb-1 text-right w-[100px] whitespace-nowrap">Amount</th>
                    <th className="pb-1 pl-1 text-center w-7"></th>
                  </tr>
                </thead>
                <tbody className="divide-y border-border">
                  {payments.map((p) => {
                    const isVoided = p.status === 'voided';
                    const dateObj = new Date(p.payment_date);
                    const formattedDate = !isNaN(dateObj.getTime())
                      ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getFullYear()).slice(-2)}`
                      : String(p.payment_date);

                    const reasonLabel = p.void_reason
                      ? VOID_PAYMENT_REASONS.find((r) => r.code === p.void_reason)?.label || p.void_reason
                      : null;

                    const methodObj = PAYMENT_METHODS.find((m) => m.id === p.payment_method) || PAYMENT_METHODS[0];
                    const MethodIcon = methodObj.icon;

                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          "group transition-colors h-8",
                          isVoided
                            ? "bg-muted/30 opacity-75 hover:opacity-90"
                            : "hover:bg-muted/10"
                        )}
                      >
                        {/* 1. Date (DD/MM/YY) */}
                        <td className="py-1 pr-1 whitespace-nowrap text-xs font-medium w-[62px]">
                          <span className={cn(isVoided ? "line-through text-muted-foreground/70" : "text-muted-foreground")}>
                            {formattedDate}
                          </span>
                        </td>

                        {/* 2. Ref No. / Remarks Pill with Status Accent & Exact 3-Line Tooltip */}
                        <td className="py-1 pr-1 whitespace-nowrap w-[165px]">
                          <Tooltip
                            content={
                              isVoided ? (
                                /* Voided Payment: Exact 3-Line Tooltip */
                                <div className="space-y-1.5 text-left py-0.5 max-w-[385px]">
                                  {/* Line 1: Ref Header */}
                                  <div className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-slate-700/80 pb-1 text-xs">
                                    <Hash className="size-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{p.reference_number ? `Ref: ${p.reference_number}` : 'No Ref Number'}</span>
                                  </div>
                                  {/* Line 2: Mode | Status */}
                                  <div className="flex items-center gap-2 text-[11px] whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 font-normal">Payment Mode:</span>
                                      <MethodIcon className="size-3.5 text-slate-300 shrink-0" />
                                      <span className="text-slate-200 font-semibold">{methodObj.label}</span>
                                    </div>
                                    <span className="text-slate-600">|</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 font-normal">Status:</span>
                                      <Ban className="size-3.5 text-rose-400 shrink-0" />
                                      <span className="text-rose-400 font-bold uppercase">VOIDED</span>
                                    </div>
                                  </div>
                                  {/* Line 3: Remarks with Yellow Shield Icon & Parenthesis */}
                                  <div className="text-[11px] text-slate-300 leading-snug flex items-center gap-1 whitespace-nowrap">
                                    <span className="text-slate-400 font-normal">Remarks:</span>
                                    <span>Please hover on</span>
                                    <ShieldAlert className="size-3.5 text-amber-400 inline shrink-0" />
                                    <span className="text-amber-300/90 font-medium">(Permanent Audit Log)</span>
                                    <span>to know more</span>
                                  </div>
                                </div>
                              ) : (
                                /* Active Payment: Exact 3-Line Tooltip */
                                <div className="space-y-1.5 text-left py-0.5 max-w-[340px]">
                                  {/* Line 1: Ref Header */}
                                  <div className="font-semibold text-slate-100 flex items-center gap-1.5 border-b border-slate-700/80 pb-1 text-xs">
                                    <Hash className="size-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{p.reference_number ? `Ref: ${p.reference_number}` : 'No Ref Number'}</span>
                                  </div>
                                  {/* Line 2: Mode | Status */}
                                  <div className="flex items-center gap-2 text-[11px] whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 font-normal">Payment Mode:</span>
                                      <MethodIcon className="size-3.5 text-slate-300 shrink-0" />
                                      <span className="text-slate-200 font-semibold">{methodObj.label}</span>
                                    </div>
                                    <span className="text-slate-600">|</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400 font-normal">Status:</span>
                                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                                      <span className="text-emerald-400 font-bold">PAID</span>
                                    </div>
                                  </div>
                                  {/* Line 3: Remarks */}
                                  <div className="text-[11px] text-slate-300 leading-snug truncate">
                                    <span className="text-slate-400 font-normal">Remarks:</span> {p.notes || 'Settlement recorded'}
                                  </div>
                                </div>
                              )
                            }
                            side="top"
                            sideOffset={6}
                          >
                            <span
                              className={cn(
                                "w-[155px] inline-flex items-center justify-between gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium cursor-pointer transition-colors shadow-2xs",
                                isVoided
                                  ? "bg-rose-50/90 text-rose-800 border border-rose-200/90 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 line-through"
                                  : "bg-emerald-50/90 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                              )}
                            >
                              <span className="truncate">
                                {p.reference_number || (isVoided ? (reasonLabel || 'Voided') : (p.notes ? 'Remarks' : 'Payment Settled'))}
                              </span>
                              <Info className="size-3 shrink-0 opacity-70" />
                            </span>
                          </Tooltip>
                        </td>

                        {/* 3. Amount */}
                        <td className="py-1 text-right text-[13px] whitespace-nowrap w-[100px]">
                          {isVoided ? (
                            <span className="line-through text-muted-foreground font-semibold">
                              {formatPaiseAsInr(p.amount_paise)}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600">
                              {formatPaiseAsInr(p.amount_paise)}
                            </span>
                          )}
                        </td>

                        {/* 4. Action / Permanent Audit Log Tooltip */}
                        <td className="py-1 pl-1 text-center whitespace-nowrap w-7">
                          {isVoided ? (
                            <Tooltip
                              content={
                                <div className="space-y-1 text-left py-0.5 max-w-[270px]">
                                  <div className="font-bold text-amber-300 flex items-center gap-1.5 border-b border-slate-700/80 pb-1 text-xs">
                                    <ShieldAlert className="size-4 text-amber-400 shrink-0" />
                                    <span>Permanent Audit Log</span>
                                  </div>
                                  <div className="text-[11px] text-slate-300 space-y-0.5">
                                    <p><span className="text-slate-400">Status:</span> <span className="text-rose-400 font-bold uppercase">Voided</span></p>
                                    <p><span className="text-slate-400">Voided:</span> {p.voided_at ? new Date(p.voided_at).toLocaleString('en-IN') : 'Recorded'}</p>
                                    <p><span className="text-slate-400">Operator:</span> {p.voided_by_name || 'Authorized Operator'}</p>
                                    {reasonLabel && (
                                      <p>
                                        <span className="text-slate-400">Reason:</span>{' '}
                                        <span className="text-rose-300 font-medium">{reasonLabel}</span>
                                      </p>
                                    )}
                                    {p.void_notes && <p className="leading-snug"><span className="text-slate-400">Notes:</span> {p.void_notes}</p>}
                                  </div>
                                </div>
                              }
                              side="left"
                              sideOffset={8}
                            >
                              <div className="inline-flex items-center justify-center p-1 text-amber-600 hover:text-amber-700 cursor-pointer">
                                <ShieldAlert className="size-4" />
                              </div>
                            </Tooltip>
                          ) : (
                            <Tooltip content="Void this payment (Audit Trail)" side="left" sideOffset={6}>
                              <button
                                type="button"
                                onClick={() => handleOpenVoidDialog(p)}
                                className="p-1 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                                aria-label="Void payment"
                              >
                                <Ban className="size-4" />
                              </button>
                            </Tooltip>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Audited Void Payment Dialog */}
      <VoidPaymentDialog
        isOpen={voidDialogOpen}
        onClose={() => setVoidDialogOpen(false)}
        payment={paymentToVoid}
        invoiceNumber={invoice.invoice_number || 'Invoice'}
      />
    </div>
  );
}
