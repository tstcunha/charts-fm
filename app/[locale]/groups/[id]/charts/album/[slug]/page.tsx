import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getEntryChartHistory } from '@/lib/chart-deep-dive'
import { notFound } from '@/i18n/routing'
import DeepDiveClient from '../../[type]/[slug]/DeepDiveClient'
import DeepDiveHero from '@/components/charts/DeepDiveHero'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { id: string; slug: string } }): Promise<Metadata> {
  try {
    const { group } = await requireGroupMembership(params.id)
    const entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group?.id,
        chartType: 'albums',
        slug: params.slug,
      },
      orderBy: { weekStart: 'desc' },
    })
    if (entry) {
      const title = entry.artist ? `${entry.name} by ${entry.artist}` : entry.name
      return {
        title: `${group?.name || 'Group'} - ${title}`,
      }
    }
  } catch {}
  return {
    title: 'Album',
  }
}

export default async function AlbumDeepDivePage({
  params,
}: {
  params: { id: string; slug: string }
}) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    notFound()
  }

  // Find entry by slug, or fallback to entryKey if slug matches (for backward compatibility)
  let entry = await prisma.groupChartEntry.findFirst({
    where: {
      groupId: group.id,
      chartType: 'albums',
      slug: params.slug,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Fallback: if not found by slug, try to find by matching entryKey pattern
  // For albums, slug format is "name-artist", entryKey is "name|artist"
  if (!entry) {
    const { generateSlug } = await import('@/lib/chart-slugs')
    // Try to find entries where the slug would match the entryKey
    const allEntries = await prisma.groupChartEntry.findMany({
      where: {
        groupId: group.id,
        chartType: 'albums',
      },
      orderBy: {
        weekStart: 'desc',
      },
    })

    // Find entry where slug would match entryKey
    for (const e of allEntries) {
      const expectedSlug = generateSlug(e.entryKey, 'albums')
      if (expectedSlug === params.slug) {
        entry = e
        break
      }
    }
  }

  if (!entry) {
    notFound()
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get chart history (initial load)
  const history = await getEntryChartHistory(group.id, 'albums', entry.entryKey)

  // Find artist entry to get slug for link
  let artistSlug: string | null = null
  if (entry.artist) {
    const artistEntry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group.id,
        chartType: 'artists',
        entryKey: entry.artist.toLowerCase().trim(),
      },
      orderBy: {
        weekStart: 'desc',
      },
      select: {
        slug: true,
        entryKey: true,
      },
    })
    if (artistEntry) {
      artistSlug = artistEntry.slug || artistEntry.entryKey
    }
  }

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <DeepDiveHero
          group={{
            id: group.id,
            name: group.name,
            image: group.image,
          }}
          entry={{
            name: entry.name,
            artist: entry.artist,
          }}
          chartType="albums"
          artistSlug={artistSlug}
        />

        <DeepDiveClient
          groupId={group.id}
          chartType="albums"
          entryKey={entry.entryKey}
          slug={entry.slug || params.slug}
          entryName={entry.name}
          entryArtist={entry.artist}
          artistSlug={artistSlug}
          initialHistory={history}
          chartMode={group.chartMode || 'vs'}
          isArtist={false}
        />
      </div>
    </main>
  )
}

