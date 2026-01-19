import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { normalizeArtistName, getArtistImages } from '@/lib/artist-images'
import { getSession } from '@/lib/auth'
import ArtistImageCarousel from '@/components/artists/ArtistImageCarousel'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

/**
 * Convert slug back to artist name
 */
async function getArtistNameFromSlug(slug: string): Promise<{ name: string; normalizedName: string } | null> {
  // Try to find an artist entry with this slug
  const entry = await prisma.groupChartEntry.findFirst({
    where: {
      chartType: 'artists',
      slug: slug,
    },
    select: {
      entryKey: true,
      name: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  if (entry) {
    return {
      name: entry.name,
      normalizedName: entry.entryKey,
    }
  }

  // Fallback: convert slug back to artist name
  const artistName = slug.replace(/-/g, ' ').trim()
  return {
    name: artistName,
    normalizedName: normalizeArtistName(artistName),
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chartsfm.com'
  const defaultOgImage = `${siteUrl}/social-preview.png`
  const t = await getTranslations('artistImages.metadata')
  const tSite = await getTranslations('site')

  const artistInfo = await getArtistNameFromSlug(slug)
  if (!artistInfo) {
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

  return {
    title: `${artistInfo.name} - ${t('title')}`,
    openGraph: {
      images: [{ url: defaultOgImage, width: 1200, height: 630, alt: tSite('name') }],
    },
    twitter: {
      images: [defaultOgImage],
    },
  }
}

export default async function ArtistImagesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getSession()
  const userId = session?.user?.id

  const artistInfo = await getArtistNameFromSlug(slug)
  if (!artistInfo) {
    notFound()
  }

  const images = await getArtistImages(artistInfo.normalizedName, userId)
  const t = await getTranslations('artistImages')

  return (
    <main className="flex min-h-screen flex-col pt-4 sm:pt-8 pb-24 px-3 sm:px-4 md:px-6 lg:px-12 xl:px-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl w-full mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{artistInfo.name}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('title')}</p>
        </div>
        <ArtistImageCarousel
          artistName={artistInfo.name}
          artistSlug={slug}
          initialImages={images}
          userId={userId}
        />
      </div>
    </main>
  )
}
