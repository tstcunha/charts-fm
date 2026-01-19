import { NextResponse } from 'next/server'
import { getSelectedArtistImage } from '@/lib/artist-images'
import { prisma } from '@/lib/prisma'
import { normalizeArtistName } from '@/lib/artist-images'

/**
 * Convert slug back to normalized artist name
 */
async function getArtistNameFromSlug(slug: string): Promise<string> {
  // Try to find an artist entry with this slug
  const entry = await prisma.groupChartEntry.findFirst({
    where: {
      chartType: 'artists',
      slug: slug,
    },
    select: {
      entryKey: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  if (entry) {
    return entry.entryKey
  }

  // Fallback: convert slug back to normalized name
  const artistName = slug.replace(/-/g, ' ').trim()
  return normalizeArtistName(artistName)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const artistName = await getArtistNameFromSlug(slug)
    const imageUrl = await getSelectedArtistImage(artistName)
    
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error fetching selected artist image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch selected artist image' },
      { status: 500 }
    )
  }
}
