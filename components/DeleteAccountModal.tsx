'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/i18n/routing'
import { signOut } from 'next-auth/react'

interface OwnedGroup {
  id: string
  name: string
}

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [ownedGroups, setOwnedGroups] = useState<OwnedGroup[]>([])

  useEffect(() => {
    if (isOpen) {
      // Fetch user's owned groups
      fetch('/api/user/owned-groups')
        .then(res => res.json())
        .then(data => {
          if (data.groups) {
            setOwnedGroups(data.groups)
          }
          setIsLoadingGroups(false)
        })
        .catch(err => {
          console.error('Error fetching owned groups:', err)
          setIsLoadingGroups(false)
        })
    } else {
      // Reset state when modal closes
      setConfirmText('')
      setError(null)
      setOwnedGroups([])
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm deletion')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect to home
      await signOut({ redirect: false })
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
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
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-red-600">Delete Account</h2>
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
            <p className="text-gray-700 mb-4 font-semibold">
              This action cannot be undone. Are you sure you want to delete your account?
            </p>

            {isLoadingGroups ? (
              <p className="text-sm text-gray-600 mb-4">Loading your groups...</p>
            ) : ownedGroups.length > 0 ? (
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2 font-medium">
                  You own the following groups. Ownership will be transferred to the oldest member:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1 bg-gray-50 p-3 rounded">
                  {ownedGroups.map(group => (
                    <li key={group.id}>{group.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2 font-medium">
                What will be deleted:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                <li>Your account and profile information</li>
                <li>Your group memberships</li>
                <li>Your personal statistics and listening data</li>
                <li>Your friendships and recommendations</li>
              </ul>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2 font-medium">
                What will be preserved:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside mb-4 space-y-1">
                <li>Group charts and historical statistics (your contributions remain but are anonymized)</li>
                <li>Group comments (anonymized as "Deleted User")</li>
                <li>Groups you created (ownership transferred if you own them)</li>
              </ul>
            </div>

            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-mono font-semibold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                id="confirmText"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="DELETE"
                disabled={isLoading}
                autoFocus
              />
            </div>
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
              onClick={handleDelete}
              disabled={isLoading || confirmText !== 'DELETE'}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

