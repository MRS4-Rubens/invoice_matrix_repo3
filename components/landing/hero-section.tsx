import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-container'

export function HeroSection() {
  return (
    <section className="py-20 sm:py-28">
      <PageContainer>
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <span className="inline-flex items-center rounded-full bg-success-subtle px-3 py-1 text-xs font-medium text-success">
            GST-ready · Built for India
          </span>

          {/* Headline */}
          <h1 className="mt-6 max-w-3xl text-5xl font-bold tracking-tight text-foreground text-balance sm:text-6xl lg:text-7xl">
            GST Billing,<br className="hidden sm:block" /> Done Right.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl text-lg text-muted-foreground text-pretty">
            Create compliant invoices, track payments, manage customers, and export
            tax-ready reports. Everything your business needs, nothing it doesn&apos;t.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/signup">Start for free — it&apos;s &#8377;0</Link>}
            />
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard">See the dashboard</Link>}
            />
          </div>

          {/* App mockup */}
          <div className="mt-14 w-full max-w-5xl overflow-hidden rounded-xl border border-border shadow-xl">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-1.5 border-b border-border bg-muted px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-red-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 rounded bg-background/60 px-3 py-0.5 text-xs text-muted-foreground">
                app.billmatrix.in/dashboard
              </div>
            </div>

            {/* App shell */}
            <div className="flex" style={{ minHeight: 380 }}>
              {/* Sidebar */}
              <div className="w-44 shrink-0 bg-primary px-3 py-4">
                <div className="mb-5 flex items-center gap-2 px-1">
                  <span className="flex size-6 items-center justify-center rounded bg-white/20 text-[10px] font-bold text-white">
                    B
                  </span>
                  <span className="text-xs font-semibold text-white">Bill Matrix</span>
                </div>
                {[
                  'Dashboard',
                  'Invoices',
                  'Customers',
                  'Products',
                  'Reports',
                ].map((item, i) => (
                  <div
                    key={item}
                    className={`mb-0.5 rounded-md px-2.5 py-1.5 text-xs ${
                      i === 0
                        ? 'bg-white/15 font-medium text-white'
                        : 'text-white/60'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Content area */}
              <div className="flex-1 bg-background p-5">
                {/* Stat cards */}
                <div className="mb-4 grid grid-cols-4 gap-3">
                  {[
                    { label: 'Today', value: '₹24,500' },
                    { label: 'Monthly', value: '₹3,12,000' },
                    { label: 'Outstanding', value: '₹45,200' },
                    { label: 'Invoices', value: '142' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-border bg-card px-3 py-2.5"
                    >
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-3 text-[10px] font-semibold text-foreground">
                    Revenue Overview
                  </p>
                  <div className="flex items-end gap-2" style={{ height: 80 }}>
                    {[40, 60, 50, 80, 70, 90].map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm bg-primary/80"
                          style={{ height: `${h}%` }}
                        />
                        <span className="text-[8px] text-muted-foreground">
                          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  )
}
