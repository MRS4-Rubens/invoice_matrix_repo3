'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthModal } from '@/components/auth/auth-modal-context'

export function PricingSection({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const { openSignup } = useAuthModal()

  const handlePlanSelect = (plan: 'free' | 'essentials' | 'professional') => {
    if (plan === 'free') {
      if (isLoggedIn) {
        router.push('/dashboard')
      } else {
        openSignup()
      }
      return
    }

    const cycleParam = billingCycle === 'annual' ? 'yearly' : 'monthly'
    if (isLoggedIn) {
      router.push(`/checkout?plan=${plan}&cycle=${cycleParam}`)
    } else {
      openSignup()
    }
  }

  return (
    <section id="pricing" className="py-24 px-6 relative overflow-hidden">
      <div className="orb orb-3"></div>
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <span className="reveal in inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 tracking-wide uppercase">
            <svg className="w-4 h-4 inline mr-1.5">
              <use href="#diamond" />
            </svg>{' '}
            Simple Pricing
          </span>
          <h2 className="reveal in text-4xl md:text-5xl font-bold heading">Fair pricing, built for growth</h2>
          <p className="reveal in text-zinc-500 mt-4 text-lg">
            Start free, upgrade when you need to. No hidden charges.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="reveal in inline-flex items-center gap-2 bg-zinc-100 p-1 rounded-full mt-10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-white text-zinc-900 shadow'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-zinc-900 shadow'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Annual
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {/* Plan 1: Free */}
          <div className="reveal in card-hover bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-300">
            <div>
              <div className="font-semibold text-zinc-500 text-xs uppercase tracking-wide">Free Plan</div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold heading text-zinc-900">₹0</span>
                <span className="text-zinc-400 text-sm">/mo</span>
              </div>
              <p className="text-zinc-500 text-sm mt-3">Perfect for micro-businesses starting out.</p>
              <div className="border-t border-zinc-100 my-6"></div>
              <ul className="space-y-3.5 text-zinc-600 text-sm">
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Up to 30 invoices/mo</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Up to 30 customers & items</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>1 User (Owner)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Template 1 (Classic Slate)</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handlePlanSelect('free')}
              className="block w-full text-center border-2 border-zinc-200 hover:border-indigo-600 hover:text-indigo-600 text-zinc-700 font-semibold py-3.5 rounded-xl transition mt-8 text-sm cursor-pointer"
            >
              Start Free
            </button>
          </div>

          {/* Plan 2: Essentials (Popular) */}
          <div className="reveal in card-hover bg-white border-2 border-indigo-600 rounded-3xl p-8 flex flex-col justify-between relative shadow-xl shadow-indigo-100/50">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-xs px-4 py-1 rounded-full uppercase tracking-wider shadow">
              Most Popular
            </span>
            <div>
              <div className="font-semibold text-indigo-600 text-xs uppercase tracking-wide mt-2">
                {billingCycle === 'monthly' ? 'Essentials Pro' : 'Essentials Pro Annual'}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold heading text-zinc-900">
                  {billingCycle === 'monthly' ? '₹399' : '₹291'}
                </span>
                <span className="text-zinc-400 text-sm">/mo</span>
              </div>
              <p className="text-zinc-500 text-sm mt-3">
                {billingCycle === 'monthly'
                  ? 'Billed monthly'
                  : 'Billed annually (₹3,499/yr — Save 27%)'}
              </p>
              <div className="border-t border-indigo-100 my-6"></div>
              <ul className="space-y-3.5 text-zinc-600 text-sm">
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span className="font-medium text-zinc-800">Unlimited invoices</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>All 4 Traditional & Book Depot Templates</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Custom Logo Upload & White-Label</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>1-Click WhatsApp + UPI Share</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span className="font-semibold text-zinc-800">GSTR-1 & ITR Excel Export</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Custom Invoice Series &amp; Brand Prefixes</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Up to 3 Team Members</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handlePlanSelect('essentials')}
              className="block w-full text-center bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3.5 rounded-xl transition mt-8 text-sm glow-btn cursor-pointer"
            >
              Get Started →
            </button>
          </div>

          {/* Plan 3: Professional */}
          <div className="reveal in card-hover bg-white border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-300">
            <div>
              <div className="font-semibold text-zinc-500 text-xs uppercase tracking-wide">
                {billingCycle === 'monthly' ? 'Enterprise / CA Max' : 'Enterprise Annual'}
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold heading text-zinc-900">
                  {billingCycle === 'monthly' ? '₹599' : '₹416'}
                </span>
                <span className="text-zinc-400 text-sm">/mo</span>
              </div>
              <p className="text-zinc-500 text-sm mt-3">
                {billingCycle === 'monthly'
                  ? 'Billed monthly'
                  : 'Billed annually (₹4,999/yr — Save 30%)'}
              </p>
              <div className="border-t border-zinc-100 my-6"></div>
              <ul className="space-y-3.5 text-zinc-600 text-sm">
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span className="font-medium text-zinc-800">Unlimited invoices & users</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Dedicated CA Accountant Portal</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Multiple Invoice Number Series</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Bulk Inventory & Customer Import</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>24/7 Priority SLA & Dedicated Manager</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0">
                    <use href="#check-circle" />
                  </svg>
                  <span>Custom document themes</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => handlePlanSelect('professional')}
              className="block w-full text-center border-2 border-zinc-200 hover:border-zinc-800 text-zinc-700 hover:text-zinc-900 font-semibold py-3.5 rounded-xl transition mt-8 text-sm cursor-pointer"
            >
              Get Started →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
