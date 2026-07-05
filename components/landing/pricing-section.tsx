import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/page-container'
import { cn } from '@/lib/utils'

interface PricingPlan {
  name: string
  price: string
  period: string
  features: string[]
  cta: string
  href: string
  variant: 'default' | 'outline'
  highlight?: boolean
  badge?: string
}

const plans: PricingPlan[] = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    features: [
      'Up to 50 invoices/month',
      '1 user',
      'PDF download',
      'Basic dashboard',
    ],
    cta: 'Get started free',
    href: '/signup',
    variant: 'outline',
  },
  {
    name: 'Professional',
    price: '₹499',
    period: '/month',
    features: [
      'Unlimited invoices',
      'Up to 5 users',
      'Excel ITR export',
      'Cloud storage (iDrive e2)',
      'Email invoice to customers',
      'Priority support',
    ],
    cta: 'Start free trial',
    href: '/signup',
    variant: 'default',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Enterprise',
    price: '₹1,499',
    period: '/month',
    features: [
      'Everything in Professional',
      'Multiple businesses',
      'Audit logs',
      'API access',
      'Dedicated support',
      'Custom invoice prefix',
    ],
    cta: 'Contact us',
    href: 'mailto:sales@billmatrix.in',
    variant: 'outline',
  },
]

export function PricingSection() {
  return (
    <section className="py-20">
      <PageContainer>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            No hidden charges. No per-invoice fees. Cancel anytime.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-xl border bg-card p-7',
                plan.highlight
                  ? 'border-primary ring-2 ring-primary'
                  : 'border-border',
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    {plan.badge}
                  </span>
                </div>
              )}

              <p className="font-semibold text-foreground">{plan.name}</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant={plan.variant}
                  className="w-full"
                  nativeButton={false}
                  render={<Link href={plan.href}>{plan.cta}</Link>}
                />
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
