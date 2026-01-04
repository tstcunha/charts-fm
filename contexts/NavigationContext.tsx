'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface NavigationContextType {
  isLoading: boolean
  triggerPulse: () => void
  stopPulse: () => void
}

const NavigationContext = createContext<NavigationContextType>({
  isLoading: false,
  triggerPulse: () => {},
  stopPulse: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true) // Start with true for initial load
  const pathname = usePathname()
  const pulseTimerRef = useRef<NodeJS.Timeout | null>(null)

  const triggerPulse = useCallback(() => {
    // Clear any existing timer
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current)
    }
    
    setIsLoading(true)
    // Set a fallback timeout in case stopPulse is never called
    pulseTimerRef.current = setTimeout(() => {
      setIsLoading(false)
      pulseTimerRef.current = null
    }, 3000)
  }, [])

  const stopPulse = useCallback(() => {
    // Clear any existing timer
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current)
      pulseTimerRef.current = null
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Handle navigation loading state - pulse on every page load/navigation
    setIsLoading(true)
    
    // Hide loading after a brief delay (simulates page load)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [pathname])

  // Global click handler for all links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      
      if (link && link.href) {
        // Check if it's an internal link (same origin)
        try {
          const url = new URL(link.href)
          const currentUrl = new URL(window.location.href)
          
          // Only trigger for internal navigation
          if (url.origin === currentUrl.origin && !link.href.startsWith('#')) {
            setIsLoading(true)
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <NavigationContext.Provider value={{ isLoading, triggerPulse, stopPulse }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}

