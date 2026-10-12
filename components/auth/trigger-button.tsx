'use client'

import React from 'react'
import { useAuthModal } from './auth-modal-context'

interface AuthTriggerButtonProps {
  mode?: 'login' | 'signup'
  className?: string
  children: React.ReactNode
}

export function AuthTriggerButton({
  mode = 'signup',
  className,
  children,
}: AuthTriggerButtonProps) {
  const { openLogin, openSignup } = useAuthModal()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      openLogin()
    } else {
      openSignup()
    }
  }

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
