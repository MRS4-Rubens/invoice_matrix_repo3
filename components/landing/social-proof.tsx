'use client'

export function SocialProof() {
  const companies = [
    { name: 'Zenith Logistics', sector: 'Supply Chain' },
    { name: 'KisanAgro Trade', sector: 'Agriculture B2B' },
    { name: 'UrbanCraft D2C', sector: 'Retail & Fashion' },
    { name: 'MediPulse Health', sector: 'Pharma Distro' },
    { name: 'NextWave Tech', sector: 'IT Services' },
    { name: 'Apex Engineering', sector: 'Manufacturing' },
    { name: 'VyaparKart Wholesale', sector: 'FMCG Trade' },
    { name: 'StyleMatrix Apparel', sector: 'Textiles' },
  ]

  // Double list for seamless infinite loop
  const marqueeItems = [...companies, ...companies]

  return (
    <section className="py-14 border-y border-slate-200/80 bg-slate-50/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Trusted by 10,000+ Indian founders across retail, wholesale, logistics & D2C
        </p>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="marquee-track flex items-center gap-12 sm:gap-16">
          {marqueeItems.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors px-4 py-2 rounded-xl border border-slate-200/60 bg-white shadow-xs cursor-default whitespace-nowrap"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-extrabold text-xs text-slate-800">
                {item.name[0]}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold text-sm text-slate-900 tracking-tight">{item.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  {item.sector}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
