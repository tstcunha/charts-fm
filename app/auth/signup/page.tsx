'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for error in query params
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        no_token: 'No authentication token received from Last.fm',
        config: 'Server configuration error. Please contact support.',
        authentication_failed: 'Failed to authenticate with Last.fm. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred during authentication')
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-4">
          Create Your Account
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Connect your Last.fm account to get started. You'll be able to add additional details after connecting.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2">
              Step 1: Connect Last.fm
            </h2>
            <p className="text-gray-600">
              We need to connect to your Last.fm account to create your ChartsFM profile.
            </p>
          </div>

          <button
            onClick={handleLastFMAuth}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-[#d51007] hover:bg-[#b00d06] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Redirecting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 0-.315.063-.441.189l-1.701 1.7-3.703 3.704-1.701-1.701c-.126-.126-.272-.189-.441-.189s-.315.063-.441.189l-1.701 1.701c-.252.252-.252.63 0 .882l1.701 1.701c.126.126.272.189.441.189s.315-.063.441-.189l1.701-1.701 3.703-3.704 1.701 1.701c.126.126.272.189.441.189s.315-.063.441-.189l1.701-1.701c.252-.252.252-.63 0-.882l-1.701-1.701c-.126-.126-.272-.189-.441-.189z"/>
                </svg>
                Connect with Last.fm
              </>
            )}
          </button>

          <p className="text-sm text-gray-500 text-center mt-4">
            You'll be redirected to Last.fm to authorize this application.
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a href="/auth/signin" className="text-yellow-600 hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

