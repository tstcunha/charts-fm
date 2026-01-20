'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { generateSlug, ChartType } from '@/lib/chart-slugs'
import SafeImage from '@/components/SafeImage'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import ShareChartButton from '@/components/charts/ShareChartButton'

interface GroupWeeklyChartsTabProps {
  groupId: string
  isOwner: boolean
  isSuperuser?: boolean
}

// Image cache helpers
const IMAGE_CACHE_PREFIX = 'chartsfm_image_cache_'
const CACHE_EXPIRY_DAYS = 30 // Cache images for 30 days
const IMAGE_CACHE_VERSION_KEY = 'chartsfm_image_cache_version'

interface CachedImage {
  url: string | null
  timestamp: number
}

function getCacheKey(type: 'artist' | 'album', identifier: string): string {
  return `${IMAGE_CACHE_PREFIX}${type}_${identifier.toLowerCase().trim()}`
}

/**
 * Get cached image URL
 * Returns:
 * - string: cached image URL
 * - null: cached as "no image available" (don't retry)
 * - undefined: not cached (should fetch)
 */
function getCachedImage(type: 'artist' | 'album', identifier: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  
  try {
    // Check cache version - if it's outdated, clear all caches
    const cacheVersion = localStorage.getItem(IMAGE_CACHE_VERSION_KEY)
    const currentCacheVersion = '2' // Increment when cache structure changes or to force refresh
    if (cacheVersion !== currentCacheVersion) {
      // Clear all image caches when version changes
      clearAllImageCaches()
      localStorage.setItem(IMAGE_CACHE_VERSION_KEY, currentCacheVersion)
      return undefined
    }
    
    const cacheKey = getCacheKey(type, identifier)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return undefined // Not cached yet
    
    const data: CachedImage = JSON.parse(cached)
    const now = Date.now()
    const expiryTime = data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    // Check if cache is expired
    if (now > expiryTime) {
      localStorage.removeItem(cacheKey)
      return undefined // Expired, treat as not cached
    }
    
    // Return the cached value (could be string URL or null for failed attempts)
    return data.url
  } catch (error) {
    console.error('Error reading image cache:', error)
    return undefined // Error reading, treat as not cached
  }
}

function clearAllImageCaches(): void {
  if (typeof window === 'undefined') return
  
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing image caches:', error)
  }
}

function setCachedImage(type: 'artist' | 'album', identifier: string, url: string | null): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = getCacheKey(type, identifier)
    const data: CachedImage = {
      url,
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(data))
  } catch (error) {
    console.error('Error writing image cache:', error)
    // If localStorage is full, try to clear old entries
    try {
      clearExpiredCache()
      const cacheKey = getCacheKey(type, identifier)
      const data: CachedImage = {
        url,
        timestamp: Date.now(),
      }
      localStorage.setItem(cacheKey, JSON.stringify(data))
    } catch (e) {
      // If still fails, just skip caching
    }
  }
}

function clearExpiredCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    const now = Date.now()
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const data: CachedImage = JSON.parse(cached)
            const expiryTime = data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
            if (now > expiryTime) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // Invalid cache entry, remove it
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Error clearing expired cache:', error)
  }
}

// Helper functions
function getEntryKey(item: { name: string; artist?: string }, chartType: string): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

function formatDisplayValue(
  item: { name: string; artist?: string; playcount: number },
  chartType: string,
  showVS: boolean,
  vsMap: Record<string, number>,
  t: (key: string, values?: Record<string, any>) => string
): string {
  if (showVS) {
    const entryKey = getEntryKey(item, chartType)
    const vs = vsMap[`${chartType}|${entryKey}`]
    if (vs !== undefined && vs !== null) {
      return `${vs.toFixed(2)} ${t('vs')}`
    }
  }
  return t('plays', { count: item.playcount })
}

export default function GroupWeeklyChartsTab({ groupId, isOwner, isSuperuser = false }: GroupWeeklyChartsTabProps) {
  const t = useSafeTranslations('groups.weeklyCharts')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<{
    topArtist: string | null
    topTrackArtist: string | null
    topAlbum: string | null
  }>({
    topArtist: null,
    topTrackArtist: null,
    topAlbum: null,
  })
  const [imagesLoading, setImagesLoading] = useState<{
    topArtist: boolean
    topTrackArtist: boolean
    topAlbum: boolean
  }>({
    topArtist: false,
    topTrackArtist: false,
    topAlbum: false,
  })

  useEffect(() => {
    // Clean up expired cache entries on mount
    clearExpiredCache()
    
    fetch(`/api/groups/${groupId}/weekly-charts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
          
          // Fetch images for top items with caching
          if (data.latestWeek) {
            const { topArtists, topTracks, topAlbums } = data.latestWeek
            
            // Fetch top artist image
            if (topArtists && topArtists.length > 0) {
              const artistName = topArtists[0].name
              const cachedUrl = getCachedImage('artist', artistName)
              
              if (cachedUrl !== undefined) {
                // Use cached image (could be URL string or null for failed attempts)
                setImages((prev) => ({ ...prev, topArtist: cachedUrl }))
              } else {
                // Not cached yet, fetch from API
                setImagesLoading((prev) => ({ ...prev, topArtist: true }))
                fetch(`/api/images/artist?artist=${encodeURIComponent(artistName)}`)
                  .then((res) => res.json())
                  .then((result) => {
                    const imageUrl = result.imageUrl || null
                    setImages((prev) => ({ ...prev, topArtist: imageUrl }))
                    setCachedImage('artist', artistName, imageUrl) // Cache result (URL or null)
                    setImagesLoading((prev) => ({ ...prev, topArtist: false }))
                  })
                  .catch(() => {
                    setImages((prev) => ({ ...prev, topArtist: null }))
                    setCachedImage('artist', artistName, null) // Cache null to avoid repeated failed requests
                    setImagesLoading((prev) => ({ ...prev, topArtist: false }))
                  })
              }
            }
            
            // Fetch top track artist image
            if (topTracks && topTracks.length > 0 && topTracks[0].artist) {
              const artistName = topTracks[0].artist
              const cachedUrl = getCachedImage('artist', artistName)
              
              if (cachedUrl !== undefined) {
                // Use cached image (could be URL string or null for failed attempts)
                setImages((prev) => ({ ...prev, topTrackArtist: cachedUrl }))
              } else {
                // Not cached yet, fetch from API
                setImagesLoading((prev) => ({ ...prev, topTrackArtist: true }))
                fetch(`/api/images/artist?artist=${encodeURIComponent(artistName)}`)
                  .then((res) => res.json())
                  .then((result) => {
                    const imageUrl = result.imageUrl || null
                    setImages((prev) => ({ ...prev, topTrackArtist: imageUrl }))
                    setCachedImage('artist', artistName, imageUrl) // Cache result (URL or null)
                    setImagesLoading((prev) => ({ ...prev, topTrackArtist: false }))
                  })
                  .catch(() => {
                    setImages((prev) => ({ ...prev, topTrackArtist: null }))
                    setCachedImage('artist', artistName, null) // Cache null to avoid repeated failed requests
                    setImagesLoading((prev) => ({ ...prev, topTrackArtist: false }))
                  })
              }
            }
            
            // Fetch top album image
            if (topAlbums && topAlbums.length > 0 && topAlbums[0].artist && topAlbums[0].name) {
              const albumKey = `${topAlbums[0].artist}|${topAlbums[0].name}`
              const cachedUrl = getCachedImage('album', albumKey)
              
              if (cachedUrl !== undefined) {
                // Use cached image (could be URL string or null for failed attempts)
                setImages((prev) => ({ ...prev, topAlbum: cachedUrl }))
              } else {
                // Not cached yet, fetch from API
                setImagesLoading((prev) => ({ ...prev, topAlbum: true }))
                fetch(`/api/images/album?artist=${encodeURIComponent(topAlbums[0].artist)}&album=${encodeURIComponent(topAlbums[0].name)}`)
                  .then((res) => res.json())
                  .then((result) => {
                    const imageUrl = result.imageUrl || null
                    setImages((prev) => ({ ...prev, topAlbum: imageUrl }))
                    setCachedImage('album', albumKey, imageUrl) // Cache result (URL or null)
                    setImagesLoading((prev) => ({ ...prev, topAlbum: false }))
                  })
                  .catch(() => {
                    setImages((prev) => ({ ...prev, topAlbum: null }))
                    setCachedImage('album', albumKey, null) // Cache null to avoid repeated failed requests
                    setImagesLoading((prev) => ({ ...prev, topAlbum: false }))
                  })
              }
            }
          }
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError(t('failedToLoad'))
        setIsLoading(false)
        console.error('Error fetching weekly charts:', err)
      })
  }, [groupId, t])

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--theme-primary-dark)]">{t('title')}</h2>
        </div>
        <div className="flex items-center justify-center py-8 md:py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.latestWeek) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[var(--theme-primary-dark)]">{t('title')}</h2>
        </div>
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-8 md:p-12 text-center border border-theme">
          <div className="mb-4 text-[var(--theme-primary)]">
            <FontAwesomeIcon icon={faMusic} className="text-4xl md:text-5xl" />
          </div>
          <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{t('noChartsAvailable')}</p>
          <p className="text-gray-500 text-sm mb-4 md:mb-6">{t('startTracking')}</p>
          {isOwner && (
            <LiquidGlassLink
              href={`/groups/${groupId}/settings?tab=regenerate`}
              variant="primary"
              useTheme
            >
              {t('generateCharts')}
            </LiquidGlassLink>
          )}
        </div>
      </div>
    )
  }

  const { latestWeek, showVS } = data
  const { topArtists, topTracks, topAlbums, vsMap, positionChangeMap, entryTypeMap } = latestWeek
  const vsMapObj = vsMap || {}
  const positionChangeMapObj = positionChangeMap || {}
  const entryTypeMapObj = entryTypeMap || {}

  // Get weekStart Date from latestWeek.weekStart (ISO string)
  const weekStartDate = latestWeek.weekStart ? new Date(latestWeek.weekStart) : new Date()

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--theme-primary-dark)]">{t('title')}</h2>
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <LiquidGlassLink
            href={`/groups/${groupId}/charts`}
            variant="primary"
            useTheme
            className="w-full sm:w-auto"
          >
            {t('exploreCharts')}
          </LiquidGlassLink>
          <div className="w-full sm:w-auto">
            <ShareChartButton
              groupId={groupId}
              weekStart={weekStartDate}
              fullWidth
            />
          </div>
        </div>
      </div>
      <div className="mb-4 md:mb-6">
        <h3 className="text-lg md:text-2xl font-bold text-gray-900">
          {t('weekOf', { date: latestWeek.weekStartFormatted })}
          <span className="text-xs md:text-sm font-normal italic text-gray-500 ml-1 md:ml-2">
            ({t('fromTo', { start: latestWeek.weekStartFormatted, end: latestWeek.weekEndFormatted })})
          </span>
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Top Artists */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMicrophone} className="text-base md:text-lg flex-shrink-0" />
              {t('topArtists')}
            </h4>
            {topArtists && topArtists.length > 0 && (
              <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 rounded-lg border-2 border-[var(--theme-border)] overflow-hidden bg-gray-100">
                  {imagesLoading.topArtist ? (
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                  ) : images.topArtist ? (
                    <SafeImage
                      src={images.topArtist}
                      alt={topArtists[0].name}
                      className="w-full h-full object-cover"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 md:space-y-3">
              {topArtists.slice(0, 3).map((artist: any, idx: number) => {
                const displayValue = formatDisplayValue(artist, 'artists', showVS, vsMapObj, t)
                const entryKey = getEntryKey(artist, 'artists')
                const positionChange = positionChangeMapObj[`artists|${entryKey}`]
                const entryType = entryTypeMapObj[`artists|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/artist/${generateSlug(entryKey, 'artists')}`}
                        className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 hover:text-[var(--theme-primary)] transition-colors min-w-0"
                      >
                        <span className="truncate">{artist.name}</span>
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                      </Link>
                      <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium truncate">{displayValue}</div>
                    </div>
                  </div>
                )
              })}
              {topArtists.length > 3 && (
                <div className="pt-2 border-t border-[var(--theme-border)]">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {topArtists.slice(3, 10).map((artist: any, idx: number) => {
                      const entryKey = getEntryKey(artist, 'artists')
                      const positionChange = positionChangeMapObj[`artists|${entryKey}`]
                      const entryType = entryTypeMapObj[`artists|${entryKey}`]
                      return (
                        <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                          <Link
                            href={`/groups/${groupId}/charts/artist/${generateSlug(entryKey, 'artists')}`}
                            className="hover:text-[var(--theme-primary)] transition-colors truncate"
                          >
                            {artist.name}
                          </Link>{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" />{' '}
                          <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(artist, 'artists', showVS, vsMapObj, t)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topArtists.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('andMore', { count: topArtists.length - 10 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Top Tracks */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMusic} className="text-base md:text-lg flex-shrink-0" />
              {t('topTracks')}
            </h4>
            {topTracks && topTracks.length > 0 && topTracks[0].artist && (
              <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 rounded-lg border-2 border-[var(--theme-border)] overflow-hidden bg-gray-100">
                  {imagesLoading.topTrackArtist ? (
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                  ) : images.topTrackArtist ? (
                    <SafeImage
                      src={images.topTrackArtist}
                      alt={topTracks[0].artist}
                      className="w-full h-full object-cover"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 md:space-y-3">
              {topTracks.slice(0, 3).map((track: any, idx: number) => {
                const displayValue = formatDisplayValue(track, 'tracks', showVS, vsMapObj, t)
                const entryKey = getEntryKey(track, 'tracks')
                const positionChange = positionChangeMapObj[`tracks|${entryKey}`]
                const entryType = entryTypeMapObj[`tracks|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/track/${generateSlug(entryKey, 'tracks')}`}
                        className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 hover:text-[var(--theme-primary)] transition-colors min-w-0"
                      >
                        <span className="truncate">{track.name}</span>
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                      </Link>
                      <div className="text-xs text-gray-600 truncate">{t('by', { artist: track.artist })}</div>
                      <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium mt-1 truncate">{displayValue}</div>
                    </div>
                  </div>
                )
              })}
              {topTracks.length > 3 && (
                <div className="pt-2 border-t border-[var(--theme-border)]">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {topTracks.slice(3, 10).map((track: any, idx: number) => {
                      const entryKey = getEntryKey(track, 'tracks')
                      const positionChange = positionChangeMapObj[`tracks|${entryKey}`]
                      const entryType = entryTypeMapObj[`tracks|${entryKey}`]
                      return (
                        <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                          <span className="truncate">
                            <Link
                              href={`/groups/${groupId}/charts/track/${generateSlug(entryKey, 'tracks')}`}
                              className="hover:text-[var(--theme-primary)] transition-colors"
                            >
                              {track.name}
                            </Link>{' '}
                            {t('by', { artist: track.artist })}
                          </span>{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" />{' '}
                          <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(track, 'tracks', showVS, vsMapObj, t)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topTracks.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('andMore', { count: topTracks.length - 10 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Top Albums */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faCompactDisc} className="text-base md:text-lg flex-shrink-0" />
              {t('topAlbums')}
            </h4>
            {topAlbums && topAlbums.length > 0 && (
              <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 rounded-lg border-2 border-[var(--theme-border)] overflow-hidden bg-gray-100">
                  {imagesLoading.topAlbum ? (
                    <div className="w-full h-full bg-gray-200 animate-pulse" />
                  ) : images.topAlbum ? (
                    <SafeImage
                      src={images.topAlbum}
                      alt={topAlbums[0].name}
                      className="w-full h-full object-cover"
                      width={96}
                      height={96}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 md:space-y-3">
              {topAlbums.slice(0, 3).map((album: any, idx: number) => {
                const displayValue = formatDisplayValue(album, 'albums', showVS, vsMapObj, t)
                const entryKey = getEntryKey(album, 'albums')
                const positionChange = positionChangeMapObj[`albums|${entryKey}`]
                const entryType = entryTypeMapObj[`albums|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/album/${generateSlug(entryKey, 'albums')}`}
                        className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5 md:gap-2 hover:text-[var(--theme-primary)] transition-colors min-w-0"
                      >
                        <span className="truncate">{album.name}</span>
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs md:text-sm flex-shrink-0" />
                      </Link>
                      <div className="text-xs text-gray-600 truncate">{t('by', { artist: album.artist })}</div>
                      <div className="text-xs md:text-sm text-[var(--theme-text)] font-medium mt-1 truncate">{displayValue}</div>
                    </div>
                  </div>
                )
              })}
              {topAlbums.length > 3 && (
                <div className="pt-2 border-t border-[var(--theme-border)]">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                    {topAlbums.slice(3, 10).map((album: any, idx: number) => {
                      const entryKey = getEntryKey(album, 'albums')
                      const positionChange = positionChangeMapObj[`albums|${entryKey}`]
                      const entryType = entryTypeMapObj[`albums|${entryKey}`]
                      return (
                        <li key={idx + 3} className="flex items-center gap-1 min-w-0">
                          <span className="truncate">
                            <Link
                              href={`/groups/${groupId}/charts/album/${generateSlug(entryKey, 'albums')}`}
                              className="hover:text-[var(--theme-primary)] transition-colors"
                            >
                              {album.name}
                            </Link>{' '}
                            {t('by', { artist: album.artist })}
                          </span>{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs flex-shrink-0" />{' '}
                          <span className="text-[var(--theme-text)] flex-shrink-0">({formatDisplayValue(album, 'albums', showVS, vsMapObj, t)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topAlbums.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {t('andMore', { count: topAlbums.length - 10 })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* The #1s Section */}
      <div className="mt-6 md:mt-8">
        <h3 className="text-xl md:text-2xl font-bold text-[var(--theme-primary-dark)] mb-4 md:mb-6">
          {t('theNumberOnes')}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <LiquidGlassLink
            href={`/groups/${groupId}/chart-toppers#artists`}
            variant="primary"
            useTheme
            className="flex-1"
          >
            {t('numberOneArtists')}
          </LiquidGlassLink>
          <LiquidGlassLink
            href={`/groups/${groupId}/chart-toppers#tracks`}
            variant="primary"
            useTheme
            className="flex-1"
          >
            {t('numberOneTracks')}
          </LiquidGlassLink>
          <LiquidGlassLink
            href={`/groups/${groupId}/chart-toppers#albums`}
            variant="primary"
            useTheme
            className="flex-1"
          >
            {t('numberOneAlbums')}
          </LiquidGlassLink>
        </div>
      </div>
    </div>
  )
}

