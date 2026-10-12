import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app/app-sidebar';
import { AppTopbar } from '@/components/app/app-topbar';
import { auth } from '@/lib/auth/server';
import { getCurrentAppUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticated check
  const session = await auth.getSession();
  const userEmail = session?.data?.user?.email?.toLowerCase();
  
  if (!userEmail) {
    redirect('/login');
  }

  // 2. Authorization check against platform admin emails
  const adminEmailsEnv = process.env.PLATFORM_ADMIN_EMAILS || '';
  const adminEmails = adminEmailsEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

  if (!adminEmails.includes(userEmail)) {
    redirect('/dashboard');
  }

  // 3. Fetch app user profile details for sidebar initialization
  const user = await getCurrentAppUser();
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get('sidebar:collapsed')?.value === 'true';

  const userProp = user
    ? {
        name: user.display_name || 'Admin',
        role: 'Platform Admin',
        initials: (user.display_name || 'A').substring(0, 2).toUpperCase(),
      }
    : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-background print:overflow-visible print:h-auto">
      <div className="print:hidden">
        {/* Pass down the user profile with the Platform Admin role override */}
        <AppSidebar user={userProp} defaultCollapsed={defaultCollapsed} isAdminUser={true} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <div className="print:hidden">
          <AppTopbar />
        </div>
        <main className="flex-1 overflow-y-auto pt-2.5 pb-6 px-6 lg:pt-3 lg:pb-8 lg:px-8 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
