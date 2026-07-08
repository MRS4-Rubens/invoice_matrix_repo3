import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your customer directory
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href="/customers/new">
              <Plus className="size-4" />
              Add Customer
            </Link>
          }
        />
      </div>

      <CustomersClient initialCustomers={initialCustomers} />
    </div>
  )
}
