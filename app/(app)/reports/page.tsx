import type { Metadata } from 'next'
import { ReportsClient } from './client'
import { getCurrentMonthRange, getCurrentFinancialYearRange } from '@/lib/reports/period'
import { getIstDateParts } from '@/lib/invoices/ist-date'
import { getSalesByPeriod } from '@/lib/actions/reports/get-sales-by-period'
import { getTopCustomers } from '@/lib/actions/reports/get-top-customers'
import { getTopProducts } from '@/lib/actions/reports/get-top-products'
import { getMonthRange } from '@/lib/reports/period'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage(props: { searchParams: Promise<{ period?: string }> }) {
  const searchParams = await props.searchParams
  const period = searchParams.period || 'this_month'
  
  let startDate = ''
  let endDate = ''
  let periodLabel = ''
  
  if (period === 'last_month') {
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
  } else {
    // Default: this_month
    const range = getCurrentMonthRange()
    startDate = range.startDate
    endDate = range.endDate
    periodLabel = range.label
  }

  const [salesDataRes, topCustomersRes, topProductsRes] = await Promise.all([
    getSalesByPeriod({ startDate, endDate }),
    getTopCustomers({ startDate, endDate, limit: 10 }),
    getTopProducts({ startDate, endDate, limit: 10 })
  ])
  
  if (!salesDataRes.success || !topCustomersRes.success || !topProductsRes.success) {
    return <div className="p-8 text-destructive">Failed to load reports data.</div>
  }

  const salesData = salesDataRes.data
  const topCustomers = topCustomersRes.data
  const topProducts = topProductsRes.data

  return (
    <ReportsClient 
      salesData={salesData} 
      topCustomers={topCustomers} 
      topProducts={topProducts} 
      currentPeriod={period}
      periodLabel={periodLabel}
      startDate={startDate}
      endDate={endDate}
    />
  )
}
