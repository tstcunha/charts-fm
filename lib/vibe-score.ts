// Vibe Score calculation functions

import { TopItem } from './lastfm-weekly'

export type ChartMode = 'vs' | 'vs_weighted' | 'plays_only'

export interface UserVSContribution {
  userId: string
  entryKey: string
  vibeScore: number
  playcount: number
}

export interface PerUserVSData {
  topTracks: UserVSContribution[]
  topArtists: UserVSContribution[]
  topAlbums: UserVSContribution[]
}

/**
 * Calculate VS for each item in a user's top N list
 * Formula: 1.00 - (1.00 × (position - 1) / chartSize)
 * Position 1 gets 1.00, position N gets 1.00 - (1.00 × (N-1) / chartSize)
 * Items beyond position chartSize get 0.00
 */
export function calculateUserVS(
  items: TopItem[],
  chartSize: number
): Array<{ item: TopItem; position: number; vibeScore: number }> {
  const result: Array<{ item: TopItem; position: number; vibeScore: number }> = []

  for (let i = 0; i < items.length; i++) {
    const position = i + 1
    let vibeScore = 0

    if (position <= chartSize) {
      // Calculate VS based on position
      vibeScore = 1.0 - (1.0 * (position - 1) / chartSize)
    }
    // Items beyond chartSize get 0.00 VS

    result.push({
      item: items[i],
      position,
      vibeScore,
    })
  }

  return result
}

/**
 * Get entry key for an item (same format as GroupChartEntry)
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: 'artists' | 'tracks' | 'albums'): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

/**
 * Aggregate VS contributions from multiple users for tracks
 * 
 * In VS weighted mode:
 * - Each user's contribution = VS × playcount
 * - Final VS = sum of (VS × playcount) across all users
 * - This weighted sum IS the VS value displayed in charts
 * 
 * In VS mode:
 * - Each user's contribution = VS (pure, 0.00-1.00)
 * - Final VS = sum of VS across all users
 * 
 * In plays-only mode:
 * - Each user's contribution = playcount
 * - Final VS = sum of playcount (stored as VS for consistency)
 */
function aggregateTopTracksVS(
  userStats: Array<{ userId: string; topTracks: TopItem[] }>,
  chartSize: number,
  mode: ChartMode
): { items: Array<TopItem & { vibeScore: number }>; perUserData: UserVSContribution[] } {
  const itemMap = new Map<string, { name: string; artist: string; totalVS: number; totalPlays: number }>()
  const perUserData: UserVSContribution[] = []

  for (const userStat of userStats) {
    const userVS = calculateUserVS(userStat.topTracks, chartSize)

    for (const { item, vibeScore } of userVS) {
      if (vibeScore === 0) continue // Skip items beyond chartSize

      const entryKey = getEntryKey(item, 'tracks')
      const key = entryKey

      // Store per-user contribution (pure VS, not weighted)
      // This is stored for future "individual contributions" feature
      perUserData.push({
        userId: userStat.userId,
        entryKey,
        vibeScore, // Pure VS (0.00-1.00), not weighted
        playcount: item.playcount,
      })

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(key)
      let contributionVS = vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = vibeScore * item.playcount
      } else if (mode === 'plays_only') {
        contributionVS = item.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += item.playcount
      } else {
        itemMap.set(key, {
          name: item.name,
          artist: item.artist || '',
          totalVS: contributionVS,
          totalPlays: item.playcount,
        })
      }
    }
  }

  const items = Array.from(itemMap.values())
    .map((item) => ({
      name: item.name,
      artist: item.artist,
      playcount: item.totalPlays,
      vibeScore: item.totalVS, // This will be stored as vibeScore in GroupChartEntry
    }))
    .sort((a, b) => {
      // Sort by vibeScore first, then by playcount as tiebreaker
      if (b.vibeScore !== a.vibeScore) {
        return b.vibeScore - a.vibeScore
      }
      return b.playcount - a.playcount
    })

  return { items, perUserData }
}

/**
 * Aggregate VS contributions from multiple users for artists
 */
function aggregateTopArtistsVS(
  userStats: Array<{ userId: string; topArtists: TopItem[] }>,
  chartSize: number,
  mode: ChartMode
): { items: Array<TopItem & { vibeScore: number }>; perUserData: UserVSContribution[] } {
  const itemMap = new Map<string, { name: string; totalVS: number; totalPlays: number }>()
  const perUserData: UserVSContribution[] = []

  for (const userStat of userStats) {
    const userVS = calculateUserVS(userStat.topArtists, chartSize)

    for (const { item, vibeScore } of userVS) {
      if (vibeScore === 0) continue // Skip items beyond chartSize

      const entryKey = getEntryKey(item, 'artists')
      const key = entryKey

      // Store per-user contribution (pure VS, not weighted)
      // This is stored for future "individual contributions" feature
      perUserData.push({
        userId: userStat.userId,
        entryKey,
        vibeScore, // Pure VS (0.00-1.00), not weighted
        playcount: item.playcount,
      })

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(key)
      let contributionVS = vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = vibeScore * item.playcount
      } else if (mode === 'plays_only') {
        contributionVS = item.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += item.playcount
      } else {
        itemMap.set(key, {
          name: item.name,
          totalVS: contributionVS,
          totalPlays: item.playcount,
        })
      }
    }
  }

  const items = Array.from(itemMap.values())
    .map((item) => ({
      name: item.name,
      playcount: item.totalPlays,
      // totalVS is the sum of contributionVS across all users
      // In VS mode: sum of pure VS
      // In VS weighted mode: sum of (VS × plays) - this IS the VS value
      // In plays-only mode: sum of plays (stored as VS for consistency)
      vibeScore: item.totalVS, // This will be stored as vibeScore in GroupChartEntry
    }))
    .sort((a, b) => {
      // Sort by vibeScore first, then by playcount as tiebreaker
      if (b.vibeScore !== a.vibeScore) {
        return b.vibeScore - a.vibeScore
      }
      return b.playcount - a.playcount
    })

  return { items, perUserData }
}

/**
 * Aggregate VS contributions from multiple users for albums
 */
function aggregateTopAlbumsVS(
  userStats: Array<{ userId: string; topAlbums: TopItem[] }>,
  chartSize: number,
  mode: ChartMode
): { items: Array<TopItem & { vibeScore: number }>; perUserData: UserVSContribution[] } {
  const itemMap = new Map<string, { name: string; artist: string; totalVS: number; totalPlays: number }>()
  const perUserData: UserVSContribution[] = []

  for (const userStat of userStats) {
    const userVS = calculateUserVS(userStat.topAlbums, chartSize)

    for (const { item, vibeScore } of userVS) {
      if (vibeScore === 0) continue // Skip items beyond chartSize

      const entryKey = getEntryKey(item, 'albums')
      const key = entryKey

      // Store per-user contribution (pure VS, not weighted)
      // This is stored for future "individual contributions" feature
      perUserData.push({
        userId: userStat.userId,
        entryKey,
        vibeScore, // Pure VS (0.00-1.00), not weighted
        playcount: item.playcount,
      })

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(key)
      let contributionVS = vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = vibeScore * item.playcount
      } else if (mode === 'plays_only') {
        contributionVS = item.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += item.playcount
      } else {
        itemMap.set(key, {
          name: item.name,
          artist: item.artist || '',
          totalVS: contributionVS,
          totalPlays: item.playcount,
        })
      }
    }
  }

  const items = Array.from(itemMap.values())
    .map((item) => ({
      name: item.name,
      artist: item.artist,
      playcount: item.totalPlays,
      // totalVS is the sum of contributionVS across all users
      // In VS mode: sum of pure VS
      // In VS weighted mode: sum of (VS × plays) - this IS the VS value
      // In plays-only mode: sum of plays (stored as VS for consistency)
      vibeScore: item.totalVS, // This will be stored as vibeScore in GroupChartEntry
    }))
    .sort((a, b) => {
      // Sort by vibeScore first, then by playcount as tiebreaker
      if (b.vibeScore !== a.vibeScore) {
        return b.vibeScore - a.vibeScore
      }
      return b.playcount - a.playcount
    })

  return { items, perUserData }
}

/**
 * Aggregate group stats using VS calculation
 * Returns both aggregated items and per-user VS data for storage
 */
export function aggregateGroupStatsVS(
  userStats: Array<{
    userId: string
    topTracks: TopItem[]
    topArtists: TopItem[]
    topAlbums: TopItem[]
  }>,
  chartSize: number,
  mode: ChartMode
): {
  topTracks: Array<TopItem & { vibeScore: number }>
  topArtists: Array<TopItem & { vibeScore: number }>
  topAlbums: Array<TopItem & { vibeScore: number }>
  perUserVS: PerUserVSData
} {
  const tracksResult = aggregateTopTracksVS(
    userStats.map((s) => ({ userId: s.userId, topTracks: s.topTracks })),
    chartSize,
    mode
  )
  const artistsResult = aggregateTopArtistsVS(
    userStats.map((s) => ({ userId: s.userId, topArtists: s.topArtists })),
    chartSize,
    mode
  )
  const albumsResult = aggregateTopAlbumsVS(
    userStats.map((s) => ({ userId: s.userId, topAlbums: s.topAlbums })),
    chartSize,
    mode
  )

  // Slice to chartSize
  return {
    topTracks: tracksResult.items.slice(0, chartSize),
    topArtists: artistsResult.items.slice(0, chartSize),
    topAlbums: albumsResult.items.slice(0, chartSize),
    perUserVS: {
      topTracks: tracksResult.perUserData,
      topArtists: artistsResult.perUserData,
      topAlbums: albumsResult.perUserData,
    },
  }
}

