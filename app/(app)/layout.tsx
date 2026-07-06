import { AppSidebar } from '@/components/app/app-sidebar'
import { AppTopbar } from '@/components/app/app-topbar'
import { getCurrentAppUser } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentAppUser()

  const userProp = user ? {
    name: user.display_name || 'User',
    role: user.role,
    initials: (user.display_name || 'U').substring(0, 2).toUpperCase()
  } : undefined

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar user={userProp} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
