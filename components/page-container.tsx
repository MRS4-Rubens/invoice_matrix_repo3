import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
  /** Constrain content width. Defaults to a comfortable reading/app width. */
  size?: 'sm' | 'md' | 'lg' | 'full'
  /** Render as a different element, e.g. "section" or "div". Defaults to "main". */
  as?: ElementType
}

const sizeClasses: Record<NonNullable<PageContainerProps['size']>, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  full: 'max-w-none',
}

export function PageContainer({
  children,
  className,
  size = 'lg',
  as,
}: PageContainerProps) {
  const Component = as ?? 'main'
  return (
    <Component
      className={cn(
        'mx-auto w-full px-4 py-10 sm:px-6 lg:px-8',
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </Component>
  )
}
