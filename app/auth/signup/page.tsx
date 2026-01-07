'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import LiquidGlassButton from '@/components/LiquidGlassButton'

// Theme gradients (excluding rainbow)
const themes = [
  { from: [254, 249, 195], to: [254, 252, 232] }, // yellow
  { from: [219, 234, 254], to: [239, 246, 255] }, // royal-blue
  { from: [207, 250, 254], to: [236, 254, 255] }, // cyan
  { from: [254, 226, 226], to: [255, 241, 242] }, // bright-red
  { from: [250, 235, 215], to: [255, 248, 240] }, // maroon
  { from: [243, 244, 246], to: [249, 250, 251] }, // graphite
  { from: [253, 244, 255], to: [255, 250, 255] }, // hot-pink
  { from: [220, 252, 231], to: [240, 253, 244] }, // neon-green
  { from: [255, 255, 255], to: [249, 250, 251] }, // white
]

function SignUpPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [backgroundGradient, setBackgroundGradient] = useState('linear-gradient(135deg, rgb(254, 249, 195), rgb(254, 252, 232))')
  const animationRef = useRef<number>()
  const startTimeRef = useRef(Date.now())

  // Smooth gradient animation
  useEffect(() => {
    const transitionDuration = 4000 // 4 seconds per transition
    const holdDuration = 3000 // 3 seconds hold at each theme

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTimeRef.current
      const cycleDuration = (transitionDuration + holdDuration) * themes.length
      const cycleProgress = (elapsed % cycleDuration) / cycleDuration

      // Calculate which theme we're transitioning from/to
      const themeProgress = cycleProgress * themes.length
      const fromIndex = Math.floor(themeProgress) % themes.length
      const toIndex = (fromIndex + 1) % themes.length
      const localProgress = themeProgress - Math.floor(themeProgress)

      // Determine if we're in transition or hold phase
      const transitionRatio = transitionDuration / (transitionDuration + holdDuration)
      let t = 0
      
      if (localProgress < transitionRatio) {
        // In transition phase
        t = localProgress / transitionRatio
        // Ease in-out for smooth transition
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      } else {
        // In hold phase
        t = 1
      }

      // Interpolate between themes
      const fromTheme = themes[fromIndex]
      const toTheme = themes[toIndex]

      const interpolateColor = (from: number[], to: number[], t: number) => {
        return [
          Math.round(from[0] + (to[0] - from[0]) * t),
          Math.round(from[1] + (to[1] - from[1]) * t),
          Math.round(from[2] + (to[2] - from[2]) * t),
        ]
      }

      const fromColor = interpolateColor(fromTheme.from, toTheme.from, t)
      const toColor = interpolateColor(fromTheme.to, toTheme.to, t)

      setBackgroundGradient(
        `linear-gradient(135deg, rgb(${fromColor[0]}, ${fromColor[1]}, ${fromColor[2]}), rgb(${toColor[0]}, ${toColor[1]}, ${toColor[2]}))`
      )

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Redirect to dashboard if already logged in with valid user
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      router.replace('/dashboard')
    }
  }, [status, session, router])
  
  // If we have an authenticated status but no user, clear the session
  useEffect(() => {
    if (status === 'authenticated' && !session?.user) {
      // Invalid session - sign out to clear it
      signOut({ redirect: false })
    }
  }, [status, session])

  useEffect(() => {
    document.title = 'ChartsFM - Sign Up'
  }, [])

  useEffect(() => {
    // Check for error in query params
    try {
      const errorParam = searchParams?.get('error')
      if (errorParam) {
        const errorMessages: Record<string, string> = {
          no_token: 'No authentication token received from Last.fm',
          config: 'Server configuration error. Please contact support.',
          authentication_failed: 'Failed to authenticate with Last.fm. Please try again.',
        }
        setError(errorMessages[errorParam] || 'An error occurred during authentication')
      }
    } catch (err) {
      // Ignore searchParams errors
      console.error('Error reading search params:', err)
    }
  }, [searchParams])

  const handleLastFMAuth = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Redirect to Last.fm authorization
      const response = await fetch('/api/auth/lastfm/authorize')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate Last.fm authentication')
      }

      const { authUrl } = await response.json()
      
      // Redirect user to Last.fm
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsLoading(false)
    }
  }

  // Show loading state while checking session (with timeout)
  const [showContent, setShowContent] = useState(false)
  
  useEffect(() => {
    // Show content after a short delay, even if still loading
    // This prevents blank page if session check hangs
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  if (status === 'loading' && !showContent) {
    return (
      <main 
        className="flex min-h-screen flex-col items-center justify-center p-24"
        style={{
          background: backgroundGradient,
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background 0.1s ease-out',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    )
  }

  // Only redirect if we have a valid authenticated user
  // If status is authenticated but no user, we'll show the form (session will be cleared)
  if (status === 'authenticated' && session?.user?.email) {
    return null
  }

  return (
    <main 
      className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      style={{
        background: backgroundGradient,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background 0.1s ease-out',
      }}
    >
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">
            Create Your Account
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 mb-2">
            Connect your Last.fm account to get started
          </p>
          <p className="text-base text-gray-600">
            You'll be able to add additional details after connecting
          </p>
        </div>

        {error && (
          <div 
            className="mb-6 p-4 rounded-2xl"
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              backdropFilter: 'blur(12px) saturate(180%)',
              WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div
          className="rounded-3xl p-8 sm:p-10 relative overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎵</div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
                Step 1: Connect Last.fm
              </h2>
              <p className="text-gray-600">
                We need to connect to your Last.fm account to create your ChartsFM profile.
              </p>
            </div>

            <LiquidGlassButton
              onClick={handleLastFMAuth}
              disabled={isLoading}
              size="lg"
              fullWidth
              className="text-lg"
              useTheme={false}
              style={{
                background: '#d51007',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              icon={
                isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 0-.315.063-.441.189l-1.701 1.7-3.703 3.704-1.701-1.701c-.126-.126-.272-.189-.441-.189s-.315.063-.441.189l-1.701 1.701c-.252.252-.252.63 0 .882l1.701 1.701c.126.126.272.189.441.189s.315-.063.441-.189l1.701-1.701 3.703-3.704 1.701 1.701c.126.126.272.189.441.189s.315-.063.441-.189l1.701-1.701c.252-.252.252-.63 0-.882l-1.701-1.701c-.126-.126-.272-.189-.441-.189z"/>
                  </svg>
                )
              }
            >
              {isLoading ? 'Redirecting...' : 'Connect with Last.fm'}
            </LiquidGlassButton>

            <p className="text-sm text-gray-600 text-center mt-6">
              You'll be redirected to Last.fm to authorize this application.
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-700">
            Already have an account?{' '}
            <a href="/" className="text-yellow-600 hover:text-yellow-700 font-semibold underline underline-offset-2">
              Log in
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <SignUpPageContent />
    </Suspense>
  )
}

