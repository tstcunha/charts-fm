'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'

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
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

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
        throw new Error(data.error || 'Failed to fetch requests')
      }

      setRequests(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch requests')
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
        throw new Error(data.error || 'Failed to accept request')
      }

      // Remove the accepted request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      // Optionally notify parent (without forcing page reload)
      onRequestProcessed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept request')
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
        throw new Error(data.error || 'Failed to reject request')
      }

      // Remove the rejected request from the list
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      // Optionally notify parent (without forcing page reload)
      onRequestProcessed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request')
    } finally {
      setProcessingId(null)
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
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Join Requests</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-600">No pending requests</p>
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
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={processingId === request.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-sm"
                      >
                        {processingId === request.id ? 'Processing...' : 'Accept'}
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm shadow-sm"
                      >
                        {processingId === request.id ? 'Processing...' : 'Reject'}
                      </button>
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
}

