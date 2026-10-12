import type { Metadata } from 'next'
import { getCurrentAppUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { customers } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { CustomersClient } from '@/components/app/customers/customers-client'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect('/login');
  }

  if (!appUser.business_id) {
    // Should go to settings if business profile is not complete
    redirect('/settings');
  }

  const initialCustomers = await db.select()
    .from(customers)
    .where(and(eq(customers.business_id, appUser.business_id), eq(customers.is_active, true)))
    .orderBy(asc(customers.name));

  return <CustomersClient initialCustomers={initialCustomers} />
}
