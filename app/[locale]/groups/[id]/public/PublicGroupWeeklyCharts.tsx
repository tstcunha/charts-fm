'use client'

import { useState, useEffect } from 'react'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'

interface PublicGroupWeeklyChartsProps {
  groupId: string
  chartMode: string
}

// Helper function to get entry key for matching
function getEntryKey(item: { name: string; artist?: string }, chartType: string): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

// Helper function to format display value (VS or plays)
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

export default function PublicGroupWeeklyCharts({ groupId, chartMode }: PublicGroupWeeklyChartsProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/public/weekly-charts`)
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
        console.error('Error fetching public weekly charts:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="flex items-center justify-center py-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.weeks || data.weeks.length === 0) {
    return (
      <>
        {data && data.weeksTracked > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Total Plays This Week</div>
              <div className="text-3xl font-bold text-[var(--theme-text)]">{data.totalPlaysThisWeek?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Weeks Tracked</div>
              <div className="text-3xl font-bold text-[var(--theme-text)]">{data.weeksTracked || 0}</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
              <div className="text-sm text-gray-600 mb-1">Chart Mode</div>
              <div className="text-lg font-bold text-[var(--theme-text)] capitalize">
                {data.chartMode === 'vs' ? 'Vibe Score' : data.chartMode === 'vs_weighted' ? 'Vibe Score Weighted' : 'Plays Only'}
              </div>
            </div>
          </div>
        )}
        <div>
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)] mb-6">
            Weekly Charts
          </h2>
          <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
            <div className="mb-4 text-[var(--theme-primary)]">
              <FontAwesomeIcon icon={faMusic} size="3x" />
            </div>
            <p className="text-gray-700 text-lg mb-2 font-medium">No charts available yet.</p>
            <p className="text-gray-500 text-sm">This group hasn't generated any charts yet.</p>
          </div>
        </div>
      </>
    )
  }

  const { weeks, showVS } = data

  return (
    <>
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Plays This Week</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">{data.totalPlaysThisWeek.toLocaleString()}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Weeks Tracked</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">{data.weeksTracked}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Chart Mode</div>
          <div className="text-lg font-bold text-[var(--theme-text)] capitalize">
            {data.chartMode === 'vs' ? 'Vibe Score' : data.chartMode === 'vs_weighted' ? 'Vibe Score Weighted' : 'Plays Only'}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)] mb-6">
          Weekly Charts
        </h2>
        <div className="space-y-6">
          {weeks.map((week: any) => {
            const vsMap = week.vsMap || {}
            const positionChangeMap = week.positionChangeMap || {}
            const entryTypeMap = week.entryTypeMap || {}
            const topArtists = week.topArtists || []
            const topTracks = week.topTracks || []
            const topAlbums = week.topAlbums || []
            
            return (
              <div key={week.id} className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Week of {week.weekStartFormatted}
                  <span className="text-sm font-normal italic text-gray-500 ml-2">
                    (from {week.weekStartFormatted} to {week.weekEndFormatted})
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Top Artists */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                    <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                      <FontAwesomeIcon icon={faMicrophone} style={{ width: '1em', height: '1em' }} />
                      Top Artists
                    </h4>
                    <div className="space-y-3">
                      {topArtists.slice(0, 3).map((artist: any, idx: number) => {
                        const displayValue = formatDisplayValue(artist, 'artists', showVS, vsMap)
                        const entryKey = getEntryKey(artist, 'artists')
                        const positionChange = positionChangeMap[`artists|${entryKey}`]
                        const entryType = entryTypeMap[`artists|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                {artist.name}
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                              </div>
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
                              const positionChange = positionChangeMap[`artists|${entryKey}`]
                              const entryType = entryTypeMap[`artists|${entryKey}`]
                              return (
                                <li key={idx + 3} className="truncate flex items-center gap-1">
                                  {artist.name} <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(artist, 'artists', showVS, vsMap)})</span>
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
                      <FontAwesomeIcon icon={faMusic} style={{ width: '1em', height: '1em' }} />
                      Top Tracks
                    </h4>
                    <div className="space-y-3">
                      {topTracks.slice(0, 3).map((track: any, idx: number) => {
                        const displayValue = formatDisplayValue(track, 'tracks', showVS, vsMap)
                        const entryKey = getEntryKey(track, 'tracks')
                        const positionChange = positionChangeMap[`tracks|${entryKey}`]
                        const entryType = entryTypeMap[`tracks|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                {track.name}
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                              </div>
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
                              const positionChange = positionChangeMap[`tracks|${entryKey}`]
                              const entryType = entryTypeMap[`tracks|${entryKey}`]
                              return (
                                <li key={idx + 3} className="truncate flex items-center gap-1">
                                  {track.name} by {track.artist} <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(track, 'tracks', showVS, vsMap)})</span>
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
                      <FontAwesomeIcon icon={faCompactDisc} style={{ width: '1em', height: '1em' }} />
                      Top Albums
                    </h4>
                    <div className="space-y-3">
                      {topAlbums.slice(0, 3).map((album: any, idx: number) => {
                        const displayValue = formatDisplayValue(album, 'albums', showVS, vsMap)
                        const entryKey = getEntryKey(album, 'albums')
                        const positionChange = positionChangeMap[`albums|${entryKey}`]
                        const entryType = entryTypeMap[`albums|${entryKey}`]
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                          >
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                {album.name}
                                <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-sm" />
                              </div>
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
                              const positionChange = positionChangeMap[`albums|${entryKey}`]
                              const entryType = entryTypeMap[`albums|${entryKey}`]
                              return (
                                <li key={idx + 3} className="truncate flex items-center gap-1">
                                  {album.name} by {album.artist} <PositionMovementIcon positionChange={positionChange} entryType={entryType} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(album, 'albums', showVS, vsMap)})</span>
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
            )
          })}
        </div>
      </div>
    </>
  )
}

