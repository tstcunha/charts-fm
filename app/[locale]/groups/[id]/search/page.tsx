import { requireGroupMembership } from '@/lib/group-auth'
import { notFound } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import SearchResultsClient from './SearchResultsClient'
import GroupPageHero from '@/components/groups/GroupPageHero'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupMembership(params.id)
    return {
      title: `${group?.name || 'Group'} - Search`,
    }
  } catch {
    return {
      title: 'Search',
    }
  }
}

async function searchChartEntries(groupId: string, searchTerm: string) {
  if (!searchTerm.trim()) {
    return {
      artists: [],
      tracks: [],
      albums: [],
    }
  }

  // Search for entries matching the search term (case-insensitive on name field only)
  const allEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      name: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    },
    select: {
      entryKey: true,
      name: true,
      artist: true,
      chartType: true,
      slug: true,
      weekStart: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Group by entryKey and chartType to get distinct entries
  // Use a Map to track the latest entry for each unique entryKey+chartType combination
  const entryMap = new Map<string, {
    entryKey: string
    name: string
    artist: string | null
    slug: string | null
  }>()

  for (const entry of allEntries) {
    const key = `${entry.chartType}|${entry.entryKey}`
    if (!entryMap.has(key)) {
      entryMap.set(key, {
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        slug: entry.slug,
      })
    }
  }

  // Separate into artists, tracks, and albums
  const artists: Array<{ entryKey: string; name: string; slug: string | null }> = []
  const tracks: Array<{ entryKey: string; name: string; artist: string | null; slug: string | null }> = []
  const albums: Array<{ entryKey: string; name: string; artist: string | null; slug: string | null }> = []

  for (const [key, entry] of entryMap.entries()) {
    const [chartType] = key.split('|')
    if (chartType === 'artists') {
      artists.push({
        entryKey: entry.entryKey,
        name: entry.name,
        slug: entry.slug,
      })
    } else if (chartType === 'tracks') {
      tracks.push({
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        slug: entry.slug,
      })
    } else if (chartType === 'albums') {
      albums.push({
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        slug: entry.slug,
      })
    }
  }

  // Sort by name
  artists.sort((a, b) => a.name.localeCompare(b.name))
  tracks.sort((a, b) => a.name.localeCompare(b.name))
  albums.sort((a, b) => a.name.localeCompare(b.name))

  return { artists, tracks, albums }
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { q?: string }
}) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    notFound()
  }

  const searchTerm = searchParams.q || ''
  const colorTheme = (group.colorTheme || 'yellow') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get initial results if search term is provided
  const initialResults = await searchChartEntries(group.id, searchTerm)

  return (
    <main 
      className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        <GroupPageHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          breadcrumbs={[
            { label: 'Groups', href: '/groups' },
            { label: group.name, href: `/groups/${group.id}` },
            { label: 'Search' },
          ]}
          subheader="Search Chart Entries"
        />

        <SearchResultsClient
          groupId={group.id}
          initialSearchTerm={searchTerm}
          initialResults={initialResults}
        />
      </div>
    </main>
  )
}

