'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from '@/i18n/routing'
import { Link, usePathname } from '@/i18n/routing'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import SafeImage from '@/components/SafeImage'
import { useNavigation } from '@/contexts/NavigationContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faBars, faTimes } from '@fortawesome/free-solid-svg-icons'
import { GROUP_THEMES } from '@/lib/group-themes'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

// Lazy load SignInModal to reduce initial bundle size
const SignInModal = dynamic(() => import('@/components/SignInModal'), {
  ssr: false,
  loading: () => null,
})

// Lazy load QuickAccessInfoModal
const QuickAccessInfoModal = dynamic(() => import('@/components/QuickAccessInfoModal'), {
  ssr: false,
  loading: () => null,
})

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading } = useNavigation()
  const t = useSafeTranslations('navbar')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const signOutStartTimeRef = useRef<number | null>(null)
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const [userData, setUserData] = useState<{
    name: string | null
    lastfmUsername: string
    image: string | null
    isSuperuser: boolean
  } | null>(null)
  const [isUserDataLoading, setIsUserDataLoading] = useState(true)
  const [quickAccessGroup, setQuickAccessGroup] = useState<{
    id: string
    name: string
    image: string | null
    colorTheme: string
  } | null>(null)
  const [isQuickAccessLoading, setIsQuickAccessLoading] = useState(true)
  const [isQuickAccessInfoOpen, setIsQuickAccessInfoOpen] = useState(false)
  const quickAccessButtonRef = useRef<HTMLButtonElement>(null)
  const prevPathnameRef = useRef(pathname)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Fetch user data and quick access group
  useEffect(() => {
    if (session?.user?.email) {
      setIsUserDataLoading(true)
      setIsQuickAccessLoading(true)
      
      fetch('/api/user/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
          setUserData({
            name: data.user.name,
            lastfmUsername: data.user.lastfmUsername,
            image: data.user.image,
            isSuperuser: data.user.isSuperuser || false,
          })
          }
        })
        .catch(console.error)
        .finally(() => setIsUserDataLoading(false))
      
      // Fetch quick access group
      fetch('/api/user/quick-access')
        .then(res => res.json())
        .then(data => {
          if (data.group) {
            setQuickAccessGroup(data.group)
          } else {
            setQuickAccessGroup(null)
          }
        })
        .catch(console.error)
        .finally(() => setIsQuickAccessLoading(false))
    } else {
      setQuickAccessGroup(null)
      setIsUserDataLoading(false)
      setIsQuickAccessLoading(false)
    }
  }, [session])

  // Listen for quick access updates
  useEffect(() => {
    const handleQuickAccessUpdate = () => {
      if (session?.user?.email) {
        setIsQuickAccessLoading(true)
        fetch('/api/user/quick-access')
          .then(res => res.json())
          .then(data => {
            if (data.group) {
              setQuickAccessGroup(data.group)
            } else {
              setQuickAccessGroup(null)
            }
          })
          .catch(console.error)
          .finally(() => setIsQuickAccessLoading(false))
      }
    }

    window.addEventListener('quickAccessUpdated', handleQuickAccessUpdate)
    return () => {
      window.removeEventListener('quickAccessUpdated', handleQuickAccessUpdate)
    }
  }, [session])

  // Refetch when navigating away from profile page
  useEffect(() => {
    const prevPathWithoutLocale = prevPathnameRef.current?.replace(/^\/[^/]+/, '') || ''
    const currentPathWithoutLocale = pathname?.replace(/^\/[^/]+/, '') || ''
    if (prevPathWithoutLocale === '/profile' && currentPathWithoutLocale !== '/profile' && session?.user?.email) {
      setIsUserDataLoading(true)
      fetch('/api/user/me')
        .then(res => res.json())
        .then(data => {
          if (data.user) {
          setUserData({
            name: data.user.name,
            lastfmUsername: data.user.lastfmUsername,
            image: data.user.image,
            isSuperuser: data.user.isSuperuser || false,
          })
          }
        })
        .catch(console.error)
        .finally(() => setIsUserDataLoading(false))
    }
    // Note: Quick access is not refetched on pathname change to prevent flashing
    // It only updates when the session changes or when explicitly updated via events
    prevPathnameRef.current = pathname
  }, [pathname, session])

  // Clear sign out loading screen when user is actually logged out, but ensure it shows for at least 1 second
  useEffect(() => {
    if (isSigningOut && status === 'unauthenticated') {
      const elapsed = signOutStartTimeRef.current 
        ? Date.now() - signOutStartTimeRef.current 
        : 0
      const remainingTime = Math.max(0, 1000 - elapsed)
      
      setTimeout(() => {
        setIsSigningOut(false)
        signOutStartTimeRef.current = null
      }, remainingTime)
    }
  }, [isSigningOut, status])

  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isDropdownOpen])

  const handleLogout = useCallback(async () => {
    setIsSigningOut(true)
    signOutStartTimeRef.current = Date.now()
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }, [router])

  const isAuthenticated = useMemo(() => status === 'authenticated' && session?.user, [status, session?.user])
  const isSessionLoading = status === 'loading'

  // Don't show navbar on auth pages, but still show loading screen if signing out
  // usePathname() from next-intl already returns pathname without locale prefix
  const pathnameWithoutLocale = pathname || ''
  if (pathnameWithoutLocale?.startsWith('/auth/')) {
    return isSigningOut ? (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
          <p className="text-white text-lg font-semibold">{t('signingOut')}</p>
        </div>
      </div>
    ) : null
  }

  return (
    <>
      {isSigningOut && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
            <p className="text-white text-lg font-semibold">{t('signingOut')}</p>
          </div>
        </div>
      )}
      <nav 
        className="sticky top-0 z-50 relative overflow-x-hidden bg-black"
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
        }}
      >
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 w-1/4 shadow-lg shadow-yellow-500/50 animate-race-bar" />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-4 md:space-x-8">
            <Link 
              href="/" 
              className={`transition-all cursor-pointer select-none ${isLoading ? 'animate-pulse-scale' : ''}`}
            >
              <Image
                src="/logo-transparent.png"
                alt="ChartsFM"
                width={180}
                height={60}
                className="h-10 md:h-12 w-auto select-none"
                priority
              />
            </Link>
            {/* Desktop Navigation - hidden on mobile */}
            {isAuthenticated && (
              <div className="hidden md:flex space-x-2">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathnameWithoutLocale === '/dashboard'
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathnameWithoutLocale === '/dashboard'
                      ? {
                          background: 'var(--theme-primary)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                      : {
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (pathnameWithoutLocale !== '/dashboard') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathnameWithoutLocale !== '/dashboard') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  {t('dashboard')}
                </Link>
                <Link
                  href="/groups"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathnameWithoutLocale?.startsWith('/groups') && !pathnameWithoutLocale?.startsWith('/groups/discover')
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathnameWithoutLocale?.startsWith('/groups') && !pathnameWithoutLocale?.startsWith('/groups/discover')
                      ? {
                          background: 'var(--theme-primary)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                      : {
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!(pathnameWithoutLocale?.startsWith('/groups') && !pathnameWithoutLocale?.startsWith('/groups/discover'))) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(pathnameWithoutLocale?.startsWith('/groups') && !pathnameWithoutLocale?.startsWith('/groups/discover'))) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  {t('groups')}
                </Link>
                <Link
                  href="/groups/discover"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathnameWithoutLocale?.startsWith('/groups/discover')
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathnameWithoutLocale?.startsWith('/groups/discover')
                      ? {
                          background: 'var(--theme-primary)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                      : {
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!pathnameWithoutLocale?.startsWith('/groups/discover')) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!pathnameWithoutLocale?.startsWith('/groups/discover')) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  {t('discover')}
                </Link>
              </div>
            )}
          </div>

          {isSessionLoading || (isAuthenticated && isUserDataLoading) ? (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
            </div>
          ) : isAuthenticated && !isUserDataLoading ? (
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="w-6 h-6" />
              </button>
              
              {/* Desktop Quick Access and User Menu - hidden on mobile */}
              <div className="hidden md:flex items-center space-x-3">
              {/* Quick Access Group or + Button */}
              {isQuickAccessLoading ? null : (quickAccessGroup ? (() => {
                const theme = GROUP_THEMES[quickAccessGroup.colorTheme as keyof typeof GROUP_THEMES]
                const isRainbow = quickAccessGroup.colorTheme === 'rainbow'
                // Convert primaryDarker RGB to RGBA with opacity for glassmorphic effect
                const primaryDarkerRgb = theme?.primaryDarker || 'rgb(255, 255, 255)'
                // Extract RGB values and add opacity
                const rgbMatch = primaryDarkerRgb.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/)
                const backgroundColor = rgbMatch 
                  ? `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.3)`
                  : 'rgba(255, 255, 255, 0.1)'
                
                // Rainbow gradient border
                const rainbowGradient = 'linear-gradient(135deg, rgb(239 68 68) 0%, rgb(249 115 22) 14.28%, rgb(234 179 8) 28.57%, rgb(34 197 94) 42.85%, rgb(59 130 246) 57.14%, rgb(147 51 234) 71.42%, rgb(219 39 119) 85.71%, rgb(239 68 68) 100%)'
                
                if (isRainbow) {
                  // For rainbow, use a partially opaque dark background to cover the gradient
                  const rainbowBackground = rgbMatch 
                    ? `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, 0.4)`
                    : 'rgba(0, 0, 0, 0.3)'
                  
                  return (
                    <div
                      className="rounded-full inline-block"
                      style={{
                        background: rainbowGradient,
                        padding: '1px',
                      }}
                    >
                      <div
                        className="rounded-full"
                        style={{
                          background: rainbowBackground,
                          backdropFilter: 'blur(12px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                        }}
                      >
                        <Link
                          href={`/groups/${quickAccessGroup.id}`}
                          className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold focus:outline-none transition-all duration-200"
                          style={{
                            color: 'white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.parentElement && (e.currentTarget.parentElement.style.filter = 'brightness(1.1)')
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.parentElement && (e.currentTarget.parentElement.style.filter = '')
                          }}
                        >
                          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{
                            border: '1px solid transparent',
                          }}>
                            <SafeImage
                              src={quickAccessGroup.image}
                              alt={quickAccessGroup.name}
                              className="object-cover w-8 h-8 rounded-full"
                            />
                          </div>
                          <span className="max-w-[150px] truncate">{quickAccessGroup.name}</span>
                        </Link>
                      </div>
                    </div>
                  )
                }
                
                return (
                <Link
                  href={`/groups/${quickAccessGroup.id}`}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold focus:outline-none transition-all duration-200"
                  style={{
                    background: backgroundColor,
                    color: 'white',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: `1px solid ${theme?.ring || 'rgba(255, 255, 255, 0.2)'}`,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = ''
                  }}
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{
                    border: `1px solid ${theme?.ring || 'rgba(255, 255, 255, 0.3)'}`,
                  }}>
                    <SafeImage
                      src={quickAccessGroup.image}
                      alt={quickAccessGroup.name}
                      className="object-cover w-8 h-8 rounded-full"
                    />
                  </div>
                  <span className="max-w-[150px] truncate">{quickAccessGroup.name}</span>
                </Link>
                )
              })() : (
                <button
                  ref={quickAccessButtonRef}
                  onClick={() => setIsQuickAccessInfoOpen(true)}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold text-gray-200 hover:text-white focus:outline-none transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    e.currentTarget.style.filter = 'brightness(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.filter = ''
                  }}
                  aria-label={t('addGroupToQuickAccess')}
                >
                  <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
                </button>
              ))}
              
              {/* User Button */}
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-semibold text-gray-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    e.currentTarget.style.filter = 'brightness(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.filter = ''
                  }}
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border-2 border-yellow-500">
                    <SafeImage
                      src={userData?.image}
                      alt={userData?.name || t('user')}
                      className="object-cover w-8 h-8 rounded-full"
                    />
                  </div>
                  <span className="max-w-[180px] truncate">{userData?.name || session?.user?.name || t('user')}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

              {isDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-[45]"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div 
                    className="fixed w-56 rounded-2xl shadow-xl z-[60] overflow-hidden" 
                    style={{ 
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`,
                      background: 'rgba(17, 24, 39, 0.8)',
                      backdropFilter: 'blur(20px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-700/50 min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {userData?.name || session?.user?.name || t('user')}
                        </p>
                        {userData?.lastfmUsername && (
                          <p className="text-xs font-bold text-gray-400 truncate">
                            @{userData.lastfmUsername}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                        onClick={() => setIsDropdownOpen(false)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {t('profile')}
                      </Link>
                      {userData?.lastfmUsername && (
                        <Link
                          href={`/u/${encodeURIComponent(userData.lastfmUsername)}`}
                          className="block px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                          onClick={() => setIsDropdownOpen(false)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          {t('publicProfile')}
                        </Link>
                      )}
                      {userData?.isSuperuser && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                          onClick={() => setIsDropdownOpen(false)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          Admin Panel
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {t('signOut')}
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
              </div>
            </div>
          ) : status === 'unauthenticated' ? (
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Mobile Hamburger Button for unauthenticated */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-200 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="w-6 h-6" />
              </button>
              
              {/* Desktop Auth Buttons - hidden on mobile */}
              <div className="hidden md:flex items-center space-x-3">
              <button
                onClick={() => setIsSignInModalOpen(true)}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                  e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.filter = ''
                }}
              >
                {t('signIn')}
              </button>
              <Link
                href="/auth/signup"
                className="px-4 py-2 rounded-full text-sm font-semibold text-black transition-all duration-200"
                style={{
                  background: 'var(--theme-primary)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = ''
                }}
              >
                {t('signUp')}
              </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Mobile Menu Slide-out */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[60] md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Mobile Menu */}
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black z-[70] md:hidden overflow-y-auto"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="px-4 py-6 space-y-4">
              {isAuthenticated ? (
                <>
                  {/* User Info */}
                  {userData && (
                    <div className="pb-4 border-b border-gray-800">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-yellow-500">
                          <SafeImage
                            src={userData.image}
                            alt={userData.name || t('user')}
                            className="object-cover w-10 h-10 rounded-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-semibold truncate">{userData.name || session?.user?.name || t('user')}</p>
                          {userData.lastfmUsername && (
                            <p className="text-gray-400 text-sm truncate">@{userData.lastfmUsername}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation Links */}
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all ${
                      pathnameWithoutLocale === '/dashboard'
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('dashboard')}
                  </Link>
                  <Link
                    href="/groups"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all ${
                      pathnameWithoutLocale?.startsWith('/groups') && !pathnameWithoutLocale?.startsWith('/groups/discover')
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('groups')}
                  </Link>
                  <Link
                    href="/groups/discover"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg text-base font-semibold transition-all ${
                      pathnameWithoutLocale?.startsWith('/groups/discover')
                        ? 'bg-yellow-500 text-black'
                        : 'text-gray-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t('discover')}
                  </Link>
                  
                  {/* Quick Access Group */}
                  {quickAccessGroup && (
                    <Link
                      href={`/groups/${quickAccessGroup.id}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                          <SafeImage
                            src={quickAccessGroup.image}
                            alt={quickAccessGroup.name}
                            className="object-cover w-8 h-8 rounded-full"
                          />
                        </div>
                        <span>{quickAccessGroup.name}</span>
                      </div>
                    </Link>
                  )}
                  
                  {/* Profile Link */}
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {t('profile')}
                  </Link>

                  {userData?.lastfmUsername && (
                    <Link
                      href={`/u/${encodeURIComponent(userData.lastfmUsername)}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                    >
                      {t('publicProfile')}
                    </Link>
                  )}
                  
                  {/* Admin Links */}
                  {userData?.isSuperuser && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Admin Panel
                    </Link>
                  )}
                  
                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {t('signOut')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsSignInModalOpen(true)
                    }}
                    className="block w-full text-left px-4 py-3 rounded-lg text-base font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-all"
                  >
                    {t('signIn')}
                  </button>
                  <Link
                    href="/auth/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base font-semibold bg-yellow-500 text-black text-center hover:bg-yellow-600 transition-all"
                  >
                    {t('signUp')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
    <SignInModal
      isOpen={isSignInModalOpen}
      onClose={() => setIsSignInModalOpen(false)}
    />
    {isAuthenticated && (
      <QuickAccessInfoModal
        isOpen={isQuickAccessInfoOpen}
        onClose={() => setIsQuickAccessInfoOpen(false)}
        buttonRef={quickAccessButtonRef}
      />
    )}
    </>
  )
}

