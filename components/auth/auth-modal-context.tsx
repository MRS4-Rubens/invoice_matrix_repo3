'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type AuthMode = 'login' | 'signup'

interface AuthModalContextType {
  isOpen: boolean
  mode: AuthMode
  openLogin: () => void
  openSignup: () => void
  closeModal: () => void
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined)

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')

  useEffect(() => {
    // Read the query parameters on mount safely in the client browser
    const params = new URLSearchParams(window.location.search)
    const authParam = params.get('auth')
    if (authParam === 'login' || authParam === 'signup') {
      const timer = setTimeout(() => {
        setMode(authParam as AuthMode)
        setIsOpen(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [])

  const openLogin = () => {
    setMode('login')
    setIsOpen(true)
    // Synchronize query parameters without reloading the page layout
    const params = new URLSearchParams(window.location.search)
    params.set('auth', 'login')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  const openSignup = () => {
    setMode('signup')
    setIsOpen(true)
    // Synchronize query parameters without reloading the page layout
    const params = new URLSearchParams(window.location.search)
    params.set('auth', 'signup')
    window.history.replaceState(null, '', `?${params.toString()}`)
  }

  const closeModal = () => {
    setIsOpen(false)
    // Clean up query parameters
    const params = new URLSearchParams(window.location.search)
    params.delete('auth')
    const queryString = params.toString()
    window.history.replaceState(null, '', queryString ? `?${queryString}` : window.location.pathname)
  }

  return (
    <AuthModalContext.Provider value={{ isOpen, mode, openLogin, openSignup, closeModal }}>
      {children}
    </AuthModalContext.Provider>
  )
}

export function useAuthModal() {
  const context = useContext(AuthModalContext)
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider')
  }
  return context
}
