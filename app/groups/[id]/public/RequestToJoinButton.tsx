'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LiquidGlassButton from '@/components/LiquidGlassButton'

const MAX_GROUP_MEMBERS = 100

interface RequestToJoinButtonProps {
  groupId: string
  hasPendingRequest: boolean
  hasPendingInvite?: boolean
  allowFreeJoin?: boolean
  memberCount?: number
}

export default function RequestToJoinButton({
  groupId,
  hasPendingRequest,
  hasPendingInvite = false,
  allowFreeJoin = false,
  memberCount,
}: RequestToJoinButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(hasPendingRequest)
  const [hasJoined, setHasJoined] = useState(false)
  const router = useRouter()

  const isAtLimit = memberCount !== undefined && memberCount >= MAX_GROUP_MEMBERS

  const handleRequest = async () => {
    if (hasRequested || hasJoined || hasPendingInvite) return

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
      {isAtLimit && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          This group has reached the maximum limit of {MAX_GROUP_MEMBERS} members.
        </div>
      )}
      {error && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <LiquidGlassButton
        onClick={handleRequest}
        disabled={hasRequested || hasJoined || hasPendingInvite || isLoading || isAtLimit}
        variant={hasRequested || hasJoined || hasPendingInvite || isLoading || isAtLimit ? 'neutral' : 'primary'}
        useTheme={false}
        title={
          isAtLimit
            ? `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members`
            : hasPendingInvite
            ? 'You have been invited to join this group'
            : undefined
        }
      >
        {isLoading
          ? (allowFreeJoin ? 'Joining...' : 'Sending...')
          : hasJoined
          ? 'Joined!'
          : hasPendingInvite
          ? 'Invited'
          : hasRequested
          ? 'Request Sent'
          : isAtLimit
          ? 'Group Full'
          : allowFreeJoin
          ? 'Join'
          : 'Request to Join'}
      </LiquidGlassButton>
    </div>
  )
}

