'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { MonthlySalesData } from '@/lib/actions/reports/get-sales-by-period'
import type { FinancialYearSalesData } from '@/lib/actions/reports/get-sales-by-financial-year'

interface DashboardChartProps {
  initialSalesData: MonthlySalesData[]
  fySalesData?: FinancialYearSalesData[]
  currentFyLabel: string
}

interface ChartDataItem {
  key: string
  displayLabel: string
  fullPeriod: string
  grand_total: number
  subtotal: number
  total_tax: number
  invoice_count: number
  type: 'month' | 'fy'
  is_current?: boolean
}

interface TooltipPayloadItem {
  payload: ChartDataItem
}

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

function CustomTooltip({
  active,
  payload,
  coordinate,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  coordinate?: { x: number; y: number }
}) {
  if (!active || !payload || !payload.length) return null
  const item = payload[0].payload

  const title =
    item.type === 'month'
      ? item.fullPeriod
      : item.key.startsWith('FY')
        ? item.key
        : `FY ${item.key}`

  // Dynamic horizontal alignment to prevent clipping near left/right chart edges
  const x = coordinate?.x ?? 150
  let alignClass = '-translate-x-1/2'
  let caretStyle: React.CSSProperties = { left: '50%' }

  if (x < 115) {
    alignClass = '-translate-x-[15%]'
    caretStyle = { left: '20%' }
  } else if (x > 700) {
    alignClass = '-translate-x-[85%]'
    caretStyle = { left: '80%' }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 py-2 text-white shadow-2xl backdrop-blur-md z-50 pointer-events-none select-none min-w-[215px] animate-in fade-in-0 zoom-in-95 duration-150',
        alignClass,
      )}
    >
      {/* Downward Caret Arrow pointing directly down to the bar */}
      <span
        className="absolute -translate-x-1/2 top-full border-[5px] border-transparent border-t-slate-950/95"
        style={caretStyle}
      />

      {/* Line 1: White Title + Muted Invoices Parenthesis + optional Current FY Badge */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-baseline flex-wrap gap-1">
          <span className="text-[13px] font-bold text-white tracking-tight">
            {title}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            (Finalized Invoices: {item.invoice_count})
          </span>
        </div>
        {item.type === 'fy' && item.is_current && (
          <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-400 border border-emerald-500/30">
            Current FY
          </span>
        )}
      </div>

      {/* Line Separator */}
      <div className="border-b border-slate-800/80 my-1.5" />

      {/* Line 2: Total Sales */}
      <div className="flex items-center justify-between gap-5 text-[11px]">
        <span className="font-medium text-slate-300">Total Sales:</span>
        <span className="font-bold text-white font-mono text-[12px]">
          {formatCurrency(item.grand_total)}
        </span>
      </div>

      {/* Line 3: GST Collected */}
      <div className="flex items-center justify-between gap-5 text-[11px] mt-0.5">
        <span className="font-medium text-slate-300">GST Collected:</span>
        <span className="font-bold text-emerald-400 font-mono text-[12px]">
          {formatCurrency(item.total_tax)}
        </span>
      </div>
    </div>
  )
}

const emptySubscribe = () => () => {}

export function DashboardChart({
  initialSalesData,
  fySalesData = [],
  currentFyLabel,
}: DashboardChartProps) {
  const [activeTab, setActiveTab] = useState<'6M' | '1Y' | 'All'>('6M')
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )

  // Prepare normalized chart data depending on active tab
  const getChartData = (): ChartDataItem[] => {
    if (activeTab === '6M') {
      return initialSalesData.slice(-6).map((d) => ({
        key: d.key,
        displayLabel: d.label.split(' ')[0].toUpperCase(),
        fullPeriod: d.label,
        grand_total: d.grand_total,
        subtotal: d.subtotal,
        total_tax: d.total_tax,
        invoice_count: d.invoice_count,
        type: 'month',
      }))
    }

    if (activeTab === '1Y') {
      return initialSalesData.slice(-12).map((d) => ({
        key: d.key,
        displayLabel: d.label.split(' ')[0].toUpperCase(),
        fullPeriod: d.label,
        grand_total: d.grand_total,
        subtotal: d.subtotal,
        total_tax: d.total_tax,
        invoice_count: d.invoice_count,
        type: 'month',
      }))
    }

    // 'All' Tab: Financial Year rollup (Year-over-Year)
    if (fySalesData && fySalesData.length > 0) {
      return fySalesData.map((d) => ({
        key: d.key,
        displayLabel: d.label.replace('FY ', 'FY '),
        fullPeriod: `${d.label} (Financial Year)`,
        grand_total: d.grand_total,
        subtotal: d.subtotal,
        total_tax: d.total_tax,
        invoice_count: d.invoice_count,
        type: 'fy',
        is_current: d.is_current,
      }))
    }

    // Fallback if fySalesData is not yet populated
    const match = currentFyLabel.match(/FY\s*(\d{4})/)
    const startYear = match ? parseInt(match[1], 10) : new Date().getFullYear()
    const fyStartKey = `${startYear}-04`
    return initialSalesData
      .filter((d) => d.key >= fyStartKey)
      .map((d) => ({
        key: d.key,
        displayLabel: d.label.split(' ')[0].toUpperCase(),
        fullPeriod: d.label,
        grand_total: d.grand_total,
        subtotal: d.subtotal,
        total_tax: d.total_tax,
        invoice_count: d.invoice_count,
        type: 'month',
      }))
  }

  const chartData = getChartData()
  const totalRevenue = chartData.reduce((acc, curr) => acc + curr.grand_total, 0)
  const totalInvoices = chartData.reduce((acc, curr) => acc + curr.invoice_count, 0)
  const maxTotal = Math.max(...chartData.map((d) => d.grand_total), 0)

  const maxBarSize = activeTab === '6M' ? 40 : activeTab === '1Y' ? 22 : 44

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm relative overflow-visible h-full flex flex-col justify-between">
      {/* Panel Header */}
      <div className="panel-head flex flex-wrap justify-between items-start gap-2 mb-1.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground font-heading tracking-tight">
              Revenue Overview
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
            {activeTab === '6M'
              ? 'Six-month sales performance'
              : activeTab === '1Y'
                ? 'Twelve-month sales performance'
                : 'All-Time Financial Year performance (YoY)'}
            {totalInvoices > 0 && (
              <span className="ml-1 text-muted-foreground/80">
                • {totalInvoices} invoice{totalInvoices === 1 ? '' : 's'}
              </span>
            )}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="pill-tabs flex gap-1 bg-muted/60 p-1 rounded-xl border border-border/30">
          {(['6M', '1Y', 'All'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'text-xs font-bold px-2.5 py-0.5 rounded-lg transition-all cursor-pointer',
                activeTab === tab
                  ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-sm border border-border/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
              )}
            >
              {tab === 'All' ? 'All (YoY)' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-container w-full h-[170px] mt-2 relative">
        {!isMounted ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
            Loading chart analytics...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 10, left: -16, bottom: 2 }}
            >
              <defs>
                <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.88} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border) / 0.5)"
              />

              <XAxis
                dataKey="displayLabel"
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
                domain={[0, maxTotal > 0 ? 'auto' : 1000]}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
                position={{ y: -6 }}
                allowEscapeViewBox={{ x: true, y: true }}
              />

              <Bar
                dataKey="grand_total"
                fill="url(#revenueBarGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={maxBarSize}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
