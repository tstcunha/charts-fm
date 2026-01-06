'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import SignInModal from '@/components/SignInModal'
import LiquidGlassButton, { LiquidGlassLink } from '@/components/LiquidGlassButton'

export default function LandingPageClient() {
  const searchParams = useSearchParams()
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'fade-in' | 'together-apart'>('fade-in')
  const musicRef = useRef<HTMLSpanElement>(null)
  const togetherRef = useRef<HTMLSpanElement>(null)
  const showSuccessMessage = searchParams?.get('success') === 'account_created'

  // Open modal if success parameter is present
  useEffect(() => {
    if (showSuccessMessage) {
      setIsSignInModalOpen(true)
    }
  }, [showSuccessMessage])

  // Animation sequence: fade in, then loop together/apart every 3 seconds
  useEffect(() => {
    // After fade-in (0.8s) + 3 second delay, switch to together-apart
    const initialTimeout = setTimeout(() => {
      setAnimationPhase('together-apart')
    }, 3800)

    return () => clearTimeout(initialTimeout)
  }, [])

  // Loop together/apart animation every 3 seconds
  useEffect(() => {
    if (animationPhase !== 'together-apart') return

    const restartAnimation = () => {
      if (musicRef.current) {
        musicRef.current.style.animation = 'none'
        void musicRef.current.offsetWidth
        musicRef.current.style.animation = ''
      }
      if (togetherRef.current) {
        togetherRef.current.style.animation = 'none'
        void togetherRef.current.offsetWidth
        togetherRef.current.style.animation = ''
      }
    }

    const interval = setInterval(restartAnimation, 8000)
    return () => clearInterval(interval)
  }, [animationPhase])

  return (
    <>
      <main className="min-h-screen relative">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 flex flex-wrap justify-center items-center gap-4 sm:gap-5 leading-tight overflow-visible">
              <span 
                ref={musicRef} 
                className={`inline-block bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent leading-tight ${
                  animationPhase === 'fade-in' ? 'animate-fade-in' : 'animate-together-apart-left'
                }`}
                style={{ lineHeight: '1.2', paddingBottom: '0.1em' }}
              >
                Your Music
              </span>
              <span 
                ref={togetherRef} 
                className={`inline-block bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent leading-tight ${
                  animationPhase === 'fade-in' ? 'animate-fade-in' : 'animate-together-apart-right'
                }`}
                style={animationPhase === 'fade-in' ? { animationDelay: '0.1s', lineHeight: '1.2', paddingBottom: '0.1em' } : { lineHeight: '1.2', paddingBottom: '0.1em' }}
              >
                Together
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto font-inter">
              Create groups with friends and build a shared listening history
            </p>
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto font-inter">
              Track what you're listening to, discover trends, and explore your music taste through combined charts and stats
            </p>
            <div className="flex justify-center">
              <LiquidGlassLink
                href="/auth/signup"
                variant="primary"
                size="lg"
                className="text-lg"
              >
                Get Started
              </LiquidGlassLink>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {/* Feature 1: Groups */}
            <div
              className="rounded-3xl p-8 relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/30 to-orange-400/30 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4">🎵</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Create Groups</h3>
                <p className="text-gray-600 leading-relaxed">
                  Start a group with friends and combine your listening histories. See what everyone's playing, find your shared favorites, and build a collective music history together.
                </p>
              </div>
            </div>

            {/* Feature 2: Stats & Trends */}
            <div
              className="rounded-3xl p-8 relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Stats & Trends</h3>
                <p className="text-gray-600 leading-relaxed">
                  Watch your favorite artists climb the charts, see what's trending in your group, and explore your listening patterns over time.
                </p>
              </div>
            </div>

            {/* Feature 3: Share Taste */}
            <div
              className="rounded-3xl p-8 relative overflow-hidden"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/30 to-red-400/30 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-4">🌟</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Share Your Taste</h3>
                <p className="text-gray-600 leading-relaxed">
                  See how your music taste compares with others, discover new artists through compatibility, and celebrate what makes your listening unique.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div
            className="rounded-3xl p-12 text-center relative overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-pink-400/20"></div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto font-inter">
                Connect your Last.fm account and start building shared listening histories with your friends.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <LiquidGlassButton
                  onClick={() => setIsSignInModalOpen(true)}
                  variant="primary"
                  size="lg"
                  className="text-lg"
                >
                  Sign In
                </LiquidGlassButton>
                <LiquidGlassLink
                  href="/auth/signup"
                  variant="secondary"
                  size="lg"
                  className="text-lg"
                >
                  Create Account
                </LiquidGlassLink>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        showSuccessMessage={showSuccessMessage}
      />
    </>
  )
}

