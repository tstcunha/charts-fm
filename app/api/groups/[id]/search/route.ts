import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get('q')?.trim()

    if (!searchTerm) {
      return NextResponse.json({
        artists: [],
        tracks: [],
        albums: [],
      })
    }

    // Search for entries matching the search term (case-insensitive on name field only)
    const allEntries = await prisma.groupChartEntry.findMany({
      where: {
        groupId: group.id,
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

    return NextResponse.json({
      artists,
      tracks,
      albums,
    })
  } catch (error) {
    console.error('Error searching chart entries:', error)
    return NextResponse.json(
      { error: 'Failed to search chart entries' },
      { status: 500 }
    )
  }
}

