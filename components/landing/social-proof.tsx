import { PageContainer } from '@/components/page-container'

export function SocialProof() {
  const companies = [
    'Rajesh Traders',
    'Mehta & Sons',
    'TechCraft India',
    'Patel Fabrics',
    'Sunrise Exports',
  ]

  return (
    <div className="border-y border-border bg-card py-6">
      <PageContainer>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="shrink-0 text-sm text-muted-foreground">
            Trusted by 1,200+ businesses across India
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {companies.map((name) => (
              <span
                key={name}
                className="text-sm font-semibold text-muted-foreground/50"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </PageContainer>
    </div>
  )
}
