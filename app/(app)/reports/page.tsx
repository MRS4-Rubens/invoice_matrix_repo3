import type { Metadata } from 'next'
import { ReportsClient } from './client'
import { getCurrentMonthRange, getCurrentFinancialYearRange, getPreviousFinancialYearRange, getMonthRange } from '@/lib/reports/period'
import { getIstDateParts } from '@/lib/invoices/ist-date'
import { getSalesByPeriod } from '@/lib/actions/reports/get-sales-by-period'
import { getTopCustomers } from '@/lib/actions/reports/get-top-customers'
import { getTopProducts } from '@/lib/actions/reports/get-top-products'
import { getCurrentAppUser } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { canExportStatutoryReport } from '@/lib/subscriptions/entitlements'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage(props: { searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams.period || 'this_month'
  
  let startDate = ''
  let endDate = ''
  let periodLabel = ''
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/

  if (period === 'custom' && searchParams.startDate && searchParams.endDate && dateRegex.test(searchParams.startDate) && dateRegex.test(searchParams.endDate)) {
    startDate = searchParams.startDate <= searchParams.endDate ? searchParams.startDate : searchParams.endDate
    endDate = searchParams.startDate <= searchParams.endDate ? searchParams.endDate : searchParams.startDate
    periodLabel = 'Custom'
  } else if (period === 'last_month') {
    const d = new Date()
    // Need to use IST date parts so it's consistent
    const parts = getIstDateParts(d)
    let year = parts.year
    let month = parts.month - 1
    if (month === 0) {
      month = 12
      year -= 1
    }
    const range = getMonthRange(year, month)
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = range.label
  } else if (period === 'this_fy') {
    const range = getCurrentFinancialYearRange()
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = range.label
  } else if (period === 'prev_fy') {
    const range = getPreviousFinancialYearRange()
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = range.label
  } else {

    // Default: this_month
    const range = getCurrentMonthRange()
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = range.label
  }

  const [salesDataRes, topCustomersRes, topProductsRes] = await Promise.all([
    getSalesByPeriod({ startDate, endDate }),
    getTopCustomers({ startDate, endDate, limit: 3 }),
    getTopProducts({ startDate, endDate, limit: 3 })
  ])
  
  if (!salesDataRes.success || !topCustomersRes.success || !topProductsRes.success) {
    return <div className="p-8 text-destructive">Failed to load reports data.</div>
  }

  const salesData = salesDataRes.data
  const topCustomers = topCustomersRes.data
  const topProducts = topProductsRes.data

  const user = await getCurrentAppUser()
  let canExport = false
  if (user?.business_id) {
    const [b] = await db.select().from(businesses).where(eq(businesses.id, user.business_id))
    if (b) {
      canExport = canExportStatutoryReport(b).allowed
    }
  }

  return (
    <ReportsClient 
      salesData={salesData} 
      topCustomers={topCustomers} 
      topProducts={topProducts} 
      currentPeriod={period}
      periodLabel={periodLabel}
      startDate={startDate}
      endDate={endDate}
      canExport={canExport}
    />
  )
}
