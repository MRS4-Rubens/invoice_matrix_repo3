'use client'

import * as React from 'react'
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import { cn } from '@/lib/utils'

export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> {
  children: React.ReactElement
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  className?: string
}

export function Tooltip({
  children,
  content,
  side = 'right',
  sideOffset = 8,
  className,
  ...props
}: TooltipProps) {
  if (!content) return children

  return (
    <TooltipPrimitive.Root {...props}>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 overflow-hidden rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-50 shadow-md transition-all duration-150 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-900 size-2" />
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
