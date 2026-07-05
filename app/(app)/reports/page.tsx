import type { Metadata } from 'next'
import {
  FileSpreadsheet,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react'

export const metadata: Metadata = { title: 'Reports' }

const reportCards = [
  {
    icon: FileSpreadsheet,
    title: 'GSTR-1 Summary',
    description: 'Outward supplies report for monthly GST filing',
    cta: 'Export Excel',
  },
  {
    icon: BarChart3,
    title: 'Sales Report',
    description: 'Invoice-wise sales summary with GST breakup',
    cta: 'Export Excel',
  },
  {
    icon: PieChart,
    title: 'GST Analysis',
    description: 'CGST, SGST, IGST collected by tax rate',
    cta: 'View Report',
  },
  {
    icon: Calendar,
    title: 'ITR Export',
    description: 'Annual income tax ready report for your CA',
    cta: 'Export Excel',
  },
]

export default function ReportsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GST and sales reports for filing
        </p>
      </div>

      {/* Report type cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reportCards.map(({ icon: Icon, title, description, cta }) => (
          <div
            key={title}
            className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
              <Icon className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              <button
                type="button"
                className="mt-3 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Date range filter */}
      <div className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">From</label>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">To</label>
          <input
            type="date"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Generate
        </button>
      </div>

      {/* Placeholder chart area */}
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-16 text-center">
        <BarChart3 className="size-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Select a date range and generate report to see data here.
        </p>
      </div>
    </div>
  )
}
