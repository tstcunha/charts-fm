'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'

const MAX_GROUP_MEMBERS = 100

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  onInviteSent?: () => void
  memberCount?: number | null
}

export default function InviteMemberModal({
  isOpen,
  onClose,
  groupId,
  onInviteSent,
  memberCount,
}: InviteMemberModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [lastfmUsername, setLastfmUsername] = useState('')
  const [isValidatingUsername, setIsValidatingUsername] = useState(false)
  const [validatedUsername, setValidatedUsername] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(false)
      setError(null)
      setSuccess(false)
      setSuccessMessage(null)
      setLastfmUsername('')
      setIsValidatingUsername(false)
      setValidatedUsername(null)
    }
  }, [isOpen])

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccess(false)
        setSuccessMessage(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Validate username when it changes (debounced)
  useEffect(() => {
    if (!lastfmUsername.trim() || lastfmUsername.trim().length < 2) {
      setValidatedUsername(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsValidatingUsername(true)
      try {
        const response = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(lastfmUsername.trim())}`)
        const data = await response.json()

        if (response.ok && data.exists) {
          setValidatedUsername(data.user.lastfmUsername)
          setError(null)
        } else {
          setValidatedUsername(null)
          // Don't show error while typing, only on submit
        }
      } catch (err) {
        setValidatedUsername(null)
      } finally {
        setIsValidatingUsername(false)
      }
    }, 500) // Debounce for 500ms

    return () => clearTimeout(timeoutId)
  }, [lastfmUsername])

  const isAtLimit = memberCount != null && memberCount >= MAX_GROUP_MEMBERS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (isAtLimit) {
      setError(`Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members`)
      return
    }

    // Use validated username if available, otherwise use input
    const usernameToUse = validatedUsername || lastfmUsername.trim()

    if (!usernameToUse) {
      setError('Please enter a Last.fm username')
      return
    }

    // If we haven't validated yet, validate now
    if (!validatedUsername) {
      setIsLoading(true)
      try {
        const checkResponse = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(usernameToUse)}`)
        const checkData = await checkResponse.json()

        if (!checkResponse.ok || !checkData.exists) {
          setError(checkData.error || 'User with this Last.fm username not found')
          setIsLoading(false)
          return
        }

        // Use the validated username with correct casing
        const actualUsername = checkData.user.lastfmUsername
        await sendInvite(actualUsername)
      } catch (err) {
        setError('Failed to validate username. Please try again.')
        setIsLoading(false)
      }
    } else {
      await sendInvite(validatedUsername)
    }
  }

  const sendInvite = async (username: string) => {
    setIsLoading(true)

    try {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastfmUsername: username }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      // Show success message with the invited username
      setSuccess(true)
      setSuccessMessage(`Invite sent successfully to ${username}!`)
      setLastfmUsername('')
      setValidatedUsername(null)
      setIsLoading(false)
      
      // Refresh the members list
      if (onInviteSent) {
        onInviteSent()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setLastfmUsername('')
      setError(null)
      setSuccess(false)
      setSuccessMessage(null)
      onClose()
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <>
      {/* Full page overlay - covers entire viewport */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
        onClick={handleClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Modal content centered */}
      <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
        <div 
          className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Invite Member</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {success && successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-sm transition-opacity duration-300">
              ✓ {successMessage}
            </div>
          )}

          {isAtLimit && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
              This group has reached the maximum limit of {MAX_GROUP_MEMBERS} members. You cannot invite more members.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="lastfmUsername" className="block text-sm font-medium text-gray-700 mb-2">
                Last.fm Username *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="lastfmUsername"
                  required
                  value={validatedUsername || lastfmUsername}
                  onChange={(e) => setLastfmUsername(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                  placeholder="username"
                  disabled={isLoading}
                />
                {isValidatingUsername && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--theme-primary)]"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the Last.fm username of the user you want to invite
                {validatedUsername && validatedUsername !== lastfmUsername && (
                  <span className="text-green-600 ml-1">✓ Valid</span>
                )}
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <LiquidGlassButton
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                variant="neutral"
                useTheme={false}
              >
                Cancel
              </LiquidGlassButton>
              <LiquidGlassButton
                type="submit"
                disabled={isLoading || isAtLimit}
                variant="primary"
                useTheme
              >
                {isLoading ? 'Inviting...' : 'Invite Member'}
              </LiquidGlassButton>
            </div>
          </form>
        </div>
      </div>
    </>
  )

  // Render modal using portal to document.body to ensure it's above everything
  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}

