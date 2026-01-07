'use client'

import { useEffect, useState, memo } from 'react'
import { Link } from '@/i18n/routing'
import ChartHistoryTimeline from '@/components/charts/ChartHistoryTimeline'
import QuickStats from '@/components/charts/QuickStats'
import EntryStatsTable from '@/components/charts/EntryStatsTable'
import ArtistEntriesTable from '@/components/charts/ArtistEntriesTable'
import { ChartHistoryEntry, EntryStats, MajorDriver, ArtistChartEntry } from '@/lib/chart-deep-dive'
import { ChartType } from '@/lib/chart-slugs'

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
}: DeepDiveClientProps) {
  const [stats, setStats] = useState<EntryStats | null>(null)
  const [majorDriver, setMajorDriver] = useState<MajorDriver | null>(null)
  const [totals, setTotals] = useState<{ totalVS: number | null; totalPlays: number; weeksAtNumberOne: number } | null>(null)
  const [artistEntries, setArtistEntries] = useState<{ tracks: ArtistChartEntry[]; albums: ArtistChartEntry[] } | null>(null)
  const [numberOnes, setNumberOnes] = useState<{ numberOneTracks: number; numberOneAlbums: number } | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6">
      {/* Entry Name Title - big, bold, centered with theme styling */}
      <div className="text-center mb-4 py-2 overflow-visible">
        <h1 
          className="text-5xl sm:text-6xl lg:text-7xl font-bold"
          style={{ 
            lineHeight: '1.2', 
            paddingBottom: '0.2em', 
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
          <p className="text-xl sm:text-2xl text-gray-600 mt-2">
            {chartType === 'tracks' ? 'Track' : chartType === 'albums' ? 'Album' : ''} by{' '}
            {artistSlug ? (
              <Link
                href={`/groups/${groupId}/charts/artist/${artistSlug}`}
                className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-dark)] transition-colors"
              >
                {entryArtist}
              </Link>
            ) : (
              entryArtist
            )}
          </p>
        )}
      </div>

      {/* Chart History Timeline - loaded immediately */}
      <ChartHistoryTimeline
        history={initialHistory}
        groupId={groupId}
        chartType={chartType}
      />

      {/* Quick Stats - loaded asynchronously */}
      {loading ? (
        <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
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
        <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
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
          <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
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

