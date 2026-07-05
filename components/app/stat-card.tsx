import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  change: number
  subtext: string
  icon: ReactNode
}

export function StatCard({ label, value, change, subtext, icon }: StatCardProps) {
  const isPositive = change >= 0

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>

      <div className="mt-1 flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="size-3.5 text-success" />
        ) : (
          <TrendingDown className="size-3.5 text-destructive" />
        )}
        <span
          className={cn(
            'text-xs font-medium',
            isPositive ? 'text-success' : 'text-destructive',
          )}
        >
          {isPositive ? '+' : ''}
          {change}%
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
