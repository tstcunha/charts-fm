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
    label: 'VS Mode',
    description: 'Rank-based scoring. Each user\'s top items are scored based on position (1.00 for #1, decreasing). Charts are ranked by the sum of VS across all users.',
  },
  {
    value: 'vs_weighted',
    label: 'VS Weighted',
    description: 'Rank-based scoring weighted by play count. VS is multiplied by play count for each user, then summed. Balances ranking importance with listening volume.',
  },
  {
    value: 'plays_only',
    label: 'Plays Only',
    description: 'Traditional mode. Charts are ranked by total play count across all users. VS equals total plays for consistency.',
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
          <label htmlFor="chartSize" className="block text-sm font-medium text-gray-700 mb-2">
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
          <label htmlFor="chartMode" className="block text-sm font-medium text-gray-700 mb-2">
            Chart Mode
          </label>
          <p className="text-sm text-gray-500 mb-4">
            How charts are calculated and ranked. Changing this only affects future charts.
          </p>
          <div className="space-y-3">
            {CHART_MODES.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  chartMode === mode.value
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="chartMode"
                  value={mode.value}
                  checked={chartMode === mode.value}
                  onChange={(e) => setChartMode(e.target.value)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-1">{mode.label}</div>
                  <div className="text-sm text-gray-600">{mode.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="trackingDayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
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

