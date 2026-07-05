import Link from 'next/link'
import { Logo } from '@/components/logo'

const footerLinks: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/' },
      { label: 'Pricing', href: '/' },
      { label: 'GST Invoicing', href: '/' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/' },
      { label: 'Contact', href: '/' },
      { label: 'Support', href: '/' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy', href: '/' },
      { label: 'Terms', href: '/' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="max-w-xs">
            <Logo showTagline />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              GST-compliant invoicing and business management, built for small
              and medium businesses across India.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.heading}>
              <h3 className="text-sm font-semibold text-foreground">
                {group.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            {`© ${new Date().getFullYear()} Bill Matrix. All rights reserved.`}
          </p>
          <p className="text-sm text-muted-foreground">
            Built for businesses across India
          </p>
        </div>
      </div>
    </footer>
  )
}
