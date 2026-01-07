'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faEdit, faTrash, faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import SafeImage from '@/components/SafeImage'
import LiquidGlassButton from '@/components/LiquidGlassButton'

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    lastfmUsername: string
    image: string | null
  }
}

interface GroupShoutboxProps {
  groupId: string
  userId: string
  isOwner: boolean
  shoutboxEnabled: boolean
}

// Simple relative time formatter
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
}

export default function GroupShoutbox({ groupId, userId, isOwner, shoutboxEnabled }: GroupShoutboxProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [canPost, setCanPost] = useState<boolean | null>(null)
  const [postError, setPostError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  const MAX_CONTENT_LENGTH = 500

  const fetchComments = useCallback(async (pageNum: number = 1) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/comments?page=${pageNum}&limit=20`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setComments(data.comments)
        setTotal(data.total)
        setPage(data.page)
        setTotalPages(data.totalPages)
        setError(null)
      }
    } catch (err) {
      setError('Failed to load comments')
      console.error('Error fetching comments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  const checkCanPost = useCallback(async () => {
    try {
      // Check permissions by trying to get settings (which requires membership)
      // We'll check actual posting permissions on first submit attempt
      setCanPost(true)
      setPostError(null)
    } catch (err) {
      // If there's an error, assume we can post (will show error on actual submit)
      setCanPost(true)
    }
  }, [groupId])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (shoutboxEnabled) {
      fetchComments()
      checkCanPost()
    }
  }, [shoutboxEnabled, fetchComments, checkCanPost])

  useEffect(() => {
    if (deleteModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [deleteModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > MAX_CONTENT_LENGTH) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/groups/${groupId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          setCanPost(false)
          setPostError(data.error)
          // Don't set error for permission issues, only postError
        } else {
          setError(data.error || 'Failed to post comment')
        }
        return
      }

      setContent('')
      setError(null)
      // Refresh comments
      await fetchComments(1)
      // Re-check permissions
      await checkCanPost()
    } catch (err) {
      setError('Failed to post comment')
      console.error('Error posting comment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim() || editContent.length > MAX_CONTENT_LENGTH || isSaving) return

    setIsSaving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update comment')
        setIsSaving(false)
        return
      }

      setEditingId(null)
      setEditContent('')
      setError(null)
      await fetchComments(page)
    } catch (err) {
      setError('Failed to update comment')
      console.error('Error updating comment:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!commentToDelete || isDeleting) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/comments/${commentToDelete}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to delete comment')
        setDeleteModalOpen(false)
        setCommentToDelete(null)
        setIsDeleting(false)
        return
      }

      setError(null)
      setDeleteModalOpen(false)
      setCommentToDelete(null)
      await fetchComments(page)
    } catch (err) {
      setError('Failed to delete comment')
      console.error('Error deleting comment:', err)
      setDeleteModalOpen(false)
      setCommentToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setCommentToDelete(null)
  }

  if (!shoutboxEnabled) {
    return null
  }

  return (
    <div className="mt-10">
      <div 
        className="bg-white/60 backdrop-blur-md rounded-xl p-6 border border-theme shadow-sm"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        }}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">Shoutbox</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Comment Form */}
        {canPost !== false && (
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex gap-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
                rows={3}
                maxLength={MAX_CONTENT_LENGTH}
                disabled={isSubmitting}
              />
              <button
                type="submit"
                disabled={!content.trim() || content.length > MAX_CONTENT_LENGTH || isSubmitting}
                className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
                Post
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {content.length}/{MAX_CONTENT_LENGTH} characters
            </div>
          </form>
        )}

        {postError && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            {postError}
          </div>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to post!
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-4 rounded-lg border border-gray-200 bg-white/40"
                >
                  <div className="flex items-start gap-3">
                    <SafeImage
                      src={comment.user.image}
                      alt={comment.user.name || comment.user.lastfmUsername}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {comment.user.name || comment.user.lastfmUsername}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(new Date(comment.createdAt))}
                        </span>
                        {comment.createdAt !== comment.updatedAt && (
                          <span className="text-xs text-gray-400 italic">(edited)</span>
                        )}
                      </div>
                      {editingId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] resize-none"
                            rows={3}
                            maxLength={MAX_CONTENT_LENGTH}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(comment.id)}
                              disabled={isSaving}
                              className="px-4 py-1 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isSaving && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null)
                                setEditContent('')
                              }}
                              disabled={isSaving}
                              className="px-4 py-1 bg-gray-200 text-gray-700 rounded text-sm font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-800 whitespace-pre-wrap break-words">{comment.content}</p>
                      )}
                    </div>
                    {(comment.user.id === userId || isOwner) && editingId !== comment.id && (
                      <div className="flex gap-2">
                        {comment.user.id === userId && (
                          <button
                            onClick={() => {
                              setEditingId(comment.id)
                              setEditContent(comment.content)
                            }}
                            className="p-2 text-gray-500 hover:text-[var(--theme-primary)] transition-colors"
                            title="Edit comment"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteClick(comment.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          title={comment.user.id === userId ? "Delete comment" : "Delete comment (as group owner)"}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => fetchComments(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <button
                  onClick={() => fetchComments(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && mounted && (
        <>
          {createPortal(
            <>
              {/* Full page overlay */}
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
                onClick={handleDeleteCancel}
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Centered modal */}
              <div 
                className="fixed z-[9999] max-w-md w-full mx-4 transition-opacity duration-200 ease-out"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white rounded-lg shadow-2xl p-6 relative">
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Delete Comment</h3>
                    <p className="text-sm text-gray-700">
                      Are you sure you want to delete this comment? This action cannot be undone.
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <LiquidGlassButton
                      onClick={handleDeleteCancel}
                      variant="neutral"
                      size="md"
                      useTheme={false}
                      disabled={isDeleting}
                    >
                      Cancel
                    </LiquidGlassButton>
                    <LiquidGlassButton
                      onClick={handleDeleteConfirm}
                      variant="danger"
                      size="md"
                      useTheme={false}
                      disabled={isDeleting}
                      icon={isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : undefined}
                    >
                      Delete
                    </LiquidGlassButton>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}
        </>
      )}
    </div>
  )
}

