// Vibe Score calculation functions

import { TopItem } from './lastfm-weekly'
import type { PrismaClient } from '@prisma/client'

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
 * Calculate VS for each item in a user's top 100 list
 * Special weighting until VS reaches 1.00:
 * - Position 1: 2.00 VS
 * - Positions 2-21: Reduce by 0.05 per position (position 21 = 1.00 VS)
 * - Positions 22-100: Linear reduction from 1.00 to 0.00 (position 101 = 0.00 VS)
 * Items beyond position 100 get 0.00 VS
 * VS is now standardized to always use top 100, making it reusable across all groups
 */
export function calculateUserVS(
  items: TopItem[]
): Array<{ item: TopItem; position: number; vibeScore: number }> {
  const CHART_SIZE = 100 // Always use top 100 for VS calculation
  const VS_1_THRESHOLD = 21 // Position where VS becomes 1.00
  const TOP_POSITION_VS = 2.0 // Position 1 gets 2.00 VS
  const TOP_REDUCTION = 0.05 // Reduction per position until VS reaches 1.00
  const result: Array<{ item: TopItem; position: number; vibeScore: number }> = []

  for (let i = 0; i < items.length; i++) {
    const position = i + 1
    let vibeScore = 0

    if (position <= CHART_SIZE) {
      if (position === 1) {
        // Top position gets special weight
        vibeScore = TOP_POSITION_VS
      } else if (position <= VS_1_THRESHOLD) {
        // Positions 2-21: Reduce by 0.05 per position until VS reaches 1.00
        vibeScore = TOP_POSITION_VS - (TOP_REDUCTION * (position - 1))
      } else {
        // Positions 22-100: Linear reduction from 1.00 to 0.00 at position 101
        const position21VS = 1.0 // VS at position 21 (the threshold)
        const positionsFrom21 = position - VS_1_THRESHOLD // 1 to 79 for positions 22-100
        const totalPositionsToZero = CHART_SIZE - VS_1_THRESHOLD + 1 // 80 positions (21 to 100)
        // Linear interpolation: start at 1.00, end at 0.00 at position 101
        vibeScore = position21VS * (1 - (positionsFrom21 / totalPositionsToZero))
      }
    }
    // Items beyond position 100 get 0.00 VS

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
 * Uses pre-calculated VS data from UserChartEntryVS
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
  userVSData: Array<{ userId: string; vsData: UserVSContribution[]; originalStats: { topTracks: TopItem[] } }>,
  mode: ChartMode
): Array<TopItem & { vibeScore: number }> {
  const itemMap = new Map<string, { name: string; artist: string; totalVS: number; totalPlays: number }>()

  for (const userData of userVSData) {
    // Create a map of entryKey -> original item for name lookup
    const originalItemsMap = new Map<string, TopItem>()
    for (const item of userData.originalStats.topTracks) {
      const key = getEntryKey(item, 'tracks')
      originalItemsMap.set(key, item)
    }

    for (const entry of userData.vsData) {
      // Look up original item to get proper capitalization
      const originalItem = originalItemsMap.get(entry.entryKey)
      const name = originalItem?.name || entry.entryKey.split('|')[0]
      const artist = originalItem?.artist || (entry.entryKey.split('|')[1] || '')

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(entry.entryKey)
      let contributionVS = entry.vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = entry.vibeScore * entry.playcount
      } else if (mode === 'plays_only') {
        contributionVS = entry.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += entry.playcount
      } else {
        itemMap.set(entry.entryKey, {
          name,
          artist,
          totalVS: contributionVS,
          totalPlays: entry.playcount,
        })
      }
    }
  }

  return Array.from(itemMap.values())
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
}

/**
 * Aggregate VS contributions from multiple users for artists
 * Uses pre-calculated VS data from UserChartEntryVS
 */
function aggregateTopArtistsVS(
  userVSData: Array<{ userId: string; vsData: UserVSContribution[]; originalStats: { topArtists: TopItem[] } }>,
  mode: ChartMode
): Array<TopItem & { vibeScore: number }> {
  const itemMap = new Map<string, { name: string; totalVS: number; totalPlays: number }>()

  for (const userData of userVSData) {
    // Create a map of entryKey -> original item for name lookup
    const originalItemsMap = new Map<string, TopItem>()
    for (const item of userData.originalStats.topArtists) {
      const key = getEntryKey(item, 'artists')
      originalItemsMap.set(key, item)
    }

    for (const entry of userData.vsData) {
      // Look up original item to get proper capitalization
      const originalItem = originalItemsMap.get(entry.entryKey)
      const name = originalItem?.name || entry.entryKey

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(entry.entryKey)
      let contributionVS = entry.vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = entry.vibeScore * entry.playcount
      } else if (mode === 'plays_only') {
        contributionVS = entry.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += entry.playcount
      } else {
        itemMap.set(entry.entryKey, {
          name,
          totalVS: contributionVS,
          totalPlays: entry.playcount,
        })
      }
    }
  }

  return Array.from(itemMap.values())
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
}

/**
 * Aggregate VS contributions from multiple users for albums
 * Uses pre-calculated VS data from UserChartEntryVS
 */
function aggregateTopAlbumsVS(
  userVSData: Array<{ userId: string; vsData: UserVSContribution[]; originalStats: { topAlbums: TopItem[] } }>,
  mode: ChartMode
): Array<TopItem & { vibeScore: number }> {
  const itemMap = new Map<string, { name: string; artist: string; totalVS: number; totalPlays: number }>()

  for (const userData of userVSData) {
    // Create a map of entryKey -> original item for name lookup
    const originalItemsMap = new Map<string, TopItem>()
    for (const item of userData.originalStats.topAlbums) {
      const key = getEntryKey(item, 'albums')
      originalItemsMap.set(key, item)
    }

    for (const entry of userData.vsData) {
      // Look up original item to get proper capitalization
      const originalItem = originalItemsMap.get(entry.entryKey)
      const name = originalItem?.name || entry.entryKey.split('|')[0]
      const artist = originalItem?.artist || (entry.entryKey.split('|')[1] || '')

      // Aggregate based on mode
      // In VS weighted mode: contributionVS = VS × plays (this IS the VS for weighted mode)
      // In VS mode: contributionVS = VS (pure VS)
      // In plays-only mode: contributionVS = plays (stored as VS for consistency)
      const existing = itemMap.get(entry.entryKey)
      let contributionVS = entry.vibeScore

      if (mode === 'vs_weighted') {
        // In weighted mode, VS × plays IS the VS value
        contributionVS = entry.vibeScore * entry.playcount
      } else if (mode === 'plays_only') {
        contributionVS = entry.playcount
      }

      if (existing) {
        existing.totalVS += contributionVS
        existing.totalPlays += entry.playcount
      } else {
        itemMap.set(entry.entryKey, {
          name,
          artist,
          totalVS: contributionVS,
          totalPlays: entry.playcount,
        })
      }
    }
  }

  return Array.from(itemMap.values())
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
}

/**
 * Get pre-calculated VS data for a user and week
 */
export async function getUserVSForWeek(
  userId: string,
  weekStart: Date,
  prisma: PrismaClient
): Promise<{
  topTracks: UserVSContribution[]
  topArtists: UserVSContribution[]
  topAlbums: UserVSContribution[]
}> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const vsEntries = await prisma.userChartEntryVS.findMany({
    where: {
      userId,
      weekStart: normalizedWeekStart,
    },
  })

  const topTracks: UserVSContribution[] = []
  const topArtists: UserVSContribution[] = []
  const topAlbums: UserVSContribution[] = []

  for (const entry of vsEntries) {
    // Skip entries with null userId
    if (!entry.userId) continue
    
    const contribution: UserVSContribution = {
      userId: entry.userId,
      entryKey: entry.entryKey,
      vibeScore: entry.vibeScore,
      playcount: entry.playcount,
    }

    if (entry.chartType === 'tracks') {
      topTracks.push(contribution)
    } else if (entry.chartType === 'artists') {
      topArtists.push(contribution)
    } else if (entry.chartType === 'albums') {
      topAlbums.push(contribution)
    }
  }

  return { topTracks, topArtists, topAlbums }
}

/**
 * Aggregate group stats using VS calculation
 * Uses pre-calculated VS data from UserChartEntryVS
 */
export function aggregateGroupStatsVS(
  userVSData: Array<{
    userId: string
    topTracks: UserVSContribution[]
    topArtists: UserVSContribution[]
    topAlbums: UserVSContribution[]
    originalStats: {
      topTracks: TopItem[]
      topArtists: TopItem[]
      topAlbums: TopItem[]
    }
  }>,
  chartSize: number,
  mode: ChartMode
): {
  topTracks: Array<TopItem & { vibeScore: number }>
  topArtists: Array<TopItem & { vibeScore: number }>
  topAlbums: Array<TopItem & { vibeScore: number }>
} {
  const tracksResult = aggregateTopTracksVS(
    userVSData.map((s) => ({ userId: s.userId, vsData: s.topTracks, originalStats: s.originalStats })),
    mode
  )
  const artistsResult = aggregateTopArtistsVS(
    userVSData.map((s) => ({ userId: s.userId, vsData: s.topArtists, originalStats: s.originalStats })),
    mode
  )
  const albumsResult = aggregateTopAlbumsVS(
    userVSData.map((s) => ({ userId: s.userId, vsData: s.topAlbums, originalStats: s.originalStats })),
    mode
  )

  // Slice to chartSize
  return {
    topTracks: tracksResult.slice(0, chartSize),
    topArtists: artistsResult.slice(0, chartSize),
    topAlbums: albumsResult.slice(0, chartSize),
  }
}

