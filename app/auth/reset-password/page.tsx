'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LiquidGlassButton from '@/components/LiquidGlassButton'

function ResetPasswordPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    document.title = 'ChartsFM - Reset Password'
  }, [])

  useEffect(() => {
    const tokenParam = searchParams?.get('token')
    if (tokenParam) {
      setToken(tokenParam)
      // Token is provided, we'll validate it when form is submitted
      setIsValidating(false)
      setIsValid(true)
    } else {
      setIsValidating(false)
      setIsValid(false)
      setError('No reset token provided. Please use the link from your email.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validation
    if (!formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsSubmitting(false)
      return
    }

    // Check for at least one special character
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/
    if (!specialCharRegex.test(formData.password)) {
      setError('Password must contain at least one special character')
      setIsSubmitting(false)
      return
    }

    if (!token) {
      setError('Invalid reset token')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      setError(null)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/?reset=success')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
      setSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidating) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Validating reset token...</p>
        </div>
      </main>
    )
  }

  if (!isValid) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl w-full">
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
              
              <div className="text-center">
                <p className="text-gray-700 mb-4">
                  The password reset link is invalid or has expired.
                </p>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-yellow-600 hover:text-yellow-700 font-semibold underline underline-offset-2"
                >
                  Request a new password reset link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              Reset Your Password
            </h1>
            <p className="text-lg sm:text-xl text-gray-700">
              Enter your new password below
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

          {success && (
            <div 
              className="mb-6 p-4 rounded-2xl"
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p className="text-green-700 font-semibold">✓ Password reset successfully!</p>
              <p className="text-sm text-green-600 mt-2">
                Redirecting to login page...
              </p>
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
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                    New Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="At least 8 characters with 1 special character"
                    minLength={8}
                    disabled={isSubmitting || success}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Password must be at least 8 characters and include at least one special character (!@#$%^&* etc.)
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="Re-enter your new password"
                    disabled={isSubmitting || success}
                  />
                </div>

                <LiquidGlassButton
                  type="submit"
                  disabled={isSubmitting || success}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="text-lg"
                >
                  {isSubmitting ? 'Resetting Password...' : success ? 'Password Reset!' : 'Reset Password'}
                </LiquidGlassButton>
              </form>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-700">
              Remember your password?{' '}
              <Link href="/" className="text-yellow-600 hover:text-yellow-700 font-semibold underline underline-offset-2">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </main>
    }>
      <ResetPasswordPageContent />
    </Suspense>
  )
}

