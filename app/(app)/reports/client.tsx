'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { FileSpreadsheet, BarChart3, PieChart, Calendar } from 'lucide-react'
import type { MonthlySalesData } from '@/lib/actions/reports/get-sales-by-period'
import type { getTopCustomers } from '@/lib/actions/reports/get-top-customers'
import type { getTopProducts } from '@/lib/actions/reports/get-top-products'

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
}

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

export function ReportsClient({ salesData, topCustomers, topProducts, currentPeriod, periodLabel, startDate, endDate }: ReportsClientProps) {
  const router = useRouter()
  
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/reports?period=${e.target.value}`)
  }

  // Calculate totals for tax breakdown
  const totalCgst = salesData.reduce((acc, d) => acc + d.total_cgst, 0)
  const totalSgst = salesData.reduce((acc, d) => acc + d.total_sgst, 0)
  const totalIgst = salesData.reduce((acc, d) => acc + d.total_igst, 0)
  const totalTax = salesData.reduce((acc, d) => acc + d.total_tax, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            GST and sales reports for filing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Period:</span>
          <select
            value={currentPeriod}
            onChange={handlePeriodChange}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_fy">This Financial Year</option>
          </select>
        </div>
      </div>

      {/* Report type cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
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
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              {cta === 'Export Excel' ? (
                <a
                  href={`/api/reports/export?startDate=${startDate}&endDate=${endDate}&label=${encodeURIComponent(periodLabel)}`}
                  className="mt-3 inline-block rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {cta}
                </a>
              ) : (
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  {cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Sales Revenue</h2>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="h-[300px] w-full">
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
                />
                <Bar 
                  dataKey="grand_total" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
               No data available for this period.
             </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tax Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Tax Breakdown</h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">CGST</span>
              <span className="font-medium text-foreground">₹{totalCgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">SGST</span>
              <span className="font-medium text-foreground">₹{totalSgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <span className="text-sm text-muted-foreground">IGST</span>
              <span className="font-medium text-foreground">₹{totalIgst.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="font-semibold text-foreground">Total Tax</span>
              <span className="font-bold text-foreground">₹{totalTax.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Customers</h2>
          <div className="overflow-x-auto">
            {topCustomers.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((c) => (
                    <tr key={c.customer_id} className="border-b border-border last:border-0">
                      <td className="py-2 text-foreground">{c.customer_name}</td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {formatPaiseAsInr(c.total_revenue_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No customer data.</p>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Top Products</h2>
          <div className="overflow-x-auto">
            {topProducts.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left font-medium text-muted-foreground">Product</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p, idx) => (
                    <tr key={p.product_id || `ad-hoc-${idx}`} className="border-b border-border last:border-0">
                      <td className="py-2 text-foreground">{p.product_name}</td>
                      <td className="py-2 text-right text-muted-foreground">{p.total_quantity}</td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {formatPaiseAsInr(p.total_revenue_paise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">No product data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
