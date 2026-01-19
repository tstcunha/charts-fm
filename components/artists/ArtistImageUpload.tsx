'use client'

import { useState, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes, faUpload, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import Image from 'next/image'

interface ArtistImageUploadProps {
  artistName: string
  artistSlug: string
  onUpload: (image: any) => void
  onClose: () => void
}

export default function ArtistImageUpload({
  artistName,
  artistSlug,
  onUpload,
  onClose,
}: ArtistImageUploadProps) {
  const t = useSafeTranslations('artistImages')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError(t('errors.invalidFileType'))
      return
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(t('errors.fileTooLarge'))
      return
    }

    setFile(selectedFile)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const dataTransfer = new DataTransfer()
      dataTransfer.items.add(droppedFile)
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files
        handleFileSelect({ target: { files: dataTransfer.files } } as any)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/artists/${artistSlug}/images`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        // Check for daily limit error (429 status code)
        if (response.status === 429) {
          throw new Error(t('errors.dailyLimitReached'))
        }
        // Check for email verification error (403 status code)
        if (response.status === 403 && data.error?.includes('Email verification required')) {
          throw new Error(t('errors.emailVerificationRequired'))
        }
        throw new Error(data.error || t('errors.uploadFailed'))
      }

      const data = await response.json()

      // Fetch the full image data
      const imagesResponse = await fetch(`/api/artists/${artistSlug}/images`)
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json()
        const uploadedImage = imagesData.images.find((img: any) => img.id === data.id)
        if (uploadedImage) {
          onUpload(uploadedImage)
        } else {
          // Fallback: create minimal image object
          onUpload({
            id: data.id,
            imageUrl: data.imageUrl,
            uploadedBy: '',
            uploadedByUser: { id: '', name: null, lastfmUsername: '' },
            uploadedAt: new Date(),
            upvotes: 0,
            downvotes: 0,
            score: 0,
            userVote: null,
          })
        }
      } else {
        // Fallback
        onUpload({
          id: data.id,
          imageUrl: data.imageUrl,
          uploadedBy: '',
          uploadedByUser: { id: '', name: null, lastfmUsername: '' },
          uploadedAt: new Date(),
          upvotes: 0,
          downvotes: 0,
          score: 0,
          userVote: null,
        })
      }
    } catch (err: any) {
      setError(err.message || t('errors.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold">{t('uploadTitle')}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors touch-manipulation p-1"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-12 text-center hover:border-gray-400 transition-colors cursor-pointer touch-manipulation"
            onClick={() => fileInputRef.current?.click()}
          >
            <FontAwesomeIcon icon={faUpload} className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4" />
            <p className="text-base sm:text-lg font-semibold mb-2">{t('dragDrop')}</p>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{t('orClickToSelect')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors touch-manipulation">
              {t('selectFile')}
            </button>
            <p className="text-xs text-gray-500 mt-3 sm:mt-4">
              {t('fileRequirements')}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 sm:mb-4">
              <div className="relative w-full" style={{ aspectRatio: '1/1', maxHeight: '400px' }}>
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain rounded-lg"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setError(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              >
                {t('changeFile')}
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 text-sm sm:text-base bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {uploading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                    {t('uploading')}
                  </>
                ) : (
                  t('upload')
                )}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
