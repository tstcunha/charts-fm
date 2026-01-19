'use client'

import { useState, useMemo } from 'react'
import { useRouter } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import CustomSelect from '@/components/CustomSelect'
import Toggle from '@/components/Toggle'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner, faUpload, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import RemovePictureModal from '@/components/RemovePictureModal'
import Toast from '@/components/Toast'

interface GroupDetailsTabProps {
  groupId: string
  initialName: string
  initialImage: string | null
  initialIsPrivate: boolean
  initialAllowFreeJoin: boolean
  initialDynamicIconEnabled: boolean
  initialDynamicIconSource: string | null
  initialTags?: string[]
}

export default function GroupDetailsTab({
  groupId,
  initialName,
  initialImage,
  initialIsPrivate,
  initialAllowFreeJoin,
  initialDynamicIconEnabled,
  initialDynamicIconSource,
  initialTags = [],
}: GroupDetailsTabProps) {
  const router = useRouter()
  const t = useSafeTranslations('groups.settings.groupDetails')
  const tCommon = useSafeTranslations('common')
  
  const ICON_SOURCES = useMemo(() => [
    { value: 'top_album', label: t('iconSources.topAlbum') },
    { value: 'top_artist', label: t('iconSources.topArtist') },
    { value: 'top_track_artist', label: t('iconSources.topTrackArtist') },
  ], [t])

  const [name, setName] = useState(initialName)
  const [imageUrl, setImageUrl] = useState(initialImage || '')
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate)
  const [allowFreeJoin, setAllowFreeJoin] = useState(initialAllowFreeJoin)
  const [dynamicIconEnabled, setDynamicIconEnabled] = useState(initialDynamicIconEnabled)
  const [dynamicIconSource, setDynamicIconSource] = useState(initialDynamicIconSource || 'top_album')
  const [tags, setTags] = useState(initialTags.join(' '))
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)

  // Map API error messages to translation keys
  const translateError = (errorMessage: string): string => {
    const errorMap: Record<string, string> = {
      'Image must be a valid URL or path': t('errors.invalidImageUrl'),
      'Image URL cannot exceed 500 characters': t('errors.imageTooLong'),
      'Image must be a string': t('errors.imageMustBeString'),
      'Email verification required. Please verify your email address before uploading images.': t('errors.emailVerificationRequired'),
    }
    return errorMap[errorMessage] || errorMessage
  }

  // Check if current image is from uploaded storage
  const isUploadedImage = !!(imageUrl && (
    imageUrl.startsWith('/uploads/group-pictures/') ||
    imageUrl.includes('blob.vercel-storage.com')
  ))

  // If group becomes private, disable allowFreeJoin
  const handlePrivateChange = (newIsPrivate: boolean) => {
    setIsPrivate(newIsPrivate)
    if (newIsPrivate) {
      setAllowFreeJoin(false)
    }
  }

  const hasChanges =
    name !== initialName ||
    imageUrl !== (initialImage || '') ||
    isPrivate !== initialIsPrivate ||
    allowFreeJoin !== initialAllowFreeJoin ||
    dynamicIconEnabled !== initialDynamicIconEnabled ||
    (dynamicIconEnabled && dynamicIconSource !== initialDynamicIconSource) ||
    tags !== initialTags.join(' ')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      // Update name and privacy
      const response = await fetch(`/api/groups/${groupId}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          isPrivate,
          allowFreeJoin: isPrivate ? false : allowFreeJoin, // Only allow free join for public groups
          dynamicIconEnabled,
          dynamicIconSource: dynamicIconEnabled ? dynamicIconSource : null,
          tags: tags,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('failedToUpdate'))
      }

      // Update icon separately if it changed
      if (imageUrl !== (initialImage || '')) {
        const iconResponse = await fetch(`/api/groups/${groupId}/icon`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageUrl.trim() || null }),
        })

        if (!iconResponse.ok) {
          const iconData = await iconResponse.json()
          const translatedError = translateError(iconData.error || '')
          throw new Error(translatedError || t('failedToUpdate'))
        }
      }

      setSuccess(true)
      
      // Refresh the router cache to ensure fresh data
      router.refresh()
      
      // Redirect immediately
      router.push(`/groups/${groupId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('failedToUpdate')
      setError(translateError(errorMessage))
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError(t('upload.invalidFileType'))
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('upload.fileTooLarge'))
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/groups/${groupId}/icon/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        // Check for email verification error (403 status code)
        if (response.status === 403 && data.error?.includes('Email verification required')) {
          throw new Error(t('errors.emailVerificationRequired'))
        }
        throw new Error(data.error || t('upload.failed'))
      }

      // Update imageUrl with the uploaded image URL
      setImageUrl(data.url || '')
      
      // Disable dynamic icon when an image is uploaded
      setDynamicIconEnabled(false)
      
      setSuccess(true)
      
      // Clear file selection
      setSelectedFile(null)
      setPreviewUrl(null)
      
      // Reset file input
      const fileInput = document.getElementById('group-file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : t('upload.failed'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    const fileInput = document.getElementById('group-file-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleRemovePicture = async () => {
    if (!imageUrl) return

    setIsRemoving(true)
    setError(null)

    try {
      const response = await fetch(`/api/groups/${groupId}/icon/picture`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('removePicture.failed'))
      }

      // Clear image URL
      setImageUrl('')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('removePicture.failed'))
    } finally {
      setIsRemoving(false)
    }
  }

  const handleDynamicIconChange = async (enabled: boolean) => {
    if (enabled) {
      // If enabling dynamic icon, delete the current image if it exists
      if (imageUrl) {
        const isUploadedImage = 
          imageUrl.startsWith('/uploads/group-pictures/') ||
          (imageUrl.includes('blob.vercel-storage.com') && imageUrl.includes('group-pictures'))
        
        if (isUploadedImage) {
          // Delete the image from storage
          try {
            await fetch(`/api/groups/${groupId}/icon/picture`, {
              method: 'DELETE',
            })
          } catch (err) {
            // Log error but continue - we still want to enable dynamic icon
            console.error('Error deleting image when enabling dynamic icon:', err)
          }
        }
        
        // Clear the image URL
        setImageUrl('')
      }
    }
    
    setDynamicIconEnabled(enabled)
  }

  const displayImage = previewUrl || imageUrl || getDefaultGroupImage()

  return (
    <>
      {/* Toast notifications */}
      <Toast
        message={t('updatedSuccessfully')}
        type="success"
        isVisible={success}
        onClose={() => setSuccess(false)}
      />
      <Toast
        message={error || ''}
        type="error"
        isVisible={!!error}
        onClose={() => setError(null)}
      />

      <RemovePictureModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={handleRemovePicture}
      />

      <div className="bg-white rounded-lg shadow-lg p-4 md:p-6 lg:p-8">

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div>
          <label htmlFor="groupName" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('groupName')}
          </label>
          <input
            type="text"
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="groupIcon" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('groupIcon')}
          </label>
          
          {/* Preview */}
          {displayImage && (
            <div className="mb-4 flex flex-col items-center">
              <div className="relative w-24 h-24 md:w-32 md:h-32 mb-3">
                <img
                  src={displayImage}
                  alt="Group icon preview"
                  className="rounded-lg object-cover w-full h-full border-2 border-gray-200"
                  onError={(e) => {
                    e.currentTarget.src = getDefaultGroupImage()
                  }}
                />
              </div>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setIsRemoveModalOpen(true)}
                  disabled={isRemoving || isLoading || isUploading}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs md:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>{t('removePicture.button')}</span>
                </button>
              )}
            </div>
          )}

          {/* File Upload Section */}
          <div className="mb-4">
            <label
              htmlFor="group-file-upload"
              className="flex items-center justify-center w-full px-4 py-3 text-sm md:text-base rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:border-yellow-500 transition-colors"
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2 text-gray-500" />
              <span className="text-gray-700">{t('upload.selectFile')}</span>
              <input
                id="group-file-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isLoading || isUploading}
              />
            </label>
            
            {selectedFile && (
              <div className="mt-3 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isUploading && (
                      <>
                        <LiquidGlassButton
                          type="button"
                          onClick={handleFileUpload}
                          variant="primary"
                          size="sm"
                          disabled={isLoading || isUploading}
                        >
                          {t('upload.upload')}
                        </LiquidGlassButton>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          disabled={isLoading || isUploading}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </>
                    )}
                    {isUploading && (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-yellow-500" />
                        <span className="text-sm text-gray-600">{t('upload.uploading')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* URL Input (Alternative) */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="text-xs text-gray-500 px-2">{t('upload.or')}</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>
            <input
              type="text"
              id="groupIcon"
              value={isUploadedImage ? '' : imageUrl}
              onChange={(e) => {
                const newUrl = e.target.value
                setImageUrl(newUrl)
                // Disable dynamic icon when a URL is entered
                if (newUrl.trim() && dynamicIconEnabled) {
                  setDynamicIconEnabled(false)
                }
              }}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={isUploadedImage ? t('upload.urlDisabledPlaceholder') : t('iconUrlPlaceholder')}
              disabled={isLoading || isUploading || isUploadedImage}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('iconUrlDescription')}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('privacySettings')}
          </label>
          <Toggle
            id="isPrivate"
            checked={isPrivate}
            onChange={handlePrivateChange}
            disabled={isLoading}
            label={t('privateGroup')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('privateGroupDescription')}
          </p>
        </div>

        {!isPrivate && (
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {t('joinSettings')}
            </label>
            <Toggle
              id="allowFreeJoin"
              checked={allowFreeJoin}
              onChange={setAllowFreeJoin}
              disabled={isLoading}
              label={t('usersCanJoinFreely')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('usersCanJoinFreelyDescription')}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('dynamicIcon')}
          </label>
          <p className="text-xs text-gray-500 mb-3">
            {t('dynamicIconDescription')}
          </p>
          
          <div className="mb-3 md:mb-4">
            <Toggle
              id="dynamicIconEnabled"
              checked={dynamicIconEnabled}
              onChange={handleDynamicIconChange}
              disabled={isLoading}
              label={t('enableDynamicIcon')}
            />
          </div>

          {dynamicIconEnabled && (
            <div>
              <label htmlFor="dynamicIconSource" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                {t('iconSource')}
              </label>
              <CustomSelect
                id="dynamicIconSource"
                options={ICON_SOURCES.map(source => ({ value: source.value, label: source.label }))}
                value={dynamicIconSource}
                onChange={(value) => setDynamicIconSource(String(value))}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('iconSourceDescription')}
              </p>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="tags" className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
            {t('tags')}
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder={t('tagsPlaceholder')}
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('tagsDescription')}
          </p>
          {tags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags
                .split(/\s+/)
                .filter(tag => tag.trim().length > 0)
                .slice(0, 10)
                .map((tag, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      /\s/.test(tag)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tag.trim()}
                  </span>
                ))}
              {tags.split(/\s+/).filter(tag => tag.trim().length > 0).length > 10 && (
                <span className="text-xs text-red-600 self-center">
                  {t('maxTagsReached')}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-3 md:pt-4">
          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 py-2.5 md:py-3 px-4 md:px-6 text-sm md:text-base bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('saving') : t('saveChanges')}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 md:px-6 py-2.5 md:py-3 text-sm md:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}

