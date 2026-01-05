'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const CHART_SIZES = [10, 20, 50, 100]

const CHART_MODES = [
  {
    value: 'vs',
    label: 'Vibe Score (VS)',
    icon: '/icons/icon_vs.png',
    description: '✨ Recommended! Every member\'s top picks get equal love. Your #1 track scores 1.00, and we sum everyone\'s scores together. Perfect for groups where everyone\'s taste matters equally!',
  },
  {
    value: 'vs_weighted',
    label: 'VS Weighted',
    icon: '/icons/icon_vs_weighted.png',
    description: 'The best of both worlds! We multiply your VS by how many times you actually played it. Great for balancing what\'s important to you with how much you listened.',
  },
  {
    value: 'plays_only',
    label: 'Plays Only',
    icon: '/icons/icon_plays.png',
    description: 'Classic and simple! Just add up all the play counts. If you want the traditional "most played wins" approach, this is your jam.',
  },
]

export default function CreateGroupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    // Step 1: Group details
    name: '',
    image: '',
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

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      setError('Group name is required')
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
      setInviteErrors({ ...inviteErrors, [formData.invites.length]: 'This username is already in the list' })
      return
    }

    // Validate username exists
    setIsValidatingUsername(true)
    try {
      const response = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(username)}`)
      const data = await response.json()

      if (!response.ok || !data.exists) {
        setInviteErrors({ ...inviteErrors, [formData.invites.length]: data.error || 'User with this Last.fm username not found' })
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
      setInviteErrors({ ...inviteErrors, [formData.invites.length]: 'Failed to validate username. Please try again.' })
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
          chartSize: formData.chartSize,
          trackingDayOfWeek: formData.trackingDayOfWeek,
          chartMode: formData.chartMode,
          isPrivate: false,
          allowFreeJoin: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create group')
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
              throw new Error(inviteData.error || 'Failed to send invite')
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
      setError(err instanceof Error ? err.message : 'Failed to create group')
      setIsLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Group Details</h2>
        <p className="text-sm text-gray-600 mb-6">
          Set up the basic information for your group.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Group Name *
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="My Music Group"
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
          Group Icon (Image URL)
        </label>
        <input
          type="url"
          id="image"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="https://example.com/icon.png"
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Enter a URL to an image for your group icon
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Chart Settings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Configure how charts are calculated and displayed.
        </p>
      </div>

      <div>
        <label htmlFor="chartSize" className="block text-lg font-bold text-gray-900 mb-2">
          Chart Size
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Number of items to display in each chart (Top 10, Top 20, Top 50, or Top 100)
        </p>
        <div className="flex gap-4">
          {CHART_SIZES.map((size) => (
            <label
              key={size}
              className={`flex items-center px-4 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
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
              <span className="font-medium">Top {size}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="trackingDayOfWeek" className="block text-lg font-bold text-gray-900 mb-2">
          Tracking Day of Week
        </label>
        <p className="text-sm text-gray-500 mb-4">
          The day of the week when charts are calculated and when the week starts. For example, if set to Wednesday, weeks will run from Wednesday to Wednesday and charts will be calculated on Wednesdays.
        </p>
        <select
          id="trackingDayOfWeek"
          value={formData.trackingDayOfWeek}
          onChange={(e) => setFormData({ ...formData, trackingDayOfWeek: Number(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          disabled={isLoading}
        >
          {DAYS_OF_WEEK.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="chartMode" className="block text-lg font-bold text-gray-900 mb-2">
          Chart Mode
        </label>
        <p className="text-sm text-gray-500 mb-4">
          How charts are calculated and ranked. Changing this only affects future charts.
        </p>
        
        {/* Carousel Selector */}
        <div className="relative">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => {
                const newIndex = carouselIndex === 0 ? CHART_MODES.length - 1 : carouselIndex - 1
                setCarouselIndex(newIndex)
                setFormData({ ...formData, chartMode: CHART_MODES[newIndex].value })
              }}
              className="p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Previous mode"
              disabled={isLoading}
            >
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Carousel Card */}
            <div className="flex-1 max-w-md">
              <div className="relative bg-white border-2 border-yellow-500 rounded-2xl p-6 shadow-lg h-[420px] flex flex-col">
                <div className="flex flex-col items-center flex-1">
                  {/* Icon */}
                  <div className="mb-4 w-48 h-48 flex items-center justify-center bg-white rounded-xl p-2 flex-shrink-0">
                    <img
                      src={CHART_MODES[carouselIndex].icon}
                      alt={CHART_MODES[carouselIndex].label}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Title (outside bubble) */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 flex-shrink-0">
                    {CHART_MODES[carouselIndex].label}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 text-center flex-1 flex items-center">
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
              className="p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Next mode"
              disabled={isLoading}
            >
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-4">
            {CHART_MODES.map((mode, index) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => {
                  setCarouselIndex(index)
                  setFormData({ ...formData, chartMode: mode.value })
                }}
                disabled={isLoading}
                className={`w-2 h-2 rounded-full transition-all ${
                  carouselIndex === index
                    ? 'bg-yellow-500 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Select ${mode.label}`}
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
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Invite Users</h2>
        <p className="text-sm text-gray-600 mb-6">
          Optionally invite users to join your group. You can skip this step and invite users later.
        </p>
      </div>

      <div>
        <label htmlFor="inviteInput" className="block text-sm font-medium text-gray-700 mb-2">
          Last.fm Username
        </label>
        <div className="flex gap-2">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            placeholder="Enter Last.fm username"
            disabled={isLoading || isValidatingUsername}
          />
          <button
            type="button"
            onClick={handleAddInvite}
            disabled={isLoading || !inviteInput.trim() || isValidatingUsername}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidatingUsername ? 'Checking...' : 'Add'}
          </button>
        </div>
        {inviteErrors[formData.invites.length] && (
          <p className="mt-2 text-sm text-red-600">{inviteErrors[formData.invites.length]}</p>
        )}
      </div>

      {formData.invites.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invites ({formData.invites.length})
          </label>
          <div className="space-y-2">
            {formData.invites.map((username, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900">{username}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveInvite(index)}
                  disabled={isLoading}
                  className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.invites.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No invites added yet. You can skip this step and invite users later.
        </div>
      )}
    </div>
  )

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-8">Create Group</h1>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 1 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full mx-2 ${currentStep >= 2 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-full ${currentStep >= 3 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className={currentStep === 1 ? 'font-semibold text-yellow-600' : ''}>Group Details</span>
            <span className={currentStep === 2 ? 'font-semibold text-yellow-600' : ''}>Chart Settings</span>
            <span className={currentStep === 3 ? 'font-semibold text-yellow-600' : ''}>Invite Users</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Step Content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Group'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
