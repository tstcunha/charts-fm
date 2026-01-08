'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

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
  const t = useSafeTranslations('groups.members.removeModal')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handleRemove = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('error.failedToRemove'))
      }

      // Notify parent that removal was successful
      onRemoved()
      // Close modal and refresh the page to show updated member list
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToRemove'))
      setIsLoading(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <>
      {/* Full page overlay - covers entire viewport */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
        onClick={onClose}
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
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl md:text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label={t('close')}
              disabled={isLoading}
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 md:mb-6">
            <p className="text-sm md:text-base text-gray-700">
              {(() => {
                const message = t('confirmMessage', { memberName })
                const parts = message.split(memberName)
                return parts.map((part, i) => (
                  <span key={i}>
                    {part}
                    {i < parts.length - 1 && <span className="font-semibold">{memberName}</span>}
                  </span>
                ))
              })()}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              {t('cannotBeUndone')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              {isLoading ? t('removing') : t('removeMember')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  // Render modal using portal to document.body to ensure it's above everything
  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}

