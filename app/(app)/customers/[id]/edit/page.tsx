import type { Metadata } from 'next'
import { CustomerForm } from '@/components/app/customers/customer-form'
import { getCurrentAppUser } from '@/lib/auth/session'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db/client'
import { customers, businesses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { CustomerActions } from '@/components/app/customers/customer-actions'

export const metadata: Metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const appUser = await getCurrentAppUser()
  if (!appUser) {
    redirect('/login')
  }

  if (!appUser.business_id) {
    redirect('/settings')
  }

  const { id } = await params

  const [customerResult, businessResult] = await Promise.all([
    db.select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.business_id, appUser.business_id))),
    db.select({ state_code: businesses.state_code })
      .from(businesses)
      .where(eq(businesses.id, appUser.business_id))
      .limit(1)
  ])

  const customer = customerResult[0]
  if (!customer) {
    notFound()
  }

  const sellerStateCode = businessResult[0]?.state_code || ''

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex flex-col gap-1 shrink-0">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
            EDIT CUSTOMER
          </h1>
          <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
            Effortlessly Track, Organize, Maintain, and <br />
            Update Business Details in Your Directory
          </p>
        </div>
        <CustomerActions customerId={customer.id} isActive={customer.is_active} />
      </div>

      <CustomerForm customer={customer} sellerStateCode={sellerStateCode} />
    </div>
  )
}
