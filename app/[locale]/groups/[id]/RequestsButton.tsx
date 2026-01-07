'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

// Lazy load modal to reduce initial bundle size
const RequestsModal = dynamic(() => import('./RequestsModal'), {
  ssr: false,
  loading: () => null,
})

interface RequestsButtonProps {
  groupId: string
  requestCount: number
}

export default function RequestsButton({
  groupId,
  requestCount: initialRequestCount,
}: RequestsButtonProps) {
  const t = useSafeTranslations('groups.members')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requestCount, setRequestCount] = useState(initialRequestCount)

  const updateRequestCount = async () => {
    // Update the request count by fetching the current count
    try {
      const response = await fetch(`/api/groups/${groupId}/requests`)
      if (response.ok) {
        const data = await response.json()
        const currentCount = data.requests?.length || 0
        setRequestCount(currentCount)
      }
    } catch (err) {
      // If fetch fails, just decrement the count locally
      setRequestCount((prev) => Math.max(0, prev - 1))
    }
  }

  const handleRequestProcessed = async () => {
    // Update count asynchronously without closing modal
    await updateRequestCount()
  }

  const handleModalOpen = () => {
    setIsModalOpen(true)
    // Refresh count when opening modal to ensure accuracy
    updateRequestCount()
  }

  return (
    <>
      <LiquidGlassButton
        onClick={handleModalOpen}
        disabled={requestCount === 0}
        variant={requestCount === 0 ? 'neutral' : 'primary'}
        useTheme={false}
      >
        {t('requests')} ({requestCount})
      </LiquidGlassButton>

      <RequestsModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestProcessed={handleRequestProcessed}
      />
    </>
  )
}

