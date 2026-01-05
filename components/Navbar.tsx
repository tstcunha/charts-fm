'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { useNavigation } from '@/contexts/NavigationContext'

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading } = useNavigation()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [userData, setUserData] = useState<{
    name: string | null
    lastfmUsername: string
    image: string | null
    isSuperuser: boolean
  } | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      // Fetch user data including lastfmUsername
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
    await signOut({ redirect: false })
    router.push('/auth/signin')
    router.refresh()
  }

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null
  }

  const isAuthenticated = status === 'authenticated' && session?.user

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-gray-800 relative overflow-x-hidden">
      {isLoading && (
        <div className="absolute bottom-0 left-0 h-1 bg-yellow-500 w-1/4 shadow-lg shadow-yellow-500/50 animate-race-bar" />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-xl font-bold text-yellow-500 transition-all ${isLoading ? 'animate-pulse-scale' : ''}`}
            >
              ChartsFM
            </Link>
            {isAuthenticated && (
              <div className="flex space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === '/dashboard'
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Main Page
                </Link>
                <Link
                  href="/groups"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname?.startsWith('/groups')
                      ? 'bg-yellow-500 text-black'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  Groups
                </Link>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
                    className="fixed w-56 rounded-md shadow-lg bg-gray-900 ring-1 ring-gray-700 z-[60]" 
                    style={{ 
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`
                    }}
                  >
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm font-medium text-white">
                          {userData?.name || session?.user?.name || 'User'}
                        </p>
                        {userData?.lastfmUsername && (
                          <p className="text-xs text-gray-400">
                            @{userData.lastfmUsername}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Edit Profile
                      </Link>
                      {userData?.isSuperuser && (
                        <Link
                          href="/admin/users/create"
                          className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          Create User
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                href="/auth/signin"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-3 py-2 rounded-md text-sm font-medium bg-yellow-500 text-black hover:bg-yellow-400 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

