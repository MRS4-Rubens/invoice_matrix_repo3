export function FaqSection() {
  return (
    <section id="faq" className="py-24 px-6 max-w-4xl mx-auto border-t border-zinc-100">
      <div className="text-center mb-16">
        <span className="reveal in inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 tracking-wide uppercase">
          <svg className="w-4 h-4 inline mr-1.5">
            <use href="#question" />
          </svg>{' '}
          FAQ
        </span>
        <h2 className="reveal in text-4xl md:text-5xl font-bold heading">Frequently asked questions</h2>
        <p className="reveal in text-zinc-500 mt-4 text-lg">Got questions? We've got answers.</p>
      </div>

      <div className="reveal in space-y-4">
        <details className="group bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex justify-between items-center font-semibold text-zinc-800 cursor-pointer list-none text-base heading">
            How long does onboarding take?
            <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            Onboarding takes less than 5 minutes. As soon as you enter your GSTIN, we verify and fetch your business
            registration data, letting you start invoicing immediately.
          </p>
        </details>
        <details className="group bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex justify-between items-center font-semibold text-zinc-800 cursor-pointer list-none text-base heading">
            Can I export data for my CA?
            <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            Yes. Our auto-export tool compiles all sales invoices, client registries, and tax components into standard
            ITR-compliant Excel spreadsheets that CAs can consume instantly.
          </p>
        </details>
        <details className="group bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex justify-between items-center font-semibold text-zinc-800 cursor-pointer list-none text-base heading">
            Is my business data secure?
            <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            Absolutely. All business communications and transactions are protected by 256-bit SSL encryption. We also
            maintain a strict residency policy, keeping all records securely stored within servers physically located in
            India.
          </p>
        </details>
        <details className="group bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex justify-between items-center font-semibold text-zinc-800 cursor-pointer list-none text-base heading">
            Is WhatsApp sharing free?
            <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <p className="text-zinc-500 text-sm mt-3 leading-relaxed">
            WhatsApp invoicing is included in our Growth and Enterprise plans. There are no extra per-message or
            per-invoice credits to purchase.
          </p>
        </details>
      </div>
    </section>
  )
}
