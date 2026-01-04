'use client'

import { useState, useEffect } from 'react'
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
  const [userData, setUserData] = useState<{
    name: string | null
    lastfmUsername: string
    image: string | null
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
          })
          }
        })
        .catch(console.error)
    }
  }, [session])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/auth/signin')
    router.refresh()
  }

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth/')) {
    return null
  }

  // Don't show navbar if not authenticated
  if (status === 'unauthenticated') {
    return null
  }

  if (status === 'loading') {
    return (
      <nav className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-yellow-500">
                ChartsFM
              </Link>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-xl font-bold text-yellow-500 transition-all ${isLoading ? 'animate-pulse-scale' : ''}`}
            >
              ChartsFM
            </Link>
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
          </div>

          <div className="relative">
            <button
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
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-900 ring-1 ring-gray-700 z-20">
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
        </div>
      </div>
    </nav>
  )
}

