import { PageContainer } from '@/components/page-container'

const testimonials = [
  {
    quote:
      'Finally an invoicing app that understands Indian GST. The CGST/SGST split is automatic — I don\'t have to think about it anymore.',
    name: 'Rajesh Mehta',
    role: 'Proprietor, Mehta Traders',
    location: 'Mumbai',
    initials: 'RM',
  },
  {
    quote:
      'The Excel ITR export saves me 3 hours every month. My CA loves it. Worth every rupee.',
    name: 'Priya Nair',
    role: 'Director, TechCraft Solutions',
    location: 'Bengaluru',
    initials: 'PN',
  },
  {
    quote:
      'We switched from a desktop software costing ₹15,000/year. Bill Matrix does everything better, from the cloud.',
    name: 'Amit Sharma',
    role: 'Partner, Sunrise Exports',
    location: 'Delhi',
    initials: 'AS',
  },
]

export function TestimonialsSection() {
  return (
    <section className="bg-muted/40 py-20">
      <PageContainer>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Businesses love Bill Matrix
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-border bg-card p-6"
            >
              <div className="text-sm text-amber-400">★★★★★</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}, {t.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
