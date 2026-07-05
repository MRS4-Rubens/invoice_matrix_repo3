import type { Metadata } from 'next'
import { PageContainer } from '@/components/page-container'

export const metadata: Metadata = {
  title: 'Platform Admin',
}

export default function AdminHomePage() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          Platform Admin
        </span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Admin console
        </h1>
        <p className="text-sm text-muted-foreground">
          Separate platform-administration area. This is a placeholder for
          managing businesses, plans and platform settings.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Businesses', value: '0' },
          { label: 'Active plans', value: '0' },
          { label: 'Support tickets', value: '0' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
