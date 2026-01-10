'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import CustomSelect from '@/components/CustomSelect'
import Toggle from '@/components/Toggle'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { useTranslations } from 'next-intl'

const CHART_SIZES = [10, 20, 50]

export default function CreateGroupPage() {
  const router = useRouter()
  const t = useSafeTranslations('groups.create')
  const tChart = useSafeTranslations('groups.settings.chartCreation')
  const tChartRich = useTranslations('groups.settings.chartCreation')
  const tGroupDetails = useSafeTranslations('groups.settings.groupDetails')
  const tDays = useSafeTranslations('groups.settings.chartCreation.daysOfWeek')
  const tModes = useSafeTranslations('groups.settings.chartCreation.modes')
  const tCommon = useSafeTranslations('common')
  
  const DAYS_OF_WEEK = useMemo(() => [
    { value: 0, label: tDays('sunday') },
    { value: 3, label: tDays('wednesday') },
  ], [tDays])

  const CHART_MODES = useMemo(() => [
    {
      value: 'vs',
      label: tModes('vs.label'),
      icon: '/icons/icon_vs.png',
      description: tModes('vs.description'),
    },
    {
      value: 'vs_weighted',
      label: tModes('vsWeighted.label'),
      icon: '/icons/icon_vs_weighted.png',
      description: tModes('vsWeighted.description'),
    },
    {
      value: 'plays_only',
      label: tModes('playsOnly.label'),
      icon: '/icons/icon_plays.png',
      description: tModes('playsOnly.description'),
    },
  ], [tModes])

  const ICON_SOURCES = useMemo(() => [
    { value: 'top_album', label: tGroupDetails('iconSources.topAlbum') },
    { value: 'top_artist', label: tGroupDetails('iconSources.topArtist') },
    { value: 'top_track_artist', label: tGroupDetails('iconSources.topTrackArtist') },
  ], [tGroupDetails])

  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // Step 1: Group details
    name: '',
    image: '',
    dynamicIconEnabled: false,
    dynamicIconSource: 'top_album',
    isPrivate: false,
    allowFreeJoin: false,
    // Step 2: Chart settings
    chartSize: 10,
    trackingDayOfWeek: 0,
    chartMode: 'vs', // Default to VS
    // Step 3: Invites
    invites: [] as string[],
  })
  const [inviteInput, setInviteInput] = useState('')
  const [inviteErrors, setInviteErrors] = useState<Record<number, string>>({})
  const [isValidatingUsername, setIsValidatingUsername] = useState(false)
  
  // Find initial carousel index
  const initialIndex = CHART_MODES.findIndex(mode => mode.value === formData.chartMode)
  const [carouselIndex, setCarouselIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

  useEffect(() => {
    document.title = `ChartsFM - ${t('title')}`
  }, [t])

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      setError(t('groupNameRequired'))
      return false
    }
    return true
  }

  // Step 2 validation (always valid, has defaults)
  const validateStep2 = (): boolean => {
    return true
  }

  // Step 3 validation (optional, can skip)
  const validateStep3 = (): boolean => {
    return true
  }

  const handleNext = () => {
    setError(null)
    
    if (currentStep === 1 && !validateStep1()) {
      return
    }
    if (currentStep === 2 && !validateStep2()) {
      return
    }
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setError(null)
    }
  }

  const handleAddInvite = async () => {
    const username = inviteInput.trim()
    if (!username) {
      return
    }

    // Check for duplicates (case-insensitive)
    const normalizedInput = username.toLowerCase()
    if (formData.invites.some(inv => inv.toLowerCase() === normalizedInput)) {
      setInviteErrors({ ...inviteErrors, [formData.invites.length]: t('usernameAlreadyInList') })
      return
    }

    // Validate username exists
    setIsValidatingUsername(true)
    try {
      const response = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(username)}`)
      const data = await response.json()

      if (!response.ok || !data.exists) {
        setInviteErrors({ ...inviteErrors, [formData.invites.length]: data.error || t('userNotFound') })
        setIsValidatingUsername(false)
        return
      }

      // Username is valid, add to list with correct casing from database
      const actualUsername = data.user.lastfmUsername
      setFormData({
        ...formData,
        invites: [...formData.invites, actualUsername],
      })
      setInviteInput('')
      setInviteErrors({})
    } catch (err) {
      setInviteErrors({ ...inviteErrors, [formData.invites.length]: t('failedToValidateUsername') })
    } finally {
      setIsValidatingUsername(false)
    }
  }

  const handleRemoveInvite = (index: number) => {
    setFormData({
      ...formData,
      invites: formData.invites.filter((_, i) => i !== index),
    })
    // Clear any error for this index
    const newErrors = { ...inviteErrors }
    delete newErrors[index]
    setInviteErrors(newErrors)
  }

  const handleSubmit = async () => {
    if (!validateStep3()) {
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // Create the group
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          image: formData.image,
          dynamicIconEnabled: formData.dynamicIconEnabled,
          dynamicIconSource: formData.dynamicIconEnabled ? formData.dynamicIconSource : null,
          chartSize: formData.chartSize,
          trackingDayOfWeek: formData.trackingDayOfWeek,
          chartMode: formData.chartMode,
          isPrivate: formData.isPrivate,
          allowFreeJoin: formData.isPrivate ? false : formData.allowFreeJoin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToCreateGroup'))
      }

      const groupId = data.group.id

      // Send invites if any
      if (formData.invites.length > 0) {
        const invitePromises = formData.invites.map(async (lastfmUsername) => {
          try {
            const inviteResponse = await fetch(`/api/groups/${groupId}/members`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ lastfmUsername }),
            })

            if (!inviteResponse.ok) {
              const inviteData = await inviteResponse.json()
              throw new Error(inviteData.error || t('failedToSendInvite'))
            }
            return { success: true, username: lastfmUsername }
          } catch (err) {
            return { success: false, username: lastfmUsername, error: err instanceof Error ? err.message : 'Unknown error' }
          }
        })

        const inviteResults = await Promise.all(invitePromises)
        const failedInvites = inviteResults.filter(r => !r.success)
        
        if (failedInvites.length > 0) {
          // Some invites failed, but group was created successfully
          console.warn('Some invites failed:', failedInvites)
          // Continue anyway - group is created
        }
      }

      // Redirect to the new group
      router.push(`/groups/${groupId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateGroup'))
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{t('step1.title')}</h2>
        <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
          {t('step1.description')}
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          {tGroupDetails('groupName')} *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base"
          placeholder={t('step1.namePlaceholder')}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
          {tGroupDetails('groupIcon')}
        </label>
        <input
          type="url"
          id="image"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="w-full px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base"
          placeholder={tGroupDetails('iconUrlPlaceholder')}
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('step1.iconOptional')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tGroupDetails('dynamicIcon')}
        </label>
        <p className="text-xs text-gray-500 mb-3">
          {tGroupDetails('dynamicIconDescription')}
        </p>
        
        <div className="mb-4">
          <Toggle
            id="dynamicIconEnabled"
            checked={formData.dynamicIconEnabled}
            onChange={(checked) => setFormData({ ...formData, dynamicIconEnabled: checked })}
            disabled={isLoading}
            label={tGroupDetails('enableDynamicIcon')}
          />
        </div>

        {formData.dynamicIconEnabled && (
          <div>
            <label htmlFor="dynamicIconSource" className="block text-sm font-medium text-gray-700 mb-2">
              {tGroupDetails('iconSource')}
            </label>
            <CustomSelect
              id="dynamicIconSource"
              options={ICON_SOURCES.map(source => ({ value: source.value, label: source.label }))}
              value={formData.dynamicIconSource}
              onChange={(value) => setFormData({ ...formData, dynamicIconSource: String(value) })}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {tGroupDetails('iconSourceDescription')}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {tGroupDetails('privacySettings')}
        </label>
        <Toggle
          id="isPrivate"
          checked={formData.isPrivate}
          onChange={(checked) => {
            setFormData({ 
              ...formData, 
              isPrivate: checked,
              allowFreeJoin: checked ? false : formData.allowFreeJoin // Disable free join if private
            })
          }}
          disabled={isLoading}
          label={tGroupDetails('privateGroup')}
        />
        <p className="text-xs text-gray-500 mt-1">
          {tGroupDetails('privateGroupDescription')}
        </p>
      </div>

      {!formData.isPrivate && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {tGroupDetails('joinSettings')}
          </label>
          <Toggle
            id="allowFreeJoin"
            checked={formData.allowFreeJoin}
            onChange={(checked) => setFormData({ ...formData, allowFreeJoin: checked })}
            disabled={isLoading}
            label={tGroupDetails('usersCanJoinFreely')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {tGroupDetails('usersCanJoinFreelyDescription')}
          </p>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{t('step2.title')}</h2>
        <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
          {t('step2.description')}
        </p>
      </div>

      <div>
        <label htmlFor="chartSize" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
          {tChart('chartSize')}
        </label>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
          {tChart('chartSizeDescription')}
        </p>
        <div className="flex flex-wrap gap-2 md:gap-4">
          {CHART_SIZES.map((size) => (
            <label
              key={size}
              className={`flex items-center px-3 md:px-4 py-2.5 md:py-2 border-2 rounded-lg cursor-pointer transition-colors min-h-[44px] ${
                formData.chartSize === size
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="chartSize"
                value={size}
                checked={formData.chartSize === size}
                onChange={(e) => setFormData({ ...formData, chartSize: Number(e.target.value) })}
                className="sr-only"
                disabled={isLoading}
              />
              <span className="font-medium text-sm md:text-base">{tChart('top', { size })}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="trackingDayOfWeek" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
          {tChart('trackingDayOfWeek')}
        </label>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
          {tChart('trackingDayOfWeekDescription')}
        </p>
        <CustomSelect
          id="trackingDayOfWeek"
          options={DAYS_OF_WEEK.map(day => ({ value: day.value, label: day.label }))}
          value={formData.trackingDayOfWeek}
          onChange={(value) => setFormData({ ...formData, trackingDayOfWeek: Number(value) })}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="chartMode" className="block text-base md:text-lg font-bold text-gray-900 mb-2">
          {tChart('chartMode')}
        </label>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
          {tChart('chartModeDescription')}
        </p>
        
        {/* Carousel Selector */}
        <div className="relative">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => {
                const newIndex = carouselIndex === 0 ? CHART_MODES.length - 1 : carouselIndex - 1
                setCarouselIndex(newIndex)
                setFormData({ ...formData, chartMode: CHART_MODES[newIndex].value })
              }}
              className="p-2 md:p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={tChart('previousMode')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Carousel Card */}
            <div className="flex-1 max-w-md w-full">
              <div className="relative bg-white border-2 border-yellow-500 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg min-h-[380px] md:min-h-[400px] lg:min-h-[420px] flex flex-col">
                <div className="flex flex-col items-center flex-1">
                  {/* Icon */}
                  <div className="mb-3 md:mb-4 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 flex items-center justify-center bg-white rounded-xl p-2 flex-shrink-0">
                    <img
                      src={CHART_MODES[carouselIndex].icon}
                      alt={CHART_MODES[carouselIndex].label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Title (outside bubble) */}
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2 flex-shrink-0 text-center w-full px-2">
                    {CHART_MODES[carouselIndex].label}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-xs md:text-sm text-gray-600 text-left break-words w-full px-2 md:px-3">
                    {CHART_MODES[carouselIndex].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => {
                const newIndex = carouselIndex === CHART_MODES.length - 1 ? 0 : carouselIndex + 1
                setCarouselIndex(newIndex)
                setFormData({ ...formData, chartMode: CHART_MODES[newIndex].value })
              }}
              className="p-2 md:p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={tChart('nextMode')}
              disabled={isLoading}
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-3 md:mt-4">
            {CHART_MODES.map((mode, index) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setCarouselIndex(index)
                  setFormData({ ...formData, chartMode: mode.value })
                }}
                disabled={isLoading}
                className={`h-2 rounded-full transition-all min-w-[8px] min-h-[8px] ${
                  carouselIndex === index
                    ? 'bg-yellow-500 w-8'
                    : 'bg-gray-300 hover:bg-gray-400 w-2'
                }`}
                aria-label={tChart('selectMode', { mode: mode.label })}
              />
            ))}
          </div>

          {/* Hidden radio input for form submission */}
          <input
            type="radio"
            name="chartMode"
            value={formData.chartMode}
            checked={true}
            readOnly
            className="sr-only"
          />
        </div>
        
        {/* FAQ Link */}
        <p className="text-xs md:text-sm text-gray-500 mt-3 md:mt-4">
          {tChartRich.rich('chartModeFAQLink', {
            link: (chunks) => (
              <Link
                href="/faq#what-is-the-vibe-score-vs"
                className="text-[var(--theme-primary)] hover:underline transition-colors duration-200"
              >
                {chunks}
              </Link>
            )
          })}
        </p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{t('step3.title')}</h2>
        <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
          {t('step3.description')}
        </p>
      </div>

      <div>
        <label htmlFor="inviteInput" className="block text-sm font-medium text-gray-700 mb-2">
          {t('step3.lastfmUsername')}
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            id="inviteInput"
            value={inviteInput}
            onChange={(e) => {
              setInviteInput(e.target.value)
              // Clear error when user types
              if (inviteErrors[formData.invites.length]) {
                const newErrors = { ...inviteErrors }
                delete newErrors[formData.invites.length]
                setInviteErrors(newErrors)
              }
            }}
            onKeyPress={async (e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                await handleAddInvite()
              }
            }}
            className="flex-1 px-4 py-3 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-base"
            placeholder={t('step3.usernamePlaceholder')}
            disabled={isLoading || isValidatingUsername}
          />
          <button
            type="button"
            onClick={handleAddInvite}
            disabled={isLoading || !inviteInput.trim() || isValidatingUsername}
            className="px-6 py-3 md:py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isValidatingUsername ? t('step3.checking') : t('step3.add')}
          </button>
        </div>
        {inviteErrors[formData.invites.length] && (
          <p className="mt-2 text-sm text-red-600">{inviteErrors[formData.invites.length]}</p>
        )}
      </div>

      {formData.invites.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('step3.invites', { count: formData.invites.length })}
          </label>
          <div className="space-y-2">
            {formData.invites.map((username, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 md:p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 truncate pr-2">{username}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInvite(index)}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 px-2 py-1 min-h-[36px] min-w-[60px] flex-shrink-0"
                >
                  {t('step3.remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.invites.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          {t('step3.noInvitesYet')}
        </div>
      )}
    </div>
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8 md:px-6 md:py-12 lg:px-12 lg:py-16 xl:p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-6 md:mb-8">{t('title')}</h1>

        {/* Progress Indicator */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 1 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full mx-1 md:mx-2 ${currentStep >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 3 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
          </div>
          <div className="flex items-center justify-between text-xs md:text-sm text-gray-600">
            <span className={`truncate px-1 ${currentStep === 1 ? 'font-semibold text-yellow-600' : ''}`}>{t('step1.title')}</span>
            <span className={`truncate px-1 ${currentStep === 2 ? 'font-semibold text-yellow-600' : ''}`}>{t('step2.title')}</span>
            <span className={`truncate px-1 ${currentStep === 3 ? 'font-semibold text-yellow-600' : ''}`}>{t('step3.title')}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 md:p-4 bg-red-100 border border-red-400 text-red-700 rounded text-sm md:text-base">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200">
            {currentStep < 3 ? (
              <>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 min-h-[44px] order-2 sm:order-1"
                  >
                    {t('back')}
                  </button>
                )}
                <div className="flex-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] order-1 sm:order-2"
                >
                  {t('next')}
                </button>
              </>
            ) : (
              <>
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 min-h-[44px] order-2 sm:order-1"
                  >
                    {t('back')}
                  </button>
                )}
                <div className="flex-1 hidden sm:block" />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] order-1 sm:order-2"
                >
                  {isLoading ? t('creating') : t('createButton')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
