'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-[#0A0E1A] text-slate-400 text-xs py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-14 border-b border-slate-800/80">
          {/* Brand Col (2 cols on desktop) */}
          <div className="col-span-2 space-y-4">
            <Link href="#" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                B
              </div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                Bill<span className="text-indigo-400">Matrix</span>
              </span>
            </Link>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The modern GST invoicing and tax automation stack for high-growth Indian businesses, traders, and founders.
            </p>

            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All Systems Operational • 99.99% Uptime</span>
            </div>
          </div>

          {/* Product Col */}
          <div className="space-y-3">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Product</div>
            <ul className="space-y-2.5">
              <li>
                <Link href="#features" className="hover:text-white transition">GST Invoicing Engine</Link>
              </li>
              <li>
                <Link href="#dashboard" className="hover:text-white transition">Live Tax Simulator</Link>
              </li>
              <li>
                <Link href="#calculator" className="hover:text-white transition">ROI Calculator</Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition">Pricing Plans</Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 transition font-semibold flex items-center gap-1">
                  <span>Merchant Portal</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions Col */}
          <div className="space-y-3">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Solutions</div>
            <ul className="space-y-2.5">
              <li>
                <span className="text-slate-400">Retail & Wholesale Depots</span>
              </li>
              <li>
                <span className="text-slate-400">E-Commerce & D2C Brands</span>
              </li>
              <li>
                <span className="text-slate-400">Manufacturing & Export</span>
              </li>
              <li>
                <span className="text-slate-400">IT & Professional Services</span>
              </li>
              <li>
                <span className="text-slate-400">Chartered Accountants</span>
              </li>
            </ul>
          </div>

          {/* Compliance & Contact */}
          <div className="space-y-3">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Trust & Support</div>
            <ul className="space-y-2.5">
              <li>
                <span className="text-slate-400">256-Bit Bank Encryption</span>
              </li>
              <li>
                <span className="text-slate-400">MeitY Indian Data Residency</span>
              </li>
              <li>
                <a href="mailto:support@billmatrix.in" className="hover:text-white transition">support@billmatrix.in</a>
              </li>
              <li>
                <span className="text-slate-500">Mon–Sat 9AM–7PM IST</span>
              </li>
              <li>
                <span className="text-slate-500">Bengaluru, Karnataka, India</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} Bill Matrix Technologies Private Limited. All rights reserved.
          </div>
          <div className="flex items-center gap-1">
            <span>Engineered with precision in Bengaluru, India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
