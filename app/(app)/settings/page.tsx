import { getCurrentAppUser } from '@/lib/auth/session';
import { db } from '@/lib/db/client';
import { businesses, financialYears } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { SettingsClient } from '@/components/app/settings/settings-client';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect('/login');
  }

  let business = null;
  let currentFy = null;

  if (appUser.business_id) {
    const businessRows = await db.select().from(businesses).where(eq(businesses.id, appUser.business_id));
    business = businessRows[0] || null;

    if (business) {
      const fyRows = await db.select().from(financialYears).where(
        and(
          eq(financialYears.business_id, business.id),
          eq(financialYears.is_current, true)
        )
      );
      currentFy = fyRows[0] || null;
    }
  }

  return (
    <SettingsClient business={business} currentFy={currentFy} />
  );
}
