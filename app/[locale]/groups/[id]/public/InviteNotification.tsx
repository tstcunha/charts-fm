'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'

interface InviteNotificationProps {
  groupId: string
  inviteId: string
}

export default function InviteNotification({ groupId, inviteId }: InviteNotificationProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAccepted, setIsAccepted] = useState(false)
  const [isRejected, setIsRejected] = useState(false)

  const handleAccept = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invite')
      }

      setIsAccepted(true)
      // Redirect to the group page after a short delay
      setTimeout(() => {
        router.push(`/groups/${groupId}`)
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite')
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject invite')
      }

      setIsRejected(true)
      // Refresh the page to update the UI
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject invite')
      setIsLoading(false)
    }
  }

  if (isAccepted) {
    return (
      <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
        <p className="font-semibold">Invite accepted! Redirecting to group...</p>
      </div>
    )
  }

  if (isRejected) {
    return null // Component will be removed after refresh
  }

  return (
    <div className="mb-6 bg-yellow-100 border border-yellow-400 text-yellow-900 px-4 py-3 rounded-lg">
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <p className="font-semibold mb-3">You've been invited to join this group</p>
      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Processing...' : 'Accept Invite'}
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isLoading ? 'Processing...' : 'Reject Invite'}
        </button>
      </div>
    </div>
  )
}

