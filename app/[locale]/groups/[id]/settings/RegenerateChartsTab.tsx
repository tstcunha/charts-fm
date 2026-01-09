'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import ChartGenerationErrorModal from '@/components/ChartGenerationErrorModal'

interface RegenerateChartsTabProps {
  groupId: string
  isSuperuser?: boolean
  initialInProgress?: boolean
}

export default function RegenerateChartsTab({ 
  groupId, 
  isSuperuser = false, 
  initialInProgress = false 
}: RegenerateChartsTabProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.regenerateCharts')
  const tMessages = useSafeTranslations('groups.settings.regenerateCharts.loadingMessages')
  
  const LOADING_MESSAGES = useMemo(() => [
    tMessages('interestingTastes'),
    tMessages('unexpectedArtist'),
    tMessages('oldTrack'),
    tMessages('calculatingPositions'),
    tMessages('deepCuts'),
    tMessages('albumLove'),
    tMessages('uniqueHabits'),
    tMessages('processingScrobbles'),
    tMessages('hiddenGems'),
  ], [tMessages])
  
  const [isLoading, setIsLoading] = useState(initialInProgress)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [showFirstMessage, setShowFirstMessage] = useState(true)
  const [weeks, setWeeks] = useState<number>(5)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [failedUsers, setFailedUsers] = useState<string[]>([])
  const [aborted, setAborted] = useState(false)

  // Poll for completion if initially in progress
  useEffect(() => {
    if (initialInProgress) {
      const pollForCompletion = async () => {
        const pollInterval = 2500 // 2.5 seconds

        const poll = async () => {
          try {
            const response = await fetch(`/api/groups/${groupId}/charts/update`)
            if (!response.ok) {
              throw new Error('Failed to check generation status')
            }

            const data = await response.json()

            if (!data.inProgress) {
              // Generation complete
              setIsLoading(false)
              router.refresh()
            } else {
              // Still in progress, poll again
              setTimeout(poll, pollInterval)
            }
          } catch (err) {
            console.error('Error polling for completion:', err)
            // Continue polling even on error (might be temporary)
            setTimeout(poll, pollInterval)
          }
        }

        // Start polling
        setTimeout(poll, pollInterval)
      }

      pollForCompletion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInProgress])

  useEffect(() => {
    if (!isLoading) {
      setShowFirstMessage(true)
      setCurrentMessageIndex(0)
      return
    }

    // Show first message for 10 seconds, then start rotating
    const firstMessageTimer = setTimeout(() => {
      setShowFirstMessage(false)
    }, 10000)

    // Rotate messages every 10 seconds (starting after first message) with random selection
    const rotationTimer = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        // Pick a random index, but avoid showing the same message twice in a row
        let newIndex
        do {
          newIndex = Math.floor(Math.random() * LOADING_MESSAGES.length)
        } while (newIndex === prev && LOADING_MESSAGES.length > 1)
        return newIndex
      })
    }, 10000)

    return () => {
      clearTimeout(firstMessageTimer)
      clearInterval(rotationTimer)
    }
  }, [isLoading])

  const handleGenerate = async () => {
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    setShowFirstMessage(true)
    setCurrentMessageIndex(0)

    try {
      const body: { weeks?: number } = {}
      if (isSuperuser) {
        body.weeks = weeks
      }

      const response = await fetch(`/api/groups/${groupId}/charts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      let data: any = {}
      try {
        data = await response.json()
      } catch (jsonError) {
        // If JSON parsing fails, try to get text
        const text = await response.text()
        throw new Error(text || 'Failed to parse response')
      }

      // Check for failed users info in both success and error responses (check this FIRST)
      if (data.failedUsers && Array.isArray(data.failedUsers) && data.failedUsers.length > 0) {
        setFailedUsers(data.failedUsers)
        setAborted(data.aborted || false)
        setShowErrorModal(true)
        setIsLoading(false)
        // If it was a success response with warnings, also set success
        if (response.ok) {
          setSuccess(true)
        }
        return
      }

      if (!response.ok) {
        throw new Error(data.error || t('failedToGenerate'))
      }

      setSuccess(true)
      setIsLoading(false)
      
      // Refresh the page to show updated charts
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToGenerate'))
      setIsLoading(false)
    }
  }

  const getLoadingMessage = () => {
    if (showFirstMessage) {
      return t('fetchingData')
    }
    return LOADING_MESSAGES[currentMessageIndex]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">
      <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">{t('title')}</h2>
      
      {isLoading && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg flex items-center gap-2 md:gap-3 text-sm md:text-base">
          <svg
            className="animate-spin h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>{getLoadingMessage()}</span>
        </div>
      )}

      {success && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm md:text-base">
          {t('generatedSuccessfully')}
        </div>
      )}

      {error && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm md:text-base">
          {error}
        </div>
      )}

      <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
        {t('description', { weeks: isSuperuser ? weeks : 10 })}
      </p>

      {isSuperuser && (
        <div className="mb-4 md:mb-6">
          <label htmlFor="weeks" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('weeksToGenerate')}
          </label>
          <input
            id="weeks"
            type="number"
            min="1"
            max="52"
            value={weeks}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10)
              if (!isNaN(value) && value > 0 && value <= 52) {
                setWeeks(value)
              }
            }}
            disabled={isLoading}
            className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('weeksToGenerateDescription')}
          </p>
        </div>
      )}

      {isLoading && !success && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-sm md:text-base">
          {t('alreadyInProgress')}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-1">
            {t('generating')}
            <span className="inline-flex">
              <span className="animate-dots">.</span>
              <span className="animate-dots-delay-1">.</span>
              <span className="animate-dots-delay-2">.</span>
            </span>
          </span>
        ) : (
          t('generateCharts')
        )}
      </button>

      <ChartGenerationErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false)
          if (success) {
            router.refresh()
          }
        }}
        failedUsers={failedUsers}
        aborted={aborted}
      />
    </div>
  )
}

