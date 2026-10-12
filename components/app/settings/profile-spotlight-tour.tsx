'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  RotateCcw,
  PartyPopper
} from 'lucide-react'

export interface TourStep {
  id: number
  selector: string
  badge: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'auto'
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    selector: '[data-tour-step="1"]',
    badge: 'STEP 1 OF 11 • GENERAL DETAILS',
    title: 'Enter Legal Business Name *',
    description: 'This is the official registered legal name of your business as recognized by tax authorities. It will appear at the top of all tax invoices, credit notes, and customer receipts.',
    placement: 'bottom',
  },
  {
    id: 2,
    selector: '[data-tour-step="2"]',
    badge: 'STEP 2 OF 11 • GST IDENTIFICATION',
    title: '15-Digit GSTIN Number *',
    description: 'Enter your 15-digit GSTIN (e.g. 37AJKPP7555Q2Z2). Pro-tip: Entering your GSTIN automatically extracts your 10-digit PAN and pre-selects your registered State code!',
    placement: 'bottom',
  },
  {
    id: 3,
    selector: '[data-tour-step="3"]',
    badge: 'STEP 3 OF 11 • REGISTRATION TYPE',
    title: 'GST Registration Type *',
    description: 'Select whether your business operates under Regular or Composition GST scheme. This determines default tax rate computation rules across your invoices.',
    placement: 'bottom',
  },
  {
    id: 4,
    selector: '[data-tour-step="4"]',
    badge: 'STEP 4 OF 11 • CONTACT INFO',
    title: 'Billing Email Address (Optional)',
    description: 'Your primary billing email. Copies of generated invoices and customer correspondence will display this contact address.',
    placement: 'top',
  },
  {
    id: 5,
    selector: '[data-tour-step="5"]',
    badge: 'STEP 5 OF 11 • CONTACT INFO',
    title: 'Business Phone Number (Optional)',
    description: 'Primary business phone number displayed on invoice headers for customer queries and payment follow-ups.',
    placement: 'top',
  },
  {
    id: 6,
    selector: '[data-tour-step="6"]',
    badge: 'STEP 6 OF 11 • REGISTERED ADDRESS',
    title: 'Principal Address Line 1 *',
    description: 'Your primary registered office, warehouse, or shop location as registered under GST. Required for all legal B2B invoices.',
    placement: 'bottom',
  },
  {
    id: 7,
    selector: '[data-tour-step="7"]',
    badge: 'STEP 7 OF 11 • REGISTERED ADDRESS',
    title: 'Registered City *',
    description: 'City, town, or municipality where your principal place of business operates.',
    placement: 'bottom',
  },
  {
    id: 8,
    selector: '[data-tour-step="8"]',
    badge: 'STEP 8 OF 11 • REGISTERED ADDRESS',
    title: 'Registered State *',
    description: 'Pre-filled automatically from your GSTIN state code. Crucial for calculating CGST + SGST (intra-state) vs. IGST (inter-state).',
    placement: 'bottom',
  },
  {
    id: 9,
    selector: '[data-tour-step="9"]',
    badge: 'STEP 9 OF 11 • REGISTERED ADDRESS',
    title: 'Postal Pincode *',
    description: '6-digit postal PIN code of your registered place of business.',
    placement: 'bottom',
  },
  {
    id: 10,
    selector: '[data-tour-step="10"]',
    badge: 'STEP 10 OF 11 • BANK DETAILS (OPTIONAL BLOCK)',
    title: 'Bank Details (Optional Section)',
    description: 'This entire section is spotlighted together as one optional block! Add your Bank Name, Account Number, and IFSC code for invoice footers so clients know where to pay. You can also skip this and add it later anytime in Settings.',
    placement: 'top',
  },
  {
    id: 11,
    selector: '[data-tour-step="11"]',
    badge: 'STEP 11 OF 11 • SAVE & ACTIVATE',
    title: 'Save Profile & Unlock Dashboard *',
    description: "You're all done! Click 'Save Profile' to permanently register your business in the database and unlock all invoicing, inventory, and reporting modules.",
    placement: 'top',
  },
]

interface ProfileSpotlightTourProps {
  isOpen: boolean
  onClose: () => void
  showCelebration?: boolean
  onCelebrationDismiss?: () => void
}

export function ProfileSpotlightTour({
  isOpen,
  onClose,
  showCelebration = false,
  onCelebrationDismiss,
}: ProfileSpotlightTourProps) {
  const router = useRouter()
  // Step 0 = Welcome Modal, 1..11 = Steps
  const [stepIndex, setStepIndex] = useState<number>(0)
  const [targetRect, setTargetRect] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  // Hardware-accelerated gliding state flag for step transitions
  const [isStepGliding, setIsStepGliding] = useState<boolean>(false)

  // Tooltip dynamic measurement with compact default footprint
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({
    width: 430,
    height: 170,
  })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const glidingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const clampTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [redirectCount, setRedirectCount] = useState<number>(2)

  // 1. High-Frequency 60fps Centering and Smooth-Gliding Transition on Step Change
  useEffect(() => {
    if (!isOpen || stepIndex === 0 || showCelebration) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetRect(null)
      setIsStepGliding(false)
      return
    }

    const currentTourStep = TOUR_STEPS.find((s) => s.id === stepIndex)
    if (!currentTourStep) return

    const targetElement = document.querySelector(currentTourStep.selector) as HTMLElement | null
    if (!targetElement) return

    // Activate gliding transition for SVG mask, glowing ring, and tooltip
    setIsStepGliding(true)
    if (glidingTimerRef.current) clearTimeout(glidingTimerRef.current)
    glidingTimerRef.current = setTimeout(() => {
      setIsStepGliding(false)
    }, 450)

    // Smoothly center the element in view
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })

    // High-frequency requestAnimationFrame 60fps tracking loop for 800ms
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    const startTime = performance.now()
    const loopDuration = 800

    const trackCenteringLoop = (now: number) => {
      const elapsed = now - startTime
      const el = document.querySelector(currentTourStep.selector) as HTMLElement | null
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
      }

      if (elapsed < loopDuration) {
        rafIdRef.current = requestAnimationFrame(trackCenteringLoop)
      }
    }

    rafIdRef.current = requestAnimationFrame(trackCenteringLoop)

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      if (glidingTimerRef.current) clearTimeout(glidingTimerRef.current)
    }
  }, [isOpen, stepIndex, showCelebration])

  // 2. Global Capture-Phase Scroll, Resize Synchronization & Gentle Focus Clamping
  useEffect(() => {
    if (!isOpen || stepIndex === 0 || showCelebration) return

    const currentTourStep = TOUR_STEPS.find((s) => s.id === stepIndex)
    if (!currentTourStep) return

    const targetElement = document.querySelector(currentTourStep.selector) as HTMLElement | null
    if (!targetElement) return

    const handleScrollOrResize = () => {
      const el = document.querySelector(currentTourStep.selector) as HTMLElement | null
      if (!el) return

      const rect = el.getBoundingClientRect()
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })

      // Gentle Focus Clamping:
      // If user scrolls so much that the target gets pushed outside viewport bounds,
      // gently guide scroll position back so the user never gets lost.
      if (clampTimerRef.current) clearTimeout(clampTimerRef.current)
      clampTimerRef.current = setTimeout(() => {
        const activeEl = document.querySelector(currentTourStep.selector) as HTMLElement | null
        if (activeEl) {
          const r = activeEl.getBoundingClientRect()
          if (r.bottom < 50 || r.top > window.innerHeight - 50) {
            activeEl.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            })
          }
        }
      }, 350)
    }

    // Capture phase listener to synchronize with any scrollable container (<main>, nested divs, or window)
    document.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true })
    window.addEventListener('resize', handleScrollOrResize)

    // ResizeObserver on target element in case validation errors appear or layout shifts
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        handleScrollOrResize()
      })
      ro.observe(targetElement)
    }

    return () => {
      document.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
      if (ro) ro.disconnect()
      if (clampTimerRef.current) clearTimeout(clampTimerRef.current)
    }
  }, [isOpen, stepIndex, showCelebration])

  // 3. Dynamically measure tooltip dimensions via ref & ResizeObserver
  useEffect(() => {
    if (!tooltipRef.current) return

    const measure = () => {
      if (tooltipRef.current) {
        const r = tooltipRef.current.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) {
          setTooltipSize({ width: r.width, height: r.height })
        }
      }
    }

    measure()

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && tooltipRef.current) {
      ro = new ResizeObserver(measure)
      ro.observe(tooltipRef.current)
    }

    return () => {
      if (ro) ro.disconnect()
    }
  }, [stepIndex, isOpen])

  // 4. Keyboard navigation (Escape to skip, ArrowRight/Left)
  useEffect(() => {
    if (!isOpen && !showCelebration) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && stepIndex >= 1 && stepIndex < TOUR_STEPS.length) {
        setStepIndex((prev) => prev + 1)
      } else if (e.key === 'ArrowLeft' && stepIndex > 1) {
        setStepIndex((prev) => prev - 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showCelebration, stepIndex, onClose])

  // Confetti Particle System for Celebration Modal
  useEffect(() => {
    if (!showCelebration) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number
      y: number
      size: number
      color: string
      vx: number
      vy: number
      rotation: number
      vRot: number
    }> = []

    const colors = ['#10b981', '#059669', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6']

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5 - 50,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 6,
      })
    }

    let animationFrameId: number

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vRot

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()

        if (p.y > canvas.height) {
          p.y = -10
          p.x = Math.random() * canvas.width
        }
      })
      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [showCelebration])

  // Countdown timer for automatic redirect during celebration
  useEffect(() => {
    if (!showCelebration) return

    let secondsLeft = 2

    const interval = setInterval(() => {
      secondsLeft -= 1
      if (secondsLeft <= 0) {
        clearInterval(interval)
        setRedirectCount(0)
        if (onCelebrationDismiss) onCelebrationDismiss()
        router.push('/dashboard')
        router.refresh()
      } else {
        setRedirectCount(secondsLeft)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      setRedirectCount(2)
    }
  }, [showCelebration, router, onCelebrationDismiss])

  // Handle Celebration Modal
  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-emerald-200/80 bg-white p-7 sm:p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
          
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-800 shadow-sm">
            <PartyPopper className="size-8 animate-bounce" />
          </div>

          <h2 className="text-2xl font-black font-heading text-slate-900 mb-2">
            Business Profile Created!
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium mb-6">
            Congratulations! Your registered business details have been securely saved to the database. All workspace modules are now unlocked!
          </p>

          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-950">
              <Check className="size-4 text-emerald-700 stroke-[3]" />
              <span>Invoicing, GST Calculation &amp; PDF Printing Unlocked</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-950">
              <Check className="size-4 text-emerald-700 stroke-[3]" />
              <span>Customer &amp; Product Directories Active</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-emerald-950">
              <Check className="size-4 text-emerald-700 stroke-[3]" />
              <span>Financial Year sequence counter initiated</span>
            </div>
          </div>

          <div className="mb-5 text-xs text-slate-500 font-medium">
            Redirecting to Dashboard in {redirectCount} second{redirectCount === 1 ? '' : 's'}...
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div 
                className="h-full bg-emerald-700 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(3 - redirectCount) * 33.3}%` }}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (onCelebrationDismiss) onCelebrationDismiss()
                router.push('/dashboard')
                router.refresh()
              }}
              className="w-full rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm py-2.5 px-4 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Go to Dashboard Now</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  // Step 0: Welcome Setup Modal
  if (stepIndex === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-4.5 pt-4.5 pb-4 sm:px-5.5 sm:pt-5 sm:pb-4.5 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
          
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            <Sparkles className="size-3.5" />
            <span>2-Minute Guided Setup</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-heading text-slate-900 mb-1 leading-snug">
            Welcome to Business Setup!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mb-3 leading-relaxed">
            Before issuing invoices and adding customers, let&apos;s configure your registered business details. This takes less than 2 minutes and unlocks the entire system.
          </p>

          <div className="mb-3.5 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 pt-2.5 pb-2.5 space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="flex size-6.5 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Zap className="size-3.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Auto-GSTIN Parsing</p>
                <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-normal">
                  Enter your 15-digit GSTIN and we automatically extract your PAN and State code.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex size-6.5 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <ShieldCheck className="size-3.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Permanent Database Truth</p>
                <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-normal">
                  Once saved, all modules and your dashboard unlock permanently without recurring prompts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex size-6.5 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <RotateCcw className="size-3.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">Flexible &amp; Self-Paced</p>
                <p className="text-[11.5px] sm:text-xs text-slate-500 font-medium mt-0.5 leading-normal">
                  Follow the 11 guided steps, or skip anytime to fill the form directly.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto rounded-lg border border-slate-300 bg-slate-100 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              I&apos;ll do it myself (Skip)
            </button>
            <button
              type="button"
              onClick={() => setStepIndex(1)}
              className="w-full sm:w-auto rounded-lg bg-emerald-800 hover:bg-emerald-900 px-4 py-1.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Start Guided Tour (11 Steps)</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active step (1..11)
  const currentStep = TOUR_STEPS.find((s) => s.id === stepIndex)
  if (!currentStep) return null

  // 5. Calculate Tooltip Position & Smart Auto-Flip
  const padding = 8
  const cutout = targetRect
    ? {
        x: targetRect.left - padding,
        y: targetRect.top - padding,
        w: targetRect.width + padding * 2,
        h: targetRect.height + padding * 2,
      }
    : null

  const vpWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vpHeight = typeof window !== 'undefined' ? window.innerHeight : 800

  const tooltipWidth = Math.min(tooltipSize.width || 430, vpWidth - 32)
  const tooltipHeight = tooltipSize.height || 170

  // Smart Auto-Flip based on available vertical space in viewport
  let placement: 'top' | 'bottom' = 'bottom'
  if (cutout) {
    const spaceAbove = cutout.y
    const spaceBelow = vpHeight - (cutout.y + cutout.h)
    const requiredSpace = tooltipHeight + 24

    if (currentStep.placement === 'top') {
      if (spaceAbove >= requiredSpace) {
        placement = 'top'
      } else if (spaceBelow >= requiredSpace) {
        placement = 'bottom'
      } else {
        placement = spaceAbove >= spaceBelow ? 'top' : 'bottom'
      }
    } else if (currentStep.placement === 'bottom') {
      if (spaceBelow >= requiredSpace) {
        placement = 'bottom'
      } else if (spaceAbove >= requiredSpace) {
        placement = 'top'
      } else {
        placement = spaceBelow >= spaceAbove ? 'bottom' : 'top'
      }
    } else {
      placement = spaceBelow >= requiredSpace ? 'bottom' : 'top'
    }
  }

  // Horizontal coordinates centered on the cutout
  const cutoutCenterX = cutout ? cutout.x + cutout.w / 2 : vpWidth / 2
  let tooltipLeft = cutoutCenterX - tooltipWidth / 2
  // Clamped with 20px padding from viewport edges
  tooltipLeft = Math.max(20, Math.min(vpWidth - tooltipWidth - 20, tooltipLeft))

  // Vertical coordinates (floating with clean 12px gap)
  let tooltipTop = 100
  if (cutout) {
    if (placement === 'bottom') {
      tooltipTop = cutout.y + cutout.h + 12
    } else {
      tooltipTop = cutout.y - tooltipHeight - 12
    }
  }
  tooltipTop = Math.max(16, Math.min(vpHeight - tooltipHeight - 16, tooltipTop))

  return (
    <div className="fixed inset-0 z-[9998] overflow-hidden pointer-events-none">
      {/* Hardware-Accelerated Smooth Gliding SVG Cutout Mask */}
      <svg className="fixed inset-0 size-full pointer-events-none">
        <defs>
          <mask id="spotlight-tour-mask">
            {/* White covers entire viewport */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black punches the transparent hole with smooth cubic-bezier gliding */}
            {cutout && (
              <rect
                x={cutout.x}
                y={cutout.y}
                width={cutout.w}
                height={cutout.h}
                rx={12}
                ry={12}
                fill="black"
                style={{
                  transition: isStepGliding
                    ? 'all 400ms cubic-bezier(0.25, 1, 0.5, 1)'
                    : 'none',
                }}
              />
            )}
          </mask>
        </defs>
        {/* Dark backdrop with cutout hole */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.72)"
          mask="url(#spotlight-tour-mask)"
        />
      </svg>

      {/* Crisp Glowing Ring around active target with smooth gliding (unified rx=12 and soft ambient glow) */}
      {cutout && (
        <div
          className="fixed rounded-xl border-2 border-emerald-500 shadow-[0_0_16px_rgba(16,185,129,0.35)] pointer-events-none"
          style={{
            top: cutout.y,
            left: cutout.x,
            width: cutout.w,
            height: cutout.h,
            transition: isStepGliding
              ? 'all 400ms cubic-bezier(0.25, 1, 0.5, 1)'
              : 'none',
          }}
        />
      )}

      {/* Floating Dynamic Tooltip Guidance Card with Smart Auto-Flip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-auto rounded-2xl border border-slate-200/90 bg-white px-4.5 pt-3.5 pb-3.5 text-slate-900 shadow-2xl animate-in fade-in overflow-hidden"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: 430,
          maxWidth: 'calc(100vw - 32px)',
          transition: isStepGliding
            ? 'top 400ms cubic-bezier(0.25, 1, 0.5, 1), left 400ms cubic-bezier(0.25, 1, 0.5, 1)'
            : 'none',
        }}
      >
        {/* Top Emerald Accent Bar - Full Width Corner to Corner */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        
        {/* Step Badge Row (Number 2: mb-1.5) */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-black tracking-wider uppercase text-emerald-800">
            {currentStep.badge}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mr-1 rounded cursor-pointer"
            title="Close Tour"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Title (Number 3: mb-1) */}
        <h3 className="text-base font-black font-heading text-slate-900 mb-1 leading-snug">
          {currentStep.title}
        </h3>

        {/* Description (Number 4: mb-2.5) */}
        <p className="text-xs sm:text-sm font-medium text-slate-600 mb-2.5 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Footer (Number 5: pt-2.5) */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Step {currentStep.id} of {TOUR_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={stepIndex <= 1}
              onClick={() => setStepIndex((prev) => Math.max(1, prev - 1))}
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="size-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (stepIndex < TOUR_STEPS.length) {
                  setStepIndex((prev) => prev + 1)
                } else {
                  // Step 11: Prompt user to save or dismiss
                  onClose()
                }
              }}
              className="rounded-lg bg-emerald-800 hover:bg-emerald-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{stepIndex === TOUR_STEPS.length ? 'Got it (Save Now)' : 'Next Step'}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
