'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

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
  const t = useSafeTranslations('groups.members.inviteModal')
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

        if (response.ok && (data.exists || data.canProceed)) {
          // If user exists, use their actual username with correct casing
          // If canProceed (superuser), use the input as-is
          setValidatedUsername(data.user?.lastfmUsername || lastfmUsername.trim())
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
      setError(t('error.atLimitError', { max: MAX_GROUP_MEMBERS }))
      return
    }

    // Use validated username if available, otherwise use input
    const usernameToUse = validatedUsername || lastfmUsername.trim()

    if (!usernameToUse) {
      setError(t('error.enterUsername'))
      return
    }

    // If we haven't validated yet, validate now
    if (!validatedUsername) {
      setIsLoading(true)
      try {
        const checkResponse = await fetch(`/api/user/check-username?lastfmUsername=${encodeURIComponent(usernameToUse)}`)
        const checkData = await checkResponse.json()

        // Allow superusers to proceed even if user doesn't exist (canProceed flag)
        if (!checkResponse.ok && !checkData.canProceed) {
          setError(checkData.error || t('error.userNotFound'))
          setIsLoading(false)
          return
        }

        if (!checkData.exists && !checkData.canProceed) {
          setError(checkData.error || t('error.userNotFound'))
          setIsLoading(false)
          return
        }

        // Use the validated username with correct casing if user exists, otherwise use input
        const actualUsername = checkData.user?.lastfmUsername || usernameToUse
        await sendInvite(actualUsername)
      } catch (err) {
        setError(t('error.failedToValidate'))
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
        throw new Error(data.error || t('error.failedToSend'))
      }

      // Show success message with the invited username
      setSuccess(true)
      if (data.accountCreated) {
        setSuccessMessage(
          data.member 
            ? t('accountCreatedAndAdded', { username })
            : t('accountCreatedAndInviteSent', { username })
        )
      } else {
        setSuccessMessage(t('inviteSentSuccess', { username }))
      }
      setLastfmUsername('')
      setValidatedUsername(null)
      setIsLoading(false)
      
      // Refresh the members list
      if (onInviteSent) {
        onInviteSent()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToSend'))
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
      <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none p-4">
        <div 
          className="bg-white rounded-lg shadow-xl p-4 md:p-6 max-w-md w-full pointer-events-auto max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 'calc(100vw - 2rem)',
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-2xl font-bold">{t('title')}</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label={t('close')}
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {success && successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded text-xs md:text-sm transition-opacity duration-300">
              ✓ {successMessage}
            </div>
          )}

          {isAtLimit && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-xs md:text-sm">
              {t('atLimit', { max: MAX_GROUP_MEMBERS })}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div>
              <label htmlFor="lastfmUsername" className="block text-sm font-medium text-gray-700 mb-2">
                {t('lastfmUsername')} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="lastfmUsername"
                  required
                  value={validatedUsername || lastfmUsername}
                  onChange={(e) => setLastfmUsername(e.target.value)}
                  className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                  placeholder={t('usernamePlaceholder')}
                  disabled={isLoading}
                />
                {isValidatingUsername && (
                  <div className="absolute right-3 top-2.5">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--theme-primary)]"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('usernameDescription')}
                {validatedUsername && validatedUsername !== lastfmUsername && (
                  <span className="text-green-600 ml-1">{t('valid')}</span>
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <LiquidGlassButton
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                variant="neutral"
                useTheme={false}
                className="w-full sm:w-auto"
              >
                {t('cancel')}
              </LiquidGlassButton>
              <LiquidGlassButton
                type="submit"
                disabled={isLoading || isAtLimit}
                variant="primary"
                useTheme
                className="w-full sm:w-auto"
              >
                {isLoading ? t('inviting') : t('inviteMember')}
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

