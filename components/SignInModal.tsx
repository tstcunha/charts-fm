'use client'

import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
  showSuccessMessage?: boolean
}

export default function SignInModal({ isOpen, onClose, showSuccessMessage = false }: SignInModalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useSafeTranslations('auth.login')
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLastFM, setIsLoadingLastFM] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (isOpen && status === 'authenticated' && session?.user) {
      onClose()
      router.push('/dashboard')
      router.refresh()
    }
  }, [isOpen, status, session, router, onClose])

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        // Check if user exists and email is unverified
        try {
          const checkResponse = await fetch('/api/auth/check-verification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: formData.email }),
          })

          const checkData = await checkResponse.json()

          if (checkData.exists && !checkData.verified) {
            setError(t('verifyEmail'))
            setShowResendVerification(true)
          } else {
            setError(t('invalidCredentials'))
          }
        } catch {
          // If check fails, show generic error
          setError(t('invalidCredentials'))
        }
        setIsLoading(false)
      } else {
        // Close modal and redirect to dashboard on success
        onClose()
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(t('error'))
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError(t('enterEmail'))
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
        body: JSON.stringify({ email: formData.email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('resendVerification'))
      }

      setResendSuccess(true)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('resendVerification'))
    } finally {
      setIsResending(false)
    }
  }

  const handleLastFMSignIn = async () => {
    setError(null)
    setIsLoadingLastFM(true)

    try {
      // Get the Last.fm authorization URL
      const response = await fetch('/api/auth/lastfm/authorize?mode=signin')
      
      if (!response.ok) {
        throw new Error('Failed to initiate Last.fm authentication')
      }

      const { authUrl } = await response.json()
      
      if (!authUrl) {
        throw new Error('No authorization URL received')
      }

      // Redirect to Last.fm authorization page
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in with Last.fm')
      setIsLoadingLastFM(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-2xl shadow-2xl max-w-md w-full p-8 pointer-events-auto"
          style={{
            animation: 'fadeIn 0.2s ease-in-out',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            {t('title')}
          </h1>
          <p className="text-center text-gray-600 mb-6">
            {t('subtitle')}
          </p>

          {showSuccessMessage && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {searchParams?.get('verified') === 'true' 
                ? t('emailVerified')
                : t('accountCreated')}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
              {showResendVerification && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="text-sm underline hover:no-underline disabled:opacity-50"
                  >
                    {isResending ? t('sending') : t('resendVerification')}
                  </button>
                  {resendSuccess && (
                    <p className="text-sm text-green-700 mt-2">
                      {t('verificationSent')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('emailLabel')}
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                placeholder={t('emailPlaceholder')}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('passwordLabel')}
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-sm text-yellow-600 hover:text-yellow-700 hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    onClose()
                    router.push('/auth/forgot-password')
                  }}
                >
                  {t('forgotPassword')}
                </a>
              </div>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors"
                placeholder={t('passwordPlaceholder')}
                disabled={isLoading}
              />
            </div>

            <LiquidGlassButton
              type="submit"
              disabled={isLoading || isLoadingLastFM}
              variant="primary"
              size="lg"
              fullWidth
              useTheme={false}
            >
              {isLoading ? t('loggingIn') : t('logInButton')}
            </LiquidGlassButton>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{t('or')}</span>
            </div>
          </div>

          <LiquidGlassButton
            type="button"
            onClick={handleLastFMSignIn}
            disabled={isLoading || isLoadingLastFM}
            size="lg"
            fullWidth
            useTheme={false}
            className="text-lg"
            style={{
              background: '#d51007',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            icon={
              isLoadingLastFM ? (
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
            {isLoadingLastFM ? t('redirecting') : t('logInWithLastfm')}
          </LiquidGlassButton>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              {t('noAccount')}{' '}
              <a href="/auth/signup" className="text-yellow-600 hover:underline">
                {t('signUp')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

