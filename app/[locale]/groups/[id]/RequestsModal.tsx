'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface Request {
  id: string
  user: {
    id: string
    name: string | null
    lastfmUsername: string
    image: string | null
  }
  createdAt: string
}

interface RequestsModalProps {
  groupId: string
  isOpen: boolean
  onClose: () => void
  onRequestProcessed?: () => void
}

export default function RequestsModal({
  groupId,
  isOpen,
  onClose,
  onRequestProcessed,
}: RequestsModalProps) {
  const t = useSafeTranslations('groups.members.requestsModal')
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen, groupId])

  const fetchRequests = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/requests`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error.failedToFetch'))
      }

      setRequests(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToFetch'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId)
    setError(null)

    try {
      const response = await fetch(
        `/api/groups/${groupId}/requests/${requestId}`,
        {
          method: 'PATCH',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error.failedToAccept'))
      }

      // Remove the accepted request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      // Optionally notify parent (without forcing page reload)
      onRequestProcessed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToAccept'))
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    setError(null)

    try {
      const response = await fetch(
        `/api/groups/${groupId}/requests/${requestId}`,
        {
          method: 'DELETE',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('error.failedToReject'))
      }

      // Remove the rejected request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      // Optionally notify parent (without forcing page reload)
      onRequestProcessed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.failedToReject'))
    } finally {
      setProcessingId(null)
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
          className="bg-white rounded-lg shadow-xl p-4 md:p-6 max-w-2xl w-full max-h-[90vh] flex flex-col pointer-events-auto"
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
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-xs md:text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-600">{t('noPendingRequests')}</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative w-12 h-12 rounded-full ring-2 ring-gray-300 bg-gray-200 flex-shrink-0 overflow-hidden">
                        <SafeImage
                          src={request.user.image}
                          alt={request.user.name || request.user.lastfmUsername}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">
                            {request.user.name || request.user.lastfmUsername}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 truncate">@{request.user.lastfmUsername}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 md:ml-4 flex-shrink-0">
                      <LiquidGlassButton
                        onClick={() => handleAccept(request.id)}
                        disabled={processingId === request.id}
                        variant="neutral"
                        size="sm"
                        useTheme={false}
                        className="text-xs md:text-sm"
                        style={{
                          background: 'rgba(34, 197, 94, 0.8)',
                          color: 'white',
                        }}
                      >
                        {processingId === request.id ? t('processing') : t('accept')}
                      </LiquidGlassButton>
                      <LiquidGlassButton
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        variant="danger"
                        size="sm"
                        useTheme={false}
                        className="text-xs md:text-sm"
                      >
                        {processingId === request.id ? t('processing') : t('reject')}
                      </LiquidGlassButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )

  // Render modal using portal to document.body to ensure it's above everything
  if (typeof document === 'undefined') return null
  return createPortal(modalContent, document.body)
}

