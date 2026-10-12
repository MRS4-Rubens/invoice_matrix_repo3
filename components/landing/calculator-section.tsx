'use client'

import { useState } from 'react'
import { Calculator, Sparkles, ArrowRight } from 'lucide-react'
import { useAuthModal } from '@/components/auth/auth-modal-context'

export function CalculatorSection() {
  const [invoicesCount, setInvoicesCount] = useState<number>(150)
  const [minutesPerInvoice, setMinutesPerInvoice] = useState<number>(12)
  const { openSignup } = useAuthModal()

  // Bill Matrix takes ~45 seconds (0.75 min) per invoice
  const currentTotalHours = (invoicesCount * minutesPerInvoice) / 60
  const billMatrixHours = (invoicesCount * 0.75) / 60
  const hoursSavedMonthly = Math.max(1, Math.round(currentTotalHours - billMatrixHours))
  
  // Assuming ₹450/hr human admin cost + CA reconciliation savings
  const annualSavings = Math.round(hoursSavedMonthly * 12 * 450 + invoicesCount * 18)

  return (
    <section id="calculator" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden">
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Calculator className="w-3.5 h-3.5" />
            ROI & Time Savings Calculator
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight heading">
            Calculate your business time & cost savings
          </h2>
          <p className="mt-4 text-slate-400 text-base sm:text-lg">
            See how many administrative hours and reconciliation costs your team can recover every single month.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-center bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
          {/* Sliders Area (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Slider 1: Invoices per month */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-300">Monthly Invoices Created</span>
                <span className="font-mono text-xl font-extrabold text-indigo-400">
                  {invoicesCount.toLocaleString('en-IN')} <span className="text-xs text-slate-400 font-normal">invoices/mo</span>
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="1500"
                step="10"
                value={invoicesCount}
                onChange={(e) => setInvoicesCount(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>20</span>
                <span>500</span>
                <span>1,000</span>
                <span>1,500+</span>
              </div>
            </div>

            {/* Slider 2: Minutes spent per invoice */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span className="text-slate-300">Current Manual Time Spent Per Invoice</span>
                <span className="font-mono text-xl font-extrabold text-indigo-400">
                  {minutesPerInvoice} <span className="text-xs text-slate-400 font-normal">minutes</span>
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={minutesPerInvoice}
                onChange={(e) => setMinutesPerInvoice(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>5 min (Templates)</span>
                <span>15 min (Excel/Word)</span>
                <span>30 min (Complex Math)</span>
              </div>
            </div>

            {/* Note box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                With Bill Matrix automation:
              </div>
              <p>Average invoice creation drops to <strong className="text-white">45 seconds</strong> with instant auto-tax calculation and WhatsApp delivery.</p>
            </div>
          </div>

          {/* Results Summary Box (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-300">
                Your Estimated Returns
              </div>

              <div className="mt-4 pb-4 border-b border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">Time Recovered Monthly</div>
                <div className="text-4xl font-extrabold font-mono text-white flex items-baseline gap-2 heading">
                  <span>{hoursSavedMonthly}</span>
                  <span className="text-sm font-normal text-indigo-300">Hours / month</span>
                </div>
              </div>

              <div className="mt-4 pb-4 border-b border-slate-800 space-y-1">
                <div className="text-xs text-slate-400">Estimated Annual Cost Savings</div>
                <div className="text-3xl font-extrabold font-mono text-emerald-400 heading">
                  ₹{annualSavings.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">/ year</span>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>CA Filing turnaround reduced from 4 days to 5 mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Up to 35% faster payment collections via WhatsApp</span>
                </div>
              </div>
            </div>

            <button
              onClick={openSignup}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm glow-btn transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Claim Your Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
