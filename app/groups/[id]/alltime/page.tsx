import { requireGroupMembership } from '@/lib/group-auth'
import { getGroupAllTimeStats } from '@/lib/group-queries'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import ChartTypeSelector from '../charts/ChartTypeSelector'
import AllTimeChartTable from './AllTimeChartTable'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { TopItem } from '@/lib/lastfm-weekly'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'

type ChartType = 'artists' | 'tracks' | 'albums'

export default async function AllTimePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { type?: string }
}) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  // Parse selected chart type (default to artists)
  const selectedType = (searchParams.type || 'artists') as ChartType

  // Get all-time stats, recalculate if missing
  let allTimeStats = await getGroupAllTimeStats(group.id)
  if (!allTimeStats) {
    // Recalculate on first access if missing
    await recalculateAllTimeStats(group.id)
    allTimeStats = await getGroupAllTimeStats(group.id)
  }

  // Convert all-time stats to EnrichedChartItem format for ChartTable
  let chartEntries: EnrichedChartItem[] = []
  if (allTimeStats) {
    let items: TopItem[] = []
    if (selectedType === 'artists') {
      items = (allTimeStats.topArtists as TopItem[]) || []
    } else if (selectedType === 'tracks') {
      items = (allTimeStats.topTracks as TopItem[]) || []
    } else {
      items = (allTimeStats.topAlbums as TopItem[]) || []
    }

    chartEntries = items.map((item, index) => ({
      name: item.name,
      artist: 'artist' in item ? item.artist : undefined,
      playcount: item.playcount,
      vibeScore: null, // All-time stats don't use VS, always use plays
      position: index + 1,
      positionChange: null, // All-time stats don't have position changes
      playsChange: null, // All-time stats don't have plays changes
      vibeScoreChange: null, // All-time stats don't have VS changes
      totalWeeksAppeared: 0, // Not applicable for all-time stats
      highestPosition: index + 1, // Current position is highest for all-time
    }))
  }

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-7xl w-full mx-auto">
        <div className="mb-8">
          <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Group
          </Link>
          <div className="flex items-start gap-4 mb-6">
            <div className="relative w-16 h-16 flex-shrink-0">
              <SafeImage
                src={group.image}
                alt={group.name}
                className="rounded-lg object-cover w-16 h-16"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
              <p className="text-gray-600">All-Time Stats</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Right: Chart Table and Type Selector */}
          <div className="col-span-12">
            {/* Chart Type Selector above table */}
            <div className="mb-4">
              <ChartTypeSelector currentType={selectedType} />
            </div>
            {/* Chart Table */}
            {chartEntries.length > 0 ? (
              <AllTimeChartTable items={chartEntries} chartType={selectedType} />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600">No all-time stats available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

