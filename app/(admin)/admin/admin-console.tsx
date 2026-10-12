'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatPaiseAsInr } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { processSubscriptionClaim } from '@/lib/actions/subscriptions/process-request';
import { updateBusinessSubscription } from '@/lib/actions/subscriptions/update-business-subscription';
import { getBusinessSubscriptions } from '@/lib/actions/subscriptions/get-business-subscriptions';
import {
  TrendingUp,
  Building2,
  Users as UsersIcon,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  ExternalLink,
  Check,
  X,
  Loader2,
  Calendar,
  History,
  Settings,
  Copy,
  Download,
  RefreshCw,
  CreditCard,
  QrCode,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Info,
  Filter,
  ArrowUpDown,
  Maximize2,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ROWS_PER_PAGE = 7;

function getVisiblePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
}
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';

interface AdminConsoleProps {
  stats: {
    totalBusinesses: number;
    activeSubscriptions: number;
    totalRevenuePaise: number;
    pendingRequestsCount: number;
    platformInvoiceCount?: number;
    planDistribution?: Record<string, number>;
    monthlyRevenue?: Array<{ month: string; revenuePaise: number; claimCount: number }>;
  };
  pendingRequests: Array<{
    id: string;
    businessId: string;
    businessName: string;
    businessGstin: string | null;
    businessEmail: string | null;
    userId: string;
    userName: string | null;
    planName: string;
    billingCycle: string;
    amountPaise: number;
    paymentMethod: string;
    paymentReference: string;
    screenshotStorageKey: string | null;
    screenshotUrl: string | null;
    createdAt: string;
  }>;
  businesses: Array<{
    id: string;
    legalName: string;
    tradeName: string | null;
    gstin: string;
    email: string | null;
    phone: string | null;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionEndsAt: string | null;
    activeUtrNo: string | null;
    createdAt: string;
    invoiceCount: number;
    userCount: number;
  }>;
  users: Array<{
    id: string;
    displayName: string | null;
    role: string;
    createdAt: string;
    businessId: string | null;
    businessName: string | null;
  }>;
  upiConfig: {
    upiId: string;
    upiName: string;
    bankName: string;
    accName: string;
    accNo: string;
    ifsc: string;
  };
  adminEmailAllowlist?: string;
}

export function AdminConsole({
  stats,
  pendingRequests,
  businesses,
  users,
  upiConfig,
  adminEmailAllowlist = '',
}: AdminConsoleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'businesses' | 'users' | 'settings'>('overview');
  const [isMounted, setIsMounted] = useState(false);

  // Clipboard copy state for quick visual feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Business Directory filters & sorting
  const [bizSearch, setBizSearch] = useState('');
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'active' | 'trial' | 'expired' | 'suspended'>('all');
  const [bizSortField, setBizSortField] = useState<'name' | 'invoices' | 'date' | 'expiry'>('date');
  const [bizSortOrder, setBizSortOrder] = useState<'asc' | 'desc'>('desc');

  // User list filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'owner' | 'staff'>('all');

  // Pagination state (7 rows per page)
  const [bizPage, setBizPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  // Claim rejection modal
  const [rejectingClaim, setRejectingClaim] = useState<typeof pendingRequests[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Business subscription manage modal
  const [selectedBiz, setSelectedBiz] = useState<typeof businesses[0] | null>(null);
  const [bizHistory, setBizHistory] = useState<any[]>([]);
  const [bizHistoryPage, setBizHistoryPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [overridePlan, setOverridePlan] = useState('essentials');
  const [overrideStatus, setOverrideStatus] = useState<'trial' | 'active' | 'expired' | 'suspended'>('active');
  const [overrideEndsAt, setOverrideEndsAt] = useState('');

  // Screenshot Lightbox Modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; utr: string } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Filtered and sorted businesses
  const filteredBusinesses = useMemo(() => {
    let result = businesses.filter((b) => {
      const matchSearch =
        b.legalName.toLowerCase().includes(bizSearch.toLowerCase()) ||
        (b.tradeName && b.tradeName.toLowerCase().includes(bizSearch.toLowerCase())) ||
        b.gstin.toLowerCase().includes(bizSearch.toLowerCase()) ||
        (b.email && b.email.toLowerCase().includes(bizSearch.toLowerCase()));

      const matchStatus = bizStatusFilter === 'all' ? true : b.subscriptionStatus === bizStatusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      if (bizSortField === 'name') {
        return bizSortOrder === 'asc'
          ? a.legalName.localeCompare(b.legalName)
          : b.legalName.localeCompare(a.legalName);
      }
      if (bizSortField === 'invoices') {
        return bizSortOrder === 'asc' ? a.invoiceCount - b.invoiceCount : b.invoiceCount - a.invoiceCount;
      }
      if (bizSortField === 'expiry') {
        const dateA = a.subscriptionEndsAt ? new Date(a.subscriptionEndsAt).getTime() : 0;
        const dateB = b.subscriptionEndsAt ? new Date(b.subscriptionEndsAt).getTime() : 0;
        return bizSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      // default 'date'
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return bizSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return result;
  }, [businesses, bizSearch, bizStatusFilter, bizSortField, bizSortOrder]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.displayName && u.displayName.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.businessName && u.businessName.toLowerCase().includes(userSearch.toLowerCase()));
      const matchRole = userRoleFilter === 'all' ? true : u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearch, userRoleFilter]);

  // Reset pagination to first page whenever search, filters, or sorting change
  useEffect(() => {
    setBizPage(1);
  }, [bizSearch, bizStatusFilter, bizSortField, bizSortOrder]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter]);

  // Businesses pagination calculations
  const totalBizPages = Math.max(1, Math.ceil(filteredBusinesses.length / ROWS_PER_PAGE));
  const safeBizPage = Math.min(Math.max(1, bizPage), totalBizPages);
  const paginatedBusinesses = useMemo(() => {
    const start = (safeBizPage - 1) * ROWS_PER_PAGE;
    return filteredBusinesses.slice(start, start + ROWS_PER_PAGE);
  }, [filteredBusinesses, safeBizPage]);

  // Platform Users pagination calculations
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / ROWS_PER_PAGE));
  const safeUserPage = Math.min(Math.max(1, userPage), totalUserPages);
  const paginatedUsers = useMemo(() => {
    const start = (safeUserPage - 1) * ROWS_PER_PAGE;
    return filteredUsers.slice(start, start + ROWS_PER_PAGE);
  }, [filteredUsers, safeUserPage]);

  // Approve claim handler
  const handleApprove = (requestId: string) => {
    if (confirm('Approve this manual payment claim and activate the subscription immediately?')) {
      startTransition(async () => {
        const result = await processSubscriptionClaim({
          request_id: requestId,
          action: 'approve',
        });
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error?.message || 'Failed to approve claim.');
        }
      });
    }
  };

  // Reject claim handler
  const handleRejectSubmit = () => {
    if (!rejectingClaim) return;
    if (!rejectReason.trim()) {
      alert('Please specify a rejection reason for the client.');
      return;
    }

    startTransition(async () => {
      const result = await processSubscriptionClaim({
        request_id: rejectingClaim.id,
        action: 'reject',
        reject_reason: rejectReason.trim(),
      });

      if (result.success) {
        setRejectingClaim(null);
        setRejectReason('');
        router.refresh();
      } else {
        alert(result.error?.message || 'Failed to reject claim.');
      }
    });
  };

  // Open manage modal for a business
  const handleOpenManageBiz = async (biz: typeof businesses[0]) => {
    setSelectedBiz(biz);
    setOverridePlan(biz.subscriptionPlan);
    setOverrideStatus(biz.subscriptionStatus as any);
    setOverrideEndsAt(
      biz.subscriptionEndsAt ? new Date(biz.subscriptionEndsAt).toISOString().split('T')[0] : ''
    );
    setBizHistoryPage(1);
    setLoadingHistory(true);

    try {
      const result = await getBusinessSubscriptions({ business_id: biz.id });
      if (result.success && result.data) {
        setBizHistory(result.data);
      } else {
        setBizHistory([]);
      }
    } catch {
      setBizHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save manual override
  const handleSaveOverride = () => {
    if (!selectedBiz) return;

    startTransition(async () => {
      const result = await updateBusinessSubscription({
        business_id: selectedBiz.id,
        subscription_plan: overridePlan,
        subscription_status: overrideStatus,
        subscription_ends_at: overrideEndsAt ? new Date(overrideEndsAt).toISOString() : '',
      });

      if (result.success) {
        setSelectedBiz(null);
        router.refresh();
      } else {
        alert(result.error?.message || 'Failed to update subscription override.');
      }
    });
  };

  // Quick preset for override dates
  const handleSetPresetDate = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setOverrideEndsAt(d.toISOString().split('T')[0]);
  };

  // Export CSV of businesses
  const handleExportCsv = () => {
    const headers = [
      'Legal Name',
      'Trade Name',
      'GSTIN',
      'Email',
      'Phone',
      'Plan',
      'Status',
      'Expires At',
      'Invoices',
      'Staff',
      'Joined Date',
    ];
    const rows = filteredBusinesses.map((b) => [
      `"${b.legalName.replace(/"/g, '""')}"`,
      `"${(b.tradeName || '').replace(/"/g, '""')}"`,
      `"${b.gstin}"`,
      `"${b.email || ''}"`,
      `"${b.phone || ''}"`,
      `"${b.subscriptionPlan}"`,
      `"${b.subscriptionStatus}"`,
      `"${b.subscriptionEndsAt ? new Date(b.subscriptionEndsAt).toLocaleDateString('en-IN') : 'N/A'}"`,
      b.invoiceCount,
      b.userCount,
      `"${new Date(b.createdAt).toLocaleDateString('en-IN')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bill_matrix_businesses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!stats.monthlyRevenue || stats.monthlyRevenue.length === 0) return [];
    return stats.monthlyRevenue.map((item) => ({
      name: item.month,
      revenue: item.revenuePaise / 100,
      claims: item.claimCount,
    }));
  }, [stats.monthlyRevenue]);

  const planDist = stats.planDistribution || {
    trial: 0,
    free: 0,
    essentials: 0,
    professional: 0,
  };
  const totalTrackedPlans = Object.values(planDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-4">
      {/* 1. Sleek Command Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM ACTIVE
            </span>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              SUPER ADMIN CONSOLE
            </span>
          </div>
          <h1 className="mt-1.5 text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground font-heading">
            Platform Administration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-3xl lg:max-w-4xl leading-relaxed">
            Real-time subscriber metrics, manual payment verification queue, and client tenancy management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              startTransition(() => {
                router.refresh();
              });
            }}
            disabled={isPending}
            className="h-8.5 gap-1.5 text-sm font-semibold shadow-xs hover:bg-muted"
          >
            <RefreshCw className={cn('size-4', isPending && 'animate-spin text-indigo-600')} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8.5 gap-1.5 text-sm font-semibold shadow-xs hover:bg-muted"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Export Directory
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('pending')}
            className={cn(
              'h-8.5 gap-1.5 text-sm font-bold transition-all shadow-xs',
              pendingRequests.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
          >
            <Clock className="size-4" />
            Pending Queue ({pendingRequests.length})
          </Button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-[1.13fr_1fr_0.87fr_1fr]">
        {/* Metric 1: Total Platform Revenue */}
        <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card px-4 pt-3 pb-2.5 shadow-xs transition-all duration-200 hover:border-indigo-500/40 hover:shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-violet-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Revenue
              </p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground font-heading">
                {formatPaiseAsInr(stats.totalRevenuePaise)}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 transition-transform duration-200 group-hover:scale-105">
              <TrendingUp className="size-4.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
            <span className="font-bold text-emerald-600">Reconciled</span>
            <span>from approved subscription claims</span>
          </div>
        </div>

        {/* Metric 2: Active Subscriptions */}
        <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card px-4 pt-3 pb-2.5 shadow-xs transition-all duration-200 hover:border-emerald-500/40 hover:shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Active Subscriptions
              </p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground font-heading">
                {stats.activeSubscriptions}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 transition-transform duration-200 group-hover:scale-105">
              <ShieldCheck className="size-4.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">
              {Math.round((stats.activeSubscriptions / (stats.totalBusinesses || 1)) * 100)}%
            </span>
            <span>of registered businesses active</span>
          </div>
        </div>

        {/* Metric 3: Pending Claims */}
        <div
          onClick={() => setActiveTab('pending')}
          className={cn(
            'group relative cursor-pointer overflow-hidden rounded-xl border px-4 pt-3 pb-2.5 shadow-xs transition-all duration-200 hover:shadow-sm',
            pendingRequests.length > 0
              ? 'border-amber-400 bg-amber-500/5 hover:border-amber-500'
              : 'border-border/80 bg-card hover:border-border'
          )}
        >
          {/* Permanent warm natural gradient ribbon */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pending Verification
              </p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground font-heading flex items-center gap-2">
                {stats.pendingRequestsCount}
                {pendingRequests.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-700">
                    Needs Action
                  </span>
                )}
              </h3>
            </div>
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105',
                pendingRequests.length > 0
                  ? 'bg-amber-500/15 text-amber-700'
                  : 'bg-amber-500/10 text-amber-600'
              )}
            >
              <Clock className="size-4.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>{pendingRequests.length === 0 ? 'Queue is cleared' : 'Awaiting admin UTR confirmation'}</span>
          </div>
        </div>

        {/* Metric 4: Total Businesses & Platform Invoices */}
        <div className="group relative overflow-hidden rounded-xl border border-border/80 bg-card px-4 pt-3 pb-2.5 shadow-xs transition-all duration-200 hover:border-blue-500/40 hover:shadow-sm">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 to-indigo-600" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Businesses
              </p>
              <h3 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground font-heading">
                {stats.totalBusinesses}
              </h3>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 transition-transform duration-200 group-hover:scale-105">
              <Building2 className="size-4.5" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground">{stats.platformInvoiceCount || 0}</span>
            <span>invoices created across tenants</span>
          </div>
        </div>
      </div>

      {/* 3. Modern Segmented Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border/60 pb-px">
        <div className="flex gap-2 overflow-x-auto py-1">
          {[
            { id: 'overview', label: 'Overview & Analytics', icon: Layers },
            {
              id: 'pending',
              label: 'Pending Claims',
              icon: Clock,
              badge: pendingRequests.length,
              badgeHighlight: pendingRequests.length > 0,
            },
            { id: 'businesses', label: 'Businesses Directory', icon: Building2, badge: businesses.length },
            { id: 'users', label: 'Platform Users', icon: UsersIcon, badge: users.length },
            { id: 'settings', label: 'Gateways & Settings', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold transition-all cursor-pointer select-none outline-none',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                )}
              >
                <Icon className={cn('size-4 transition-colors', isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground')} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs font-bold leading-tight transition-colors',
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeHighlight
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TAB CONTENT */}

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Revenue Trend Chart (8 cols) */}
            <div className="lg:col-span-8 rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground font-heading">
                    Subscription Revenue Trajectory
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    Monthly subscription inflow over the last 6 calendar months (INR)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                    <span className="size-2 rounded-full bg-indigo-600" />
                    Gross Revenue
                  </span>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                {isMounted && chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <RechartsTooltip
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#1e293b',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 'bold',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fill="url(#revenueGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground font-semibold">
                    No historical revenue data recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Right: Plan Distribution & Gateways Snapshot (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Plan Distribution meter */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <h3 className="text-base font-bold text-foreground font-heading">
                  Tenant Plan Distribution
                </h3>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  Breakdown across subscription tiers
                </p>

                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Trial', count: planDist.trial, color: 'bg-amber-500', barColor: 'bg-amber-500' },
                    { label: 'Essentials', count: planDist.essentials, color: 'bg-indigo-500', barColor: 'bg-indigo-500' },
                    { label: 'Professional', count: planDist.professional, color: 'bg-emerald-500', barColor: 'bg-emerald-500' },
                    { label: 'Free Tier', count: planDist.free, color: 'bg-purple-500', barColor: 'bg-purple-500' },
                  ].map((plan) => {
                    const percentage = Math.round((plan.count / totalTrackedPlans) * 100);
                    return (
                      <div key={plan.label} className="space-y-1">
                        <div className="flex justify-between text-sm font-semibold">
                          <span className="text-foreground flex items-center gap-1.5">
                            <span className={cn('size-2.5 rounded-full', plan.color)} />
                            {plan.label}
                          </span>
                          <span className="text-muted-foreground font-mono font-medium">
                            {plan.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', plan.barColor)}
                            style={{ width: `${Math.max(percentage, percentage > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Gateway Snapshot Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-foreground font-heading">
                    Payee UPI & Bank Config
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('settings')}
                    className="h-6 text-xs font-bold text-indigo-600 hover:text-indigo-700 p-0"
                  >
                    Manage Config →
                  </Button>
                </div>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  Current active manual payout endpoints
                </p>

                <div className="mt-3.5 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 border border-border/50">
                    <span className="text-muted-foreground font-medium">Payee UPI:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span>{upiConfig.upiId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(upiConfig.upiId, 'upi-quick')}
                        className="text-muted-foreground hover:text-indigo-600 cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedKey === 'upi-quick' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5 border border-border/50">
                    <span className="text-muted-foreground font-medium">Direct Bank IFSC:</span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                      <span>{upiConfig.ifsc}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(upiConfig.ifsc, 'ifsc-quick')}
                        className="text-muted-foreground hover:text-indigo-600 cursor-pointer"
                        title="Copy IFSC"
                      >
                        {copiedKey === 'ifsc-quick' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: Recent Pending Claims Action Queue */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  Priority Payment Reconciliation Queue
                </h3>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                  Recent manual claims requiring administrative confirmation
                </p>
              </div>

              {pendingRequests.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('pending')}
                  className="h-7.5 text-xs font-bold text-indigo-600"
                >
                  View All ({pendingRequests.length})
                </Button>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center">
                <CheckCircle2 className="size-8 text-emerald-500 mb-1.5" />
                <p className="text-sm font-bold text-foreground">All claims are reconciled!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending payment claims waiting for verification.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {pendingRequests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground truncate">{req.businessName}</span>
                        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-600 uppercase border border-indigo-200">
                          {req.planName} · {req.billingCycle}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-semibold">
                        <span>
                          UTR:{' '}
                          <span className="font-mono text-indigo-600 font-bold">{req.paymentReference}</span>
                        </span>
                        <span>•</span>
                        <span>Amount: <b className="text-foreground">{formatPaiseAsInr(req.amountPaise)}</b></span>
                        <span>•</span>
                        <span>{new Date(req.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.screenshotUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setLightboxImage({
                              url: req.screenshotUrl!,
                              title: `${req.businessName} - Payment Proof`,
                              utr: req.paymentReference,
                            })
                          }
                          className="h-7.5 px-2.5 text-xs font-bold text-muted-foreground hover:text-indigo-600"
                        >
                          <Eye className="size-3.5 mr-1" /> Proof
                        </Button>
                      )}
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleApprove(req.id)}
                        className="h-7.5 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setRejectingClaim(req)}
                        className="h-7.5 px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PENDING CLAIMS VERIFICATION QUEUE */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Pending Subscription Claims ({pendingRequests.length})
              </h3>
              <p className="text-xs font-semibold text-muted-foreground">
                Inspect bank transaction references (UTR) and verify proof before subscription activation.
              </p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-xs">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500 mb-2" />
              <h4 className="text-base font-bold text-foreground">Reconciliation Queue Empty</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                No manual UPI or bank transfer claims are currently awaiting review. New claims submitted by tenants will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4 hover:border-border/80 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-foreground font-heading">{req.businessName}</h4>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        GSTIN: <span className="font-mono text-foreground font-bold">{req.businessGstin || 'Unregistered'}</span>
                        {req.userName && ` · Submitted by ${req.userName}`}
                      </p>
                    </div>
                    <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-bold text-indigo-700 uppercase tracking-wide">
                      {req.planName} ({req.billingCycle})
                    </span>
                  </div>

                  {/* Payment Details Card */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm border border-border/40">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Amount Paid
                      </span>
                      <span className="text-base font-extrabold text-foreground font-heading">
                        {formatPaiseAsInr(req.amountPaise)}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Payment Method
                      </span>
                      <span className="font-semibold text-foreground capitalize">
                        {req.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        UTR / Transaction Reference No
                      </span>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="font-mono text-sm font-extrabold text-indigo-600 tracking-wider">
                          {req.paymentReference}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(req.paymentReference, `utr-${req.id}`)}
                          className="flex items-center gap-1 rounded bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground border border-border/80 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {copiedKey === `utr-${req.id}` ? (
                            <>
                              <Check className="size-3.5 text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" /> Copy UTR
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40">
                    {req.screenshotUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxImage({
                            url: req.screenshotUrl!,
                            title: `${req.businessName} - Payment Proof`,
                            utr: req.paymentReference,
                          })
                        }
                        className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        <Maximize2 className="size-4" /> View Payment Proof
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground italic">
                        No image uploaded
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => setRejectingClaim(req)}
                        className="h-8 text-sm font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleApprove(req.id)}
                        className="h-8 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Approve Claim
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BUSINESSES DIRECTORY */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Client Businesses Directory ({filteredBusinesses.length} of {businesses.length})
              </h3>
              <p className="text-xs font-semibold text-muted-foreground">
                Search, inspect invoices, and manage subscription lifecycles.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8.5 gap-1.5 text-sm font-semibold self-start sm:self-auto"
            >
              <Download className="size-4 text-indigo-600" /> Export CSV
            </Button>
          </div>

          {/* Search and filter toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by legal name, trade name, GSTIN, or email..."
                value={bizSearch}
                onChange={(e) => setBizSearch(e.target.value)}
                className="h-9.5 w-full rounded-lg border border-border bg-background pl-9.5 pr-8 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {bizSearch && (
                <button
                  type="button"
                  onClick={() => setBizSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {(['all', 'active', 'trial', 'expired', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setBizStatusFilter(st)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-sm font-bold capitalize transition cursor-pointer',
                    bizStatusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (bizSortField === 'name') {
                            setBizSortOrder(bizSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setBizSortField('name');
                            setBizSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                      >
                        Business & GSTIN
                        <ArrowUpDown className="size-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Plan & Status</th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (bizSortField === 'expiry') {
                            setBizSortOrder(bizSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setBizSortField('expiry');
                            setBizSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                      >
                        Expires At
                        <ArrowUpDown className="size-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (bizSortField === 'invoices') {
                            setBizSortOrder(bizSortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setBizSortField('invoices');
                            setBizSortOrder('desc');
                          }
                        }}
                        className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                      >
                        Invoices
                        <ArrowUpDown className="size-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-semibold text-sm">
                        No businesses found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedBusinesses.map((biz) => {
                      const isPaying = biz.subscriptionStatus === 'active';
                      const isSuspended = biz.subscriptionStatus === 'suspended';
                      const isTrial = biz.subscriptionStatus === 'trial';
                      const isExpired = biz.subscriptionStatus === 'expired';

                      return (
                        <tr key={biz.id} className="hover:bg-muted/15 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-sm">{biz.legalName}</span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground font-mono font-medium">
                                <span>{biz.gstin}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(biz.gstin, `gstin-${biz.id}`)}
                                  className="hover:text-indigo-600 transition cursor-pointer"
                                  title="Copy GSTIN"
                                >
                                  {copiedKey === `gstin-${biz.id}` ? (
                                    <Check className="size-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className="font-bold text-foreground capitalize text-xs">
                                {biz.subscriptionPlan}
                              </span>
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border',
                                  isPaying && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  isTrial && 'bg-amber-50 text-amber-700 border-amber-200',
                                  isSuspended && 'bg-rose-50 text-rose-700 border-rose-200',
                                  isExpired && 'bg-zinc-100 text-zinc-700 border-zinc-200'
                                )}
                              >
                                <span
                                  className={cn(
                                    'size-1.5 rounded-full',
                                    isPaying && 'bg-emerald-500',
                                    isTrial && 'bg-amber-500',
                                    isSuspended && 'bg-rose-500',
                                    isExpired && 'bg-zinc-400'
                                  )}
                                />
                                {biz.subscriptionStatus}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-xs font-semibold">
                            {biz.subscriptionEndsAt ? (
                              <span>{new Date(biz.subscriptionEndsAt).toLocaleDateString('en-IN')}</span>
                            ) : (
                              <span className="text-muted-foreground italic">Lifetime / Unset</span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono font-bold text-foreground text-sm">
                            {biz.invoiceCount}
                          </td>

                          <td className="px-4 py-3 font-semibold text-foreground text-sm">
                            {biz.userCount}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenManageBiz(biz)}
                              className="h-7.5 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border-indigo-200"
                            >
                              Manage
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Businesses Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs font-semibold text-muted-foreground">
              <div>
                {filteredBusinesses.length === 0 ? (
                  <span>No businesses found</span>
                ) : (
                  <span>
                    Showing <strong className="text-foreground font-bold">{(safeBizPage - 1) * ROWS_PER_PAGE + 1}</strong>–
                    <strong className="text-foreground font-bold">{Math.min(safeBizPage * ROWS_PER_PAGE, filteredBusinesses.length)}</strong> of{' '}
                    <strong className="text-foreground font-bold">{filteredBusinesses.length}</strong> {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
                  </span>
                )}
              </div>

              {totalBizPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={safeBizPage <= 1}
                    onClick={() => setBizPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted font-bold text-foreground text-xs disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </button>

                  {getVisiblePageNumbers(safeBizPage, totalBizPages).map((pNum, idx) => {
                    if (pNum === '...') {
                      return (
                        <span key={`biz-ellipsis-${idx}`} className="px-1.5 py-1 text-muted-foreground select-none">
                          ...
                        </span>
                      );
                    }
                    const num = pNum as number;
                    const isActive = safeBizPage === num;
                    return (
                      <button
                        key={`biz-page-${num}`}
                        type="button"
                        onClick={() => setBizPage(num)}
                        className={cn(
                          'min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition cursor-pointer',
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-border bg-background hover:bg-muted text-foreground'
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={safeBizPage >= totalBizPages}
                    onClick={() => setBizPage((p) => Math.min(totalBizPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted font-bold text-foreground text-xs disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PLATFORM USERS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-foreground font-heading">
                Platform Users Directory ({filteredUsers.length} of {users.length})
              </h3>
              <p className="text-xs font-semibold text-muted-foreground">
                All authenticated accounts and tenancy memberships.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card p-3 rounded-xl border border-border shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users by name or business affiliation..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-9.5 w-full rounded-lg border border-border bg-background pl-9.5 pr-8 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1">
              {(['all', 'owner', 'staff'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-sm font-bold capitalize transition cursor-pointer',
                    userRoleFilter === r
                      ? 'bg-indigo-600 text-white'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3">User Profile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Business Affiliation</th>
                    <th className="px-4 py-3">Member Since</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground font-semibold text-sm">
                        No platform users found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => {
                      const initials = (u.displayName || 'User')
                        .split(' ')
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={u.id} className="hover:bg-muted/15 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-7.5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shrink-0">
                                {initials}
                              </div>
                              <span className="font-bold text-foreground text-sm">
                                {u.displayName || 'No Name Set'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border',
                                u.role === 'owner'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              )}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            {u.businessName ? (
                              <span className="font-semibold text-foreground text-sm">{u.businessName}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground/70 italic">Unassigned</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-xs text-muted-foreground font-semibold">
                            {new Date(u.createdAt).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Platform Users Pagination Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs font-semibold text-muted-foreground">
              <div>
                {filteredUsers.length === 0 ? (
                  <span>No platform users found</span>
                ) : (
                  <span>
                    Showing <strong className="text-foreground font-bold">{(safeUserPage - 1) * ROWS_PER_PAGE + 1}</strong>–
                    <strong className="text-foreground font-bold">{Math.min(safeUserPage * ROWS_PER_PAGE, filteredUsers.length)}</strong> of{' '}
                    <strong className="text-foreground font-bold">{filteredUsers.length}</strong> platform {filteredUsers.length === 1 ? 'user' : 'users'}
                  </span>
                )}
              </div>

              {totalUserPages > 1 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={safeUserPage <= 1}
                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted font-bold text-foreground text-xs disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" /> Previous
                  </button>

                  {getVisiblePageNumbers(safeUserPage, totalUserPages).map((pNum, idx) => {
                    if (pNum === '...') {
                      return (
                        <span key={`user-ellipsis-${idx}`} className="px-1.5 py-1 text-muted-foreground select-none">
                          ...
                        </span>
                      );
                    }
                    const num = pNum as number;
                    const isActive = safeUserPage === num;
                    return (
                      <button
                        key={`user-page-${num}`}
                        type="button"
                        onClick={() => setUserPage(num)}
                        className={cn(
                          'min-w-[28px] h-7 px-2 rounded-lg font-bold text-xs transition cursor-pointer',
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-border bg-background hover:bg-muted text-foreground'
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={safeUserPage >= totalUserPages}
                    onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted font-bold text-foreground text-xs disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer"
                  >
                    Next <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: GATEWAYS & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-foreground font-heading">
              Platform System Settings & Payment Gateways
            </h3>
            <p className="text-xs font-semibold text-muted-foreground">
              These payment details are presented to customers during the Pro upgrade checkout process.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Payee UPI Information */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground font-heading uppercase tracking-wider">
                    Payee UPI Configuration
                  </h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Dynamic QR codes and VPA addresses used on /checkout
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg bg-muted/40 p-3.5 border border-border/50 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Payee VPA / UPI ID:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    <span>{upiConfig.upiId}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(upiConfig.upiId, 'upi-full')}
                      className="text-muted-foreground hover:text-indigo-600 transition cursor-pointer"
                    >
                      {copiedKey === 'upi-full' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Recipient Display Name:</span>
                  <span className="font-bold text-foreground">{upiConfig.upiName}</span>
                </div>
              </div>
            </div>

            {/* Direct Bank Account */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground font-heading uppercase tracking-wider">
                    Direct Bank Transfer Endpoint
                  </h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    NEFT / RTGS / IMPS instructions for enterprise subscribers
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 rounded-lg bg-muted/40 p-3.5 border border-border/50 text-sm">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Bank Name:</span>
                  <span className="font-bold text-foreground">{upiConfig.bankName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Account Name:</span>
                  <span className="font-bold text-foreground">{upiConfig.accName}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <span className="text-muted-foreground font-medium">Account Number:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    <span>{upiConfig.accNo}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(upiConfig.accNo, 'acc-no')}
                      className="text-muted-foreground hover:text-indigo-600 transition cursor-pointer"
                    >
                      {copiedKey === 'acc-no' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">IFSC Code:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    <span>{upiConfig.ifsc}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(upiConfig.ifsc, 'ifsc-full')}
                      className="text-muted-foreground hover:text-indigo-600 transition cursor-pointer"
                    >
                      {copiedKey === 'ifsc-full' ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Security Allowlist */}
            <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-foreground font-heading uppercase tracking-wider">
                  Platform Admin Authorization Security
                </h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Super Admin operations and route protection are governed by the server-side environment allowlist{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground font-bold">
                  PLATFORM_ADMIN_EMAILS
                </code>
                . Only sessions with these emails can access this portal or execute status overrides.
              </p>
              <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-sm font-mono text-foreground font-bold break-all">
                {adminEmailAllowlist || 'Configured via server environment'}
              </div>
            </div>

            {/* Feedback & Support Inbox Dispatch */}
            <div className="md:col-span-2 rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground font-heading uppercase tracking-wider">
                      Feedback &amp; Bug Report Inbox Dispatch
                    </h4>
                    <p className="text-xs text-muted-foreground font-semibold">
                      Live destination for all user reviews, bug reports &amp; UI/UX suggestions
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 self-start sm:self-auto">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active In-Memory Delivery (0 Cloud/DB Storage)
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">
                When users submit bug reports or feedback via the topbar or settings form, the payload and screenshots are packaged in-memory and delivered via Resend directly to your inbox. You can reply directly to the submitting user from Gmail.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Active Recipient Email
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-foreground">
                      mcrsftrwds4@gmail.com
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy('mcrsftrwds4@gmail.com', 'feedback-email')}
                      className="text-muted-foreground hover:text-indigo-600 transition cursor-pointer"
                    >
                      {copiedKey === 'feedback-email' ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-sm">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                    Environment Override Variable
                  </span>
                  <div className="flex items-center justify-between">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground font-bold">
                      FEEDBACK_RECIPIENT_EMAIL
                    </code>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Update in .env to change
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REJECT CLAIM DIALOG */}
      {/* ========================================================================= */}
      {rejectingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-foreground font-heading border-b border-border/40 pb-3 flex items-center gap-2">
              <XCircle className="size-5 text-rose-600" /> Reject Payment Claim
            </h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Claim for <b className="text-foreground">{rejectingClaim.businessName}</b> (UTR:{' '}
              <span className="font-mono text-indigo-600 font-bold">{rejectingClaim.paymentReference}</span>).
              Please provide a clear rejection reason.
            </p>

            {/* Reason presets */}
            <div className="mt-3.5 space-y-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Quick Reason Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'UTR not found in bank statement',
                  'Payment amount does not match plan price',
                  'Duplicate transaction reference submitted',
                  'Unreadable payment screenshot proof',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRejectReason(chip)}
                    className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-indigo-50 hover:text-indigo-600 transition cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3.5 flex flex-col gap-1">
              <label htmlFor="reject_reason" className="text-sm font-bold text-foreground">
                Rejection Note *
              </label>
              <textarea
                id="reject_reason"
                rows={3}
                placeholder="State why the claim was not approved..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-medium outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setRejectingClaim(null);
                  setRejectReason('');
                }}
                className="text-sm font-bold"
              >
                Cancel
              </Button>
              <Button
                disabled={isPending}
                onClick={handleRejectSubmit}
                className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE BUSINESS SUBSCRIPTION & HISTORICAL LEDGER */}
      {/* ========================================================================= */}
      {selectedBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-4.5 sm:p-5 shadow-xl relative animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedBiz(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-5" />
            </button>

            <h3 className="text-lg font-bold text-foreground font-heading border-b border-border/40 pb-2 flex items-center gap-2">
              <Building2 className="size-5 text-indigo-600" />
              Manage Subscription: {selectedBiz.legalName}
            </h3>

            {/* Subscription override inputs */}
            <div className="mt-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Settings className="size-4" /> Manual Subscription Override
                </h4>
                <span className="text-xs font-semibold text-muted-foreground">
                  GSTIN: {selectedBiz.gstin}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Plan Tier
                  </label>
                  <select
                    value={overridePlan}
                    onChange={(e) => setOverridePlan(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background text-sm font-semibold px-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="free">Free</option>
                    <option value="essentials">Essentials</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Lifecycle Status
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value as any)}
                    className="h-9 w-full rounded-lg border border-border bg-background text-sm font-semibold px-2.5 outline-none focus:border-indigo-500"
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={overrideEndsAt}
                    onChange={(e) => setOverrideEndsAt(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background text-sm font-semibold px-2.5 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quick Expiry Presets & Save Action Single-Line Lockup */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-500/10">
                <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                  <span className="text-xs font-bold text-muted-foreground mr-0.5 whitespace-nowrap">Quick Expiry:</span>
                  {[
                    { label: '+30 Days', months: 1 },
                    { label: '+90 Days', months: 3 },
                    { label: '+1 Year', months: 12 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetPresetDate(preset.months)}
                      className="rounded bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground border border-border/80 hover:text-indigo-600 transition cursor-pointer whitespace-nowrap"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOverrideEndsAt('')}
                    className="rounded bg-background px-2 py-0.5 text-xs font-bold text-rose-600 border border-border/80 hover:bg-rose-50 transition cursor-pointer whitespace-nowrap"
                  >
                    Clear Date
                  </button>
                </div>

                <Button
                  disabled={isPending}
                  onClick={handleSaveOverride}
                  className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Save Subscription Changes'}
                </Button>
              </div>
            </div>

            {/* Historical transaction ledger */}
            <div className="mt-3 space-y-2">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                <History className="size-4 text-muted-foreground" /> Historical Subscription Claims
              </h4>

              {loadingHistory ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-indigo-600" />
                </div>
              ) : bizHistory.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground font-semibold">
                  No previous subscription claim records for this business.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border font-bold text-muted-foreground text-xs">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Reference / UTR</th>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {bizHistory
                          .slice((bizHistoryPage - 1) * 3, bizHistoryPage * 3)
                          .map((item) => (
                            <tr key={item.id} className="hover:bg-muted/10">
                              <td className="px-3 py-2 font-semibold">
                                {new Date(item.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs font-bold text-indigo-600">
                                {item.paymentReference}
                              </td>
                              <td className="px-3 py-2 capitalize font-semibold">
                                {item.planName} ({item.billingCycle.replace('_', ' ')})
                              </td>
                              <td className="px-3 py-2 font-semibold">{formatPaiseAsInr(item.amountPaise)}</td>
                              <td className="px-3 py-2 font-bold capitalize">
                                <span
                                  className={cn(
                                    item.status === 'approved' && 'text-emerald-600',
                                    item.status === 'pending' && 'text-amber-600',
                                    item.status === 'rejected' && 'text-rose-600'
                                  )}
                                >
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls for Claims */}
                  {bizHistory.length > 0 && (
                    <div className="flex items-center justify-between gap-2 pt-0.5 px-0.5 text-xs">
                      <span className="text-muted-foreground font-medium">
                        Showing {(bizHistoryPage - 1) * 3 + 1} to{' '}
                        {Math.min(bizHistoryPage * 3, bizHistory.length)} of {bizHistory.length} claims
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-muted-foreground mr-1.5">
                          Page {bizHistoryPage} of {Math.max(1, Math.ceil(bizHistory.length / 3))}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setBizHistoryPage((p) => Math.max(1, p - 1))}
                          disabled={bizHistoryPage === 1}
                          className="h-6.5 px-2 text-xs font-semibold cursor-pointer border-border disabled:opacity-40"
                        >
                          <ChevronLeft className="size-3 mr-0.5" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setBizHistoryPage((p) =>
                              Math.min(Math.max(1, Math.ceil(bizHistory.length / 3)), p + 1)
                            )
                          }
                          disabled={bizHistoryPage >= Math.max(1, Math.ceil(bizHistory.length / 3))}
                          className="h-6.5 px-2 text-xs font-semibold cursor-pointer border-border disabled:opacity-40"
                        >
                          Next
                          <ChevronRight className="size-3 ml-0.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SCREENSHOT LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-card p-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-foreground font-heading">
                  {lightboxImage.title}
                </h3>
                <p className="text-xs font-mono text-muted-foreground font-bold">
                  UTR: {lightboxImage.utr}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={lightboxImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border px-2.5 py-1 text-sm font-bold text-muted-foreground hover:text-indigo-600 hover:bg-muted transition"
                >
                  Open Original ↗
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-center items-center max-h-[70vh] overflow-hidden rounded-lg bg-black/5 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxImage.url}
                alt="Payment proof screenshot"
                className="max-h-[65vh] w-auto object-contain rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
