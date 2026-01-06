import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getEntryChartHistory } from '@/lib/chart-deep-dive'
import { notFound } from 'next/navigation'
import DeepDiveClient from '../../[type]/[slug]/DeepDiveClient'
import DeepDiveHero from '@/components/charts/DeepDiveHero'

export default async function ArtistDeepDivePage({
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
      chartType: 'artists',
      slug: params.slug,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Fallback: if not found by slug, try to find by entryKey (for entries without slugs yet)
  if (!entry) {
    entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group.id,
        chartType: 'artists',
        entryKey: params.slug, // For artists, slug should match entryKey
      },
      orderBy: {
        weekStart: 'desc',
      },
    })
  }

  if (!entry) {
    notFound()
  }

  // Get color theme
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get chart history (initial load)
  const history = await getEntryChartHistory(group.id, 'artists', entry.entryKey)

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
            artist: null,
          }}
          chartType="artists"
        />

        <DeepDiveClient
          groupId={group.id}
          chartType="artists"
          entryKey={entry.entryKey}
          slug={entry.slug || params.slug}
          entryName={entry.name}
          entryArtist={null}
          artistSlug={null}
          initialHistory={history}
          chartMode={group.chartMode || 'vs'}
          isArtist={true}
        />
      </div>
    </main>
  )
}

