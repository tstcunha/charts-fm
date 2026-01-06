'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { generateSlug, ChartType } from '@/lib/chart-slugs'

interface GroupWeeklyChartsTabProps {
  groupId: string
  isOwner: boolean
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
  vsMap: Record<string, number>
): string {
  if (showVS) {
    const entryKey = getEntryKey(item, chartType)
    const vs = vsMap[`${chartType}|${entryKey}`]
    if (vs !== undefined && vs !== null) {
      return `${vs.toFixed(2)} VS`
    }
  }
  return `${item.playcount} plays`
}

export default function GroupWeeklyChartsTab({ groupId, isOwner }: GroupWeeklyChartsTabProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/weekly-charts`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load charts')
        setIsLoading(false)
        console.error('Error fetching weekly charts:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Weekly Charts</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.latestWeek) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Weekly Charts</h2>
        </div>
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
          <div className="mb-4 text-[var(--theme-primary)]">
            <FontAwesomeIcon icon={faMusic} size="3x" />
          </div>
          <p className="text-gray-700 text-lg mb-2 font-medium">No charts available yet.</p>
          <p className="text-gray-500 text-sm mb-6">Start tracking your group's listening habits!</p>
          {isOwner && (
            <LiquidGlassLink
              href={`/groups/${groupId}/generate`}
              variant="primary"
              useTheme
            >
              Generate Charts
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Weekly Charts</h2>
        <LiquidGlassLink
          href={`/groups/${groupId}/charts`}
          variant="primary"
          useTheme
        >
          Explore Charts
        </LiquidGlassLink>
      </div>
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            Week of {latestWeek.weekStartFormatted}
            <span className="text-sm font-normal italic text-gray-500 ml-2">
              (from {latestWeek.weekStartFormatted} to {latestWeek.weekEndFormatted})
            </span>
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Artists */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMicrophone} className="text-lg" />
              Top Artists
            </h4>
            <div className="space-y-3">
              {topArtists.slice(0, 3).map((artist: any, idx: number) => {
                const displayValue = formatDisplayValue(artist, 'artists', showVS, vsMapObj)
                const entryKey = getEntryKey(artist, 'artists')
                const positionChange = positionChangeMapObj[`artists|${entryKey}`]
                const entryType = entryTypeMapObj[`artists|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/artist/${generateSlug(entryKey, 'artists')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate flex items-center gap-2 hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {artist.name}
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                      </Link>
                      <div className="text-sm text-[var(--theme-text)] font-medium">{displayValue}</div>
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
                        <li key={idx + 3} className="truncate flex items-center gap-1">
                          <Link
                            href={`/groups/${groupId}/charts/artist/${generateSlug(entryKey, 'artists')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--theme-primary)] transition-colors"
                          >
                            {artist.name}
                          </Link>{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" />{' '}
                          <span className="text-[var(--theme-text)]">({formatDisplayValue(artist, 'artists', showVS, vsMapObj)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topArtists.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ...and {topArtists.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Top Tracks */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMusic} className="text-lg" />
              Top Tracks
            </h4>
            <div className="space-y-3">
              {topTracks.slice(0, 3).map((track: any, idx: number) => {
                const displayValue = formatDisplayValue(track, 'tracks', showVS, vsMapObj)
                const entryKey = getEntryKey(track, 'tracks')
                const positionChange = positionChangeMapObj[`tracks|${entryKey}`]
                const entryType = entryTypeMapObj[`tracks|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/track/${generateSlug(entryKey, 'tracks')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate flex items-center gap-2 hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {track.name}
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                      </Link>
                      <div className="text-xs text-gray-600 truncate">by {track.artist}</div>
                      <div className="text-sm text-[var(--theme-text)] font-medium mt-1">{displayValue}</div>
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
                        <li key={idx + 3} className="truncate flex items-center gap-1">
                          <Link
                            href={`/groups/${groupId}/charts/track/${generateSlug(entryKey, 'tracks')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--theme-primary)] transition-colors"
                          >
                            {track.name}
                          </Link>{' '}
                          by {track.artist}{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" />{' '}
                          <span className="text-[var(--theme-text)]">({formatDisplayValue(track, 'tracks', showVS, vsMapObj)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topTracks.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ...and {topTracks.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Top Albums */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faCompactDisc} className="text-lg" />
              Top Albums
            </h4>
            <div className="space-y-3">
              {topAlbums.slice(0, 3).map((album: any, idx: number) => {
                const displayValue = formatDisplayValue(album, 'albums', showVS, vsMapObj)
                const entryKey = getEntryKey(album, 'albums')
                const positionChange = positionChangeMapObj[`albums|${entryKey}`]
                const entryType = entryTypeMapObj[`albums|${entryKey}`]
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/album/${generateSlug(entryKey, 'albums')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate flex items-center gap-2 hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {album.name}
                        <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                      </Link>
                      <div className="text-xs text-gray-600 truncate">by {album.artist}</div>
                      <div className="text-sm text-[var(--theme-text)] font-medium mt-1">{displayValue}</div>
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
                        <li key={idx + 3} className="truncate flex items-center gap-1">
                          <Link
                            href={`/groups/${groupId}/charts/album/${generateSlug(entryKey, 'albums')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-[var(--theme-primary)] transition-colors"
                          >
                            {album.name}
                          </Link>{' '}
                          by {album.artist}{' '}
                          <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" />{' '}
                          <span className="text-[var(--theme-text)]">({formatDisplayValue(album, 'albums', showVS, vsMapObj)})</span>
                        </li>
                      )
                    })}
                  </ol>
                  {topAlbums.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ...and {topAlbums.length - 10} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

