'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faThumbsUp, 
  faThumbsDown, 
  faChevronLeft, 
  faChevronRight,
  faPlus,
  faTrash,
  faFlag,
  faInfoCircle,
  faStar,
} from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import ArtistImageUpload from './ArtistImageUpload'

interface ArtistImage {
  id: string
  imageUrl: string
  uploadedBy: string
  uploadedByUser: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  uploadedAt: Date
  upvotes: number
  downvotes: number
  score: number
  userVote: 'up' | 'down' | null
}

interface ArtistImageCarouselProps {
  artistName: string
  artistSlug: string
  initialImages: ArtistImage[]
  userId?: string
}

export default function ArtistImageCarousel({
  artistName,
  artistSlug,
  initialImages,
  userId,
}: ArtistImageCarouselProps) {
  const t = useSafeTranslations('artistImages')
  const [images, setImages] = useState<ArtistImage[]>(initialImages)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reportingImageId, setReportingImageId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)

  const currentImage = images[currentIndex]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        setShowUploadModal(false)
        setShowReportModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!userId || !currentImage) return

    setLoading(true)
    try {
      const response = await fetch(`/api/artists/${artistSlug}/images/${currentImage.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      const data = await response.json()

      // Update the current image with new vote counts
      setImages((prev) =>
        prev.map((img) =>
          img.id === currentImage.id
            ? {
                ...img,
                upvotes: data.upvotes,
                downvotes: data.downvotes,
                score: data.score,
                userVote: data.userVote,
              }
            : img
        )
      )
    } catch (error) {
      console.error('Error voting:', error)
      alert(t('errors.voteFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentImage || !confirm(t('deleteConfirm'))) return

    setLoading(true)
    try {
      const response = await fetch(`/api/artists/${artistSlug}/images/${currentImage.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      // Remove image from list
      setImages((prev) => prev.filter((img) => img.id !== currentImage.id))

      // Adjust current index if needed
      if (currentIndex >= images.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (images.length === 1) {
        // No images left
        setCurrentIndex(0)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert(t('errors.deleteFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleReport = async () => {
    if (!currentImage || !reportReason.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/artists/${artistSlug}/images/${currentImage.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reportReason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to report')
      }

      alert(t('reportSuccess'))
      setShowReportModal(false)
      setReportReason('')
    } catch (error: any) {
      console.error('Error reporting:', error)
      alert(error.message || t('errors.reportFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleImageUploaded = (newImage: ArtistImage) => {
    setImages((prev) => [newImage, ...prev])
    setCurrentIndex(0) // Show the newly uploaded image
    setShowUploadModal(false)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (images.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 text-center">
        <p className="text-sm sm:text-base text-gray-600 mb-4">{t('noImages')}</p>
        {userId && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors flex items-center gap-2 mx-auto touch-manipulation"
          >
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4 sm:w-5 sm:h-5" />
            {t('addImage')}
          </button>
        )}
        {showUploadModal && (
          <ArtistImageUpload
            artistName={artistName}
            artistSlug={artistSlug}
            onUpload={handleImageUploaded}
            onClose={() => setShowUploadModal(false)}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header with photo counter and add button */}
        <div className="p-3 md:p-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('photoCounter', { current: currentIndex + 1, total: images.length })}
            </p>
          </div>
          {userId && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-start"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3 sm:w-4 sm:h-4" />
              {t('addImage')}
            </button>
          )}
        </div>

        {/* Main image display */}
        <div className="relative bg-gray-100" style={{ aspectRatio: '1/1', maxHeight: '600px' }}>
          {currentImage && (
            <>
              <Image
                src={currentImage.imageUrl}
                alt={`${artistName} - Photo ${currentIndex + 1}`}
                fill
                className="object-contain"
                priority={currentIndex === 0}
                sizes="(max-width: 768px) 100vw, 600px"
              />
              
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevious}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors touch-manipulation"
                    aria-label={t('previous')}
                  >
                    <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors touch-manipulation"
                    aria-label={t('next')}
                  >
                    <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 sm:w-6 sm:h-6" />
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Sidebar with artist info and actions */}
        <div className="p-4 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{artistName}</h2>
            
            {currentImage && (
              <div className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                <p>
                  {t('uploadedBy')}{' '}
                  <span className="font-semibold">{currentImage.uploadedByUser.name || currentImage.uploadedByUser.lastfmUsername}</span>
                  {' '}{t('on')} {formatDate(currentImage.uploadedAt)}
                </p>
              </div>
            )}

            {/* Vote buttons */}
            {currentImage && userId && (
              <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 flex-wrap">
                <button
                  onClick={() => handleVote('up')}
                  disabled={loading}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base transition-colors touch-manipulation ${
                    currentImage.userVote === 'up'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <FontAwesomeIcon icon={faThumbsUp} className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{currentImage.upvotes}</span>
                </button>
                <button
                  onClick={() => handleVote('down')}
                  disabled={loading}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base transition-colors touch-manipulation ${
                    currentImage.userVote === 'down'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <FontAwesomeIcon icon={faThumbsDown} className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{currentImage.downvotes}</span>
                </button>
                <button
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors touch-manipulation"
                >
                  <FontAwesomeIcon icon={faStar} className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}

            {/* Report button */}
            {currentImage && userId && (
              <button
                onClick={() => {
                  setReportingImageId(currentImage.id)
                  setShowReportModal(true)
                }}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors touch-manipulation"
              >
                <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 sm:w-4 sm:h-4" />
                {t('reportImage')}
              </button>
            )}

            {/* Delete button (if user is uploader) */}
            {currentImage && userId && currentImage.uploadedBy === userId && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-red-600 hover:text-red-800 transition-colors touch-manipulation"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3 sm:w-4 sm:h-4" />
                {t('deleteImage')}
              </button>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${
                    index === currentIndex
                      ? 'border-red-600 ring-2 ring-red-200'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Image
                    src={image.imageUrl}
                    alt={`Thumbnail ${index + 1}`}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <ArtistImageUpload
          artistName={artistName}
          artistSlug={artistSlug}
          onUpload={handleImageUploaded}
          onClose={() => setShowUploadModal(false)}
        />
      )}

      {/* Report Modal */}
      {showReportModal && currentImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">{t('reportTitle')}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('reportDescription')}</p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder={t('reportPlaceholder')}
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 sm:mb-4 resize-none text-sm sm:text-base"
              rows={4}
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={() => {
                  setShowReportModal(false)
                  setReportReason('')
                }}
                className="px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={loading || !reportReason.trim()}
                className="px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {loading ? t('submitting') : t('submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
