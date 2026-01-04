'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface RequestToJoinButtonProps {
  groupId: string
  hasPendingRequest: boolean
  allowFreeJoin?: boolean
}

export default function RequestToJoinButton({
  groupId,
  hasPendingRequest,
  allowFreeJoin = false,
}: RequestToJoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(hasPendingRequest)
  const [hasJoined, setHasJoined] = useState(false)
  const router = useRouter()

  const handleRequest = async () => {
    if (hasRequested || hasJoined) return

    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send request')
      }

      if (data.joined) {
        // User was directly added as a member
        setHasJoined(true)
        // Redirect to the group page after a short delay
        setTimeout(() => {
          router.push(`/groups/${groupId}`)
        }, 1000)
      } else {
        // Request was sent
        setHasRequested(true)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleRequest}
        disabled={hasRequested || hasJoined || isLoading}
        className={`
          px-4 py-2 rounded-lg font-semibold transition-colors
          ${
            hasRequested || hasJoined || isLoading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-yellow-500 text-black hover:bg-yellow-400'
          }
        `}
      >
        {isLoading
          ? (allowFreeJoin ? 'Joining...' : 'Sending...')
          : hasJoined
          ? 'Joined!'
          : hasRequested
          ? 'Request Sent'
          : allowFreeJoin
          ? 'Join'
          : 'Request to Join'}
      </button>
    </div>
  )
}

