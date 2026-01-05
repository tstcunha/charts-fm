// Functions to calculate and cache all-time stats for groups

import { prisma } from './prisma'
import { TopItem } from './lastfm-weekly'
import { ChartGenerationLogger } from './chart-generation-logger'

/**
 * Normalize entry key for matching (same logic as aggregation)
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: 'artists' | 'tracks' | 'albums'): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

/**
 * Aggregate all-time stats from all weekly stats
 * Only uses top 10 items from each week (already stored in GroupWeeklyStats)
 */
export async function recalculateAllTimeStats(groupId: string, logger?: ChartGenerationLogger): Promise<void> {
  // Fetch all weekly stats for this group
  const allWeeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'asc',
    },
  })

  if (allWeeklyStats.length === 0) {
    // No weekly stats yet, create empty all-time stats
    await prisma.groupAllTimeStats.upsert({
      where: { groupId },
      create: {
        groupId,
        topArtists: [],
        topTracks: [],
        topAlbums: [],
        lastUpdated: new Date(),
      },
      update: {
        topArtists: [],
        topTracks: [],
        topAlbums: [],
        lastUpdated: new Date(),
      },
    })
    return
  }

  // Aggregate artists
  const artistMap = new Map<string, { name: string; playcount: number }>()
  for (const weekStats of allWeeklyStats) {
    const topArtists = (weekStats.topArtists as unknown as TopItem[]) || []
    // Only use top 10 (already limited in GroupWeeklyStats, but be safe)
    const top10Artists = topArtists.slice(0, 10)
    for (const artist of top10Artists) {
      const key = getEntryKey(artist, 'artists')
      const existing = artistMap.get(key)
      if (existing) {
        existing.playcount += artist.playcount
      } else {
        artistMap.set(key, {
          name: artist.name,
          playcount: artist.playcount,
        })
      }
    }
  }

  // Aggregate tracks
  const trackMap = new Map<string, { name: string; artist: string; playcount: number }>()
  for (const weekStats of allWeeklyStats) {
    const topTracks = (weekStats.topTracks as unknown as TopItem[]) || []
    const top10Tracks = topTracks.slice(0, 10)
    for (const track of top10Tracks) {
      const key = getEntryKey(track, 'tracks')
      const existing = trackMap.get(key)
      if (existing) {
        existing.playcount += track.playcount
      } else {
        trackMap.set(key, {
          name: track.name,
          artist: track.artist || '',
          playcount: track.playcount,
        })
      }
    }
  }

  // Aggregate albums
  const albumMap = new Map<string, { name: string; artist: string; playcount: number }>()
  for (const weekStats of allWeeklyStats) {
    const topAlbums = (weekStats.topAlbums as unknown as TopItem[]) || []
    const top10Albums = topAlbums.slice(0, 10)
    for (const album of top10Albums) {
      const key = getEntryKey(album, 'albums')
      const existing = albumMap.get(key)
      if (existing) {
        existing.playcount += album.playcount
      } else {
        albumMap.set(key, {
          name: album.name,
          artist: album.artist || '',
          playcount: album.playcount,
        })
      }
    }
  }

  // Sort and keep top 100 for each category
  const topArtists = Array.from(artistMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 100)

  const topTracks = Array.from(trackMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 100)

  const topAlbums = Array.from(albumMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 100)

  // Upsert all-time stats
  await prisma.groupAllTimeStats.upsert({
    where: { groupId },
    create: {
      groupId,
      topArtists,
      topTracks,
      topAlbums,
      lastUpdated: new Date(),
    },
    update: {
      topArtists,
      topTracks,
      topAlbums,
      lastUpdated: new Date(),
    },
  })
}

/**
 * Get cached all-time stats for a group
 * Returns null if stats don't exist yet
 */
export async function getGroupAllTimeStats(groupId: string) {
  return await prisma.groupAllTimeStats.findUnique({
    where: { groupId },
  })
}

