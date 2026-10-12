export function ComparisonTable() {
  return (
    <section className="py-24 px-6 max-w-4xl mx-auto">
      <h2 className="reveal in text-4xl md:text-5xl font-bold heading text-center mb-4">
        Why businesses switch to <span className="text-indigo-600">Bill Matrix</span>
      </h2>
      <p className="reveal in text-center text-zinc-500 mb-14 text-lg">The difference is night and day</p>
      <div className="reveal in overflow-hidden rounded-3xl border border-zinc-200 shadow-xl shadow-indigo-100/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-indigo-50 text-left">
              <th className="p-5 font-semibold text-zinc-800 heading">Capability</th>
              <th className="p-5 font-semibold text-indigo-600 heading bg-indigo-50/50">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4">
                    <use href="#sparkle" />
                  </svg>{' '}
                  Bill Matrix
                </span>
              </th>
              <th className="p-5 font-semibold text-zinc-400 heading">Spreadsheets / Manual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            <tr className="hover:bg-indigo-50/30 transition-colors">
              <td className="p-5 font-medium text-zinc-700">GST calculation</td>
              <td className="p-5 text-emerald-600 font-medium bg-indigo-50/20">
                <svg className="w-4 h-4 inline-block mr-1.5">
                  <use href="#check" />
                </svg>{' '}
                Automatic, error-free
              </td>
              <td className="p-5 text-zinc-400">
                <svg className="w-4 h-4 inline-block mr-1">
                  <use href="#cross" />
                </svg>{' '}
                Manual, error-prone
              </td>
            </tr>
            <tr className="hover:bg-indigo-50/30 transition-colors bg-zinc-50/50">
              <td className="p-5 font-medium text-zinc-700">ITR-ready export</td>
              <td className="p-5 text-emerald-600 font-medium bg-indigo-50/20">
                <svg className="w-4 h-4 inline-block mr-1.5">
                  <use href="#check" />
                </svg>{' '}
                One click
              </td>
              <td className="p-5 text-zinc-400">
                <svg className="w-4 h-4 inline-block mr-1">
                  <use href="#cross" />
                </svg>{' '}
                Hours of formatting
              </td>
            </tr>
            <tr className="hover:bg-indigo-50/30 transition-colors">
              <td className="p-5 font-medium text-zinc-700">Payment reminders</td>
              <td className="p-5 text-emerald-600 font-medium bg-indigo-50/20">
                <svg className="w-4 h-4 inline-block mr-1.5">
                  <use href="#check" />
                </svg>{' '}
                Automated
              </td>
              <td className="p-5 text-zinc-400">
                <svg className="w-4 h-4 inline-block mr-1">
                  <use href="#cross" />
                </svg>{' '}
                Manual follow-ups
              </td>
            </tr>
            <tr className="hover:bg-indigo-50/30 transition-colors bg-zinc-50/50">
              <td className="p-5 font-medium text-zinc-700">Invoice sharing</td>
              <td className="p-5 text-emerald-600 font-medium bg-indigo-50/20">
                <svg className="w-4 h-4 inline-block mr-1.5">
                  <use href="#check" />
                </svg>{' '}
                Email + WhatsApp
              </td>
              <td className="p-5 text-zinc-400">
                <svg className="w-4 h-4 inline-block mr-1">
                  <use href="#cross" />
                </svg>{' '}
                Print & hand over
              </td>
            </tr>
            <tr className="hover:bg-indigo-50/30 transition-colors">
              <td className="p-5 font-medium text-zinc-700">Business insights</td>
              <td className="p-5 text-emerald-600 font-medium bg-indigo-50/20">
                <svg className="w-4 h-4 inline-block mr-1.5">
                  <use href="#check" />
                </svg>{' '}
                Real-time dashboard
              </td>
              <td className="p-5 text-zinc-400">
                <svg className="w-4 h-4 inline-block mr-1">
                  <use href="#cross" />
                </svg>{' '}
                None
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}
