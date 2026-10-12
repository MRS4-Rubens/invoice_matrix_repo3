import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/app/app-sidebar'
import { AppTopbar } from '@/components/app/app-topbar'
import { getCurrentAppUser } from '@/lib/auth/session'
import { auth } from '@/lib/auth/server'

import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentAppUser()
  const session = await auth.getSession()
  const userEmail = session?.data?.user?.email?.toLowerCase()
  const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || ''
  const adminEmails = adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const isAdminUser = userEmail ? adminEmails.includes(userEmail) : false

  const cookieStore = await cookies()
  const defaultCollapsed = cookieStore.get('sidebar:collapsed')?.value === 'true'

  const userProp = user ? {
    name: user.display_name || 'User',
    role: user.role,
    initials: (user.display_name || 'U').substring(0, 2).toUpperCase()
  } : undefined

  let subscriptionProp: {
    plan: string;
    status: string;
    endsAt: string | null;
  } | null = null

  let businessLogoUrl: string | undefined = undefined

  if (user?.business_id) {
    const biz = await db
      .select({
        plan: businesses.subscription_plan,
        status: businesses.subscription_status,
        endsAt: businesses.subscription_ends_at,
        trialEndsAt: businesses.trial_ends_at,
        logoStorageKey: businesses.logo_storage_key,
      })
      .from(businesses)
      .where(eq(businesses.id, user.business_id))
      .limit(1)

    if (biz[0]) {
      subscriptionProp = {
        plan: biz[0].plan,
        status: biz[0].status,
        endsAt: biz[0].endsAt ? biz[0].endsAt.toISOString() : (biz[0].trialEndsAt ? biz[0].trialEndsAt.toISOString() : null),
      }

      if (biz[0].logoStorageKey) {
        businessLogoUrl = `/api/business/${user.business_id}/logo`
      }
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background print:overflow-visible print:h-auto">
      <div className="print:hidden">
        <AppSidebar
          user={userProp}
          defaultCollapsed={defaultCollapsed}
          isAdminUser={isAdminUser}
          subscription={subscriptionProp}
          businessLogoUrl={businessLogoUrl}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="relative z-40 print:hidden">
          <AppTopbar />
        </div>
        <main className="flex-1 overflow-y-auto pt-2.5 pb-6 px-6 lg:pt-3 lg:pb-8 lg:px-8 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  )
}
