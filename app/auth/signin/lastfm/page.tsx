'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LastFMSignInPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    document.title = 'ChartsFM - Sign In'
  }, [])

  useEffect(() => {
    async function handleSignIn() {
      try {
        // Get the Last.fm credentials from the cookie via an API route
        const response = await fetch('/api/auth/lastfm/get-signin-creds')
        
        if (!response.ok) {
          throw new Error('Failed to retrieve credentials')
        }

        const { username, sessionKey } = await response.json()

        if (!username || !sessionKey) {
          throw new Error('Missing credentials')
        }

        // Sign in using NextAuth with Last.fm provider
        const result = await signIn('lastfm', {
          lastfmUsername: username,
          lastfmSessionKey: sessionKey,
          redirect: false,
        })

        if (result?.error) {
          // Sign-in failed - likely due to unverified email (since we check that in NextAuth)
          setError('Log in failed. Please verify your email address before logging in. Check your inbox for the verification link, or request a new one.')
          setIsLoading(false)
        } else if (result?.ok) {
          // Success - redirect to dashboard
          router.push('/dashboard')
          router.refresh()
        }
      } catch (err) {
        console.error('Last.fm signin error:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
        setIsLoading(false)
      }
    }

    handleSignIn()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return null
}

