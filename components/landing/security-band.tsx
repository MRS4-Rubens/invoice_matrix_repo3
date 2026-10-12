'use client'

import { ShieldCheck, Lock, Landmark, Headphones, Server } from 'lucide-react'

export function SecurityBand() {
  const pillars = [
    {
      icon: Lock,
      title: '256-Bit Bank-Grade Encryption',
      desc: 'All business communication and invoice documents are protected with TLS 1.3 in transit and AES-256 at rest.',
      badge: 'Zero Knowledge',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      icon: Landmark,
      title: '100% Indian Data Residency',
      desc: 'All database records and backups reside strictly in MeitY-empaneled tier-4 data centers within Indian borders.',
      badge: 'MeitY & RBI Compliant',
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      icon: Server,
      title: '99.99% Cloud SLA & Uptime',
      desc: 'High-availability infrastructure with automatic geo-redundancy ensuring uninterrupted billing at peak business hours.',
      badge: 'Zero Downtime',
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      icon: Headphones,
      title: 'Human CA & Tech Support',
      desc: 'Direct priority assistance from certified GST practitioners and engineers via WhatsApp, Email & Call.',
      badge: 'Mon–Sat 9AM–7PM',
      color: 'text-sky-600 bg-sky-50 border-sky-100',
    },
  ]

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wider mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Enterprise Security & Trust
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight heading">
          Built for regulatory compliance and absolute data integrity
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon
          return (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${pillar.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 heading">{pillar.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-normal">{pillar.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
