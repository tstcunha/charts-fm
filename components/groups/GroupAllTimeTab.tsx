'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faTrophy, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import LiquidGlassButton from '@/components/LiquidGlassButton'
import { generateSlug } from '@/lib/chart-slugs'

interface GroupAllTimeTabProps {
  groupId: string
  isOwner: boolean
}

export default function GroupAllTimeTab({ groupId, isOwner }: GroupAllTimeTabProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/alltime-stats`)
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
        setError('Failed to load all-time stats')
        setIsLoading(false)
        console.error('Error fetching all-time stats:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">All-Time Stats</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.allTimeStats || (data.allTimeStats.topArtists as any[]).length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">All-Time Stats</h2>
        </div>
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
          <div className="mb-4 text-[var(--theme-primary)]">
            <FontAwesomeIcon icon={faTrophy} size="3x" />
          </div>
          <p className="text-gray-700 text-lg mb-2 font-medium">No all-time stats available yet.</p>
          <p className="text-gray-500 text-sm mb-6">Generate charts to start building your all-time rankings!</p>
          {!data?.hasWeeklyStats && isOwner && (
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

  const { allTimeStats } = data
  const topArtists = (allTimeStats.topArtists as any[]) || []
  const topTracks = (allTimeStats.topTracks as any[]) || []
  const topAlbums = (allTimeStats.topAlbums as any[]) || []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">All-Time Stats</h2>
        <LiquidGlassLink
          href={`/groups/${groupId}/alltime`}
          variant="primary"
          useTheme
        >
          View All-Time Stats
        </LiquidGlassLink>
      </div>
      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">Top 100 All-Time</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMicrophone} className="text-lg" />
              Top Artists
            </h4>
            <ol className="space-y-2">
              {topArtists.slice(0, 10).map((artist: any, idx: number) => {
                const entryKey = artist.name.toLowerCase()
                return (
                  <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/artist/${generateSlug(entryKey, 'artists')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {artist.name}
                      </Link>
                      <div className="text-sm text-[var(--theme-text)]">{artist.playcount.toLocaleString()} plays</div>
                    </div>
                  </li>
                )
              })}
            </ol>
            {topArtists.length > 10 && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
                ...and {topArtists.length - 10} more
              </p>
            )}
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faMusic} className="text-lg" />
              Top Tracks
            </h4>
            <ol className="space-y-2">
              {topTracks.slice(0, 10).map((track: any, idx: number) => {
                const entryKey = `${track.name}|${track.artist || ''}`.toLowerCase()
                return (
                  <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/track/${generateSlug(entryKey, 'tracks')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {track.name}
                      </Link>
                      <div className="text-xs text-gray-600 truncate">by {track.artist}</div>
                      <div className="text-sm text-[var(--theme-text)] mt-0.5">{track.playcount.toLocaleString()} plays</div>
                    </div>
                  </li>
                )
              })}
            </ol>
            {topTracks.length > 10 && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
                ...and {topTracks.length - 10} more
              </p>
            )}
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
              <FontAwesomeIcon icon={faCompactDisc} className="text-lg" />
              Top Albums
            </h4>
            <ol className="space-y-2">
              {topAlbums.slice(0, 10).map((album: any, idx: number) => {
                const entryKey = `${album.name}|${album.artist || ''}`.toLowerCase()
                return (
                  <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/groups/${groupId}/charts/album/${generateSlug(entryKey, 'albums')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {album.name}
                      </Link>
                      <div className="text-xs text-gray-600 truncate">by {album.artist}</div>
                      <div className="text-sm text-[var(--theme-text)] mt-0.5">{album.playcount.toLocaleString()} plays</div>
                    </div>
                  </li>
                )
              })}
            </ol>
            {topAlbums.length > 10 && (
              <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
                ...and {topAlbums.length - 10} more
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

