'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { recordPaymentSchema, RecordPaymentInput } from '@/lib/validations/payment';
import { recordPayment } from '@/lib/actions/payments/record-payment';
import { deletePayment } from '@/lib/actions/payments/delete-payment';
import { Button } from '@/components/ui/button';
import { formatPaiseAsInr, paiseToRupees } from '@/lib/money';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PaymentSection({ invoice, payments }: { invoice: any, payments: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingSum = payments.reduce((acc, p) => acc + p.amount_paise, 0);
  const balanceDue = invoice.grand_total_paise - existingSum;
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RecordPaymentInput>({
    resolver: zodResolver(recordPaymentSchema as never),
    defaultValues: {
      invoice_id: invoice.id,
      amount: paiseToRupees(balanceDue),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      reference_number: '',
      notes: ''
    }
  });

  const onSubmit = async (data: RecordPaymentInput) => {
    setIsSubmitting(true);
    setError(null);
    const result = await recordPayment(data);
    if (!result.success) {
      setError(result.error.message || 'Failed to record payment');
    } else {
      reset({ ...data, amount: paiseToRupees(result.data.remaining_balance_paise), reference_number: '', notes: '' });
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this payment record? This will adjust the invoice balance.')) {
      await deletePayment({ id });
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Summary */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Grand Total</span>
              <span className="font-medium text-foreground">{formatPaiseAsInr(invoice.grand_total_paise)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium text-success">{formatPaiseAsInr(existingSum)}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-base font-semibold">
              <span className="text-foreground">Balance Due</span>
              <span className={balanceDue > 0 ? 'text-destructive' : 'text-foreground'}>
                {formatPaiseAsInr(balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        {balanceDue > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Record Payment</h3>
            {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Amount (₹)</label>
                  <input type="number" step="0.01" className={cn("w-full rounded-lg border border-border bg-background px-3 py-2 text-sm", errors.amount && 'border-destructive')} {...register('amount')} />
                  {errors.amount && <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Date</label>
                  <input type="date" className={cn("w-full rounded-lg border border-border bg-background px-3 py-2 text-sm", errors.payment_date && 'border-destructive')} {...register('payment_date')} />
                  {errors.payment_date && <p className="mt-1 text-xs text-destructive">{errors.payment_date.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Method</label>
                  <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" {...register('payment_method')}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">Reference No.</label>
                  <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" {...register('reference_number')} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">Notes (Optional)</label>
                <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" {...register('notes')} />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Record Payment'}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Payment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Reference</th>
                  <th className="pb-2 pr-4">Notes</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2 pl-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id}>
                    <td className="py-3 pr-4">{new Date(p.payment_date).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 pr-4 capitalize">{p.payment_method.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.reference_number || '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">{p.notes || '—'}</td>
                    <td className="py-3 text-right font-medium text-success">{formatPaiseAsInr(p.amount_paise)}</td>
                    <td className="py-3 pl-4 text-center">
                      <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="size-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
