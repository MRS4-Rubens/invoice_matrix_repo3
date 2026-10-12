import type { Metadata } from 'next'
import { CustomerForm } from '@/components/app/customers/customer-form'
import { getCurrentAppUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const metadata: Metadata = { title: 'Add Customer' }

export default async function NewCustomerPage() {
  const appUser = await getCurrentAppUser()
  if (!appUser) {
    redirect('/login')
  }

  if (!appUser.business_id) {
    redirect('/settings')
  }

  const businessResult = await db
    .select({ state_code: businesses.state_code })
    .from(businesses)
    .where(eq(businesses.id, appUser.business_id))
    .limit(1)
  const sellerStateCode = businessResult[0]?.state_code || ''

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-1 shrink-0">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading uppercase">
          ADD CUSTOMER
        </h1>
        <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[315px]" style={{ textAlign: 'justify', textAlignLast: 'justify' }}>
          Effortlessly Track, Organize, Maintain, and <br />
          Add a Customer to Your Directory
        </p>
      </div>

      <CustomerForm sellerStateCode={sellerStateCode} />
    </div>
  )
}
