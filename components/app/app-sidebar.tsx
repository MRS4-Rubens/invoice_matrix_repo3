'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ShieldCheck,
  Crown,
  CreditCard,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  color: {
    activeGradient: string
    inactiveBg: string
    inactiveText: string
    inactiveBorder: string
  }
}

const mainNav: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: {
      activeGradient: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30',
      inactiveBg: 'bg-indigo-500/10',
      inactiveText: 'text-indigo-600 dark:text-indigo-400',
      inactiveBorder: 'border-indigo-500/20',
    },
  },
  {
    label: 'Invoices',
    icon: FileText,
    href: '/invoices',
    color: {
      activeGradient: 'bg-gradient-to-br from-blue-500 to-sky-600 text-white shadow-md shadow-blue-500/30',
      inactiveBg: 'bg-blue-500/10',
      inactiveText: 'text-blue-600 dark:text-blue-400',
      inactiveBorder: 'border-blue-500/20',
    },
  },
  {
    label: 'Customers',
    icon: Users,
    href: '/customers',
    color: {
      activeGradient: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30',
      inactiveBg: 'bg-emerald-500/10',
      inactiveText: 'text-emerald-600 dark:text-emerald-400',
      inactiveBorder: 'border-emerald-500/20',
    },
  },
  {
    label: 'Products',
    icon: Package,
    href: '/products',
    color: {
      activeGradient: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30',
      inactiveBg: 'bg-amber-500/10',
      inactiveText: 'text-amber-600 dark:text-amber-400',
      inactiveBorder: 'border-amber-500/20',
    },
  },
  {
    label: 'Reports',
    icon: BarChart3,
    href: '/reports',
    color: {
      activeGradient: 'bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/30',
      inactiveBg: 'bg-purple-500/10',
      inactiveText: 'text-purple-600 dark:text-purple-400',
      inactiveBorder: 'border-purple-500/20',
    },
  },
]

const accountNav: NavItem[] = [
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
    color: {
      activeGradient: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-600/30',
      inactiveBg: 'bg-slate-500/10',
      inactiveText: 'text-slate-600 dark:text-slate-400',
      inactiveBorder: 'border-slate-500/20',
    },
  },
]

const adminNavItem: NavItem = {
  label: 'Admin Console',
  icon: ShieldCheck,
  href: '/admin',
  color: {
    activeGradient: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30',
    inactiveBg: 'bg-rose-500/10',
    inactiveText: 'text-rose-600 dark:text-rose-400',
    inactiveBorder: 'border-rose-500/20',
  },
}

function NavLink({
  item,
  pathname,
  isCollapsed,
}: {
  item: NavItem
  pathname: string
  isCollapsed: boolean
}) {
  const isActive = pathname === item.href
  const Icon = item.icon

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'group flex items-center rounded-xl text-[13.5px] font-semibold transition-all relative duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 select-none',
        isActive
          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-200/50 dark:border-indigo-800/40 shadow-xs'
          : 'text-slate-600 dark:text-slate-400 hover:bg-muted/70 hover:text-foreground',
        isCollapsed ? 'justify-center p-1.5 my-0.5' : 'px-2 py-1.5 my-0.5 gap-2',
      )}
    >
      {/* Active Left Indicator Bar */}
      {isActive && (
        <span
          className={cn(
            'absolute top-[18%] bottom-[18%] w-[3.5px] bg-gradient-to-b from-indigo-500 to-violet-600 rounded-r-full shadow-xs transition-all duration-300',
            isCollapsed ? '-left-2' : '-left-1',
          )}
        />
      )}

      {/* Chromatic Icon Pod */}
      <div
        className={cn(
          'size-7.5 shrink-0 flex items-center justify-center rounded-lg border transition-all duration-200 group-hover:scale-105',
          isActive
            ? cn(item.color.activeGradient, 'border-transparent')
            : cn(
              item.color.inactiveBg,
              item.color.inactiveText,
              item.color.inactiveBorder,
              'group-hover:brightness-110',
            ),
        )}
      >
        <Icon className="size-4" strokeWidth={isActive ? 2.2 : 2} />
      </div>

      {/* Label and right chevron */}
      {!isCollapsed && (
        <>
          <span className="truncate flex-1">{item.label}</span>
          <ChevronRight
            className={cn(
              'size-3.5 shrink-0 transition-all duration-200',
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 opacity-90'
                : 'text-muted-foreground/35 group-hover:text-muted-foreground group-hover:translate-x-0.5',
            )}
          />
        </>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip content={item.label} side="right" sideOffset={12}>
        {linkContent}
      </Tooltip>
    )
  }

  return linkContent
}

export function AppSidebar({
  user,
  defaultCollapsed = false,
  isAdminUser = false,
  subscription,
  businessLogoUrl,
}: {
  user?: { name: string; role: string; initials: string }
  defaultCollapsed?: boolean
  isAdminUser?: boolean
  subscription?: {
    plan: string
    status: string
    endsAt: string | null
  } | null
  businessLogoUrl?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [daysRemaining] = useState<number | null>(() => {
    if (!subscription?.endsAt) return null
    const diff = new Date(subscription.endsAt).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleToggle = () => {
    const nextCollapsed = !isCollapsed
    setIsCollapsed(nextCollapsed)
    document.cookie = `sidebar:collapsed=${nextCollapsed}; path=/; max-age=31536000`
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'relative flex h-full shrink-0 flex-col border-r border-border/50 bg-card/85 backdrop-blur-xl shadow-xs print:hidden transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[68px]' : 'w-[220px]',
        )}
      >
        {/* Subtle decorative background aura */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={handleToggle}
          className="absolute -right-3 top-1/2 z-40 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-indigo-600 transition-all cursor-pointer opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronLeft className="size-3.5" />
          )}
        </button>

        {/* Brand Header */}
        <div
          className={cn(
            'brand flex items-center border-b border-border/40 transition-all duration-300 relative z-10',
            isCollapsed ? 'justify-center px-2 py-3.5' : 'px-3.5 py-3.5 gap-2',
          )}
        >
          {/* Vibrant Rounded "B" Logo Squircle */}
          <div className="logo flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 font-extrabold text-white text-base shadow-[0_4px_14px_rgba(99,102,241,0.35)] border border-white/20 transition-transform duration-300 hover:rotate-[-4deg] hover:scale-105 select-none">
            B
          </div>

          <div
            className={cn(
              'flex flex-col leading-tight transition-all duration-300 ease-in-out origin-left overflow-hidden whitespace-nowrap',
              isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-40',
            )}
          >
            <div className="flex items-center gap-1">
              <span className="text-[14.5px] font-black tracking-tight text-foreground">
                Bill
              </span>
              <span className="text-[14.5px] font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-600 bg-clip-text text-transparent">
                Matrix
              </span>
            </div>
            <span className="text-[9px] font-extrabold text-muted-foreground/80 uppercase tracking-[0.16em] mt-0.5">
              GST Invoicing Suite
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto pb-3 transition-all duration-300 relative z-10',
            isCollapsed ? 'px-3 space-y-1' : 'px-3 space-y-0.5',
          )}
        >
          {/* MENU Section Header */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-1 pt-3 pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground/60 select-none">
                Menu
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
          ) : (
            <div className="h-px w-6 mx-auto bg-border/40 my-2" />
          )}

          <div className="space-y-0.5">
            {mainNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>

          {/* ACCOUNT Section Header */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2 px-1 pt-3.5 pb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground/60 select-none">
                Account
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>
          ) : (
            <div className="h-px w-6 mx-auto bg-border/40 my-2" />
          )}

          <div className="space-y-0.5">
            {accountNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            ))}
            {isAdminUser && (
              <NavLink
                item={adminNavItem}
                pathname={pathname}
                isCollapsed={isCollapsed}
              />
            )}
          </div>

          {/* UPGRADE / PRO SUBSCRIPTION CARD */}
          {subscription?.status === 'active' ? (
            <div
              className={cn(
                'bg-gradient-to-br from-emerald-500/[0.08] via-indigo-500/[0.04] to-transparent border border-emerald-500/20 rounded-2xl relative overflow-hidden group/upgrade transition-all duration-300 shadow-2xs',
                isCollapsed
                  ? 'opacity-0 max-h-0 m-0 border-0 p-0 overflow-hidden pointer-events-none'
                  : 'opacity-100 max-h-56 p-2.5 mt-3.5',
              )}
            >
              <div className="absolute -top-6 -right-6 size-16 bg-emerald-500/15 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover/upgrade:scale-150" />
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Plan
                </span>
                <span className="text-[9.5px] font-bold capitalize text-foreground bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {subscription.plan}
                </span>
              </div>
              <p className="text-[9.5px] text-muted-foreground leading-relaxed mb-2">
                {daysRemaining !== null
                  ? `${daysRemaining} days remaining in billing cycle.`
                  : 'Unlimited GST invoices & premium suite unlocked.'}
              </p>
              <Link href="/settings?tab=Billing & Usage" className="block w-full">
                <Button
                  className="w-full text-[10.5px] font-bold h-7 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs hover:shadow-md hover:translate-y-[-1px] active:translate-y-px transition-all cursor-pointer rounded-xl"
                  variant="default"
                  size="sm"
                >
                  Manage Subscription
                </Button>
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.04] to-transparent border border-indigo-500/20 rounded-2xl relative overflow-hidden group/upgrade transition-all duration-300 shadow-2xs',
                isCollapsed
                  ? 'opacity-0 max-h-0 m-0 border-0 p-0 overflow-hidden pointer-events-none'
                  : 'opacity-100 max-h-60 p-2.5 mt-3.5',
              )}
            >
              <div className="absolute -top-8 -right-8 size-20 bg-purple-500/20 rounded-full blur-xl pointer-events-none transition-all duration-300 group-hover/upgrade:scale-150" />

              {/* Header row with crown and miniature illustration */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-xs">
                    <Crown className="size-3" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Upgrade to Pro
                  </span>
                </div>

                {/* Decorative Mini Invoice Document */}
                <div className="relative shrink-0 flex items-center justify-center size-7.5 bg-white/95 dark:bg-slate-800/95 rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs p-1">
                  <div className="w-full space-y-0.5">
                    <div className="h-0.5 w-3/4 rounded-full bg-indigo-500" />
                    <div className="h-0.5 w-full rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div className="h-0.5 w-1/2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex size-3 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-bold text-white shadow-xs border border-white">
                    ✓
                  </span>
                </div>
              </div>

              <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 leading-snug mb-2.5">
                Unlock unlimited invoices, multi-users & WhatsApp sharing.
              </p>

              <Link href="/checkout" className="block w-full">
                <Button
                  className="w-full text-[10.5px] font-bold h-7 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-xs hover:shadow-md hover:translate-y-[-1px] active:translate-y-px transition-all cursor-pointer rounded-xl flex items-center justify-center gap-1.5 group/btn"
                  variant="default"
                  size="sm"
                >
                  <span>Upgrade Now</span>
                  <ArrowRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* User profile dock & interactive popover at bottom */}
        <div
          className={cn(
            'relative border-t border-border/40 transition-all duration-300 z-20',
            isCollapsed ? 'p-1.5' : 'px-3 py-2',
          )}
          ref={userMenuRef}
        >
          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className={cn(
              'group/user flex items-center rounded-xl transition-all duration-200 cursor-pointer w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
              isCollapsed
                ? 'justify-center p-1.5 hover:bg-accent/60'
                : 'p-1.5 hover:bg-accent/60 gap-2',
              userMenuOpen && 'bg-accent/80 ring-1 ring-border',
            )}
            aria-expanded={userMenuOpen}
            aria-label="User profile and menu"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-violet-500 text-[11px] font-bold text-white shadow-sm transition-transform duration-200 group-hover/user:scale-105 overflow-hidden border border-border/40">
              {businessLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessLogoUrl}
                  alt="Logo"
                  className="size-full object-contain p-0.5 bg-white"
                />
              ) : (
                user?.initials || 'U'
              )}
            </div>

            <div
              className={cn(
                'min-w-0 flex-1 flex flex-col leading-none transition-all duration-300 ease-in-out origin-left overflow-hidden whitespace-nowrap',
                isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-36',
              )}
            >
              <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground capitalize mt-0.5">
                {user?.role || 'Owner'}
              </p>
            </div>

            {!isCollapsed && (
              <ChevronsUpDown className="size-3.5 text-muted-foreground/60 shrink-0 group-hover/user:text-foreground transition-colors ml-auto" />
            )}
          </button>

          {/* Interactive Popover Menu */}
          {userMenuOpen && (
            <div
              className={cn(
                'absolute z-50 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl p-2 shadow-2xl shadow-indigo-500/10 transition-all duration-150 animate-in fade-in-0 zoom-in-95',
                isCollapsed
                  ? 'left-[72px] bottom-1 w-64'
                  : 'bottom-full mb-2 left-1.5 right-1.5 min-w-[190px]',
              )}
            >
              {/* Popover Header with User Details */}
              <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 mb-1 border border-border/40">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-rose-400 to-violet-500 text-xs font-bold text-white shadow-sm overflow-hidden border border-border/40">
                  {businessLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={businessLogoUrl}
                      alt="Logo"
                      className="size-full object-contain p-0.5 bg-white"
                    />
                  ) : (
                    user?.initials || 'U'
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {user?.name || 'User'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 capitalize">
                      {user?.role || 'Owner'}
                    </span>
                    {subscription?.plan && (
                      <span className="text-[10px] text-muted-foreground capitalize">
                        • {subscription.plan}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Popover Quick Links */}
              <div className="space-y-0.5 py-1">
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="size-3.5 text-muted-foreground" />
                  <span>Account Settings</span>
                </Link>
                <Link
                  href="/settings?tab=Billing & Usage"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <CreditCard className="size-3.5 text-muted-foreground" />
                  <span>Billing & Plan</span>
                </Link>
              </div>

              <div className="h-px bg-border/60 my-1" />

              {/* Prominent Sign Out Button */}
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  handleSignOut()
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 w-full text-left transition-colors cursor-pointer group"
              >
                <LogOut className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
