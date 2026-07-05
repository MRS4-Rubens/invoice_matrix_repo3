import { PageContainer } from '@/components/page-container'

const steps = [
  {
    number: '1',
    title: 'Create your business',
    description:
      'Enter your GSTIN, business details, and bank info. Takes 2 minutes.',
  },
  {
    number: '2',
    title: 'Add customers & products',
    description:
      'Build your catalogue with HSN codes and GST rates. Reuse across all invoices.',
  },
  {
    number: '3',
    title: 'Generate & send invoices',
    description:
      'Fill invoice in seconds. Download PDF, share by email, track payment status.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20">
      <PageContainer>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Up and running in 3 steps
          </h2>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-start">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {step.number}
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </PageContainer>
    </section>
  )
}
