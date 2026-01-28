'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import Image from 'next/image'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faUpload, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import DeleteAccountModal from '@/components/DeleteAccountModal'
import RemovePictureModal from '@/components/RemovePictureModal'
import CustomSelect from '@/components/CustomSelect'
import Toast from '@/components/Toast'
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
    email: '',
    image: '',
    locale: 'en',
    bio: '',
    profilePublic: true,
    showProfileStats: true,
    showProfileGroups: true,
  })
  const [originalLocale, setOriginalLocale] = useState<string>('en')
  const [lastfmUsername, setLastfmUsername] = useState<string | null>(null)
  const [originalEmail, setOriginalEmail] = useState<string>('')
  const [emailVerified, setEmailVerified] = useState<boolean>(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'ChartsFM - Profile'
  }, [])

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          const userLocale = data.user.locale || 'en'
          setFormData({
            name: data.user.name || '',
            email: data.user.email || '',
            image: data.user.image || '',
            locale: userLocale,
            bio: data.user.bio || '',
            profilePublic: data.user.profilePublic ?? true,
            showProfileStats: data.user.showProfileStats ?? true,
            showProfileGroups: data.user.showProfileGroups ?? true,
          })
          setOriginalLocale(userLocale)
          setOriginalEmail(data.user.email || '')
          setLastfmUsername(data.user.lastfmUsername || null)
          setEmailVerified(data.user.emailVerified || false)
        }
        setIsLoading(false)
      })
      .catch(err => {
        setError(t('failedToLoad'))
        setIsLoading(false)
      })
  }, [t])

  // Map API error messages to translation keys
  const translateError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Image must be a valid URL or path': t('errors.invalidImageUrl'),
      'Image URL cannot exceed 500 characters': t('errors.imageTooLong'),
      'Image must be a string': t('errors.imageMustBeString'),
      'Name cannot exceed 100 characters': t('errors.nameTooLong'),
      'Name must be a string': t('errors.nameMustBeString'),
      'Email is required': t('errors.emailRequired'),
      'Invalid email format': t('errors.invalidEmail'),
      'An account with this email already exists': t('errors.emailExists'),
    }
    return errorMap[errorMessage] || errorMessage
  }

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
        const translatedError = translateError(data.error || '')
        throw new Error(translatedError || t('failedToUpdate'))
      }

      setSuccess(true)
      
      // Update email verification status if email changed
      if (formData.email !== originalEmail) {
        setEmailVerified(false)
        setOriginalEmail(formData.email)
      }
      
      // Reload profile data to get updated verification status
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      if (profileData.user) {
        setEmailVerified(profileData.user.emailVerified || false)
      }
      
      // If locale changed, set cookie and reload the page to apply the new locale
      if (formData.locale !== originalLocale) {
        // Update original locale to prevent multiple redirects
        setOriginalLocale(formData.locale)
        // Set cookie for middleware to use
        document.cookie = `NEXT_LOCALE=${formData.locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
        // Redirect to new locale
        window.location.href = `/${formData.locale}/profile`
      }
    } catch (err) {
      // Error is already translated in the throw above, or use default
      setError(err instanceof Error ? err.message : t('failedToUpdate'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden flex items-center justify-center px-4">
        <div className="relative z-10 text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-yellow-500 mb-4" />
          <p className="text-sm md:text-base text-gray-700">{tCommon('loading')}</p>
        </div>
      </main>
    )
  }

  const displayImage = previewUrl || formData.image || getDefaultGroupImage()
  
  // Check if current image is from uploaded storage
  const isUploadedImage = !!(formData.image && (
    formData.image.startsWith('/uploads/profile-pictures/') ||
    formData.image.includes('blob.vercel-storage.com')
  ))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError(t('upload.invalidFileType'))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('upload.fileTooLarge'))
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/user/profile/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('upload.failed'))
      }

      // Don't update formData.image - the upload endpoint already updated the database
      // Reload profile data to get the updated image
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      
      if (profileData.user) {
        setFormData(prev => ({
          ...prev,
          image: profileData.user.image || '',
        }))
      }
      
      setSuccess(true)
      
      // Clear file selection
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.failed'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    const fileInput = document.getElementById('file-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleRemovePicture = async () => {
    if (!formData.image) return

    setIsRemoving(true)
    setError(null)

    try {
      const response = await fetch('/api/user/profile/picture', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('removePicture.failed'))
      }

      // Reload profile data to get updated state
      const profileResponse = await fetch('/api/user/profile')
      const profileData = await profileResponse.json()
      
      if (profileData.user) {
        setFormData(prev => ({
          ...prev,
          image: profileData.user.image || '',
        }))
      }
      
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('removePicture.failed'))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 relative overflow-hidden">
      {/* Toast notifications */}
      <Toast
        message={t('profileUpdated')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
      <Toast
        message={error || ''}
        type="error"
        isVisible={!!error}
        onClose={() => setError(null)}
      />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-6 lg:px-12 xl:px-24 py-8 md:py-16 lg:py-24">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              {t('title')}
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-700">
              {t('subtitle')}
            </p>
          </div>


          <div
            className="rounded-3xl p-4 md:p-6 lg:p-8 xl:p-10 relative"
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
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="flex flex-col items-center mb-4 md:mb-6">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 mb-3 md:mb-4">
                    <img
                      src={displayImage}
                      alt="Profile picture"
                      className="rounded-full object-cover w-24 h-24 md:w-32 md:h-32 border-4 border-white/50 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = getDefaultGroupImage()
                      }}
                    />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs md:text-sm text-gray-600 font-medium">{t('profilePicturePreview')}</p>
                    {formData.image && (
                      <button
                        type="button"
                        onClick={() => setIsRemoveModalOpen(true)}
                        disabled={isRemoving || isSaving || isUploading}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                        <span>{t('removePicture.button')}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="Your name"
                    disabled={isSaving || isUploading}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="email" className="block text-xs md:text-sm font-semibold text-gray-800">
                      {t('email')}
                    </label>
                    <div className="flex items-center gap-2">
                      {emailVerified ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t('emailVerified')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-yellow-600 font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {t('emailNotVerified')}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value })
                      // Reset verification status when email changes from original
                      // If changed back to original, we'll refresh status on save
                      if (e.target.value !== originalEmail) {
                        setEmailVerified(false)
                      }
                    }}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder="your.email@example.com"
                    disabled={isSaving || isUploading}
                  />
                  {formData.email !== originalEmail && (
                    <p className="text-xs text-yellow-600 mt-2">
                      {t('emailChangeWarning')}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="image" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('profilePicture')}
                  </label>
                  
                  {/* File Upload Section */}
                  <div className="mb-4">
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center w-full px-4 py-3 text-sm md:text-base rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-yellow-500 transition-colors"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <FontAwesomeIcon icon={faUpload} className="mr-2 text-gray-500" />
                      <span className="text-gray-700">{t('upload.selectFile')}</span>
                      <input
                        id="file-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isSaving || isUploading}
                      />
                    </label>
                    
                    {selectedFile && (
                      <div className="mt-3 p-3 rounded-xl border border-gray-200" style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                              {previewUrl && (
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isUploading && (
                              <>
                                <LiquidGlassButton
                                  type="button"
                                  onClick={handleFileUpload}
                                  variant="primary"
                                  size="sm"
                                  disabled={isSaving || isUploading}
                                >
                                  {t('upload.upload')}
                                </LiquidGlassButton>
                                <button
                                  type="button"
                                  onClick={handleRemoveFile}
                                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                                  disabled={isSaving || isUploading}
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </button>
                              </>
                            )}
                            {isUploading && (
                              <div className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-yellow-500" />
                                <span className="text-sm text-gray-600">{t('upload.uploading')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* URL Input (Alternative) */}
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-gray-300"></div>
                      <span className="text-xs text-gray-500 px-2">{t('upload.or')}</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <input
                      type="text"
                      id="image"
                      value={isUploadedImage ? '' : formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(8px)',
                      }}
                      placeholder={isUploadedImage ? t('upload.urlDisabledPlaceholder') : "https://example.com/profile.jpg"}
                      disabled={isSaving || isUploading || isUploadedImage}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs md:text-sm font-semibold text-gray-800">{t('lastfmUsername')}</span>
                    <div className="relative group">
                      <svg
                        className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 cursor-help"
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
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[9999] max-w-[200px] md:max-w-none"
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
                    className="px-3 md:px-4 py-2.5 md:py-3 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <p className="text-base md:text-lg text-gray-900 font-medium break-words">{lastfmUsername || 'Not set'}</p>
                  </div>
                </div>

                {/* Public profile settings */}
                <div>
                  <label htmlFor="bio" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
                    {t('bio')}
                  </label>
                  <textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base rounded-xl border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                    placeholder={t('bioPlaceholder')}
                    rows={4}
                    maxLength={500}
                    disabled={isSaving || isUploading}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-600">{t('bioHelp')}</p>
                    <p className="text-xs text-gray-500">{(formData.bio || '').length}/500</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-2">{t('publicProfile.title')}</h3>
                  <div
                    className="rounded-xl border border-gray-200 p-3 md:p-4 space-y-3"
                    style={{
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.profilePublic')}</span>
                      <input
                        type="checkbox"
                        checked={formData.profilePublic}
                        onChange={(e) => setFormData({ ...formData, profilePublic: e.target.checked })}
                        disabled={isSaving || isUploading}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.showStats')}</span>
                      <input
                        type="checkbox"
                        checked={formData.showProfileStats}
                        onChange={(e) => setFormData({ ...formData, showProfileStats: e.target.checked })}
                        disabled={isSaving || isUploading || !formData.profilePublic}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 font-medium">{t('publicProfile.showGroups')}</span>
                      <input
                        type="checkbox"
                        checked={formData.showProfileGroups}
                        onChange={(e) => setFormData({ ...formData, showProfileGroups: e.target.checked })}
                        disabled={isSaving || isUploading || !formData.profilePublic}
                        className="h-5 w-5 accent-yellow-500"
                      />
                    </label>

                    {lastfmUsername && formData.profilePublic && (
                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">{t('publicProfile.viewPublicProfileLabel')}</p>
                        <a
                          href={`/u/${encodeURIComponent(lastfmUsername)}`}
                          className="text-sm font-semibold text-[var(--theme-primary-dark)] hover:underline"
                        >
                          {t('publicProfile.viewPublicProfileLink')}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="locale" className="block text-xs md:text-sm font-semibold text-gray-800 mb-2">
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
                    disabled={isSaving || isUploading}
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {t('selectLanguage')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                  <LiquidGlassButton
                    type="submit"
                    disabled={isSaving || isUploading}
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="text-base md:text-lg min-h-[44px]"
                  >
                    {isSaving ? t('saving') : t('saveChanges')}
                  </LiquidGlassButton>
                  <LiquidGlassButton
                    type="button"
                    onClick={() => router.back()}
                    variant="neutral"
                    size="lg"
                    className="min-h-[44px]"
                  >
                    {tCommon('cancel')}
                  </LiquidGlassButton>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div
            className="rounded-3xl p-4 md:p-6 lg:p-8 xl:p-10 relative mt-6 md:mt-8"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="relative z-10">
              <h2 className="text-xl md:text-2xl font-bold text-red-600 mb-2">{t('dangerZone.title')}</h2>
              <p className="text-xs md:text-sm text-gray-600 mb-4">
                {t('dangerZone.description')}
              </p>
              <div className="pt-4 border-t border-red-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                      {t('dangerZone.deleteAccount.title')}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      {t('dangerZone.deleteAccount.description')}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="px-4 py-2.5 md:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm md:text-base min-h-[44px] sm:min-h-0 w-full sm:w-auto"
                  >
                    {t('dangerZone.deleteAccount.button')}
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

      <RemovePictureModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleRemovePicture}
      />
    </main>
  )
}

