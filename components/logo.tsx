import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  /** Where the logo links to. Defaults to the marketing home page. */
  href?: string
  /** Show the "Smart GST Invoicing for Indian Businesses" tagline. */
  showTagline?: boolean
  className?: string
}

export function Logo({
  href = '/',
  showTagline = true,
  className,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label="Bill Matrix — Smart GST Invoicing for Indian Businesses"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground"
      >
        <span className="text-base leading-none tracking-tight">B</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Bill Matrix
        </span>
        {showTagline ? (
          <span className="mt-1 text-xs font-medium text-muted-foreground">
            Smart GST Invoicing for Indian Businesses
          </span>
        ) : null}
      </span>
    </Link>
  )
}
