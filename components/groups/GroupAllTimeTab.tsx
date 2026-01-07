'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faTrophy, faSpinner, faMedal } from '@fortawesome/free-solid-svg-icons'
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
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

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

    // Fetch preview data
    fetch(`/api/groups/${groupId}/records/preview`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setPreviewData(data)
        }
        setPreviewLoading(false)
      })
      .catch((err) => {
        setPreviewLoading(false)
        console.error('Error fetching records preview:', err)
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
      </div>

      {/* Records Preview Section */}
      {!previewLoading && previewData && (previewData.artist || previewData.track || previewData.album) && (
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FontAwesomeIcon icon={faMedal} className="text-[var(--theme-primary)]" />
              Records
            </h3>
            <LiquidGlassLink
              href={`/groups/${groupId}/records`}
              variant="primary"
              useTheme
            >
              View All Records
            </LiquidGlassLink>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {previewData.artist && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faMicrophone} className="text-[var(--theme-primary)]" />
                  <span className="text-sm font-semibold text-gray-600">Artist (most consecutive weeks)</span>
                </div>
                <Link
                  href={`/groups/${groupId}/charts/artist/${previewData.artist.slug}`}
                  className="font-bold text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1"
                >
                  {previewData.artist.name}
                </Link>
                <p className="text-sm text-gray-600">
                  {previewData.artist.value} {previewData.artist.value === 1 ? 'week' : 'weeks'} on chart
                </p>
              </div>
            )}
            {previewData.track && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faMusic} className="text-[var(--theme-primary)]" />
                  <span className="text-sm font-semibold text-gray-600">Track (most consecutive weeks)</span>
                </div>
                <Link
                  href={`/groups/${groupId}/charts/track/${previewData.track.slug}`}
                  className="font-bold text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1"
                >
                  {previewData.track.name}
                </Link>
                {previewData.track.artist && (
                  <p className="text-xs text-gray-600 mb-1">by {previewData.track.artist}</p>
                )}
                <p className="text-sm text-gray-600">
                  {previewData.track.value} {previewData.track.value === 1 ? 'week' : 'weeks'} on chart
                </p>
              </div>
            )}
            {previewData.album && (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faCompactDisc} className="text-[var(--theme-primary)]" />
                  <span className="text-sm font-semibold text-gray-600">Album (most consecutive weeks)</span>
                </div>
                <Link
                  href={`/groups/${groupId}/charts/album/${previewData.album.slug}`}
                  className="font-bold text-lg text-gray-900 hover:text-[var(--theme-primary)] transition-colors block mb-1"
                >
                  {previewData.album.name}
                </Link>
                {previewData.album.artist && (
                  <p className="text-xs text-gray-600 mb-1">by {previewData.album.artist}</p>
                )}
                <p className="text-sm text-gray-600">
                  {previewData.album.value} {previewData.album.value === 1 ? 'week' : 'weeks'} on chart
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-[var(--theme-primary)]" />
            Top 100 All-Time
          </h3>
          <LiquidGlassLink
            href={`/groups/${groupId}/alltime`}
            variant="primary"
            useTheme
          >
            View complete table
          </LiquidGlassLink>
        </div>
        
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

