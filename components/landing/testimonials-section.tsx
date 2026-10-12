'use client'

import { Star, CheckCircle2 } from 'lucide-react'

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rajesh Sharma',
      role: 'Managing Director',
      company: 'Rajesh Provisions Wholesale',
      location: 'Bengaluru, Karnataka',
      outcome: 'Saved 18 hours/month on billing',
      text: 'Switching from manual Excel sheets to Bill Matrix transformed our wholesale depot. The WhatsApp invoice dispatch with embedded dynamic UPI QR has cut our average payment recovery cycle from 22 days down to 6 days.',
      initials: 'RS',
      color: 'bg-indigo-600',
    },
    {
      name: 'Ananya Mehta',
      role: 'Co-Founder',
      company: 'Mehta Textile & Apparel',
      location: 'Surat, Gujarat',
      outcome: 'Zero CA filing discrepancies',
      text: 'Our Chartered Accountant used to spend 4 full days reconciling our HSN codes and interstate IGST invoices every month. With Bill Matrix 1-click GSTR-1 export, filing returns takes under 5 minutes without a single discrepancy.',
      initials: 'AM',
      color: 'bg-emerald-600',
    },
    {
      name: 'Vikramaditya Singh',
      role: 'Head of Operations',
      company: 'SwiftKart Logistics',
      location: 'Delhi NCR',
      outcome: '3,000+ Invoices Processed monthly',
      text: 'The master catalog feature allowed us to import 2,500 inventory items and customer GSTIN records in one go. Uptime has been 100% reliable, and creating an invoice takes our team less than 45 seconds on mobile.',
      initials: 'VS',
      color: 'bg-amber-600',
    },
  ]

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/70 border-y border-slate-200/70">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
            Verified Founder Reviews
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight heading">
            Loved by 10,000+ growing Indian businesses
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg">
            See how founders, accountants, and trade businesses streamline their daily GST operations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Stars + Outcome pill */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-amber-400 gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                    {t.outcome}
                  </span>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed font-normal">
                  "{t.text}"
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${t.color} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 heading flex items-center gap-1.5">
                    {t.name}
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {t.role}, {t.company}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
