'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/invoices': 'Invoices',
  '/invoices/new': 'New Invoice',
  '/customers': 'Customers',
  '/customers/new': 'Add Customer',
  '/products': 'Products',
  '/products/new': 'Add Product',
  '/reports': 'Reports',
  '/settings': 'Settings',
}

export function AppTopbar() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Bill Matrix'

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-6 print:hidden">
      {/* Page title */}
      <span className="flex-1 text-base font-semibold text-foreground">
        {title}
      </span>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent">
          <Search className="size-3.5 shrink-0" />
          <span>Search...</span>
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        {/* Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" />
        </button>

        {/* Avatar */}
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          DU
        </div>
      </div>
    </header>
  )
}
