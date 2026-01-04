'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LeaveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLeave = async () => {
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

  return (
    <button
      onClick={handleLeave}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {isLoading ? 'Leaving...' : 'Leave Group'}
    </button>
  )
}

