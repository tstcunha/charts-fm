'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'

interface RemoveMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onRemoved: () => void
  groupId: string
  userId: string
  memberName: string
}

export default function RemoveMemberModal({
  isOpen,
  onClose,
  onRemoved,
  groupId,
  userId,
  memberName,
}: RemoveMemberModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRemove = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      // Notify parent that removal was successful
      onRemoved()
      // Close modal and refresh the page to show updated member list
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Remove Member</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-700">
              Are you sure you want to remove <span className="font-semibold">{memberName}</span> from this group?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

