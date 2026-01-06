'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faArrowUp, faArrowDown, faMinus, faSpinner } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'
import { formatWeekLabel } from '@/lib/weekly-utils'

interface PersonalListeningStats {
  currentWeek: {
    topArtists: Array<{ name: string; playcount: number }>
    topTracks: Array<{ name: string; artist: string; playcount: number }>
    topAlbums: Array<{ name: string; artist: string; playcount: number }>
    totalPlays: number
    uniqueArtists: number
    uniqueTracks: number
  } | null
  previousWeek: {
    totalPlays: number
  } | null
  weekStart: string
}

export default function PersonalListeningOverview() {
  const [stats, setStats] = useState<PersonalListeningStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/personal-stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setStats(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load stats')
        setIsLoading(false)
        console.error('Error fetching personal stats:', err)
      })
  }, [])

  // All hooks must be called before any conditional returns
  const currentWeek = stats?.currentWeek ?? null
  const previousWeek = stats?.previousWeek ?? null
  
  const weekStartDate = useMemo(() => {
    if (!stats?.weekStart) return new Date()
    return new Date(stats.weekStart)
  }, [stats?.weekStart])

  // Memoize computed values - safe to call even if data is null
  const { playsChange, playsChangePercent } = useMemo(() => {
    if (!previousWeek || !currentWeek) {
      return { playsChange: null, playsChangePercent: null }
    }
    const change = currentWeek.totalPlays - previousWeek.totalPlays
    const percent = previousWeek.totalPlays > 0
      ? ((change / previousWeek.totalPlays) * 100).toFixed(1)
      : null
    return { playsChange: change, playsChangePercent: percent }
  }, [currentWeek?.totalPlays, previousWeek?.totalPlays])

  // Memoize top items lists - safe to call even if data is null
  const topArtists = useMemo(() => {
    if (!currentWeek?.topArtists) return []
    return currentWeek.topArtists.slice(0, 5)
  }, [currentWeek?.topArtists])
  
  const topTracks = useMemo(() => {
    if (!currentWeek?.topTracks) return []
    return currentWeek.topTracks.slice(0, 5)
  }, [currentWeek?.topTracks])
  
  const topAlbums = useMemo(() => {
    if (!currentWeek?.topAlbums) return []
    return currentWeek.topAlbums.slice(0, 5)
  }, [currentWeek?.topAlbums])

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  }

  // Now we can safely return early after all hooks have been called
  if (isLoading) {
    return (
      <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200"
        style={glassStyle}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Your Listening This Week</h2>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || !stats || !currentWeek) {
    return (
      <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200"
        style={glassStyle}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">Your Listening This Week</h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No listening data available yet.</p>
          <p className="text-sm">Your weekly stats will appear here once your groups generate charts.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="rounded-xl shadow-lg p-6 border border-theme"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Listening This Week</h2>
        {currentWeek && (
          <span className="text-sm text-gray-500">
            Week of {formatWeekLabel(weekStartDate)}
        </span>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-1">Total Plays</div>
          <div className="text-2xl font-bold text-gray-900">{currentWeek.totalPlays.toLocaleString()}</div>
          {playsChange !== null && (
            <div className="flex items-center gap-1 mt-1 text-xs">
              {playsChange > 0 ? (
                <>
                  <FontAwesomeIcon icon={faArrowUp} className="text-green-600" />
                  <span className="text-green-600">+{playsChange.toLocaleString()}</span>
                  {playsChangePercent && <span className="text-gray-500">({playsChangePercent}%)</span>}
                </>
              ) : playsChange < 0 ? (
                <>
                  <FontAwesomeIcon icon={faArrowDown} className="text-red-600" />
                  <span className="text-red-600">{playsChange.toLocaleString()}</span>
                  {playsChangePercent && <span className="text-gray-500">({playsChangePercent}%)</span>}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faMinus} className="text-gray-500" />
                  <span className="text-gray-500">No change</span>
                </>
              )}
            </div>
          )}
        </div>

        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-1">Unique Artists</div>
          <div className="text-2xl font-bold text-gray-900">{currentWeek.uniqueArtists}</div>
        </div>

        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-1">Unique Tracks</div>
          <div className="text-2xl font-bold text-gray-900">{currentWeek.uniqueTracks}</div>
        </div>

        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="text-sm text-gray-600 font-medium mb-1">Top Items</div>
          <div className="text-2xl font-bold text-gray-900">
            {currentWeek.topArtists.length + currentWeek.topTracks.length + currentWeek.topAlbums.length}
          </div>
        </div>
      </div>

      {/* Top Items Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Artists */}
        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faMicrophone} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Top Artists</h3>
          </div>
          <ol className="space-y-2">
            {topArtists.map((artist, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700">
                  {idx + 1}
                </span>
                <span className="font-medium text-gray-900 truncate">{artist.name}</span>
                <span className="ml-auto text-gray-500 text-xs">{artist.playcount} plays</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Tracks */}
        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faMusic} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Top Tracks</h3>
          </div>
          <ol className="space-y-2">
            {topTracks.map((track, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{track.name}</div>
                  <div className="text-xs text-gray-500 truncate">by {track.artist}</div>
                </div>
                <span className="ml-auto text-gray-500 text-xs flex-shrink-0">{track.playcount}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Top Albums */}
        <div 
          className="rounded-lg p-4 border"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: 'blur(8px) saturate(180%)',
            borderColor: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <FontAwesomeIcon icon={faCompactDisc} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">Top Albums</h3>
          </div>
          <ol className="space-y-2">
            {topAlbums.map((album, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-700 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{album.name}</div>
                  <div className="text-xs text-gray-500 truncate">by {album.artist}</div>
                </div>
                <span className="ml-auto text-gray-500 text-xs flex-shrink-0">{album.playcount}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

