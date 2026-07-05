import {
  FileText,
  Hash,
  Users,
  Package,
  FileSpreadsheet,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageContainer } from '@/components/page-container'

interface FeatureCard {
  icon: LucideIcon
  title: string
  description: string
}

const features: FeatureCard[] = [
  {
    icon: FileText,
    title: 'GST-Compliant Invoices',
    description:
      'Auto CGST/SGST/IGST split based on buyer and seller state. Always audit-ready.',
  },
  {
    icon: Hash,
    title: 'Smart Invoice Numbers',
    description:
      'Format: INV-DD/MM/YY/001. Auto-resets daily. Manual override supported.',
  },
  {
    icon: Users,
    title: 'Customer Management',
    description:
      'B2B, B2C, and export customers. GSTIN auto-detection and state-wise GST routing.',
  },
  {
    icon: Package,
    title: 'Product Catalogue',
    description:
      'HSN codes, GST rates, barcode support. One click to auto-fill an invoice line.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel ITR Export',
    description:
      'One-click tax-ready Excel reports with CGST, SGST, IGST columns. Ready for your CA.',
  },
  {
    icon: Shield,
    title: 'Secure Cloud Storage',
    description:
      'Invoices and documents stored on iDrive e2. Signed URLs, 6+ year retention.',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20">
      <PageContainer>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Everything you need to run your business
          </h2>
          <p className="mt-3 text-muted-foreground">
            From first invoice to ITR filing — Bill Matrix handles it all.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/[0.08]">
                  <Icon className="size-5 text-primary" />
                </div>
                <p className="mt-4 text-sm font-semibold text-foreground">
                  {feature.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </PageContainer>
    </section>
  )
}
