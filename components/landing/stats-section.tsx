import { PageContainer } from '@/components/page-container'

const stats = [
  { value: '50,000+', label: 'Invoices Generated' },
  { value: '1,200+', label: 'Businesses Onboarded' },
  { value: '₹120 Cr+', label: 'GST Calculated' },
  { value: '99.9%', label: 'Uptime' },
]

export function StatsSection() {
  return (
    <section className="bg-primary py-16">
      <PageContainer>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl font-bold text-primary-foreground">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/70">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
