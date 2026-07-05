'use client'

import Link from 'next/link'
import { Logo } from '@/components/logo'

const inputClass =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
const labelClass = 'mb-1.5 block text-sm font-medium text-foreground'

// Password strength shown at level 2 (Fair) by default — visual only
const strengthSegments = [
  { active: true, color: 'bg-amber-400' },
  { active: true, color: 'bg-amber-400' },
  { active: false, color: 'bg-muted' },
  { active: false, color: 'bg-muted' },
]

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <Logo showTagline={false} />

        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start with a free account. No credit card required.
        </p>

        <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Business + Owner name */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Business Name</label>
              <input type="text" className={inputClass} placeholder="Acme Trading Co." />
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input type="text" className={inputClass} placeholder="Rajesh Mehta" />
            </div>
          </div>

          {/* GSTIN */}
          <div>
            <label className={labelClass}>GSTIN</label>
            <input
              type="text"
              className={`${inputClass} font-mono`}
              placeholder="29AABCU9603R1ZM — Optional"
              maxLength={15}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              15-character GSTIN. Your state will be auto-detected.
            </p>
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" className={inputClass} placeholder="you@company.com" />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" className={inputClass} placeholder="9876543210" />
          </div>

          {/* Password + strength */}
          <div>
            <label className={labelClass}>Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" />
            {/* Strength bar — visual only, shows "Fair" (2/4) by default */}
            <div className="mt-1.5 flex gap-1">
              {strengthSegments.map((seg, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${seg.active ? seg.color : 'bg-muted'}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Fair</p>
          </div>

          {/* Confirm password */}
          <div>
            <label className={labelClass}>Confirm Password</label>
            <input type="password" className={inputClass} placeholder="••••••••" />
          </div>

          {/* Terms checkbox */}
          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="terms"
              className="mt-0.5 rounded border-border"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Submit */}
          <button
            type="button"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
