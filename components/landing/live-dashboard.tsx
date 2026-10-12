'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'


interface Activity {
  id: number
  icon: string
  color: 'emerald' | 'indigo' | 'amber' | 'violet'
  text: string
  time: string
  desc: string
}

const initialActivities: Activity[] = [
  { id: 1, icon: '#check-circle', color: 'emerald', text: 'Payment received <span class="font-semibold text-zinc-800">₹42,000</span>', time: '2 minutes ago', desc: 'Invoice #1284' },
  { id: 2, icon: '#invoice', color: 'indigo', text: 'Invoice <span class="font-semibold text-zinc-800">#1292</span> sent via WhatsApp', time: '15 minutes ago', desc: 'Customer: KiranaKart' },
  { id: 3, icon: '#bell', color: 'amber', text: 'Follow-up reminder sent to <span class="font-semibold text-zinc-800">StyleDesk</span>', time: '1 hour ago', desc: 'Payment overdue' },
  { id: 4, icon: '#thumbs-up', color: 'violet', text: 'New customer <span class="font-semibold text-zinc-800">AgroTrade</span> onboarded', time: '2 hours ago', desc: 'Self signup' }
]

const dummyActivities = [
  { icon: '#check-circle', color: 'emerald', text: 'Payment received <span class="font-semibold text-zinc-800">₹18,500</span>', time: 'Just now', desc: 'Invoice #1295' },
  { icon: '#invoice', color: 'indigo', text: 'Invoice <span class="font-semibold text-zinc-800">#1296</span> generated', time: 'Just now', desc: 'Customer: MediSupply' },
  { icon: '#bell', color: 'amber', text: 'Follow-up sent to <span class="font-semibold text-zinc-800">ShopSwift</span>', time: 'Just now', desc: 'Pending ₹22,000' },
  { icon: '#thumbs-up', color: 'violet', text: 'New customer <span class="font-semibold text-zinc-800">UrbanD2C</span> added', time: 'Just now', desc: 'Self registration' }
] as const

const baseRevenuePoints = [
  { x: 0, y: 55 }, { x: 50, y: 48 }, { x: 100, y: 52 }, { x: 150, y: 38 },
  { x: 200, y: 42 }, { x: 250, y: 28 }, { x: 300, y: 35 }, { x: 350, y: 20 },
  { x: 400, y: 25 }, { x: 450, y: 15 }, { x: 500, y: 18 }, { x: 550, y: 8 },
  { x: 600, y: 10 }
]

export function LiveDashboard() {
  // Last updated timestamp state
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now())
  const [relativeTime, setRelativeTime] = useState('Just now')
  const [refreshSpin, setRefreshSpin] = useState(false)

  // KPI States
  const [invoicesToday, setInvoicesToday] = useState(128)
  const [revenue, setRevenue] = useState(4.2)
  const [followups, setFollowups] = useState(14)
  const [weekRevenue, setWeekRevenue] = useState(8.9)

  // Animation Pulse States (for trigger visual cue)
  const [pulseInvoices, setPulseInvoices] = useState(false)
  const [pulseRevenue, setPulseRevenue] = useState(false)
  const [pulseFollowups, setPulseFollowups] = useState(false)
  const [pulseWeekRevenue, setPulseWeekRevenue] = useState(false)

  // SVG Chart points state
  const [chartPoints, setChartPoints] = useState(baseRevenuePoints)

  // Activity feed state
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [activityIdCounter, setActivityIdCounter] = useState(5)

  // Refresh dynamic relative time
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSeconds = Math.floor((Date.now() - lastRefresh) / 1000)
      if (diffSeconds < 10) {
        setRelativeTime('Just now')
      } else if (diffSeconds < 60) {
        setRelativeTime(`${diffSeconds}s ago`)
      } else {
        setRelativeTime(`${Math.floor(diffSeconds / 60)} min ago`)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [lastRefresh])

  // Random-walk for KPIs
  useEffect(() => {
    const kpiInterval = setInterval(() => {
      // Invoices Today random walk
      if (Math.random() < 0.3) {
        const change = Math.floor(Math.random() * 3) - 1 // -1, 0, +1
        setInvoicesToday(prev => Math.max(0, prev + change))
        setPulseInvoices(true)
        setTimeout(() => setPulseInvoices(false), 600)
      }
      // Revenue random walk
      if (Math.random() < 0.3) {
        const change = (Math.random() * 0.2) - 0.1 // -0.1 to +0.1
        setRevenue(prev => Math.max(0, parseFloat((prev + change).toFixed(1))))
        setPulseRevenue(true)
        setTimeout(() => setPulseRevenue(false), 600)
      }
      // Follow-ups random walk
      if (Math.random() < 0.4) {
        const change = Math.floor(Math.random() * 3) - 1
        setFollowups(prev => Math.max(0, prev + change))
        setPulseFollowups(true)
        setTimeout(() => setPulseFollowups(false), 600)
      }
      // Weekly Revenue random walk
      if (Math.random() < 0.3) {
        const change = (Math.random() * 0.3) - 0.15
        setWeekRevenue(prev => Math.max(0, parseFloat((prev + change).toFixed(1))))
        setPulseWeekRevenue(true)
        setTimeout(() => setPulseWeekRevenue(false), 600)
      }
    }, 2500)

    return () => clearInterval(kpiInterval)
  }, [])

  // Random-walk for SVG Sparkline Chart
  const varyChartPoints = () => {
    setChartPoints(prev =>
      prev.map((p, i) => ({
        x: p.x,
        y: Math.max(2, Math.min(78, p.y + (Math.random() * 6 - 3) * (i < 12 ? 1 : 0)))
      }))
    )
  }

  useEffect(() => {
    const chartInterval = setInterval(varyChartPoints, 3000)
    return () => clearInterval(chartInterval)
  }, [])

  // Insert dummy activities
  useEffect(() => {
    const activityInterval = setInterval(() => {
      const dummy = dummyActivities[Math.floor(Math.random() * dummyActivities.length)]
      const newAct: Activity = {
        id: activityIdCounter,
        icon: dummy.icon,
        color: dummy.color,
        text: dummy.text,
        time: 'Just now',
        desc: dummy.desc
      }
      setActivityIdCounter(prev => prev + 1)
      setActivities(prev => [newAct, ...prev.slice(0, 5)])
    }, 8000)

    return () => clearInterval(activityInterval)
  }, [activityIdCounter])

  // Handle manual refresh button click
  const handleRefresh = () => {
    setRefreshSpin(true)
    setLastRefresh(Date.now())
    setRelativeTime('Just now')

    // Vary values instantly
    varyChartPoints()
    setInvoicesToday(prev => prev + Math.floor(Math.random() * 3) - 1)
    setRevenue(prev => parseFloat((prev + (Math.random() * 0.2 - 0.1)).toFixed(1)))
    setFollowups(prev => prev + Math.floor(Math.random() * 3) - 1)
    setWeekRevenue(prev => parseFloat((prev + (Math.random() * 0.3 - 0.15)).toFixed(1)))

    setTimeout(() => {
      setRefreshSpin(false)
    }, 600)
  }

  // Create SVG points strings
  const lineStr = chartPoints.map(p => `${p.x},${p.y}`).join(' ')
  const areaStr = `0,60 ${lineStr} 600,60`

  return (
    <section id="dashboard" className="py-16 px-6 bg-gradient-to-b from-white to-slate-50 border-y border-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="reveal in inline-block text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-5 tracking-wide uppercase">
            <svg className="w-4 h-4 inline mr-1.5">
              <use href="#bar-chart" />
            </svg>{' '}
            Live Demo
          </span>
          <h2 className="reveal in text-4xl md:text-5xl font-bold heading">
            See Bill Matrix <span className="text-indigo-600">in action</span>
          </h2>
          <p className="reveal in text-zinc-500 mt-3">
            Every element below updates just like the real dashboard — dynamically and in real time.
          </p>
        </div>

        {/* MAIN DASHBOARD CARD */}
        <div className="reveal in max-w-5xl mx-auto bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-2xl shadow-indigo-100/50 float-slow">
          {/* Dashboard Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div>
                <div className="font-bold text-xl heading">Business Snapshot</div>
                <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                  <svg className="w-3.5 h-3.5">
                    <use href="#clock" />
                  </svg>
                  <span>{relativeTime}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-full hover:bg-indigo-50 transition group"
                title="Refresh data"
              >
                <svg
                  className={`w-5 h-5 text-zinc-400 group-hover:text-indigo-600 transition-transform duration-500 ${
                    refreshSpin ? 'rotate-360' : ''
                  }`}
                  style={{ transform: refreshSpin ? 'rotate(360deg)' : undefined, transition: refreshSpin ? 'transform 0.6s' : undefined }}
                >
                  <use href="#refresh" />
                </svg>
              </button>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border border-slate-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-all group">
              <svg className="w-5 h-5 text-indigo-400 mx-auto mb-1">
                <use href="#invoice" />
              </svg>
              <div
                className={`text-2xl md:text-3xl font-bold heading text-zinc-800 ${
                  pulseInvoices ? 'scale-105 opacity-80' : 'live-value'
                } transition-all duration-300`}
              >
                {invoicesToday}
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 font-medium">Invoices Today</div>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-violet-50 border border-slate-200 rounded-2xl p-4 text-center hover:border-violet-300 transition-all group">
              <svg className="w-5 h-5 text-violet-400 mx-auto mb-1">
                <use href="#dollar" />
              </svg>
              <div
                className={`text-2xl md:text-3xl font-bold heading text-zinc-800 ${
                  pulseRevenue ? 'scale-105 opacity-80' : 'live-value'
                } transition-all duration-300`}
              >
                ₹{revenue}L
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 font-medium">Revenue</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-all group">
              <svg className="w-5 h-5 text-emerald-500 mx-auto mb-1">
                <use href="#shield" />
              </svg>
              <div className="text-2xl md:text-3xl font-bold heading text-emerald-600">99.9%</div>
              <div className="text-xs text-zinc-500 mt-1.5 font-medium">Compliance</div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-center hover:border-amber-400 transition-all group">
              <svg className="w-5 h-5 text-amber-500 mx-auto mb-1">
                <use href="#bell" />
              </svg>
              <div
                className={`text-2xl md:text-3xl font-bold heading text-amber-600 ${
                  pulseFollowups ? 'scale-105 opacity-80' : 'live-value'
                } transition-all duration-300`}
              >
                {followups}
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 font-medium">Follow-ups</div>
            </div>
            <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-slate-50 to-rose-50 border border-slate-200 rounded-2xl p-4 text-center hover:border-rose-300 transition-all group">
              <svg className="w-5 h-5 text-rose-400 mx-auto mb-1">
                <use href="#trending-up" />
              </svg>
              <div
                className={`text-2xl md:text-3xl font-bold heading text-zinc-800 ${
                  pulseWeekRevenue ? 'scale-105 opacity-80' : 'live-value'
                } transition-all duration-300`}
              >
                ₹{weekRevenue}L
              </div>
              <div className="text-xs text-zinc-500 mt-1.5 font-medium">This Week</div>
            </div>
          </div>

          {/* Revenue Chart (Interactive sparkline) */}
          <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-pink-50 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-zinc-600 heading">Revenue Trend (Today)</span>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <svg className="w-4 h-4">
                  <use href="#trending-up" />
                </svg>{' '}
                +12.4%
              </span>
            </div>
            <svg viewBox="0 0 600 80" className="w-full h-20">
              {/* Grid lines */}
              <line x1="0" y1="60" x2="600" y2="60" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="0" y1="30" x2="600" y2="30" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="4" />
              {/* Animated line */}
              <polyline
                id="revenueLine"
                fill="none"
                stroke="url(#chartGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={lineStr}
                className="transition-all duration-1000 ease-in-out"
              />
              {/* Area under line */}
              <polygon
                id="revenueArea"
                fill="url(#areaGrad)"
                opacity="0.3"
                points={areaStr}
                className="transition-all duration-1000 ease-in-out"
              />
              <defs>
                <linearGradient id="chartGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>8 AM</span>
              <span>10 AM</span>
              <span>12 PM</span>
              <span>2 PM</span>
              <span>4 PM</span>
              <span>6 PM</span>
              <span>Now</span>
            </div>
          </div>

          {/* Activity Feed + Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Recent Activity Feed */}
            <div className="md:col-span-2 bg-zinc-50 rounded-2xl p-5">
              <h4 className="text-sm font-semibold heading text-zinc-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500">
                  <use href="#bell" />
                </svg>{' '}
                Recent Activity
              </h4>
              <div className="space-y-3" id="activityFeed">
                {activities.map(activity => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 text-sm activity-item transform translate-y-0 opacity-100 transition-all duration-500"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        activity.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-600'
                          : activity.color === 'indigo'
                          ? 'bg-indigo-100 text-indigo-600'
                          : activity.color === 'amber'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-violet-100 text-violet-600'
                      }`}
                    >
                      <svg className="w-4 h-4">
                        <use href={activity.icon} />
                      </svg>
                    </div>
                    <div>
                      <p className="text-zinc-700" dangerouslySetInnerHTML={{ __html: activity.text }} />
                      <p className="text-xs text-zinc-400">
                        {activity.desc} · {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats & Actions */}
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-2xl p-5">
                <h4 className="text-sm font-semibold heading text-indigo-700 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition bg-white rounded-xl p-2.5 shadow-sm"
                  >
                    <svg className="w-4 h-4">
                      <use href="#invoice" />
                    </svg>{' '}
                    New Invoice
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition bg-white rounded-xl p-2.5 shadow-sm"
                  >
                    <svg className="w-4 h-4">
                      <use href="#lightning" />
                    </svg>{' '}
                    ITR Export
                  </Link>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 transition bg-white rounded-xl p-2.5 shadow-sm"
                  >
                    <svg className="w-4 h-4">
                      <use href="#chat-bubble" />
                    </svg>{' '}
                    WhatsApp Share
                  </Link>
                </div>
              </div>
              <div className="bg-amber-50 rounded-2xl p-5 relative overflow-hidden">
                <h4 className="text-sm font-semibold heading text-amber-700 mb-2">Payment Due</h4>
                <div className="text-2xl font-bold text-zinc-800 heading">₹1.2L</div>
                <p className="text-xs text-zinc-500">6 invoices pending</p>
                <span className="absolute -bottom-2 -right-2 text-5xl opacity-10">
                  <svg className="w-16 h-16">
                    <use href="#dollar" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
