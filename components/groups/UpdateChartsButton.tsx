'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface UpdateChartsButtonProps {
  groupId: string
  initialInProgress?: boolean
  onUpdateComplete?: () => void
}

export default function UpdateChartsButton({ groupId, initialInProgress = false, onUpdateComplete }: UpdateChartsButtonProps) {
  const [isUpdating, setIsUpdating] = useState(initialInProgress)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const t = useSafeTranslations('groups.weeklyCharts')

  const pollForCompletion = async () => {
    const pollInterval = 2500 // 2.5 seconds

    const poll = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}/charts/update`)
        if (!response.ok) {
          throw new Error('Failed to check update status')
        }

        const data = await response.json()

        if (!data.inProgress) {
          // Generation complete
          setIsUpdating(false)
          // Refresh the page to update server components
          router.refresh()
          onUpdateComplete?.()
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

  // If initially in progress, start polling
  useEffect(() => {
    if (initialInProgress) {
      pollForCompletion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInProgress])

  const handleUpdate = async () => {
    setIsUpdating(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/charts/update`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToUpdate'))
      }

      // Start polling for completion
      pollForCompletion()
    } catch (err: any) {
      setError(err.message || t('failedToUpdate'))
      setIsUpdating(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold shadow-sm w-full md:w-auto md:inline-flex">
        <span className="text-sm">Error: {error}</span>
      </div>
    )
  }

  return (
    <LiquidGlassButton
      onClick={handleUpdate}
      disabled={isUpdating}
      variant="primary"
      size="sm"
      useTheme
      className="w-full md:w-auto"
      icon={isUpdating ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : undefined}
    >
      {isUpdating ? t('updatingCharts') : t('updateCharts')}
    </LiquidGlassButton>
  )
}

