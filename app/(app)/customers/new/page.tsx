import type { Metadata } from 'next'
import { CustomerForm } from '@/components/app/customers/customer-form'

export const metadata: Metadata = { title: 'Add Customer' }

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Add Customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new customer to your directory
        </p>
      </div>

      <CustomerForm />
    </div>
  )
}
