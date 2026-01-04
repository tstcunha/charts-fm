'use client'

import { useState } from 'react'
import RequestsModal from './RequestsModal'

interface RequestsButtonProps {
  groupId: string
  requestCount: number
}

export default function RequestsButton({
  groupId,
  requestCount: initialRequestCount,
}: RequestsButtonProps) {
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
      <button
        onClick={handleModalOpen}
        disabled={requestCount === 0}
        className={`
          px-4 py-2 rounded-lg font-semibold transition-colors
          ${
            requestCount === 0
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }
        `}
      >
        Requests ({requestCount})
      </button>

      <RequestsModal
        groupId={groupId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRequestProcessed={handleRequestProcessed}
      />
    </>
  )
}

