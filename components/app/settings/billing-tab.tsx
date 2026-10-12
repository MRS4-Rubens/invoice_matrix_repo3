'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { businesses } from '@/lib/db/schema'
import { formatPaiseAsInr } from '@/lib/money'
import { getBusinessSubscriptions } from '@/lib/actions/subscriptions/get-business-subscriptions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Crown,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  Layers,
  FileText,
  Users,
  Package,
  ArrowRight,
  TrendingUp,
  Search,
  Receipt,
  Printer,
  X,
  Zap,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'

export interface SubscriptionHistoryItem {
  id: string
  planName: string
  billingCycle: string
  amountPaise: number
  paymentMethod: string
  paymentReference: string
  screenshotStorageKey: string | null
  status: string
  rejectReason: string | null
  approvedAt: Date | null
  createdAt: Date
  userName: string | null
}

export interface UsageStats {
  invoicesThisMonth: number
  invoicesTotal: number
  teamMembersCount: number
  customersCount: number
  productsCount: number
  currentMonthLabel: string
}

const SHORT_MONTHS: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'Aug',
  september: 'Sept',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
}

function formatShortMonth(label?: string): string {
  if (!label) return ''
  const parts = label.trim().split(/\s+/)
  if (parts.length >= 2) {
    const monthKey = parts[0].toLowerCase()
    const shortM = SHORT_MONTHS[monthKey] || parts[0].slice(0, 3)
    return `${shortM} ${parts[1]}`
  }
  return label
}

interface BillingTabProps {
  business: typeof businesses.$inferSelect | null
  initialSubscriptions?: SubscriptionHistoryItem[]
  usageStats?: UsageStats
}

interface PlanDefinition {
  name: string
  price: string
  monthlyPaise: number
  yearlyPaise: number
  invoiceMonthlyLimit: number | null // null = unlimited
  userLimit: number | null // null = unlimited
  features: string[]
  badge?: string
}

const PLAN_CONFIGS: Record<string, PlanDefinition> = {
  free: {
    name: 'Free Plan',
    price: '₹0 / month',
    monthlyPaise: 0,
    yearlyPaise: 0,
    invoiceMonthlyLimit: 30,
    userLimit: 1,
    features: [
      'Up to 30 invoices / month',
      'Up to 30 customers & products',
      'Template 1 (Classic Slate)',
      'Standard GST compliance',
      '1 Team User account',
    ],
  },
  trial: {
    name: 'Free Trial',
    price: '₹0 for 14 days',
    monthlyPaise: 0,
    yearlyPaise: 0,
    invoiceMonthlyLimit: null,
    userLimit: 3,
    features: [
      'Unlimited invoices during trial',
      'Full GST compliance & e-Waybill preview',
      'All 4 Invoice templates & branding',
      'WhatsApp & Email invoice sharing',
      'Up to 3 Team Members',
    ],
  },
  essentials: {
    name: 'Essentials Pro Plan',
    price: '₹399 / month (or ₹3,499 / year)',
    monthlyPaise: 39900,
    yearlyPaise: 349900,
    invoiceMonthlyLimit: null,
    userLimit: 3,
    features: [
      'Unlimited GST Invoices & Credit Notes',
      'All 4 Traditional & Book Depot Templates',
      'Custom Logo Upload & White-Label Branding',
      '1-Click WhatsApp Direct Share with UPI Link',
      'Official GSTR-1 & ITR 44AD Excel Exports',
      'Custom Invoice Number Formats & Brand Prefixes',
      'Up to 3 Team Members',
    ],
    badge: 'Popular Tier',
  },
  professional: {
    name: 'Enterprise / CA Max',
    price: '₹599 / month (or ₹4,999 / year)',
    monthlyPaise: 59900,
    yearlyPaise: 499900,
    invoiceMonthlyLimit: null,
    userLimit: null,
    features: [
      'Everything in Essentials Pro',
      'Unlimited Invoices & Unlimited Users',
      'Dedicated Read-Only CA Accountant Portal',
      'Multiple Invoice Series & Number Prefixes',
      'Bulk Data & Inventory Import',
      '24/7 Priority SLA & Dedicated Manager',
    ],
    badge: 'Enterprise Grade',
  },
}

export function BillingTab({
  business,
  initialSubscriptions = [],
  usageStats = {
    invoicesThisMonth: 0,
    invoicesTotal: 0,
    teamMembersCount: 1,
    customersCount: 0,
    productsCount: 0,
    currentMonthLabel: 'Current Month',
  },
}: BillingTabProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistoryItem[]>(initialSubscriptions)
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null)
  const [isRefreshing, startTransition] = useTransition()
  
  // Ledger filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [activeTab, setActiveTab] = useState<'current' | 'compare'>('current')
  
  // Active receipt modal
  const [selectedReceipt, setSelectedReceipt] = useState<SubscriptionHistoryItem | null>(null)

  const currentPlanKey = (business?.subscription_plan || 'free').toLowerCase()
  const status = (business?.subscription_status || 'free').toLowerCase()
  const planConfig = PLAN_CONFIGS[currentPlanKey] || PLAN_CONFIGS.essentials

  // Expiration and Days Calculation
  const targetExpiry = business?.subscription_ends_at || business?.trial_ends_at
  const daysRemaining = targetExpiry
    ? Math.ceil((new Date(targetExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const isExpired = daysRemaining !== null && daysRemaining <= 0
  const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7
  const isActive = status === 'active' && !isExpired

  // Subscription Lifecycle progress
  const lifecycleProgress = useMemo(() => {
    const start = business?.subscription_activated_at ? new Date(business.subscription_activated_at).getTime() : null
    const end = targetExpiry ? new Date(targetExpiry).getTime() : null
    const now = Date.now()

    if (!start || !end || end <= start) return null
    const total = end - start
    const elapsed = Math.max(0, Math.min(total, now - start))
    return Math.round((elapsed / total) * 100)
  }, [business?.subscription_activated_at, targetExpiry])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUtr(text)
    setTimeout(() => setCopiedUtr(null), 2000)
  }

  const handleRefreshHistory = () => {
    if (!business?.id) return
    startTransition(async () => {
      const res = await getBusinessSubscriptions({ business_id: business.id })
      if (res.success && res.data) {
        setSubscriptions(res.data)
      }
    })
  }

  // Filtered subscriptions
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const matchesSearch =
        sub.paymentReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.planName.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || sub.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [subscriptions, searchQuery, statusFilter])

  // Pagination for Ledger (3 items per page)
  const [historyPage, setHistoryPage] = useState(1)
  const ITEMS_PER_PAGE = 3

  const totalHistoryPages = Math.max(1, Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE))
  const paginatedSubscriptions = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE
    return filteredSubscriptions.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSubscriptions, historyPage])

  // Print voucher handler
  const handlePrintReceipt = () => {
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* -- 1. Plan Overview Hero Card -------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/20 p-4.5 sm:p-5 shadow-xs">
        <div className="absolute -right-20 -top-20 size-60 rounded-full bg-indigo-500/8 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 size-60 rounded-full bg-purple-500/8 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-4.5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-sm font-bold text-indigo-700 shadow-2xs">
                <Crown className="size-4" />
                Current Tier
              </span>

              {/* Universal Status Badge */}
              {isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 shadow-2xs">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Subscription
                </span>
              ) : status === 'trial' && !isExpired ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800 shadow-2xs">
                  <Clock className="size-4" />
                  Trial Period ({daysRemaining ?? 14} days left)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/80 bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 shadow-2xs">
                  <AlertCircle className="size-4" />
                  {status === 'suspended' ? 'Suspended Account' : 'Plan Expired'}
                </span>
              )}

              {planConfig.badge && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                  <Sparkles className="size-3.5 text-amber-500" />
                  {planConfig.badge}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
                {planConfig.name}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-1 flex items-center gap-2">
                <span>Pricing:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">{planConfig.price}</span>
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full lg:w-auto">
            <Link href="/checkout?action=upgrade">
              <Button className="w-full h-10 gap-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white shadow-md hover:shadow-lg text-sm font-bold cursor-pointer rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0">
                <Sparkles className="size-4" />
                Upgrade / Change Plan
              </Button>
            </Link>

            <Link href="/checkout?action=renew">
              <Button
                variant="outline"
                className="w-full h-10 gap-2 border-emerald-300 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 text-sm font-bold cursor-pointer rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-2xs"
              >
                <RefreshCw className="size-4" />
                Renew Early
              </Button>
            </Link>
          </div>
        </div>

        {/* -- Subscription Validity & Payment Settlement Lockup (Option B Hybrid) -- */}
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 pt-3.5">
          {/* Card 1: Subscription Validity */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold uppercase tracking-wider">
                  <Clock className="size-4 text-indigo-500 shrink-0" />
                  <span>Subscription Validity :</span>
                  {daysRemaining !== null ? (
                    isExpired ? (
                      <span className="font-extrabold text-rose-600 normal-case">Expired</span>
                    ) : (
                      <span
                        className={cn(
                          'font-black font-heading normal-case text-sm',
                          isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'
                        )}
                      >
                        {daysRemaining} {daysRemaining === 1 ? 'Day Remaining' : 'Days Remaining'}
                      </span>
                    )
                  ) : (
                    <span className="font-bold text-slate-800 normal-case">Continuous Active</span>
                  )}
                </div>

                {targetExpiry && (
                  <span className="text-xs font-medium text-slate-500">
                    ({isActive ? 'Renews' : 'Valid until'}{' '}
                    <strong className="text-slate-700">
                      {new Date(targetExpiry).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>)
                  </span>
                )}
              </div>

              {/* Lifecycle Progress Bar (Reference Image 2 Style) */}
              {lifecycleProgress !== null && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                  <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 font-medium">
                    <span>
                      Days Elapsed: <strong className="text-slate-800 font-semibold">{lifecycleProgress}%</strong>
                    </span>
                    <span>
                      {business?.subscription_activated_at ? (
                        <>
                          Activated{' '}
                          <strong className="text-slate-700">
                            {new Date(business.subscription_activated_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </strong>
                        </>
                      ) : (
                        `${daysRemaining ?? 0} days remaining`
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        isExpired
                          ? "bg-rose-500 w-full"
                          : isExpiringSoon
                          ? "bg-amber-500"
                          : "bg-indigo-600"
                      )}
                      style={{ width: `${Math.min(100, Math.max(4, lifecycleProgress))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Payment Settlement */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-4 text-indigo-500 shrink-0" />
                  Payment Settlement
                </span>
                {business?.active_utr_no ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full shadow-2xs">
                    <CheckCircle2 className="size-3 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                    Free Tier
                  </span>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {business?.active_utr_no ? 'Active UTR:' : 'Plan Mode:'}
                </span>

                {business?.active_utr_no ? (
                  <div className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 pl-2.5 pr-1.5 py-0.5 rounded-lg shadow-2xs">
                    <span>{business.active_utr_no}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(business.active_utr_no!)}
                      className="rounded p-1 text-indigo-400 hover:bg-indigo-100/80 hover:text-indigo-800 transition-colors cursor-pointer"
                      title="Copy UTR Reference"
                    >
                      {copiedUtr === business.active_utr_no ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold font-sans">
                          <Check className="size-3 text-emerald-600" /> Copied
                        </span>
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                    Free / Trial Tier
                  </span>
                )}

                <span className="text-[11px] text-slate-400 font-normal">
                  {business?.active_utr_no
                    ? 'Bank cleared & verified transaction reference'
                    : 'No manual bank transfer required for this tier'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* -- 2. Live Resource Consumption & Quotas --------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="size-4 text-indigo-500" />
              Live Resource Consumption & Quotas
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time monitoring of your monthly invoicing throughput, team seat allocation, and catalog volumes.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Database Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Meter 1: Invoices Generated */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs sm:text-[13px] font-semibold text-slate-500 mb-1.5 gap-1.5">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <FileText className="size-4 text-indigo-500 shrink-0" />
                  Monthly Invoices
                </span>
                {/* Refined Image 3 Month Badge (3-4 Letter Short Month Format) */}
                <span className="text-[11px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md shadow-2xs shrink-0 whitespace-nowrap">
                  {formatShortMonth(usageStats.currentMonthLabel)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-heading text-slate-900">
                  {usageStats.invoicesThisMonth}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  {planConfig.invoiceMonthlyLimit ? `/ ${planConfig.invoiceMonthlyLimit}` : 'invoices created'}
                </span>
              </div>

              {/* Progress bar or unlimited badge */}
              {planConfig.invoiceMonthlyLimit ? (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Quota: {Math.round((usageStats.invoicesThisMonth / planConfig.invoiceMonthlyLimit) * 100)}%</span>
                    <span>{Math.max(0, planConfig.invoiceMonthlyLimit - usageStats.invoicesThisMonth)} remaining</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (usageStats.invoicesThisMonth / planConfig.invoiceMonthlyLimit) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>Unlimited Invoicing Quota</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60">
              Total lifetime invoices: <strong className="text-slate-800">{usageStats.invoicesTotal}</strong>
            </p>
          </div>

          {/* Meter 2: Team Members */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-indigo-500" />
                  Team Seats
                </span>
                <span className="text-xs font-bold text-slate-500">
                  {planConfig.userLimit ? `Cap: ${planConfig.userLimit}` : 'Unlimited'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-heading text-slate-900">
                  {usageStats.teamMembersCount}
                </span>
                <span className="text-sm text-slate-500 font-medium">
                  {planConfig.userLimit ? `of ${planConfig.userLimit} seats` : 'active users'}
                </span>
              </div>

              {/* Visual Seat Indicators */}
              <div className="mt-3 flex items-center gap-1">
                {planConfig.userLimit ? (
                  Array.from({ length: planConfig.userLimit }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-2 flex-1 rounded-full transition-all',
                        i < usageStats.teamMembersCount ? 'bg-indigo-600' : 'bg-slate-200'
                      )}
                      title={`Seat ${i + 1}`}
                    />
                  ))
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="size-4 text-emerald-600" /> Unlimited Team Seats
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/settings?tab=Users & Roles"
              className="mt-2 pt-1.5 border-t border-slate-200/60 text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              <span>Manage User Roles</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {/* Meter 3: Client & Catalog Volume */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Package className="size-4 text-indigo-500" />
                  Catalog & CRM
                </span>
                {/* Refined Image 3 Active Badge */}
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                  Active
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1 sm:gap-1.5 whitespace-nowrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-heading text-slate-900">
                    {usageStats.customersCount}
                  </span>
                  <span className="text-xs sm:text-[13px] text-slate-500 font-medium">
                    {currentPlanKey === 'free' ? '/ 30' : ''} Clients
                  </span>
                </div>

                <span className="text-slate-300 font-light px-0.5">•</span>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-heading text-slate-900">
                    {usageStats.productsCount}
                  </span>
                  <span className="text-xs sm:text-[13px] text-slate-500 font-medium">
                    {currentPlanKey === 'free' ? '/ 30' : ''} Items
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-[11.5px] sm:text-xs text-slate-600 whitespace-nowrap">
                <Check className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">
                  {currentPlanKey === 'free' ? 'Up to 30 Customers & Products' : 'Unlimited Customers & Products'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60">
              Instant HSN/SAC search enabled
            </p>
          </div>

          {/* Meter 4: Compliance & Export Automation */}
          <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  Automation Status
                </span>
                {/* Refined Image 3 Ready Badge */}
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                  Ready
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-[13px] gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">WhatsApp / Email:</span>
                  <span className="font-bold text-emerald-700 whitespace-nowrap">Enabled</span>
                </div>
                <div className="flex items-center justify-between text-xs sm:text-[13px] gap-1">
                  <span className="text-slate-500 font-medium whitespace-nowrap">GSTR-1 & ITR Export:</span>
                  <span className="font-bold text-emerald-700 whitespace-nowrap">1-Click Excel</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                <Zap className="size-4 text-amber-500" />
                <span>Automated GST Calculation</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-2 pt-1.5 border-t border-slate-200/60">
              Audit log immutability active
            </p>
          </div>
        </div>
      </div>

      {/* -- 3. Features & Availed Services / Tier Privileges --------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              Availed Services & Tier Privileges
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Service levels, automation privileges, and compliance features unlocked for your business account.
            </p>
          </div>

          <div className="flex rounded-lg bg-slate-100 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-semibold transition-all cursor-pointer',
                activeTab === 'current'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Current Tier
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compare')}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-semibold transition-all cursor-pointer flex items-center gap-1',
                activeTab === 'compare'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Compare All Tiers
              <Sparkles className="size-3.5 text-amber-500" />
            </button>
          </div>
        </div>

        {activeTab === 'current' ? (
          <div className="flex flex-wrap gap-2.5">
            {planConfig.features.map((feature, idx) => (
              <div
                key={idx}
                className="w-fit inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-2xs whitespace-nowrap transition-colors hover:border-indigo-300 hover:bg-white"
              >
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Essentials Tier */}
            <div className={cn(
              'rounded-xl border p-4.5 transition-all',
              currentPlanKey === 'essentials' ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200/80 bg-slate-50/40'
            )}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-base font-extrabold text-slate-900">Essentials Pro Plan</h4>
                {currentPlanKey === 'essentials' ? (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Your Current Plan
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-800">₹399/mo</span>
                )}
              </div>
              <ul className="space-y-2 mt-3 text-sm">
                {PLAN_CONFIGS.essentials.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-600">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Professional Tier */}
            <div className={cn(
              'rounded-xl border p-4.5 transition-all',
              currentPlanKey === 'professional' ? 'border-indigo-200 bg-indigo-50/20' : 'border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30'
            )}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-base font-extrabold text-slate-900">Enterprise / CA Max</h4>
                  <span className="text-xs font-extrabold uppercase bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                    Best for Scale
                  </span>
                </div>
                {currentPlanKey === 'professional' ? (
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    Your Current Plan
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-800">₹599/mo</span>
                )}
              </div>
              <ul className="space-y-2 mt-3 text-sm">
                {PLAN_CONFIGS.professional.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-800 font-medium">
                    <Check className="size-4 text-indigo-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Upgrade Incentive Bar (if not on professional) */}
        {currentPlanKey !== 'professional' && (
          <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 py-2.5 px-3.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-amber-500 shrink-0" />
              <p className="text-sm text-slate-600">
                Need <strong className="text-slate-900">Dedicated CA Portal</strong> and{' '}
                <strong className="text-slate-900">ERP/CRM API Integration</strong>? Upgrade to Professional anytime.
              </p>
            </div>
            <Link href="/checkout?plan=professional">
              <Button size="sm" className="h-8 text-xs font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0 shadow-xs">
                Explore Pro Tier <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* -- 4. Historical Payment Claims Ledger ---------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4.5 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-3.5">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="size-4 text-indigo-500" />
              Payment & Subscription History
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Historical ledger of all manual UPI / NEFT payment claims submitted by your business.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHistoryPage(1)
                }}
                placeholder="Search UTR / Plan..."
                className="h-8 w-44 sm:w-52 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any)
                setHistoryPage(1)
              }}
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-700 outline-none cursor-pointer focus:border-indigo-500 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshHistory}
              disabled={isRefreshing}
              className="h-8 gap-1.5 text-sm font-semibold cursor-pointer border-slate-200"
            >
              <RefreshCw className={cn('size-4', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {filteredSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <CreditCard className="size-9 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">No subscription records found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'No transactions matched your search or status filter. Try clearing filters.'
                : "You haven't submitted any manual payment claims yet. When you upgrade via UPI or bank transfer, your transaction will appear here."}
            </p>
            <Link href="/checkout" className="mt-4">
              <Button size="sm" className="h-8 text-sm font-bold cursor-pointer">
                Upgrade Account Now
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
                    <th className="px-3.5 py-2">Date</th>
                    <th className="px-3.5 py-2">Plan & Cycle</th>
                    <th className="px-3.5 py-2">Amount</th>
                    <th className="px-3.5 py-2">Payment Mode</th>
                    <th className="px-3.5 py-2">UTR / Reference</th>
                    <th className="px-3.5 py-2">Status</th>
                    <th className="px-3.5 py-2 text-right">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSubscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-3.5 py-2 whitespace-nowrap font-medium text-slate-800">
                        {new Date(sub.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap capitalize font-bold text-slate-900">
                        {sub.planName}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          ({sub.billingCycle})
                        </span>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap font-extrabold text-slate-900 font-heading">
                        {formatPaiseAsInr(sub.amountPaise)}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-slate-500 capitalize">
                        {sub.paymentMethod === 'upi_qr'
                          ? 'UPI QR'
                          : sub.paymentMethod === 'upi_id'
                          ? 'UPI ID'
                          : sub.paymentMethod === 'manual_override'
                          ? 'System Override'
                          : 'Bank Transfer'}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-semibold">{sub.paymentReference}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(sub.paymentReference)}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="Copy reference"
                          >
                            {copiedUtr === sub.paymentReference ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        {sub.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
                            <CheckCircle2 className="size-3.5" />
                            Approved
                          </span>
                        ) : sub.status === 'pending' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-800 shadow-2xs">
                            <Clock className="size-3.5 animate-pulse" />
                            Verification Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-xs font-bold text-rose-700 shadow-2xs">
                            <AlertCircle className="size-3.5" />
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedReceipt(sub)}
                          className="h-7 px-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                        >
                          <Receipt className="size-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredSubscriptions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 px-1">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong className="text-slate-700">{(historyPage - 1) * ITEMS_PER_PAGE + 1}</strong> to{' '}
                  <strong className="text-slate-700">
                    {Math.min(historyPage * ITEMS_PER_PAGE, filteredSubscriptions.length)}
                  </strong>{' '}
                  of <strong className="text-slate-700">{filteredSubscriptions.length}</strong> transactions
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-2">
                    Page {historyPage} of {totalHistoryPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="h-7 px-2.5 text-xs font-semibold cursor-pointer border-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5 mr-0.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage >= totalHistoryPages}
                    className="h-7 px-2.5 text-xs font-semibold cursor-pointer border-slate-200 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="size-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- 5. Payment Voucher / Receipt Modal ------------------------------ */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs print:p-0 print:bg-white">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl print:border-none print:shadow-none print:p-0">
            {/* Close Button (Hidden in Print) */}
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer print:hidden"
              title="Close"
            >
              <X className="size-5" />
            </button>

            {/* Receipt Content */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4 text-center">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-extrabold text-lg mb-2 shadow-xs">
                  B
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 font-heading">BILL MATRIX</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Subscription Payment Voucher
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Business:</span>
                  <span className="font-bold text-slate-900">{business?.legal_name || 'Account Holder'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Subscription Plan:</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {selectedReceipt.planName} ({selectedReceipt.billingCycle})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Claimed Date:</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(selectedReceipt.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200">
                  <span className="text-slate-500">Payment Reference (UTR):</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedReceipt.paymentReference}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed border-slate-200 items-center">
                  <span className="text-slate-500">Status:</span>
                  <div className="flex items-center flex-wrap justify-end gap-1.5">
                    {selectedReceipt.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs">
                        <CheckCircle2 className="size-3.5" />
                        Approved
                      </span>
                    ) : selectedReceipt.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-800 shadow-2xs">
                        <Clock className="size-3.5 animate-pulse" />
                        Pending
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-xs font-bold text-rose-700 shadow-2xs">
                          <AlertCircle className="size-3.5" />
                          Rejected
                        </span>
                        <span className="text-xs font-semibold text-rose-600">
                          (Reason: {selectedReceipt.rejectReason || 'Administrative decision'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between py-2 items-baseline">
                  <span className="text-base font-bold text-slate-900">Total Paid:</span>
                  <span className="text-2xl font-black text-slate-900 font-heading">
                    {formatPaiseAsInr(selectedReceipt.amountPaise)}
                  </span>
                </div>
              </div>

              {/* Action Buttons (Hidden in Print) */}
              <div className="flex gap-2 pt-2 print:hidden">
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="flex-1 h-9 gap-1.5 text-sm font-semibold cursor-pointer border-slate-200"
                >
                  <Printer className="size-4" /> Print Voucher
                </Button>
                <Button
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 h-9 text-sm font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
