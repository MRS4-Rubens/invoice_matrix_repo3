'use client'

import { useEffect, useState } from 'react'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { AuthModalProvider } from '@/components/auth/auth-modal-context'
import { AuthenticationModal } from '@/components/auth/auth-modal'
import { AuthTriggerButton } from '@/components/auth/trigger-button'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [scrolled, setScrolled] = useState(false)
  const [showStickyCta, setShowStickyCta] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
      setShowStickyCta(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <AuthModalProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader scrolled={scrolled} />
        <div className="flex-1">{children}</div>
        <SiteFooter />

        {/* STICKY MOBILE CTA */}
        <div
          className={`fixed bottom-0 inset-x-0 md:hidden bg-white/90 backdrop-blur-xl border-t border-zinc-200 p-4 transition-transform duration-500 z-40 ${
            showStickyCta ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <AuthTriggerButton
            mode="signup"
            className="block w-full text-center bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3.5 rounded-full glow-btn text-lg cursor-pointer"
          >
            Start free — no card needed →
          </AuthTriggerButton>
        </div>

        {/* Global Portal-mounted Auth Modal */}
        <AuthenticationModal />
      </div>
    </AuthModalProvider>
  )
}

