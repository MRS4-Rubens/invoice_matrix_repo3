'use client'

import { useEffect, useState, useRef } from 'react'

interface ProgressBarProps {
  width: string
}

function ProgressBar({ width }: ProgressBarProps) {
  const [currentWidth, setCurrentWidth] = useState('0%')
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCurrentWidth(width)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [width])

  return (
    <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden" ref={elementRef}>
      <div
        className="bar h-full transition-all duration-[1400ms] ease-out"
        style={{ width: currentWidth }}
      />
    </div>
  )
}

export function StatsSection() {
  return (
    <section id="analytics" className="py-20 px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="reveal in">
          <span className="reveal in inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 tracking-wide uppercase">
            <svg className="w-4 h-4 inline mr-1.5">
              <use href="#bar-chart" />
            </svg>{' '}
            Analytics
          </span>
          <h2 className="text-4xl md:text-5xl font-bold heading leading-tight">
            Know your business<br />at a single glance
          </h2>
          <p className="text-zinc-500 mt-4 leading-relaxed">
            Stop operating in the dark. Bill Matrix parses your historical transactions to give you interactive
            cash-flow trends, tax liability estimates, and predictive outstanding payment alerts.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mt-0.5 font-bold text-sm">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-zinc-800 heading">Instant GST Breakdowns</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Know exactly how much SGST/CGST/IGST you owe before filing.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mt-0.5 font-bold text-sm">
                ✓
              </div>
              <div>
                <h4 className="font-semibold text-zinc-800 heading">Automated Kirana Insights</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Identify your highest-selling products instantly.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="reveal in bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-xl shadow-indigo-100/40">
          <h3 className="font-bold text-lg heading mb-6">Revenue Trend</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-700">October</span>
                <span className="font-bold text-zinc-900">
                  ₹3.2L <span className="text-xs text-zinc-400 font-normal">/ target ₹3L</span>
                </span>
              </div>
              <ProgressBar width="100%" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-700">November</span>
                <span className="font-bold text-zinc-900">
                  ₹3.8L <span className="text-xs text-emerald-500 font-semibold">(+18.7%)</span>
                </span>
              </div>
              <ProgressBar width="100%" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-700">December</span>
                <span className="font-bold text-zinc-900">
                  ₹4.5L <span className="text-xs text-indigo-600 font-semibold">(Festive season)</span>
                </span>
              </div>
              <ProgressBar width="100%" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-zinc-700">
                  January{' '}
                  <span className="text-xs text-emerald-500 font-bold bg-emerald-50 px-2 py-0.5 rounded ml-1">
                    Live
                  </span>
                </span>
                <span className="font-bold text-zinc-900">
                  ₹4.2L <span className="text-xs text-zinc-400 font-normal">/ target ₹5L</span>
                </span>
              </div>
              <ProgressBar width="84%" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
