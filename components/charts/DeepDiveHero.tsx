import GroupPageHero from '@/components/groups/GroupPageHero'
import { ChartType } from '@/lib/chart-slugs'

interface DeepDiveHeroProps {
  group: {
    id: string
    name: string
    image: string | null
  }
  entry: {
    name: string
    artist: string | null
  }
  chartType: ChartType
  artistSlug?: string | null
}

export default function DeepDiveHero({ group, entry, chartType, artistSlug }: DeepDiveHeroProps) {
  // Determine subheader text based on chart type
  const getSubheaderText = () => {
    switch (chartType) {
      case 'artists':
        return 'Artist Chart History'
      case 'tracks':
        return 'Track Chart History'
      case 'albums':
        return 'Album Chart History'
      default:
        return 'Chart History'
    }
  }

  // Generate Last.fm URL based on chart type
  const getLastFmUrl = () => {
    switch (chartType) {
      case 'artists':
        return `https://www.last.fm/music/${encodeURIComponent(entry.name)}`
      case 'tracks':
        return `https://www.last.fm/music/${encodeURIComponent(entry.artist || '')}/_/${encodeURIComponent(entry.name)}`
      case 'albums':
        return `https://www.last.fm/music/${encodeURIComponent(entry.artist || '')}/${encodeURIComponent(entry.name)}`
      default:
        return '#'
    }
  }

  // Build breadcrumbs
  const breadcrumbs = [
    { label: 'Groups', href: '/groups' },
    { label: group.name, href: `/groups/${group.id}` },
    { label: 'Charts', href: `/groups/${group.id}/charts` },
  ]

  // Add artist to breadcrumb for tracks/albums if available
  if (chartType !== 'artists' && entry.artist && artistSlug) {
    breadcrumbs.push({
      label: entry.artist,
      href: `/groups/${group.id}/charts/artist/${artistSlug}`,
    })
  }

  // Add entry name as final breadcrumb
  breadcrumbs.push({ label: entry.name })

  return (
    <GroupPageHero
      group={group}
      breadcrumbs={breadcrumbs}
      subheader={getSubheaderText()}
      actionButton={
        <a
          href={getLastFmUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          View in Last.fm →
        </a>
      }
    />
  )
}

