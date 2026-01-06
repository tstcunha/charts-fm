import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getEntryChartHistory } from '@/lib/chart-deep-dive'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import DeepDiveClient from '../../[type]/[slug]/DeepDiveClient'

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
        {/* Hero Section */}
        <div className="mb-6">
          <div className="bg-[var(--theme-background-from)] rounded-xl shadow-lg p-4 border border-theme">
            <nav className="mb-3 flex items-center gap-2 text-sm">
              <Link
                href="/groups"
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                Groups
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href={`/groups/${group.id}`}
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                {group.name}
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                href={`/groups/${group.id}/charts`}
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                Charts
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{entry.name}</span>
            </nav>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md ring-2 ring-[var(--theme-ring)]/30 bg-[var(--theme-primary-lighter)]">
                  <SafeImage
                    src={group.image}
                    alt={group.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-[var(--theme-primary-dark)] mb-1">
                  {group.name}
                </h1>
                <p className="text-sm text-gray-600">Artist Chart History</p>
              </div>
            </div>
          </div>
        </div>

        <DeepDiveClient
          groupId={group.id}
          chartType="artists"
          entryKey={entry.entryKey}
          slug={entry.slug || params.slug}
          entryName={entry.name}
          entryArtist={null}
          initialHistory={history}
          chartMode={group.chartMode || 'vs'}
          isArtist={true}
        />
      </div>
    </main>
  )
}

