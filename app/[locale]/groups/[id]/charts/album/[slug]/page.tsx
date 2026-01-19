import { getGroupAccess } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getEntryChartHistory } from '@/lib/chart-deep-dive'
import { notFound } from 'next/navigation'
import DeepDiveClient from '../../[type]/[slug]/DeepDiveClient'
import DeepDiveHero from '@/components/charts/DeepDiveHero'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getGroupImageUrl } from '@/lib/group-image-utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string; slug: string; locale: string }> }): Promise<Metadata> {
  const { id, slug, locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com';
  const defaultOgImage = `${siteUrl}/social-preview.png`;
  const t = await getTranslations('deepDive.metadata')
  const tSite = await getTranslations('site');
  
  try {
    const { group } = await getGroupAccess(id)
    const entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group?.id,
        chartType: 'albums',
        slug: slug,
      },
      orderBy: { weekStart: 'desc' },
    })
    if (entry) {
      const title = entry.artist ? `${entry.name} by ${entry.artist}` : entry.name
      return {
        title: `${group?.name || 'Group'} - ${title}`,
        openGraph: {
          images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
        },
        twitter: {
          images: [defaultOgImage],
        },
      }
    }
  } catch {}
  return {
    title: t('album'),
    openGraph: {
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
    },
    twitter: {
      images: [defaultOgImage],
    },
  }
}

export default async function AlbumDeepDivePage({
  params,
}: {
  params: { id: string; slug: string }
}) {
  const { user, group } = await getGroupAccess(params.id)

  if (!group) {
    notFound()
  }

  // Find entry by slug, or fallback to entryKey if slug matches (for backward compatibility)
  let entry = await prisma.groupChartEntry.findFirst({
    where: {
      groupId: group!.id,
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
        groupId: group!.id,
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
  const colorTheme = (group!.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get chart history (initial load)
  const history = await getEntryChartHistory(group!.id, 'albums', entry!.entryKey)

  // Find artist entry to get slug for link
  let artistSlug: string | null = null
  if (entry!.artist) {
    const artistEntry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group!.id,
        chartType: 'artists',
        entryKey: entry!.artist.toLowerCase().trim(),
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

  // Get dynamic group image (includes user-chosen artist images if dynamic covers are enabled)
  const dynamicGroupImage = await getGroupImageUrl({
    id: group!.id,
    image: group!.image,
    dynamicIconEnabled: group!.dynamicIconEnabled,
    dynamicIconSource: group!.dynamicIconSource,
  })

  return (
    <main className={`flex min-h-screen flex-col pt-8 pb-24 px-4 md:px-6 lg:px-12 xl:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}>
      <div className="max-w-7xl w-full mx-auto">
        <DeepDiveHero
          group={{
            id: group!.id,
            name: group!.name,
            image: dynamicGroupImage,
          }}
          entry={{
            name: entry!.name,
            artist: entry!.artist,
          }}
          chartType="albums"
          artistSlug={artistSlug}
        />

        <DeepDiveClient
          groupId={group!.id}
          chartType="albums"
          entryKey={entry!.entryKey}
          slug={entry!.slug || params.slug}
          entryName={entry!.name}
          entryArtist={entry!.artist}
          artistSlug={artistSlug}
          initialHistory={history}
          chartMode={group!.chartMode || 'vs'}
          isArtist={false}
          albumArtistForImage={entry!.artist}
          albumNameForImage={entry!.name}
        />
      </div>
    </main>
  )
}

