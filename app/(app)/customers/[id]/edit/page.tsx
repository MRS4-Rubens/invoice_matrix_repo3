import type { Metadata } from 'next'
import { CustomerForm } from '@/components/app/customers/customer-form'
import { getCurrentAppUser } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { customers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { CustomerActions } from '@/components/app/customers/customer-actions'

export const metadata: Metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await getCurrentAppUser();
  if (!appUser) {
    redirect('/login');
  }

  if (!appUser.business_id) {
    redirect('/settings');
  }

  const { id } = await params;

  const result = await db.select()
    .from(customers)
    .where(and(eq(customers.id, id), eq(customers.business_id, appUser.business_id)));

  const customer = result[0];

  if (!customer) {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Customer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update {customer.name}&apos;s details
          </p>
        </div>
        <CustomerActions customerId={customer.id} isActive={customer.is_active} />
      </div>

      <CustomerForm customer={customer} />
    </div>
  )
}
