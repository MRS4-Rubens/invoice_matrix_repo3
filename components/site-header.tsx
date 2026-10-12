'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthModal } from '@/components/auth/auth-modal-context'
import { 
  Menu, 
  X, 
  Sparkles, 
  BarChart3, 
  Layers, 
  CreditCard, 
  HelpCircle, 
  ArrowRight,
  Calculator
} from 'lucide-react'

interface SiteHeaderProps {
  scrolled?: boolean
}

export function SiteHeader({ scrolled }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { openLogin, openSignup } = useAuthModal()

  return (
    <header
      id="nav"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'glass shadow-sm border-b border-slate-200/80 py-3'
          : 'bg-white/70 backdrop-blur-md border-b border-slate-200/40 py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="#" className="flex items-center gap-2.5 group focus-visible:outline-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-base shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            B
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none flex items-center gap-1">
              Bill<span className="text-indigo-600">Matrix</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 ml-1">
                India
              </span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 leading-none mt-0.5">
              GST Billing Stack
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/70 p-1.5 rounded-full border border-slate-200/60 text-sm font-medium text-slate-600">
          <Link
            href="#features"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors"
          >
            Features
          </Link>
          <Link
            href="#dashboard"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Simulator
          </Link>
          <Link
            href="#calculator"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors"
          >
            ROI Calculator
          </Link>
          <Link
            href="#how"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="#pricing"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="#faq"
            className="px-4 py-1.5 rounded-full hover:text-slate-900 hover:bg-white transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={openLogin}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={openSignup}
            className="group text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl glow-btn transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-4 top-20 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3 z-50 animate-fadeIn">
          <div className="space-y-1">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Features
            </Link>
            <Link
              href="#dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Live GST Simulator
            </Link>
            <Link
              href="#calculator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <Calculator className="w-4 h-4 text-indigo-600" />
              ROI & Savings Calculator
            </Link>
            <Link
              href="#how"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              How it Works
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              Pricing Plans
            </Link>
            <Link
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 transition font-medium text-sm"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Frequently Asked Questions
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                openLogin()
              }}
              className="w-full text-center py-3 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              Sign In to Your Account
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                openSignup()
              }}
              className="w-full text-center py-3.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm glow-btn cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
