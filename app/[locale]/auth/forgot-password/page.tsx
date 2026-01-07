'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import LiquidGlassButton from '@/components/LiquidGlassButton'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    document.title = 'ChartsFM - Forgot Password'
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSubmitting(true)

    if (!email) {
      setError('Please enter your email address')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email')
      }

      setSuccess(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email')
      setSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
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
              Forgot Password?
            </h1>
            <p className="text-lg sm:text-xl text-gray-700">
              Enter your email address and we'll send you a link to reset your password
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
              <p className="text-green-700 font-semibold">✓ Password reset email sent!</p>
              <p className="text-sm text-green-600 mt-2">
                If an account exists with this email, you'll receive a password reset link. Please check your inbox and follow the instructions.
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
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="your.email@example.com"
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
                  {isSubmitting ? 'Sending...' : success ? 'Email Sent!' : 'Send Reset Link'}
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

