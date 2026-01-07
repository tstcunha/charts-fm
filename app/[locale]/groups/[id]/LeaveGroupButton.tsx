'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import Tooltip from '@/components/Tooltip'
import LiquidGlassButton from '@/components/LiquidGlassButton'

interface LeaveGroupButtonProps {
  groupId: string
  isOwner?: boolean
  subtle?: boolean
}

export default function LeaveGroupButton({ groupId, isOwner = false, subtle = false }: LeaveGroupButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLeave = async () => {
    if (isOwner) {
      return
    }

    if (!confirm('Are you sure you want to leave this group?')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to leave group')
      }

      router.push('/groups')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave group')
      setIsLoading(false)
    }
  }

  const isDisabled = isLoading || isOwner

  if (subtle) {
    const button = (
      <button
        onClick={handleLeave}
        disabled={isDisabled}
        className={`
          transition-colors
          ${
            isOwner
              ? 'text-gray-400 cursor-not-allowed text-sm'
              : 'text-gray-500 hover:text-red-600 text-sm underline-offset-2 hover:underline disabled:opacity-50'
          }
        `}
      >
        {isLoading ? 'Leaving...' : 'Leave Group'}
      </button>
    )
    if (isOwner) {
      return (
        <Tooltip content="You can't leave a group that you're the owner of">
          {button}
        </Tooltip>
      )
    }
    return button
  }

  const button = (
    <LiquidGlassButton
      onClick={handleLeave}
      disabled={isDisabled}
      variant={isOwner ? 'neutral' : 'danger'}
      useTheme={false}
    >
      {isLoading ? 'Leaving...' : 'Leave Group'}
    </LiquidGlassButton>
  )

  if (isOwner) {
    return (
      <Tooltip content="You can't leave a group that you're the owner of">
        {button}
      </Tooltip>
    )
  }

  return button
}

