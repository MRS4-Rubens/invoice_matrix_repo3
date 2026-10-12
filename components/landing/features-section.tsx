export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <span className="reveal in inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 tracking-wide uppercase">
          <svg className="w-4 h-4 inline mr-1.5">
            <use href="#sparkle" />
          </svg>{' '}
          Features
        </span>
        <h2 className="reveal in text-4xl md:text-5xl font-bold heading">Everything your business needs</h2>
        <p className="reveal in text-zinc-500 mt-4 text-lg">
          From first invoice to final filing — <span className="text-zinc-700 font-medium">one platform.</span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Card 1 */}
        <div className="reveal in card-hover bento-card md:col-span-2 bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#invoice" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">GST-Compliant Invoicing</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Auto-calculated CGST/SGST/IGST, HSN codes, and formats aligned with Indian GST rules —{' '}
            <span className="text-zinc-700 font-medium">zero manual errors, every single time.</span>
          </p>
        </div>

        {/* Card 2 */}
        <div className="reveal in card-hover bento-card bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#lightning" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">One-Click ITR Export</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Filing-ready data in seconds — no spreadsheets, no CA back-and-forth.
          </p>
        </div>

        {/* Card 3 */}
        <div className="reveal in card-hover bento-card bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#bar-chart" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">Live Sales Analytics</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Daily, monthly & annual revenue trends — always up to date.
          </p>
        </div>

        {/* Card 4 */}
        <div className="reveal in card-hover bento-card bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#folder" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">Master Data Hub</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Manage products & customers once, reuse everywhere.
          </p>
        </div>

        {/* Card 5 */}
        <div className="reveal in card-hover bento-card bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#users" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">Multi-User Access</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed font-normal">
            Role-aware authentication for your whole team.
          </p>
        </div>

        {/* Card 6 */}
        <div className="reveal in card-hover bento-card md:col-span-2 bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#chat-bubble" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">Email & WhatsApp Sharing + Payment Tracking</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Send invoices instantly, set recurring billing, and track every payment with automated follow-up reminders
            — <span className="text-zinc-700 font-medium">never chase a payment manually again.</span>
          </p>
        </div>

        {/* Card 7 */}
        <div className="reveal in card-hover bento-card bg-white border border-zinc-200 rounded-3xl p-8 animated-border">
          <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-5 icon-bounce text-white">
            <svg className="w-8 h-8">
              <use href="#smartphone" />
            </svg>
          </div>
          <h3 className="font-semibold text-xl heading">Works Everywhere</h3>
          <p className="text-zinc-500 text-sm mt-2 leading-relaxed">
            Desktop, tablet & mobile — fully responsive.
          </p>
        </div>
      </div>
    </section>
  )
}
