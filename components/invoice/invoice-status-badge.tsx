import { cn } from '@/lib/utils'

export type InvoiceStatus = 'Paid' | 'Sent' | 'Overdue' | 'Draft' | 'Partial'

const statusStyles: Record<InvoiceStatus, string> = {
  Paid: 'bg-success-subtle text-success',
  Sent: 'bg-blue-100 text-blue-700',
  Overdue: 'bg-red-100 text-red-700',
  Draft: 'bg-muted text-muted-foreground',
  Partial: 'bg-amber-100 text-amber-700',
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        statusStyles[status],
        className,
      )}
    >
      {status}
    </span>
  )
}
