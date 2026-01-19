import { getGroupAccess } from '@/lib/group-auth'
import { getGroupAllTimeStats } from '@/lib/group-queries'
import { Link } from '@/i18n/routing'
import ChartTypeSelector from '../charts/ChartTypeSelector'
import AllTimeChartTable from './AllTimeChartTable'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { TopItem } from '@/lib/lastfm-weekly'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import GroupPageHero from '@/components/groups/GroupPageHero'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('groups.allTimeStats')
  const tGroups = await getTranslations('groups')
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await getGroupAccess(id)
    return {
      title: `${group?.name || tGroups('title')} - ${t('title')}`,
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  } catch {
    return {
      title: t('title'),
      openGraph: {
        images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
      },
      twitter: {
        images: [defaultOgImage],
      },
    }
  }
}

type ChartType = 'artists' | 'tracks' | 'albums'

export default async function AllTimePage({
  params,
  searchParams,
}: {
  params: { id: string; locale: string }
  searchParams: { type?: string }
}) {
  const { user, group } = await getGroupAccess(params.id)
  const t = await getTranslations('groups.allTimeStats')
  const tGroups = await getTranslations('groups')

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{tGroups('notFound')}</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            {tGroups('backToGroups')}
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
      items = (allTimeStats.topArtists as unknown as TopItem[]) || []
    } else if (selectedType === 'tracks') {
      items = (allTimeStats.topTracks as unknown as TopItem[]) || []
    } else {
      items = (allTimeStats.topAlbums as unknown as TopItem[]) || []
    }

    chartEntries = items.map((item, index) => ({
      entryKey: `${selectedType}|${item.name}${'artist' in item && item.artist ? `|${item.artist}` : ''}`,
      slug: `${selectedType}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${'artist' in item && item.artist ? `-${item.artist.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : ''}`,
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

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: dynamicGroupImage,
          }}
          breadcrumbs={[
            { label: tGroups('hero.breadcrumb'), href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: t('breadcrumb') },
          ]}
          subheader={t('subheaderTop100')}
          narrow={true}
        />

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
              <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-8 text-center border border-theme">
                <p className="text-gray-600">{t('noStatsAvailable')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

