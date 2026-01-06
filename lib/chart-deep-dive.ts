// Data fetching functions for chart deep dive pages

import { prisma } from './prisma'
import { generateSlug, ChartType } from './chart-slugs'
import { formatWeekDate } from './weekly-utils'

export interface ChartHistoryEntry {
  weekStart: Date
  position: number
  playcount: number
  vibeScore: number | null
}

export interface EntryStats {
  peakPosition: number
  weeksAtPeak: number
  debutPosition: number
  debutDate: Date | null
  weeksInTop10: number
  totalWeeksCharting: number
  longestStreak: number
  longestStreakStartDate: Date | null
  longestStreakEndDate: Date | null
  isStreakOngoing: boolean
  latestAppearance: Date | null
  currentlyCharting: boolean
}

export interface MajorDriver {
  userId: string
  name: string
  contribution: number
}

export interface ArtistChartEntry {
  entryKey: string
  slug: string
  name: string
  artist: string | null
  chartType: 'tracks' | 'albums'
  peakPosition: number
  weeksAtPeak: number
  totalWeeksCharting: number
}

/**
 * Get all weeks where an entry appeared with positions
 */
export async function getEntryChartHistory(
  groupId: string,
  chartType: ChartType,
  entryKey: string
): Promise<ChartHistoryEntry[]> {
  const entries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      chartType,
      entryKey,
    },
    orderBy: {
      weekStart: 'asc',
    },
    select: {
      weekStart: true,
      position: true,
      playcount: true,
      vibeScore: true,
    },
  })

  return entries.map((entry) => ({
    weekStart: entry.weekStart,
    position: entry.position,
    playcount: entry.playcount,
    vibeScore: entry.vibeScore,
  }))
}

/**
 * Calculate entry statistics from chart history
 */
function calculateEntryStats(history: ChartHistoryEntry[]): EntryStats {
  if (history.length === 0) {
    return {
      peakPosition: 0,
      weeksAtPeak: 0,
      debutPosition: 0,
      debutDate: null,
      weeksInTop10: 0,
      totalWeeksCharting: history.length,
      longestStreak: 0,
      longestStreakStartDate: null,
      longestStreakEndDate: null,
      isStreakOngoing: false,
      latestAppearance: null,
      currentlyCharting: false,
    }
  }

  const peakPosition = Math.min(...history.map((h) => h.position))
  const weeksAtPeak = history.filter((h) => h.position === peakPosition).length
  const debutPosition = history[0].position
  const debutDate = history[0].weekStart
  const weeksInTop10 = history.filter((h) => h.position <= 10).length
  const latestAppearance = history[history.length - 1].weekStart

  // Calculate longest streak
  let longestStreak = 1
  let currentStreak = 1
  let isStreakOngoing = true
  let longestStreakStartDate: Date | null = history[0].weekStart
  let longestStreakEndDate: Date | null = history[0].weekStart
  let currentStreakStart = history[0].weekStart

  for (let i = 1; i < history.length; i++) {
    const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff <= 7) {
      // Consecutive week (within 7 days)
      currentStreak++
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak
        longestStreakStartDate = currentStreakStart
        longestStreakEndDate = history[i].weekStart
      }
    } else {
      // Break in streak
      currentStreak = 1
      currentStreakStart = history[i].weekStart
      isStreakOngoing = false
    }
  }

  // Check if streak is ongoing by comparing with latest week
  const now = new Date()
  const daysSinceLast = (now.getTime() - latestAppearance.getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceLast > 7) {
    isStreakOngoing = false
  }

  return {
    peakPosition,
    weeksAtPeak,
    debutPosition,
    debutDate,
    weeksInTop10,
    totalWeeksCharting: history.length,
    longestStreak,
    longestStreakStartDate,
    longestStreakEndDate,
    isStreakOngoing,
    latestAppearance,
    currentlyCharting: false, // Will be set by caller
  }
}

/**
 * Get entry statistics with lazy cache population
 */
export async function getEntryStats(
  groupId: string,
  chartType: ChartType,
  entryKey: string
): Promise<EntryStats> {
  // Check cache first
  let stats = await prisma.chartEntryStats.findUnique({
    where: {
      groupId_chartType_entryKey: {
        groupId,
        chartType,
        entryKey,
      },
    },
  })

  // If no cache exists or stats are stale, calculate
  if (!stats || stats.statsStale) {
    const history = await getEntryChartHistory(groupId, chartType, entryKey)
    const calculatedStats = calculateEntryStats(history)

    // Check if currently charting
    const latestWeek = await prisma.groupWeeklyStats.findFirst({
      where: { groupId },
      orderBy: { weekStart: 'desc' },
      select: { weekStart: true },
    })

    const currentlyCharting =
      latestWeek && calculatedStats.latestAppearance
        ? formatWeekDate(calculatedStats.latestAppearance) === formatWeekDate(latestWeek.weekStart)
        : false

    calculatedStats.currentlyCharting = currentlyCharting

    // Update or create cache
    const slug = generateSlug(entryKey, chartType)
    if (stats) {
      await prisma.chartEntryStats.update({
        where: { id: stats.id },
        data: {
          peakPosition: calculatedStats.peakPosition,
          weeksAtPeak: calculatedStats.weeksAtPeak,
          debutPosition: calculatedStats.debutPosition,
          weeksInTop10: calculatedStats.weeksInTop10,
          totalWeeksCharting: calculatedStats.totalWeeksCharting,
          longestStreak: calculatedStats.longestStreak,
          isStreakOngoing: calculatedStats.isStreakOngoing,
          latestAppearance: calculatedStats.latestAppearance,
          statsStale: false,
          statsLastUpdated: new Date(),
        },
      })
    } else {
      // Get totals for new cache entry
      const totals = await prisma.groupChartEntry.aggregate({
        where: {
          groupId,
          chartType,
          entryKey,
        },
        _sum: {
          vibeScore: true,
          playcount: true,
        },
      })

      await prisma.chartEntryStats.create({
        data: {
          groupId,
          chartType,
          entryKey,
          slug,
          peakPosition: calculatedStats.peakPosition,
          weeksAtPeak: calculatedStats.weeksAtPeak,
          debutPosition: calculatedStats.debutPosition,
          weeksInTop10: calculatedStats.weeksInTop10,
          totalWeeksCharting: calculatedStats.totalWeeksCharting,
          longestStreak: calculatedStats.longestStreak,
          isStreakOngoing: calculatedStats.isStreakOngoing,
          latestAppearance: calculatedStats.latestAppearance,
          totalVS: totals._sum.vibeScore,
          totalPlays: totals._sum.playcount || 0,
          statsStale: false,
          statsLastUpdated: new Date(),
        },
      })
    }

    return calculatedStats
  }

  // Check if currently charting
  const latestWeek = await prisma.groupWeeklyStats.findFirst({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
    select: { weekStart: true },
  })

  const currentlyCharting =
    latestWeek && stats.latestAppearance
      ? formatWeekDate(stats.latestAppearance) === formatWeekDate(latestWeek.weekStart)
      : false

  // Get history to calculate debut date and streak dates
  const history = await getEntryChartHistory(groupId, chartType, entryKey)
  const firstEntry = history.length > 0 ? history[0] : null
  
  // Calculate streak dates from history
  let longestStreakStartDate: Date | null = null
  let longestStreakEndDate: Date | null = null
  
  if (history.length > 0 && stats.longestStreak > 0) {
    let currentStreak = 1
    let currentStreakStart = history[0].weekStart
    let foundLongestStreak = stats.longestStreak === 1 // If streak is 1, we already have it
    
    for (let i = 1; i < history.length; i++) {
      const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff <= 7) {
        currentStreak++
        if (currentStreak === stats.longestStreak && !foundLongestStreak) {
          longestStreakStartDate = currentStreakStart
          longestStreakEndDate = history[i].weekStart
          foundLongestStreak = true
        }
      } else {
        currentStreak = 1
        currentStreakStart = history[i].weekStart
      }
    }
    
    // If longest streak is 1 week, use the first entry
    if (stats.longestStreak === 1 && !foundLongestStreak) {
      longestStreakStartDate = history[0].weekStart
      longestStreakEndDate = history[0].weekStart
    }
  }

  return {
    peakPosition: stats.peakPosition,
    weeksAtPeak: stats.weeksAtPeak,
    debutPosition: stats.debutPosition,
    debutDate: firstEntry?.weekStart || null,
    weeksInTop10: stats.weeksInTop10,
    totalWeeksCharting: stats.totalWeeksCharting,
    longestStreak: stats.longestStreak,
    longestStreakStartDate,
    longestStreakEndDate,
    isStreakOngoing: stats.isStreakOngoing,
    latestAppearance: stats.latestAppearance,
    currentlyCharting,
  }
}

/**
 * Recalculate major driver efficiently using raw SQL
 */
async function recalculateMajorDriverEfficient(
  groupId: string,
  chartType: ChartType,
  entryKey: string,
  chartMode: string
): Promise<MajorDriver | null> {
  const result = await prisma.$queryRaw<Array<{
    userId: string
    name: string
    totalVS: number
    totalPlays: number
  }>>`
    SELECT 
      u.id as "userId",
      COALESCE(u.name, u."lastfmUsername") as name,
      COALESCE(SUM(ucvs."vibeScore"), 0)::float as "totalVS",
      COALESCE(SUM(ucvs.playcount), 0)::integer as "totalPlays"
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "users" u ON ucvs."userId" = u.id
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."chartType" = ${chartType}
      AND ucvs."entryKey" = ${entryKey}
    GROUP BY u.id, u.name, u."lastfmUsername"
    ORDER BY 
      CASE WHEN ${chartMode} IN ('vs', 'vs_weighted') 
        THEN COALESCE(SUM(ucvs."vibeScore"), 0)
        ELSE COALESCE(SUM(ucvs.playcount), 0)
      END DESC
    LIMIT 1
  `

  if (result.length === 0) return null

  const top = result[0]
  return {
    userId: top.userId,
    name: top.name || 'Unknown',
    contribution: chartMode === 'vs' || chartMode === 'vs_weighted' ? top.totalVS : top.totalPlays,
  }
}

/**
 * Get major driver with lazy cache population
 */
export async function getEntryMajorDriver(
  groupId: string,
  chartType: ChartType,
  entryKey: string,
  chartMode: string
): Promise<MajorDriver | null> {
  // Check cache first
  const stats = await prisma.chartEntryStats.findUnique({
    where: {
      groupId_chartType_entryKey: {
        groupId,
        chartType,
        entryKey,
      },
    },
  })

  // If cache exists and major driver is not stale, return cached value
  if (stats && stats.majorDriverLastUpdated && stats.majorDriverUserId) {
    return {
      userId: stats.majorDriverUserId,
      name: stats.majorDriverName || 'Unknown',
      contribution: chartMode === 'vs' || chartMode === 'vs_weighted' ? (stats.majorDriverVS || 0) : (stats.majorDriverPlays || 0),
    }
  }

  // Calculate major driver
  const majorDriver = await recalculateMajorDriverEfficient(groupId, chartType, entryKey, chartMode)

  // Update cache
  if (stats) {
    await prisma.chartEntryStats.update({
      where: { id: stats.id },
      data: {
        majorDriverUserId: majorDriver?.userId || null,
        majorDriverName: majorDriver?.name || null,
        majorDriverVS: chartMode !== 'plays_only' ? majorDriver?.contribution || null : null,
        majorDriverPlays: majorDriver?.contribution || null,
        majorDriverLastUpdated: new Date(),
      },
    })
  } else {
    // Create cache entry if it doesn't exist
    const slug = generateSlug(entryKey, chartType)
    const totals = await prisma.groupChartEntry.aggregate({
      where: {
        groupId,
        chartType,
        entryKey,
      },
      _sum: {
        vibeScore: true,
        playcount: true,
      },
    })

    await prisma.chartEntryStats.create({
      data: {
        groupId,
        chartType,
        entryKey,
        slug,
        peakPosition: 0, // Will be calculated when stats are requested
        weeksAtPeak: 0,
        debutPosition: 0,
        weeksInTop10: 0,
        totalWeeksCharting: 0,
        longestStreak: 0,
        isStreakOngoing: false,
        majorDriverUserId: majorDriver?.userId || null,
        majorDriverName: majorDriver?.name || null,
        majorDriverVS: chartMode !== 'plays_only' ? majorDriver?.contribution || null : null,
        majorDriverPlays: majorDriver?.contribution || null,
        majorDriverLastUpdated: new Date(),
        totalVS: totals._sum.vibeScore,
        totalPlays: totals._sum.playcount || 0,
        statsStale: true, // Stats need to be calculated
      },
    })
  }

  return majorDriver
}

/**
 * Get all tracks/albums by an artist that charted
 */
export async function getArtistChartEntries(
  groupId: string,
  artistName: string
): Promise<{ tracks: ArtistChartEntry[]; albums: ArtistChartEntry[] }> {
  // Get all chart entries for tracks and albums by this artist
  const entries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      artist: artistName,
      chartType: {
        in: ['tracks', 'albums'],
      },
    },
    orderBy: [
      { chartType: 'asc' },
      { weekStart: 'asc' },
    ],
  })

  // Group by entryKey and calculate stats
  const entryMap = new Map<string, {
    entryKey: string
    name: string
    artist: string | null
    chartType: 'tracks' | 'albums'
    positions: number[]
    weeks: number
  }>()

  for (const entry of entries) {
    const existing = entryMap.get(entry.entryKey)
    if (existing) {
      existing.positions.push(entry.position)
      existing.weeks++
    } else {
      entryMap.set(entry.entryKey, {
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        chartType: entry.chartType as 'tracks' | 'albums',
        positions: [entry.position],
        weeks: 1,
      })
    }
  }

  // Calculate stats for each entry
  const tracks: ArtistChartEntry[] = []
  const albums: ArtistChartEntry[] = []

  for (const [entryKey, data] of entryMap.entries()) {
    const peakPosition = Math.min(...data.positions)
    const weeksAtPeak = data.positions.filter((p) => p === peakPosition).length
    const slug = generateSlug(entryKey, data.chartType)

    const entry: ArtistChartEntry = {
      entryKey,
      slug,
      name: data.name,
      artist: data.artist,
      chartType: data.chartType,
      peakPosition,
      weeksAtPeak,
      totalWeeksCharting: data.weeks,
    }

    if (data.chartType === 'tracks') {
      tracks.push(entry)
    } else {
      albums.push(entry)
    }
  }

  // Sort: peak position → weeks at peak → alphabetical
  const sortEntries = (a: ArtistChartEntry, b: ArtistChartEntry) => {
    if (a.peakPosition !== b.peakPosition) {
      return a.peakPosition - b.peakPosition
    }
    if (a.weeksAtPeak !== b.weeksAtPeak) {
      return b.weeksAtPeak - a.weeksAtPeak
    }
    return a.name.localeCompare(b.name)
  }

  tracks.sort(sortEntries)
  albums.sort(sortEntries)

  return { tracks, albums }
}

/**
 * Get totals (VS and plays) for an entry
 */
export async function getEntryTotals(
  groupId: string,
  chartType: ChartType,
  entryKey: string
): Promise<{ totalVS: number | null; totalPlays: number; weeksAtNumberOne: number }> {
  // Get chart history to calculate weeks at #1
  const history = await getEntryChartHistory(groupId, chartType, entryKey)
  const weeksAtNumberOne = history.filter((h) => h.position === 1).length

  const stats = await prisma.chartEntryStats.findUnique({
    where: {
      groupId_chartType_entryKey: {
        groupId,
        chartType,
        entryKey,
      },
    },
    select: {
      totalVS: true,
      totalPlays: true,
    },
  })

  if (stats) {
    return {
      totalVS: stats.totalVS,
      totalPlays: stats.totalPlays,
      weeksAtNumberOne,
    }
  }

  // Calculate if not cached
  const totals = await prisma.groupChartEntry.aggregate({
    where: {
      groupId,
      chartType,
      entryKey,
    },
    _sum: {
      vibeScore: true,
      playcount: true,
    },
  })

  return {
    totalVS: totals._sum.vibeScore,
    totalPlays: totals._sum.playcount || 0,
    weeksAtNumberOne,
  }
}

/**
 * Get number of #1 tracks and #1 albums for an artist
 */
export async function getArtistNumberOnes(
  groupId: string,
  artistName: string
): Promise<{ numberOneTracks: number; numberOneAlbums: number }> {
  // Get all chart entries for tracks and albums by this artist
  const entries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      artist: artistName,
      chartType: {
        in: ['tracks', 'albums'],
      },
    },
  })

  // Group by entryKey and find peak positions
  const entryMap = new Map<string, {
    chartType: 'tracks' | 'albums'
    peakPosition: number
  }>()

  for (const entry of entries) {
    const existing = entryMap.get(entry.entryKey)
    if (existing) {
      // Update peak position if this entry has a better (lower) position
      if (entry.position < existing.peakPosition) {
        existing.peakPosition = entry.position
      }
    } else {
      entryMap.set(entry.entryKey, {
        chartType: entry.chartType as 'tracks' | 'albums',
        peakPosition: entry.position,
      })
    }
  }

  // Count #1 entries
  let numberOneTracks = 0
  let numberOneAlbums = 0

  for (const [, data] of entryMap.entries()) {
    if (data.peakPosition === 1) {
      if (data.chartType === 'tracks') {
        numberOneTracks++
      } else {
        numberOneAlbums++
      }
    }
  }

  return { numberOneTracks, numberOneAlbums }
}

/**
 * Invalidate entry stats cache (mark as stale)
 */
export async function invalidateEntryStatsCache(
  groupId: string,
  weekStart: Date,
  chartType: ChartType,
  newEntries: Array<{ entryKey: string; vibeScore: number | null; playcount: number }>
): Promise<void> {
  for (const entry of newEntries) {
    const stats = await prisma.chartEntryStats.findUnique({
      where: {
        groupId_chartType_entryKey: {
          groupId,
          chartType,
          entryKey: entry.entryKey,
        },
      },
    })

    if (stats) {
      // Mark as stale and incrementally update totals
      await prisma.chartEntryStats.update({
        where: { id: stats.id },
        data: {
          majorDriverLastUpdated: null, // Mark major driver as stale
          statsStale: true, // Mark stats as needing recalculation
          totalVS: stats.totalVS ? stats.totalVS + (entry.vibeScore || 0) : entry.vibeScore,
          totalPlays: stats.totalPlays + entry.playcount,
          latestAppearance: weekStart,
          lastUpdated: new Date(),
        },
      })
    } else {
      // Create cache entry but mark everything as stale
      const slug = generateSlug(entry.entryKey, chartType)
      await prisma.chartEntryStats.create({
        data: {
          groupId,
          chartType,
          entryKey: entry.entryKey,
          slug,
          peakPosition: 0, // Will be calculated on first access
          weeksAtPeak: 0,
          debutPosition: 0,
          weeksInTop10: 0,
          totalWeeksCharting: 0,
          longestStreak: 0,
          isStreakOngoing: false,
          majorDriverLastUpdated: null, // Will be calculated on first access
          totalVS: entry.vibeScore || null,
          totalPlays: entry.playcount,
          latestAppearance: weekStart,
          statsStale: true, // Stats will be calculated on first access
        },
      })
    }
  }
}

