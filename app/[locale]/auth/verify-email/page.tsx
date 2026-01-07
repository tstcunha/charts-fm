'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

function VerifyEmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useSafeTranslations('auth.verifyEmail')
  const tCommon = useSafeTranslations('common')
  const [status, setStatus] = useState<'loading' | 'pending' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    document.title = `ChartsFM - ${t('title')}`
  }, [t])

  useEffect(() => {
    const token = searchParams?.get('token')
    const errorParam = searchParams?.get('error')
    const emailParam = searchParams?.get('email')

    if (emailParam) {
      setEmail(emailParam)
    }

    if (errorParam) {
      if (errorParam === 'email_not_verified') {
        // User tried to log in but email is not verified - show pending state with message
        setStatus('pending')
        setError(t('errors.emailNotVerified'))
      } else {
        setStatus('error')
        const errorMessages: Record<string, string> = {
          missing_token: t('errors.missingToken'),
          invalid_token: t('errors.invalidToken'),
          server_error: t('errors.serverError'),
        }
        setError(errorMessages[errorParam] || t('errors.verificationError'))
      }
    } else if (token) {
      // Token is provided, verify it by calling the API
      setStatus('loading')
      verifyToken(token)
    } else {
      // No token, show pending state
      setStatus('pending')
    }
  }, [searchParams])

  // Check if verification was successful (from redirect)
  useEffect(() => {
    const verified = searchParams?.get('verified')
    if (verified === 'true') {
      setStatus('success')
    }
  }, [searchParams])

  const verifyToken = async (token: string) => {
    try {
      // Call the verification API (without redirect parameter for JSON response)
      const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        method: 'GET',
      })

      const data = await response.json()

      if (!response.ok) {
        setStatus('error')
        const errorMessages: Record<string, string> = {
          'No verification token provided': t('errors.missingToken'),
          'Invalid or expired verification token': t('errors.invalidToken'),
          'An error occurred during verification': t('errors.serverError'),
        }
        setError(errorMessages[data.error] || data.error || t('errors.verificationError'))
        return
      }

      // Success!
      setStatus('success')
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/?verified=true')
      }, 1500)
    } catch (err) {
      console.error('Verification error:', err)
      setStatus('error')
      setError(t('errors.verifyFailed'))
    }
  }

  const handleResend = async () => {
    if (!email) {
      setError(t('emailRequired'))
      return
    }

    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('errors.resendFailed'))
      }

      setResendSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.resendFailed'))
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

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
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-2xl"></div>
            <div className="relative z-10 text-center">
              {status === 'loading' && (
                <>
                  <div className="text-5xl mb-4">📧</div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
                    {t('verifying')}
                  </h1>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('verifyingDescription')}</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="text-5xl mb-4">✅</div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
                    {t('successTitle')}
                  </h1>
                  <p className="text-gray-600 mb-6">
                    {t('successDescription')}
                  </p>
                  <LiquidGlassButton
                    onClick={() => router.push('/')}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    {t('goToLogin')}
                  </LiquidGlassButton>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="text-5xl mb-4">❌</div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
                    {t('errorTitle')}
                  </h1>
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
                  {email && (
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        {t('needNewEmail')}
                      </p>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(8px)',
                        }}
                        placeholder="your.email@example.com"
                      />
                      <LiquidGlassButton
                        onClick={handleResend}
                        disabled={isResending || !email}
                        variant="primary"
                        size="lg"
                        fullWidth
                      >
                        {isResending ? t('sending') : t('resendEmail')}
                      </LiquidGlassButton>
                      {resendSuccess && (
                        <p className="text-green-600 font-medium">
                          {t('emailSent')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {status === 'pending' && (
                <>
                  <div className="text-5xl mb-4">📬</div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-800">
                    {t('checkEmailTitle')}
                  </h1>
                  <p className="text-gray-600 mb-6">
                    {t('checkEmailDescription')}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {t('linkExpires')}
                  </p>
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
                  {resendSuccess && (
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
                      <p className="text-green-700 font-medium">
                        {t('emailSent')}
                      </p>
                    </div>
                  )}
                  {email && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600">
                        {t('didntReceive')}
                      </p>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          backdropFilter: 'blur(8px)',
                        }}
                        placeholder="your.email@example.com"
                      />
                      <LiquidGlassButton
                        onClick={handleResend}
                        disabled={isResending || !email}
                        variant="primary"
                        size="lg"
                        fullWidth
                      >
                        {isResending ? t('sending') : t('resendEmail')}
                      </LiquidGlassButton>
                    </div>
                  )}
                  <div className="mt-6">
                    <a
                      href="/"
                      className="text-yellow-600 hover:text-yellow-700 font-semibold underline underline-offset-2"
                    >
                      {t('backToLogin')}
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </main>
    }>
      <VerifyEmailPageContent />
    </Suspense>
  )
}

