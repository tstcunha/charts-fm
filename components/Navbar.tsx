'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { useNavigation } from '@/contexts/NavigationContext'
import SignInModal from '@/components/SignInModal'

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading } = useNavigation()
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
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    if (session?.user?.email) {
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
    }
  }, [session])

  // Refetch when navigating away from profile page
  useEffect(() => {
    if (prevPathnameRef.current === '/profile' && pathname !== '/profile' && session?.user?.email) {
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
    }
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

  const handleLogout = async () => {
    setIsSigningOut(true)
    signOutStartTimeRef.current = Date.now()
    await signOut({ redirect: false })
    router.push('/')
    router.refresh()
  }

  const isAuthenticated = status === 'authenticated' && session?.user

  // Don't show navbar on auth pages, but still show loading screen if signing out
  if (pathname?.startsWith('/auth/')) {
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
          <p className="text-white text-lg font-semibold">Signing out...</p>
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
            <p className="text-white text-lg font-semibold">Signing out...</p>
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
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-3xl font-bold text-yellow-500 transition-all font-oswald leading-none pb-1 ${isLoading ? 'animate-pulse-scale' : ''}`}
            >
              ChartsFM
            </Link>
            {isAuthenticated && (
              <div className="flex space-x-2">
                <Link
                  href="/dashboard"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathname === '/dashboard'
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathname === '/dashboard'
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
                    if (pathname !== '/dashboard') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (pathname !== '/dashboard') {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  Main Page
                </Link>
                <Link
                  href="/groups"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathname?.startsWith('/groups') && !pathname?.startsWith('/groups/discover')
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathname?.startsWith('/groups') && !pathname?.startsWith('/groups/discover')
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
                    if (!(pathname?.startsWith('/groups') && !pathname?.startsWith('/groups/discover'))) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(pathname?.startsWith('/groups') && !pathname?.startsWith('/groups/discover'))) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  Groups
                </Link>
                <Link
                  href="/groups/discover"
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 leading-tight ${
                    pathname?.startsWith('/groups/discover')
                      ? 'text-black'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={
                    pathname?.startsWith('/groups/discover')
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
                    if (!pathname?.startsWith('/groups/discover')) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!pathname?.startsWith('/groups/discover')) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.filter = ''
                    }
                  }}
                >
                  Discover
                </Link>
              </div>
            )}
          </div>

          {isAuthenticated ? (
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
                    alt={userData?.name || 'User'}
                    className="object-cover w-8 h-8 rounded-full"
                  />
                </div>
                <span>{userData?.name || session?.user?.name || 'User'}</span>
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
                      <div className="px-4 py-2 border-b border-gray-700/50">
                        <p className="text-sm font-bold text-white">
                          {userData?.name || session?.user?.name || 'User'}
                        </p>
                        {userData?.lastfmUsername && (
                          <p className="text-xs font-bold text-gray-400">
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
                        Edit Profile
                      </Link>
                      {userData?.isSuperuser && (
                        <>
                          <Link
                            href="/admin/users/create"
                            className="block px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                            onClick={() => setIsDropdownOpen(false)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            Create User
                          </Link>
                          <Link
                            href="/admin/bulk-generate"
                            className="block px-4 py-2 text-sm font-semibold text-gray-200 hover:text-white transition-all duration-200"
                            onClick={() => setIsDropdownOpen(false)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent'
                            }}
                          >
                            Bulk Generate
                          </Link>
                        </>
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
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
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
                Log In
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
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
    <SignInModal
      isOpen={isSignInModalOpen}
      onClose={() => setIsSignInModalOpen(false)}
    />
    </>
  )
}

