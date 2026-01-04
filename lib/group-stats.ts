// Functions to aggregate group statistics from user statistics

import { TopItem } from './lastfm-weekly'

export interface AggregatedStats {
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}

/**
 * Aggregate top tracks from multiple users
 * Combines playcounts for the same track (same name + artist)
 */
export function aggregateTopTracks(
  userStats: Array<{ topTracks: TopItem[] }>
): TopItem[] {
  const trackMap = new Map<string, { name: string; artist: string; playcount: number }>()

  for (const stats of userStats) {
    for (const track of stats.topTracks) {
      const key = `${track.name}|${track.artist || ''}`.toLowerCase()
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

  return Array.from(trackMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 10)
}

/**
 * Aggregate top artists from multiple users
 * Combines playcounts for the same artist
 */
export function aggregateTopArtists(
  userStats: Array<{ topArtists: TopItem[] }>
): TopItem[] {
  const artistMap = new Map<string, { name: string; playcount: number }>()

  for (const stats of userStats) {
    for (const artist of stats.topArtists) {
      const key = artist.name.toLowerCase()
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

  return Array.from(artistMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 10)
}

/**
 * Aggregate top albums from multiple users
 * Combines playcounts for the same album (same name + artist)
 */
export function aggregateTopAlbums(
  userStats: Array<{ topAlbums: TopItem[] }>
): TopItem[] {
  const albumMap = new Map<string, { name: string; artist: string; playcount: number }>()

  for (const stats of userStats) {
    for (const album of stats.topAlbums) {
      const key = `${album.name}|${album.artist || ''}`.toLowerCase()
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

  return Array.from(albumMap.values())
    .sort((a, b) => b.playcount - a.playcount)
    .slice(0, 10)
}

/**
 * Aggregate all stats from multiple users
 */
export function aggregateGroupStats(
  userStats: Array<{
    topTracks: TopItem[]
    topArtists: TopItem[]
    topAlbums: TopItem[]
  }>
): AggregatedStats {
  return {
    topTracks: aggregateTopTracks(userStats),
    topArtists: aggregateTopArtists(userStats),
    topAlbums: aggregateTopAlbums(userStats),
  }
}

