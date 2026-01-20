'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMusic, faCompactDisc, faXmark, faSpinner, faCheck, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ShareChartModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  weekStart: Date
}

type ChartType = 'artists' | 'tracks' | 'albums'

const chartTypeIcons = {
  artists: faMicrophone,
  tracks: faMusic,
  albums: faCompactDisc,
}

// Cache key generator
function getCacheKey(groupId: string, weekStart: Date, chartType: ChartType): string {
  const weekStartStr = weekStart.toISOString().split('T')[0]
  return `chart_image_${groupId}_${weekStartStr}_${chartType}`
}

// Load from cache
function loadFromCache(cacheKey: string): Blob | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
    
    const data = JSON.parse(cached)
    // Convert base64 back to blob
    const byteCharacters = atob(data.base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: 'image/png' })
  } catch (error) {
    console.error('Error loading from cache:', error)
    return null
  }
}

// Clean up old cache entries to free up space
function cleanupOldCacheEntries(): void {
  if (typeof window === 'undefined') return
  
  try {
    const cachePrefix = 'chart_image_'
    const entries: Array<{ key: string; timestamp: number }> = []
    
    // Collect all chart image cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(cachePrefix)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data = JSON.parse(cached)
            if (data.timestamp) {
              entries.push({ key, timestamp: data.timestamp })
            }
          }
        } catch {
          // Invalid entry, remove it
          if (key) localStorage.removeItem(key)
        }
      }
    }
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp)
    
    // Remove oldest entries, keeping only the 3 most recent
    if (entries.length > 3) {
      const toRemove = entries.slice(0, entries.length - 3)
      toRemove.forEach(entry => localStorage.removeItem(entry.key))
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error)
  }
}

// Save to cache
function saveToCache(cacheKey: string, blob: Blob): void {
  if (typeof window === 'undefined') return
  
  try {
    // Convert blob to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      try {
        const base64 = reader.result as string
        const base64Data = base64.split(',')[1] // Remove data:image/png;base64, prefix
        
        // Try to save
        localStorage.setItem(cacheKey, JSON.stringify({
          base64: base64Data,
          timestamp: Date.now(),
        }))
      } catch (error: any) {
        // If quota exceeded, clean up old entries and try again
        if (error.name === 'QuotaExceededError' || error.code === 22) {
          console.warn('localStorage quota exceeded, cleaning up old cache entries...')
          cleanupOldCacheEntries()
          
          // Try one more time after cleanup
          try {
            const base64 = reader.result as string
            const base64Data = base64.split(',')[1]
            localStorage.setItem(cacheKey, JSON.stringify({
              base64: base64Data,
              timestamp: Date.now(),
            }))
          } catch (retryError) {
            console.error('Failed to save to cache after cleanup:', retryError)
            // Silently fail - caching is optional
          }
        } else {
          console.error('Error saving to cache:', error)
        }
      }
    }
    reader.readAsDataURL(blob)
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

// Remove from cache
function removeFromCache(cacheKey: string): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.error('Error removing from cache:', error)
  }
}

export default function ShareChartModal({
  isOpen,
  onClose,
  groupId,
  weekStart,
}: ShareChartModalProps) {
  const t = useSafeTranslations('groups.weeklyCharts')
  const [mounted, setMounted] = useState(false)
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('artists')
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false)
      // Cleanup preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setCachedBlob(null)
    } else {
      // Check cache when modal opens or chart type changes
      const cacheKey = getCacheKey(groupId, weekStart, selectedChartType)
      const cached = loadFromCache(cacheKey)
      if (cached) {
        // Cleanup old preview URL if exists
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        setCachedBlob(cached)
        const url = URL.createObjectURL(cached)
        setPreviewUrl(url)
      } else {
        // Cleanup old preview URL if exists
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        setCachedBlob(null)
        setPreviewUrl(null)
      }
    }
  }, [isOpen, selectedChartType, groupId, weekStart])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const fetchChartImage = async (): Promise<Blob> => {
    const weekStartStr = weekStart.toISOString().split('T')[0]
    const url = `/api/groups/${groupId}/charts/export-image?weekStart=${weekStartStr}&chartType=${selectedChartType}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch image')
    }
    return await response.blob()
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const blob = await fetchChartImage()
      
      // Cache the blob
      const cacheKey = getCacheKey(groupId, weekStart, selectedChartType)
      saveToCache(cacheKey, blob)
      
      // Set preview
      setCachedBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (error) {
      console.error('Error generating image:', error)
      alert(t('shareFailed') || 'Failed to generate image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    // Clear cache and reset preview
    const cacheKey = getCacheKey(groupId, weekStart, selectedChartType)
    removeFromCache(cacheKey)
    
    // Cleanup preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    
    setCachedBlob(null)
    setPreviewUrl(null)
    setCopySuccess(false)
  }

  const handleCopyImage = async () => {
    if (!cachedBlob) return
    
    try {
      // Copy image to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': cachedBlob,
        }),
      ])
      setCopySuccess(true)
      setTimeout(() => {
        setCopySuccess(false)
      }, 1000)
    } catch (err) {
      console.error('Failed to copy image:', err)
      alert(t('copyFailed') || 'Failed to copy image. Please try downloading instead.')
    }
  }

  const handleDownloadImage = async () => {
    if (!cachedBlob) return
    
    const weekStartStr = weekStart.toISOString().split('T')[0]
    
    // Download the image
    const downloadUrl = window.URL.createObjectURL(cachedBlob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `chart_${selectedChartType}_${weekStartStr}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  if (!isOpen || !mounted) return null

  const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']
  const chartTypeLabels = {
    artists: t('topArtists'),
    tracks: t('topTracks'),
    albums: t('topAlbums'),
  }

  const modalContent = (
    <>
      {/* Full page overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9998] transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-4 pointer-events-none">
        <div 
          className="bg-white rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto max-w-[calc(100vw-1.5rem)] md:max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold pr-2">{t('shareChart')}</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 active:text-gray-900 text-xl md:text-2xl leading-none w-8 h-8 md:w-8 md:h-8 flex items-center justify-center flex-shrink-0 touch-manipulation"
                aria-label="Close"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Chart Type Selection */}
            <div className="mb-4 md:mb-6">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">
                {t('selectChartType')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 md:gap-2">
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedChartType(type)}
                    disabled={isLoading}
                    className={`p-2 md:p-3 rounded-lg border-2 transition-all touch-manipulation ${
                      selectedChartType === type
                        ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-lighter)]/20'
                        : 'border-gray-300 active:border-gray-400'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FontAwesomeIcon
                      icon={chartTypeIcons[type]}
                      className={`text-base md:text-lg mb-1 md:mb-2 ${
                        selectedChartType === type
                          ? 'text-[var(--theme-primary)]'
                          : 'text-gray-500'
                      }`}
                    />
                    <div className={`text-[10px] md:text-xs font-medium ${
                      selectedChartType === type
                        ? 'text-[var(--theme-primary-dark)]'
                        : 'text-gray-600'
                    }`}>
                      {chartTypeLabels[type]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview Area */}
            <div className="mb-4 md:mb-6">
              <div className="relative w-full max-h-48 md:max-h-64 bg-gray-100 rounded-lg border-2 border-gray-300 flex items-center justify-center overflow-hidden" style={{ aspectRatio: '9/16' }}>
                {/* Refresh Button - only show when image is cached */}
                {previewUrl && !isLoading && (
                  <button
                    onClick={handleRefresh}
                    className="absolute top-1.5 right-1.5 md:top-2 md:right-2 p-1.5 md:p-2 bg-white/90 active:bg-white rounded-full shadow-md transition-colors z-10 touch-manipulation"
                    title={t('refreshImage') || 'Refresh image'}
                    aria-label={t('refreshImage') || 'Refresh image'}
                  >
                    <FontAwesomeIcon
                      icon={faRotateRight}
                      className="text-gray-700 text-xs md:text-sm"
                    />
                  </button>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 md:gap-3">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="text-3xl md:text-4xl text-[var(--theme-primary)] animate-spin"
                    />
                    <p className="text-xs md:text-sm text-gray-600">{t('generatingImage')}</p>
                  </div>
                ) : previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`${chartTypeLabels[selectedChartType]} preview`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 md:gap-3 p-4 md:p-6">
                    <p className="text-xs md:text-sm text-gray-600 text-center mb-1 md:mb-2">
                      {t('previewPlaceholder')}
                    </p>
                    <LiquidGlassButton
                      onClick={handleGenerate}
                      variant="primary"
                      useTheme
                      size="sm"
                    >
                      {t('generate')}
                    </LiquidGlassButton>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 md:space-y-3">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5 md:mb-2">
                {t('shareOptions')}
              </label>
              
              {/* Copy Image */}
              <LiquidGlassButton
                onClick={handleCopyImage}
                disabled={!cachedBlob || isLoading || copySuccess}
                variant="primary"
                useTheme
                fullWidth
                className={`${copySuccess ? 'opacity-50' : ''} touch-manipulation`}
              >
                {copySuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                ) : (
                  t('copyImage')
                )}
              </LiquidGlassButton>

              {/* Download Image */}
              <LiquidGlassButton
                onClick={handleDownloadImage}
                disabled={!cachedBlob || isLoading}
                variant="primary"
                useTheme
                fullWidth
                className="touch-manipulation"
              >
                {t('downloadImage')}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modalContent, document.body)
}
