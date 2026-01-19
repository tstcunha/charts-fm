'use client'

import { useEffect, useState, memo } from 'react'
import { Link } from '@/i18n/routing'
import ChartHistoryTimeline from '@/components/charts/ChartHistoryTimeline'
import QuickStats from '@/components/charts/QuickStats'
import EntryStatsTable from '@/components/charts/EntryStatsTable'
import ArtistEntriesTable from '@/components/charts/ArtistEntriesTable'
import { ChartHistoryEntry, EntryStats, MajorDriver, ArtistChartEntry } from '@/lib/chart-deep-dive'
import { ChartType } from '@/lib/chart-slugs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import SafeImage from '@/components/SafeImage'
import { getDefaultArtistImage, getDefaultAlbumImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'

// Image cache helpers (same as GroupWeeklyChartsTab)
const IMAGE_CACHE_PREFIX = 'chartsfm_image_cache_'
const CACHE_EXPIRY_DAYS = 30
const IMAGE_CACHE_VERSION_KEY = 'chartsfm_image_cache_version'

interface CachedImage {
  url: string | null
  timestamp: number
}

function getCacheKey(type: 'artist' | 'album', identifier: string): string {
  return `${IMAGE_CACHE_PREFIX}${type}_${identifier.toLowerCase().trim()}`
}

function getCachedImage(type: 'artist' | 'album', identifier: string): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  
  try {
    const cacheVersion = localStorage.getItem(IMAGE_CACHE_VERSION_KEY)
    const currentCacheVersion = '2'
    if (cacheVersion !== currentCacheVersion) {
      return undefined
    }
    
    const cacheKey = getCacheKey(type, identifier)
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return undefined
    
    const data: CachedImage = JSON.parse(cached)
    const now = Date.now()
    const expiryTime = data.timestamp + (CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    
    if (now > expiryTime) {
      localStorage.removeItem(cacheKey)
      return undefined
    }
    
    return data.url
  } catch (error) {
    console.error('Error reading image cache:', error)
    return undefined
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
  }
}

interface DeepDiveClientProps {
  groupId: string
  chartType: ChartType
  entryKey: string
  slug: string
  entryName: string
  entryArtist: string | null
  artistSlug: string | null
  initialHistory: ChartHistoryEntry[]
  chartMode: string
  isArtist?: boolean
  imageUrl?: string | null
  imageLinkUrl?: string | null
  // For client-side image fetching
  artistNameForImage?: string | null
  albumArtistForImage?: string | null
  albumNameForImage?: string | null
}

export default function DeepDiveClient({
  groupId,
  chartType,
  entryKey,
  slug,
  entryName,
  entryArtist,
  artistSlug,
  initialHistory,
  chartMode,
  isArtist = false,
  imageUrl: initialImageUrl,
  imageLinkUrl,
  artistNameForImage,
  albumArtistForImage,
  albumNameForImage,
}: DeepDiveClientProps) {
  const t = useSafeTranslations('deepDive.client')
  const [stats, setStats] = useState<EntryStats | null>(null)
  const [majorDriver, setMajorDriver] = useState<MajorDriver | null>(null)
  const [totals, setTotals] = useState<{ totalVS: number | null; totalPlays: number; weeksAtNumberOne: number } | null>(null)
  const [artistEntries, setArtistEntries] = useState<{ tracks: ArtistChartEntry[]; albums: ArtistChartEntry[] } | null>(null)
  const [numberOnes, setNumberOnes] = useState<{ numberOneTracks: number; numberOneAlbums: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(initialImageUrl)

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(`/api/groups/${groupId}/charts/${chartType}/${encodeURIComponent(slug)}`)
        if (!response.ok) {
          console.error('Failed to load deep dive data')
          return
        }

        const data = await response.json()
        // Parse dates from API response
        if (data.stats) {
          setStats({
            ...data.stats,
            debutDate: data.stats.debutDate ? new Date(data.stats.debutDate) : null,
            latestAppearance: data.stats.latestAppearance ? new Date(data.stats.latestAppearance) : null,
            longestStreakStartDate: data.stats.longestStreakStartDate ? new Date(data.stats.longestStreakStartDate) : null,
            longestStreakEndDate: data.stats.longestStreakEndDate ? new Date(data.stats.longestStreakEndDate) : null,
          })
        }
        setMajorDriver(data.majorDriver)
        setTotals(data.totals)
        if (isArtist) {
          setArtistEntries(data.artistEntries)
          setNumberOnes(data.numberOnes)
        }
      } catch (error) {
        console.error('Error loading deep dive data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [groupId, chartType, slug, isArtist])

  // Fetch image on client side (non-blocking)
  useEffect(() => {
    // If imageUrl was already provided server-side, don't fetch
    if (initialImageUrl !== undefined) {
      return
    }

    // Fetch artist image for artists or tracks
    if ((chartType === 'artists' || chartType === 'tracks') && artistNameForImage) {
      const cachedUrl = getCachedImage('artist', artistNameForImage)
      
      if (cachedUrl !== undefined) {
        // Use cached value immediately
        setImageUrl(cachedUrl)
      } else {
        // Show placeholder while fetching
        setImageUrl(undefined)
        
        // Fetch from API (non-blocking)
        fetch(`/api/images/artist?artist=${encodeURIComponent(artistNameForImage)}`)
          .then((res) => res.json())
          .then((result) => {
            const imageUrl = result.imageUrl || null
            setImageUrl(imageUrl)
            setCachedImage('artist', artistNameForImage, imageUrl)
          })
          .catch(() => {
            setImageUrl(null)
            setCachedImage('artist', artistNameForImage, null)
          })
      }
    }
    
    // Fetch album image for albums
    if (chartType === 'albums' && albumArtistForImage && albumNameForImage) {
      const albumKey = `${albumArtistForImage}|${albumNameForImage}`
      const cachedUrl = getCachedImage('album', albumKey)
      
      if (cachedUrl !== undefined) {
        // Use cached value immediately
        setImageUrl(cachedUrl)
      } else {
        // Show placeholder while fetching
        setImageUrl(undefined)
        
        // Fetch from API (non-blocking)
        fetch(`/api/images/album?artist=${encodeURIComponent(albumArtistForImage)}&album=${encodeURIComponent(albumNameForImage)}`)
          .then((res) => res.json())
          .then((result) => {
            const imageUrl = result.imageUrl || null
            setImageUrl(imageUrl)
            setCachedImage('album', albumKey, imageUrl)
          })
          .catch(() => {
            setImageUrl(null)
            setCachedImage('album', albumKey, null)
          })
      }
    }
  }, [chartType, artistNameForImage, albumArtistForImage, albumNameForImage, initialImageUrl])

  // Determine which placeholder to use based on chart type
  const getDefaultImage = () => {
    if (chartType === 'albums') {
      return getDefaultAlbumImage()
    }
    // For artists and tracks, use artist placeholder
    return getDefaultArtistImage()
  }

  // Always render image section if we have data to fetch or if imageUrl was provided
  const renderImageSection = imageUrl !== undefined || artistNameForImage !== undefined || (albumArtistForImage !== undefined && albumNameForImage !== undefined)

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Entry Name Title - with side-by-side image */}
      {renderImageSection ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 md:gap-6 mb-2 sm:mb-3 md:mb-4 py-1 sm:py-2 overflow-visible">
          {/* Image - left side */}
          {imageLinkUrl ? (
            <Link href={imageLinkUrl} className="flex-shrink-0 group touch-manipulation">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-36 lg:h-36 xl:w-40 xl:h-40 rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg hover:shadow-xl active:shadow-xl transition-all cursor-pointer border-2 border-white/20 bg-gray-100">
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt={entryName}
                    className="object-cover w-full h-full transition-transform group-hover:scale-105 group-active:scale-105"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, (max-width: 1280px) 144px, 160px"
                  />
                ) : (
                  <SafeImage
                    src={getDefaultImage()}
                    alt={`${entryName} - No image available`}
                    className="object-contain w-full h-full p-2 sm:p-3 md:p-4"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, (max-width: 1280px) 144px, 160px"
                  />
                )}
                {/* Dark overlay with edit icon on hover/touch */}
                <div className="absolute inset-0 bg-black/50 sm:bg-black/60 opacity-0 active:opacity-100 sm:active:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <FontAwesomeIcon 
                    icon={faImage} 
                    className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl"
                  />
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex-shrink-0">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-36 lg:h-36 xl:w-40 xl:h-40 rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg border-2 border-white/20 bg-gray-100">
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt={entryName}
                    className="object-cover w-full h-full"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, (max-width: 1280px) 144px, 160px"
                  />
                ) : (
                  <SafeImage
                    src={getDefaultImage()}
                    alt={`${entryName} - No image available`}
                    className="object-contain w-full h-full p-2 sm:p-3 md:p-4"
                    fill
                    sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, (max-width: 1280px) 144px, 160px"
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Entry Name and Artist - right side */}
          <div className="flex-1 min-w-0">
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold break-words"
              style={{ 
                lineHeight: '1.2', 
                paddingBottom: '0.1em', 
                overflow: 'visible',
                backgroundImage: 'linear-gradient(to right, var(--theme-primary-darker), var(--theme-primary), var(--theme-primary-light))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {entryName}
            </h1>
            {entryArtist && chartType !== 'artists' && (
              <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mt-1 sm:mt-2 break-words">
                {chartType === 'tracks' ? t('track') : chartType === 'albums' ? t('album') : ''} {t('by')}{' '}
                {artistSlug ? (
                  <Link
                    href={`/groups/${groupId}/charts/artist/${artistSlug}`}
                    className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] active:text-[var(--theme-primary-dark)] transition-colors touch-manipulation"
                  >
                    {entryArtist}
                  </Link>
                ) : (
                  entryArtist
                )}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center mb-2 sm:mb-3 md:mb-4 py-1 sm:py-2 overflow-visible">
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold break-words"
            style={{ 
              lineHeight: '1.2', 
              paddingBottom: '0.1em', 
              overflow: 'visible',
              backgroundImage: 'linear-gradient(to right, var(--theme-primary-darker), var(--theme-primary), var(--theme-primary-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            {entryName}
          </h1>
          {entryArtist && (
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mt-1 sm:mt-2 break-words">
              {chartType === 'tracks' ? t('track') : chartType === 'albums' ? t('album') : ''} {t('by')}{' '}
              {artistSlug ? (
                <Link
                  href={`/groups/${groupId}/charts/artist/${artistSlug}`}
                  className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] active:text-[var(--theme-primary-dark)] transition-colors touch-manipulation"
                >
                  {entryArtist}
                </Link>
              ) : (
                entryArtist
              )}
            </p>
          )}
        </div>
      )}

      {/* Chart History Timeline - loaded immediately */}
      <ChartHistoryTimeline
        history={initialHistory}
        groupId={groupId}
        chartType={chartType}
      />

      {/* Quick Stats - loaded asynchronously */}
      {loading ? (
        <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
          <div className="animate-pulse">
            <div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-24 sm:w-32 md:w-48 mb-2 sm:mb-3 md:mb-4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
              <div className="h-12 sm:h-14 md:h-16 bg-gray-200 rounded"></div>
              <div className="h-12 sm:h-14 md:h-16 bg-gray-200 rounded"></div>
              <div className="h-12 sm:h-14 md:h-16 bg-gray-200 rounded sm:col-span-2 md:col-span-1"></div>
            </div>
          </div>
        </div>
      ) : totals && (
        <QuickStats
          totalVS={totals.totalVS}
          totalPlays={totals.totalPlays}
          majorDriver={majorDriver}
          chartMode={chartMode}
          numberOneTracks={numberOnes?.numberOneTracks}
          numberOneAlbums={numberOnes?.numberOneAlbums}
          weeksAtNumberOne={totals.weeksAtNumberOne}
        />
      )}

      {/* Stats Table - loaded asynchronously */}
      {loading ? (
        <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
          <div className="animate-pulse">
            <div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-20 sm:w-24 md:w-32 mb-2 sm:mb-3 md:mb-4"></div>
            <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-8 sm:h-10 md:h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : stats && (
        <EntryStatsTable stats={stats} />
      )}

      {/* Artist Entries Table - only for artists, loaded asynchronously */}
      {isArtist && (
        loading ? (
          <div className="bg-white/40 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
            <div className="animate-pulse">
              <div className="h-4 sm:h-5 md:h-6 bg-gray-200 rounded w-24 sm:w-32 md:w-48 mb-2 sm:mb-3 md:mb-4"></div>
              <div className="h-6 sm:h-8 md:h-10 bg-gray-200 rounded mb-2 sm:mb-3 md:mb-4"></div>
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 sm:h-10 md:h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        ) : artistEntries && (
          <ArtistEntriesTable
            tracks={artistEntries.tracks}
            albums={artistEntries.albums}
            groupId={groupId}
          />
        )
      )}
    </div>
  )
}

