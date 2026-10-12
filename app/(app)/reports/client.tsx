'use client'

import { useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatPaiseAsInr } from '@/lib/money'
import {
  Calendar,
  ChevronDown,
  ShieldCheck,
  FileText,
  Layers,
  Download,
  Users,
  Package,
  Lock,
  Crown,
  ArrowRight,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpgradePromptModal } from '@/components/app/subscription/upgrade-prompt-modal'
import { cn } from '@/lib/utils'
import type { MonthlySalesData } from '@/lib/actions/reports/get-sales-by-period'
import type { getTopCustomers } from '@/lib/actions/reports/get-top-customers'
import type { getTopProducts } from '@/lib/actions/reports/get-top-products'

const emptySubscribe = () => () => {}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function formatYAxisCurrency(val: number) {
  if (val === 0) return '₹0'
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`
  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`
  return `₹${val}`
}

interface ReportsChartTooltipProps {
  active?: boolean
  payload?: Array<{ payload: MonthlySalesData }>
  coordinate?: { x: number; y: number }
  mode: 'turnover_tax' | 'tax_split'
}

function ReportsChartTooltip({
  active,
  payload,
  coordinate,
  mode,
}: ReportsChartTooltipProps) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload

  const x = coordinate?.x ?? 150
  let alignClass = '-translate-x-1/2'
  let caretStyle: React.CSSProperties = { left: '50%' }

  if (x < 115) {
    alignClass = '-translate-x-[15%]'
    caretStyle = { left: '20%' }
  } else if (x > 500) {
    alignClass = '-translate-x-[85%]'
    caretStyle = { left: '80%' }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-white shadow-2xl backdrop-blur-md z-50 pointer-events-none select-none min-w-[220px] animate-in fade-in-0 zoom-in-95 duration-150',
        alignClass,
      )}
    >
      {/* Downward Caret Arrow pointing directly down to the bar */}
      <span
        className="absolute -translate-x-1/2 top-full border-[5px] border-transparent border-t-slate-950/95"
        style={caretStyle}
      />

      {/* Header: Interval Label + Invoice count */}
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[13px] font-bold text-white tracking-tight">
          {item.label}
        </span>
        <span className="text-[11px] font-medium text-slate-400">
          ({item.invoice_count} inv{item.invoice_count === 1 ? '' : 's'})
        </span>
      </div>

      <div className="border-b border-slate-800/80 my-1.5" />

      {mode === 'turnover_tax' ? (
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
              Taxable Turnover:
            </span>
            <span className="font-bold text-white font-mono text-[12px]">
              {formatCurrency(item.subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              Output GST:
            </span>
            <span className="font-bold text-emerald-400 font-mono text-[12px]">
              {formatCurrency(item.total_tax)}
            </span>
          </div>

          <div className="border-t border-slate-800/60 pt-1 mt-1 flex items-center justify-between gap-4 font-semibold">
            <span className="text-slate-200">Total Invoiced:</span>
            <span className="font-bold text-white font-mono text-[12px]">
              {formatCurrency(item.grand_total)}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="size-2 rounded-full bg-sky-400 shrink-0" />
              CGST:
            </span>
            <span className="font-bold text-sky-400 font-mono text-[12px]">
              {formatCurrency(item.total_cgst)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
              SGST:
            </span>
            <span className="font-bold text-emerald-400 font-mono text-[12px]">
              {formatCurrency(item.total_sgst)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="size-2 rounded-full bg-purple-400 shrink-0" />
              IGST:
            </span>
            <span className="font-bold text-purple-400 font-mono text-[12px]">
              {formatCurrency(item.total_igst)}
            </span>
          </div>

          <div className="border-t border-slate-800/60 pt-1 mt-1 flex items-center justify-between gap-4 font-semibold">
            <span className="text-slate-200">Total GST Liability:</span>
            <span className="font-bold text-white font-mono text-[12px]">
              {formatCurrency(item.total_tax)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

type CustomerData = Extract<Awaited<ReturnType<typeof getTopCustomers>>, { success: true }>['data'][number]
type ProductData = Extract<Awaited<ReturnType<typeof getTopProducts>>, { success: true }>['data'][number]

interface ReportsClientProps {
  salesData: MonthlySalesData[]
  topCustomers: CustomerData[]
  topProducts: ProductData[]
  currentPeriod: string
  periodLabel: string
  startDate: string
  endDate: string
  canExport?: boolean
}

const statutoryCards = [
  {
    type: 'gstr1',
    badge: 'GST COMPLIANCE',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    icon: ShieldCheck,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-500/10',
    title: 'GSTR-1 Outward Supplies',
    description: 'Official GSTN Offline Utility format (b2b, b2cl, b2cs, cdnr, hsn, doc) ready for CA portal upload.',
  },
  {
    type: 'sales_register',
    badge: 'CORE ACCOUNTING',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: FileText,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    title: 'Sales Register (Detailed)',
    description: 'Line-by-line breakdown including customer GSTIN, Place of Supply, taxable amounts, and CGST/SGST/IGST.',
  },
  {
    type: 'hsn_summary',
    badge: 'HSN FILING',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Layers,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    title: 'HSN / SAC Wise Summary',
    description: 'Aggregated product quantities, units of measurement, taxable values, and tax rates for statutory filing.',
  },
  {
    type: 'itr_report',
    badge: 'TAX FILING',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    icon: Calendar,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: 'ITR Ready & CA Sales Report',
    description: 'Rate-wise sales register (0%, 5%, 12%, 18%, 28%) with summary box and 44AD turnover statement for your Chartered Accountant.',
  },
]

export function ReportsClient({
  salesData,
  topCustomers,
  topProducts,
  currentPeriod,
  periodLabel,
  startDate,
  endDate,
  canExport = true,
}: ReportsClientProps) {
  const router = useRouter()

  const [selectedPreset, setSelectedPreset] = useState<string>(currentPeriod)
  const [customStart, setCustomStart] = useState<string>(startDate)
  const [customEnd, setCustomEnd] = useState<string>(endDate)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [chartMode, setChartMode] = useState<'turnover_tax' | 'tax_split'>('turnover_tax')

  const totalTurnover = salesData.reduce((acc, curr) => acc + curr.subtotal, 0)
  const totalTax = salesData.reduce((acc, curr) => acc + curr.total_tax, 0)
  const totalCgst = salesData.reduce((acc, curr) => acc + curr.total_cgst, 0)
  const totalSgst = salesData.reduce((acc, curr) => acc + curr.total_sgst, 0)
  const totalIgst = salesData.reduce((acc, curr) => acc + curr.total_igst, 0)
  const totalGrand = salesData.reduce((acc, curr) => acc + curr.grand_total, 0)
  const totalInvoices = salesData.reduce((acc, curr) => acc + curr.invoice_count, 0)

  const maxVal = Math.max(
    ...salesData.map((d) => (chartMode === 'turnover_tax' ? d.grand_total : d.total_tax)),
    0,
  )
  const maxBarSize = salesData.length <= 5 ? 38 : salesData.length <= 12 ? 24 : 16

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setSelectedPreset(val)
    if (val !== 'custom') {
      router.push(`/reports?period=${val}`)
    }
  }

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return
    router.push(`/reports?period=custom&startDate=${customStart}&endDate=${customEnd}`)
  }

  const displayedCustomers = topCustomers.slice(0, 3)
  const displayedProducts = topProducts.slice(0, 3)


  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      {/* 1. Header & Period Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        {/* Left Side: Title, Live Indicator & Window Subtext (Image 1) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Reports &amp; Financial Intelligence
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Ledger Data
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
            <Calendar className="size-3.5 sm:size-4 text-muted-foreground/80 shrink-0" />
            <span>
              Reporting Window:{' '}
              <strong className="text-foreground font-semibold">
                {periodLabel.startsWith('Custom') ? 'Custom' : periodLabel}
              </strong>{' '}
              <span className="text-muted-foreground/80 font-mono text-xs sm:text-sm">
                ({startDate} → {endDate})
              </span>
            </span>
          </div>
        </div>

        {/* Right Side: Period & Custom Date Range Filter Card */}
        <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-2 self-start xl:self-auto">
          <div className="relative w-[196px] shrink-0">
            <select
              value={selectedPreset}
              onChange={handlePresetChange}
              className="w-full appearance-none rounded-lg border border-border/80 bg-background pl-3 pr-8 py-1.5 h-9 text-sm text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs hover:bg-accent/40 transition-colors"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_fy">This Financial Year</option>
              <option value="prev_fy">Previous Financial Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-muted-foreground/80" />
          </div>

          {selectedPreset === 'custom' && (
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-[130px] rounded-lg border border-border/80 bg-background px-2.5 py-1.5 h-9 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-0"
              />
              <span className="text-sm text-muted-foreground font-medium px-0.5">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-[130px] rounded-lg border border-border/80 bg-background px-2.5 py-1.5 h-9 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:p-0"
              />
              <Button
                size="sm"
                onClick={handleApplyCustom}
                className="h-9 px-3.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer shrink-0"
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Official Statutory & Tax Filing Center (Image 3) */}
      <div className="space-y-2.5">
        <div>
          <h2 className="text-xl font-bold text-foreground font-heading tracking-tight uppercase">
            Official Statutory &amp; Tax Filing Center
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5 font-medium">
            Download comprehensive GST and Income Tax export packages verified for your accountant.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statutoryCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="flex flex-col justify-between rounded-xl border border-border bg-card px-3.5 py-3 shadow-xs hover:shadow-sm hover:border-border/80 transition-all duration-200 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${card.badgeClass}`}
                      >
                        {card.badge}
                      </span>
                      {!canExport && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-black tracking-wide text-amber-600 dark:text-amber-400 shadow-2xs">
                          <Crown className="size-3 text-amber-500" />
                          PRO
                        </span>
                      )}
                    </div>
                    <div
                      className={`flex size-7.5 shrink-0 items-center justify-center rounded-lg ${card.iconBg} ${card.iconColor}`}
                    >
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <h3 className="font-bold text-[15px] sm:text-base text-foreground font-heading tracking-tight leading-snug">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs sm:text-[13px] text-muted-foreground leading-normal">
                    {card.description}
                  </p>
                </div>

                <a
                  href={canExport ? `/api/reports/export?type=${card.type}&startDate=${startDate}&endDate=${endDate}&label=${encodeURIComponent(periodLabel)}` : '#'}
                  onClick={(e) => {
                    if (!canExport) {
                      e.preventDefault()
                      setShowUpgradeModal(true)
                    }
                  }}
                  className={cn(
                    "mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg border py-1.5 px-1.5 sm:px-2 h-9 text-[15px] font-bold tracking-tight transition-all shadow-2xs cursor-pointer whitespace-nowrap",
                    canExport
                      ? "border-border/80 bg-background text-foreground hover:bg-accent/60 group-hover:border-indigo-500/30"
                      : "border-[#dfd3be] bg-gradient-to-b from-[#fdfbf7] to-[#f4eedb] text-amber-950 dark:from-amber-950/20 dark:to-amber-950/40 dark:border-amber-800/40 dark:text-amber-300 hover:from-white hover:to-[#eee6d1] hover:border-amber-400/60"
                  )}
                >
                  {canExport ? (
                    <>
                      <Download className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {card.type === 'gstr1'
                          ? 'Download GSTR-1 Package (.xlsx)'
                          : card.type === 'sales_register'
                            ? 'Download Sales Register (.xlsx)'
                            : card.type === 'hsn_summary'
                              ? 'Download HSN Summary (.xlsx)'
                              : card.type === 'itr_report'
                                ? 'Download ITR Report (.xlsx)'
                                : 'Download (.xlsx)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Lock className="size-3.5 text-amber-700/80 dark:text-amber-400 shrink-0" />
                      <span>Unlock Excel Export</span>
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-black text-amber-700 dark:text-amber-300">
                        <Crown className="size-2.5 text-amber-600 dark:text-amber-400" />
                        PRO
                      </span>
                      <ArrowRight className="size-3.5 text-amber-700/80 dark:text-amber-400 shrink-0" />
                    </>
                  )}
                </a>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Turnover & GST Analytics Chart (Left) + Stacked Top Performers (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column: Turnover & GST Analytics Chart */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs flex flex-col justify-between">
          {/* Panel Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
                  Turnover &amp; GST Analytics
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {formatCurrency(totalGrand)}
                </span>
              </div>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {periodLabel} • {salesData.length} interval{salesData.length === 1 ? '' : 's'}
                {totalInvoices > 0 && (
                  <span className="ml-1 text-muted-foreground/80">
                    • {totalInvoices} invoice{totalInvoices === 1 ? '' : 's'}
                  </span>
                )}
              </p>
            </div>

            {/* Pill Tabs Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/30">
              <button
                type="button"
                onClick={() => setChartMode('turnover_tax')}
                className={cn(
                  'text-xs font-bold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer',
                  chartMode === 'turnover_tax'
                    ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
              >
                Turnover &amp; GST
              </button>
              <button
                type="button"
                onClick={() => setChartMode('tax_split')}
                className={cn(
                  'text-xs font-bold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer',
                  chartMode === 'tax_split'
                    ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-xs border border-border/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                )}
              >
                Tax Split
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="w-full h-[235px] mt-1 relative">
            {!isMounted ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                Loading analytics...
              </div>
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={salesData}
                  margin={{ top: 12, right: 10, left: -14, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id="reportsTurnoverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#4338ca" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="reportsGstGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="reportsCgstGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="reportsSgstGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                    </linearGradient>
                    <linearGradient id="reportsIgstGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6d28d9" stopOpacity={0.9} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border) / 0.5)"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 600,
                    }}
                    dy={6}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 10,
                      fill: 'hsl(var(--muted-foreground))',
                      fontWeight: 500,
                    }}
                    tickFormatter={formatYAxisCurrency}
                    allowDecimals={false}
                    domain={[0, maxVal > 0 ? 'auto' : 1000]}
                  />

                  <Tooltip
                    content={<ReportsChartTooltip mode={chartMode} />}
                    cursor={false}
                    position={{ y: -6 }}
                    allowEscapeViewBox={{ x: true, y: true }}
                  />

                  {chartMode === 'turnover_tax' ? (
                    <>
                      <Bar
                        dataKey="subtotal"
                        name="Taxable Turnover"
                        stackId="a"
                        fill="url(#reportsTurnoverGradient)"
                        maxBarSize={maxBarSize}
                        animationDuration={500}
                      />
                      <Bar
                        dataKey="total_tax"
                        name="GST Liability"
                        stackId="a"
                        fill="url(#reportsGstGradient)"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={maxBarSize}
                        animationDuration={500}
                      />
                    </>
                  ) : (
                    <>
                      <Bar
                        dataKey="total_cgst"
                        name="CGST"
                        stackId="b"
                        fill="url(#reportsCgstGradient)"
                        maxBarSize={maxBarSize}
                        animationDuration={500}
                      />
                      <Bar
                        dataKey="total_sgst"
                        name="SGST"
                        stackId="b"
                        fill="url(#reportsSgstGradient)"
                        maxBarSize={maxBarSize}
                        animationDuration={500}
                      />
                      <Bar
                        dataKey="total_igst"
                        name="IGST"
                        stackId="b"
                        fill="url(#reportsIgstGradient)"
                        radius={[5, 5, 0, 0]}
                        maxBarSize={maxBarSize}
                        animationDuration={500}
                      />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-medium">
                No revenue recorded for this period.
              </div>
            )}
          </div>

          {/* Bottom Summary Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground mt-2">
            {chartMode === 'turnover_tax' ? (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="size-2 rounded-full bg-indigo-500 shrink-0" />
                    Taxable Turnover: <strong className="text-foreground font-mono">{formatCurrency(totalTurnover)}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    Output GST: <strong className="text-foreground font-mono">{formatCurrency(totalTax)}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/80 italic font-sans hidden sm:inline">
                  Stacked Bar = Gross Invoiced Total
                </span>
              </>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full bg-sky-500 shrink-0" />
                  CGST: <strong className="text-foreground font-mono">{formatCurrency(totalCgst)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  SGST: <strong className="text-foreground font-mono">{formatCurrency(totalSgst)}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                  IGST: <strong className="text-foreground font-mono">{formatCurrency(totalIgst)}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stacked Top Performers & Top Products */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 sm:gap-3">
          {/* Card 1: Top Revenue Contributors (Customers) */}
          <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
                  Top Revenue Contributors (Customers)
                </h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                {displayedCustomers.length} Active
              </span>
            </div>

            {displayedCustomers.length === 0 ? (
              /* Empty State */
              <div className="py-6 px-4 flex flex-col items-center justify-center text-center">
                <div className="size-10 rounded-full bg-muted/70 flex items-center justify-center mb-2 text-muted-foreground/80">
                  <Users className="size-5" strokeWidth={1.75} />
                </div>
                <h4 className="text-sm font-bold text-foreground">No customer revenue recorded</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px] leading-relaxed">
                  Finalized invoices within this reporting window will rank here by total revenue.
                </p>
              </div>
            ) : (
              /* Active Records */
              <div className="divide-y divide-border/40 max-h-[260px] overflow-y-auto pr-1">
                {displayedCustomers.map((c) => (
                  <div
                    key={c.customer_id || c.customer_name}
                    className="py-1.5 flex items-center justify-between gap-2.5 hover:bg-muted/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-baseline gap-1.5 truncate">
                      <span className="text-[15px] sm:text-base font-bold text-foreground truncate">
                        {c.customer_name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({c.customer_gstin ? (
                          <span>
                            GSTIN: <span className="font-mono font-semibold">{c.customer_gstin}</span>
                          </span>
                        ) : (
                          <span className="italic font-serif text-muted-foreground/80">Retail Customer</span>
                        )})
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-base font-extrabold text-foreground font-heading">
                        {formatPaiseAsInr(c.total_revenue_paise)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Top Products & Services by Volume */}
          <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
                  Top Products &amp; Services by Volume
                </h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                {displayedProducts.length} Active
              </span>
            </div>

            {displayedProducts.length === 0 ? (
              /* Empty State */
              <div className="py-6 px-4 flex flex-col items-center justify-center text-center">
                <div className="size-10 rounded-full bg-muted/70 flex items-center justify-center mb-2 text-muted-foreground/80">
                  <Package className="size-5" strokeWidth={1.75} />
                </div>
                <h4 className="text-sm font-bold text-foreground">No product sales recorded</h4>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px] leading-relaxed">
                  Finalized line items within this reporting window will rank here by unit volume and revenue.
                </p>
              </div>
            ) : (
              /* Active Records */
              <div className="divide-y divide-border/40 max-h-[260px] overflow-y-auto pr-1">
                {displayedProducts.map((p, idx) => {
                  const isService = p.hsn_sac_code?.startsWith('99')
                  const codeLabel = isService ? 'SAC' : 'HSN'

                  return (
                    <div
                      key={p.product_id || `product-${idx}`}
                      className="py-1.5 flex items-center justify-between gap-2.5 hover:bg-muted/10 transition-colors"
                    >
                      <div className="min-w-0 flex-1 flex items-baseline gap-1.5 truncate">
                        <span className="text-[15px] sm:text-base font-bold text-foreground truncate">
                          {p.product_name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 font-mono">
                          ({p.hsn_sac_code ? (
                            <span>{codeLabel}: {p.hsn_sac_code}, </span>
                          ) : (
                            <span className="font-sans italic">{isService ? 'Service, ' : 'Product, '}</span>
                          )}
                          Qty: {Number(p.total_quantity).toLocaleString('en-IN')})
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm sm:text-base font-extrabold text-foreground font-heading">
                          {formatPaiseAsInr(p.total_revenue_paise)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Unlock Statutory Tax Exports"
        featureName="Official GSTR-1 &amp; ITR 44AD Excel Packages"
        description="Upgrade to Essentials Pro (₹399/mo) to download official GSTN offline utility format, detailed line-by-line sales registers, and rate-wise CA audit statements."
        recommendedPlan="essentials"
        ctaText="Upgrade to Essentials Pro (₹399/mo)"
      />
    </div>
  )
}
