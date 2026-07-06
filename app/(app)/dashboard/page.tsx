import type { Metadata } from 'next'
import Link from 'next/link'
import {
  TrendingUp,
  IndianRupee,
  AlertCircle,
  Users,
  Plus,
  FilePlus,
  UserPlus,
  PackagePlus,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/app/stat-card'
import { InvoiceStatusBadge, type InvoiceStatus } from '@/components/invoice/invoice-status-badge'

export const metadata: Metadata = { title: 'Dashboard' }

const recentInvoices: {
  no: string
  customer: string
  date: string
  amount: string
  status: InvoiceStatus
}[] = [
  { no: 'INV-25/06/25/005', customer: 'Tech Solutions Pvt Ltd', date: '25 Jun 2025', amount: '₹18,000', status: 'Paid' },
  { no: 'INV-25/06/25/004', customer: 'Mehta Traders', date: '24 Jun 2025', amount: '₹7,500', status: 'Sent' },
  { no: 'INV-25/06/25/003', customer: 'Sunrise Exports', date: '23 Jun 2025', amount: '₹32,400', status: 'Overdue' },
  { no: 'INV-25/06/25/002', customer: 'Patel Fabrics', date: '22 Jun 2025', amount: '₹9,200', status: 'Paid' },
  { no: 'INV-25/06/25/001', customer: 'Rajesh Electronics', date: '21 Jun 2025', amount: '₹15,600', status: 'Draft' },
]

const quickActions = [
  { icon: FilePlus, label: 'New Invoice', href: '/invoices/new' },
  { icon: UserPlus, label: 'Add Customer', href: '/customers/new' },
  { icon: PackagePlus, label: 'Add Product', href: '/products/new' },
  { icon: FileDown, label: 'Export Report', href: '/reports' },
]

const barHeights = ['h-16', 'h-24', 'h-20', 'h-32', 'h-28', 'h-36']
const barMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

const gstItems = [
  { label: 'CGST', amount: '₹14,200', pct: '50%' },
  { label: 'SGST', amount: '₹14,200', pct: '50%' },
  { label: 'IGST', amount: '₹8,400', pct: '30%' },
]

export default function DashboardPage() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good morning, Demo User
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/invoices/new">
              <Plus className="size-4" />
              New Invoice
            </Link>
          }
        />
      </div>

      {/* Row 1 — stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value="₹24,500"
          change={12.5}
          subtext="vs ₹21,780 yesterday"
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Monthly Revenue"
          value="₹3,12,000"
          change={8.2}
          subtext="June 2025"
          icon={<IndianRupee className="size-4" />}
        />
        <StatCard
          label="Outstanding"
          value="₹45,200"
          change={-3.1}
          subtext="4 overdue invoices"
          icon={<AlertCircle className="size-4" />}
        />
        <StatCard
          label="Total Customers"
          value="142"
          change={5}
          subtext="3 added this month"
          icon={<Users className="size-4" />}
        />
      </div>

      {/* Row 2 — charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Revenue bar chart */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <p className="text-sm font-semibold text-foreground">Revenue Overview</p>
          <p className="text-xs text-muted-foreground">Last 6 months</p>
          <div className="relative mt-6 flex items-end gap-3 pl-8" style={{ height: 160 }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 flex h-full flex-col justify-between text-right">
              {['₹3L', '₹2L', '₹1L', '₹0'].map((l) => (
                <span key={l} className="text-[10px] text-muted-foreground">{l}</span>
              ))}
            </div>
            {barHeights.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className={`w-full rounded-t-sm bg-primary ${h}`} />
                <span className="text-[10px] text-muted-foreground">{barMonths[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* GST summary */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground">GST Summary</p>
          <p className="text-xs text-muted-foreground">June 2025</p>
          <div className="mt-6 flex flex-col gap-5">
            {gstItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.amount}</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: item.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — recent invoices + quick actions */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Recent invoices */}
        <div className="overflow-hidden rounded-xl border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Recent Invoices</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Invoice No
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="hidden px-5 py-2.5 text-left text-xs font-medium text-muted-foreground sm:table-cell">
                    Date
                  </th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.no} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs text-foreground">
                      {inv.no}
                    </td>
                    <td className="px-5 py-3 text-foreground">{inv.customer}</td>
                    <td className="hidden px-5 py-3 text-muted-foreground sm:table-cell">
                      {inv.date}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-foreground">
                      {inv.amount}
                    </td>
                    <td className="px-5 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 text-sm font-semibold text-foreground">Quick Actions</p>
          <div className="flex flex-col gap-2">
            {quickActions.map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
