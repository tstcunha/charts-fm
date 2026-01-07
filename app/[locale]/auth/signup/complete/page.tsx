'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

function CompleteSignUpPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useSafeTranslations('auth.signupComplete')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastfmUsername, setLastfmUsername] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    document.title = 'ChartsFM - Complete Sign Up'
  }, [])

  useEffect(() => {
    // Check if we have Last.fm session data
    fetch('/api/auth/lastfm/session')
      .then(res => res.json())
      .then(data => {
        if (data.username) {
          setLastfmUsername(data.username)
          setIsLoading(false)
        } else {
          setError(t('noSession'))
          setIsLoading(false)
        }
      })
      .catch(() => {
        setError(t('verifyFailed'))
        setIsLoading(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    // Validation
    if (!formData.email || !formData.name || !formData.password) {
      setError(t('errors.fillAllFields'))
      setIsSubmitting(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('errors.passwordsDontMatch'))
      setIsSubmitting(false)
      return
    }

    if (formData.password.length < 8) {
      setError(t('errors.passwordTooShort'))
      setIsSubmitting(false)
      return
    }

    // Check for at least one special character
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/
    if (!specialCharRegex.test(formData.password)) {
      setError(t('errors.passwordNoSpecialChar'))
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/auth/signup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('errors.createFailed'))
      }

      // Account created successfully, redirect to verification page
      router.push('/auth/verify-email?email=' + encodeURIComponent(formData.email))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.createFailed'))
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-700">{t('verifying')}</p>
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
              {t('title')}
            </h1>
            <p className="text-lg sm:text-xl text-gray-700">
              {t('subtitle')}
            </p>
          </div>

          {lastfmUsername && (
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
              <p className="text-green-700 font-semibold">✓ {t('connected')}</p>
              <p className="text-sm text-green-600 mt-1">{t('username', { username: lastfmUsername })}</p>
            </div>
          )}

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
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-pink-400/30 to-purple-400/30 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('emailLabel')}
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder={t('emailPlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('nameLabel')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder={t('namePlaceholder')}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('passwordLabel')}
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
                    placeholder={t('passwordPlaceholder')}
                    minLength={8}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {t('passwordHint')}
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('confirmPasswordLabel')}
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
                    placeholder={t('confirmPasswordPlaceholder')}
                  />
                </div>

                <LiquidGlassButton
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="text-lg"
                >
                  {isSubmitting ? t('creatingAccount') : t('createAccount')}
                </LiquidGlassButton>
              </form>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-gray-700">
              {t('alreadyHaveAccount')}{' '}
              <a href="/" className="text-yellow-600 hover:text-yellow-700 font-semibold underline underline-offset-2">
                {t('logIn')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CompleteSignUpPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </main>
    }>
      <CompleteSignUpPageContent />
    </Suspense>
  )
}

