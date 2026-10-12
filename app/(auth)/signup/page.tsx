'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('auth', 'signup')
    router.replace(`/?${params.toString()}`)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-sm text-muted-foreground animate-pulse font-sans">
        Redirecting to sign up...
      </div>
    </div>
  )
}
