'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface GroupSettingsFormProps {
  groupId: string
  initialChartSize: number
  initialChartMode: string
  initialTrackingDayOfWeek: number
}

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

export default function GroupSettingsForm({
  groupId,
  initialChartSize,
  initialChartMode,
  initialTrackingDayOfWeek,
}: GroupSettingsFormProps) {
  const router = useRouter()
  const [chartSize, setChartSize] = useState(initialChartSize)
  const [chartMode, setChartMode] = useState(initialChartMode)
  const [trackingDayOfWeek, setTrackingDayOfWeek] = useState(initialTrackingDayOfWeek)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Find initial carousel index
  const initialIndex = CHART_MODES.findIndex(mode => mode.value === initialChartMode)
  const [carouselIndex, setCarouselIndex] = useState(initialIndex >= 0 ? initialIndex : 0)

  const hasChanges =
    chartSize !== initialChartSize ||
    chartMode !== initialChartMode ||
    trackingDayOfWeek !== initialTrackingDayOfWeek

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartSize,
          chartMode,
          trackingDayOfWeek,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings')
      }

      setSuccess(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/groups/${groupId}`)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {success && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          Settings updated successfully! Redirecting...
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  chartSize === size
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="chartSize"
                  value={size}
                  checked={chartSize === size}
                  onChange={(e) => setChartSize(Number(e.target.value))}
                  className="sr-only"
                />
                <span className="font-medium">Top {size}</span>
              </label>
            ))}
          </div>
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
                  setChartMode(CHART_MODES[newIndex].value)
                }}
                className="p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label="Previous mode"
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
                  setChartMode(CHART_MODES[newIndex].value)
                }}
                className="p-2 rounded-full hover:bg-yellow-100 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                aria-label="Next mode"
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
                    setChartMode(mode.value)
                  }}
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
              value={chartMode}
              checked={true}
              readOnly
              className="sr-only"
            />
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
            value={trackingDayOfWeek}
            onChange={(e) => setTrackingDayOfWeek(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          >
            {DAYS_OF_WEEK.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-3 px-6 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

