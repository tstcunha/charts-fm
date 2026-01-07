'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import CustomSelect from '@/components/CustomSelect'
import { useTranslations } from 'next-intl'
import { routing } from '@/i18n/routing'

export default function ProfilePage() {
  const router = useRouter()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    locale: 'en',
  })
  const [lastfmUsername, setLastfmUsername] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'ChartsFM - Profile'
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setFormData({
            name: data.user.name || '',
            image: data.user.image || '',
            locale: data.user.locale || 'en',
          })
          setLastfmUsername(data.user.lastfmUsername || null)
        }
        setIsLoading(false)
      })
      .catch(err => {
        setError(t('failedToLoad'))
        setIsLoading(false)
      })
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsSaving(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToUpdate'))
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
      // If locale changed, set cookie and reload the page to apply the new locale
      if (formData.locale !== data.user?.locale) {
        // Set cookie for middleware to use
        document.cookie = `NEXT_LOCALE=${formData.locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        // Redirect to new locale
        window.location.href = `/${formData.locale}/profile`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="relative z-10 text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500 mb-4" />
          <p className="text-gray-700">{tCommon('loading')}</p>
        </div>
      </main>
    )
  }

  const displayImage = formData.image || getDefaultGroupImage()

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
              <p className="text-green-700 font-semibold">✓ {t('profileUpdated')}</p>
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
            className="rounded-3xl p-8 sm:p-10 relative"
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
                <div className="flex flex-col items-center mb-6">
                  <div className="relative w-32 h-32 mb-4">
                    <img
                      src={displayImage}
                      alt="Profile picture"
                      className="rounded-full object-cover w-32 h-32 border-4 border-white/50 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultGroupImage()
                      }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">{t('profilePicturePreview')}</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="Your name"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label htmlFor="image" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('profilePicture')}
                  </label>
                  <input
                    type="url"
                    id="image"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="https://example.com/profile.jpg"
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Enter a URL to an image for your profile picture
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-800">{t('lastfmUsername')}</span>
                    <div className="relative group">
                      <svg
                        className="w-4 h-4 text-gray-400 cursor-help"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999]"
                        style={{
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        {t('lastfmUsernameTooltip')}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-4 py-3 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <p className="text-lg text-gray-900 font-medium">{lastfmUsername || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="locale" className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('language')}
                  </label>
                  <CustomSelect
                    id="locale"
                    options={routing.locales.map((locale) => {
                      const localeNames: Record<string, string> = {
                        'en': 'English',
                        'pt': 'Português'
                      };
                      return {
                        value: locale,
                        label: localeNames[locale] || locale.toUpperCase(),
                      };
                    })}
                    value={formData.locale}
                    onChange={(value) => setFormData({ ...formData, locale: String(value) })}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {t('selectLanguage')}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <LiquidGlassButton
                    type="submit"
                    disabled={isSaving}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="text-lg"
                  >
                    {isSaving ? t('saving') : t('saveChanges')}
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    type="button"
                    onClick={() => router.back()}
                    variant="neutral"
                    size="lg"
                  >
                    {tCommon('cancel')}
                  </LiquidGlassButton>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-3xl p-8 sm:p-10 relative mt-8"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-600 mb-4">
                Irreversible and destructive actions
              </p>
              <div className="pt-4 border-t border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Delete Account
                    </h3>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </main>
  )
}

