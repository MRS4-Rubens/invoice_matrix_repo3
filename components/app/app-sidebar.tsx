'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { authClient } from '@/lib/auth/client'

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Invoices', icon: FileText, href: '/invoices' },
  { label: 'Customers', icon: Users, href: '/customers' },
  { label: 'Products', icon: Package, href: '/products' },
  { label: 'Reports', icon: BarChart3, href: '/reports' },
]

const accountNav: NavItem[] = [
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Help', icon: HelpCircle, href: '/' },
]

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent font-medium text-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  )
}

export function AppSidebar({ user }: { user?: { name: string, role: string, initials: string } }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card print:hidden">
      {/* Logo */}
      <div className="border-b border-border px-4 py-4">
        <Logo href="/dashboard" showTagline={false} />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Main
        </p>
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        <p className="mt-5 mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </p>
        {accountNav.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {user?.initials || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role || 'User'}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
