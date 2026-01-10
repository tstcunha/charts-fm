// Data fetching functions for chart deep dive pages

import { prisma } from './prisma'
import { generateSlug, ChartType } from './chart-slugs'
import { formatWeekDate, getWeekStart } from './weekly-utils'

export interface ChartHistoryEntry {
  weekStart: Date
  position: number
  playcount: number
  vibeScore: number | null
}

export interface EntryStats {
  peakPosition: number
  weeksAtPeak: number
  weeksAtOne: number
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
      weeksAtOne: 0,
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
  const weeksAtOne = history.filter((h) => h.position === 1).length
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
    weeksAtOne,
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

    // Update or create cache using upsert to handle race conditions
    const slug = generateSlug(entryKey, chartType)
    
    // Get totals (needed for create, and may need refresh for update)
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

    // Use upsert to atomically handle create/update and avoid race conditions
    await prisma.chartEntryStats.upsert({
      where: {
        groupId_chartType_entryKey: {
          groupId,
          chartType,
          entryKey,
        },
      },
      update: {
        peakPosition: calculatedStats.peakPosition,
        weeksAtPeak: calculatedStats.weeksAtPeak,
        weeksAtOne: calculatedStats.weeksAtOne,
        debutPosition: calculatedStats.debutPosition,
        weeksInTop10: calculatedStats.weeksInTop10,
        totalWeeksCharting: calculatedStats.totalWeeksCharting,
        longestStreak: calculatedStats.longestStreak,
        isStreakOngoing: calculatedStats.isStreakOngoing,
        latestAppearance: calculatedStats.latestAppearance,
        statsStale: false,
        statsLastUpdated: new Date(),
      },
      create: {
        groupId,
        chartType,
        entryKey,
        slug,
        peakPosition: calculatedStats.peakPosition,
        weeksAtPeak: calculatedStats.weeksAtPeak,
        weeksAtOne: calculatedStats.weeksAtOne,
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
    weeksAtOne: stats.weeksAtOne || 0,
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


  // Group by entryKey AND chartType to separate tracks from albums
  // Use Set to track distinct weeks to ensure accuracy
  // Key format: "entryKey|chartType" to ensure tracks and albums are separate
  const entryMap = new Map<string, {
    entryKey: string
    name: string
    artist: string | null
    chartType: 'tracks' | 'albums'
    positions: number[]
    weekStarts: Set<string> // Track distinct weeks as ISO date strings
    entryCount: number // Count entries for validation
  }>()

  for (const entry of entries) {
    // Use entryKey + chartType as the map key to separate tracks from albums
    // This prevents mixing tracks and albums that share the same entryKey
    const mapKey = `${entry.entryKey}|${entry.chartType}`
    const existing = entryMap.get(mapKey)
    // Normalize weekStart to ensure consistent grouping (Sunday 00:00:00 UTC)
    const normalizedWeekStart = getWeekStart(entry.weekStart)
    const weekKey = formatWeekDate(normalizedWeekStart) // Use normalized date as key
    
    if (existing) {
      // Validate that we're not grouping different albums/tracks
      if (existing.name !== entry.name || existing.artist !== entry.artist) {
        console.warn(
          `[getArtistChartEntries] Warning: entryKey "${entry.entryKey}" (${entry.chartType}) has inconsistent data. ` +
          `Existing: name="${existing.name}", artist="${existing.artist}". ` +
          `New: name="${entry.name}", artist="${entry.artist}". ` +
          `This may indicate a data integrity issue.`
        )
      }
      
      existing.positions.push(entry.position)
      existing.weekStarts.add(weekKey)
      existing.entryCount++
    } else {
      entryMap.set(mapKey, {
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        chartType: entry.chartType as 'tracks' | 'albums',
        positions: [entry.position],
        weekStarts: new Set([weekKey]),
        entryCount: 1,
      })
    }
  }

  // Calculate stats for each entry
  const tracks: ArtistChartEntry[] = []
  const albums: ArtistChartEntry[] = []

  for (const [mapKey, data] of entryMap.entries()) {
    // mapKey is "entryKey|chartType", but we just need entryKey for the result
    const entryKey = data.entryKey
    const peakPosition = Math.min(...data.positions)
    const weeksAtPeak = data.positions.filter((p) => p === peakPosition).length
    // Count distinct weeks instead of just entries (should be the same, but more accurate)
    const totalWeeksCharting = data.weekStarts.size
    const slug = generateSlug(entryKey, data.chartType)

    // Validate: if entry count != distinct weeks, there might be duplicates
    if (data.entryCount !== totalWeeksCharting) {
      console.warn(
        `[getArtistChartEntries] Warning: entryKey "${entryKey}" (${data.chartType}) has ${data.entryCount} entries ` +
        `but only ${totalWeeksCharting} distinct weeks. This may indicate duplicate entries in the database.`
      )
    }

    const entry: ArtistChartEntry = {
      entryKey,
      slug,
      name: data.name,
      artist: data.artist,
      chartType: data.chartType,
      peakPosition,
      weeksAtPeak,
      totalWeeksCharting,
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
 * @deprecated Use invalidateEntryStatsCacheBatch for better performance
 */
export async function invalidateEntryStatsCache(
  groupId: string,
  weekStart: Date,
  chartType: ChartType,
  newEntries: Array<{ entryKey: string; vibeScore: number | null; playcount: number }>
): Promise<void> {
  // Convert to batch format and call batch function
  const batchEntries = newEntries.map(entry => ({
    ...entry,
    weekStart,
    chartType,
  }))
  await invalidateEntryStatsCacheBatch(groupId, batchEntries)
}

/**
 * Batch invalidate entry stats cache (mark as stale)
 * Uses batch operations instead of N+1 queries for much better performance
 */
/**
 * Calculate and update stats for multiple entries in bulk
 * This ensures all stats are up-to-date before querying
 */
export async function calculateEntryStatsBatch(
  groupId: string,
  chartType: ChartType,
  entryKeys: string[]
): Promise<void> {
  if (entryKeys.length === 0) {
    return
  }

  // Get all existing stats for these entries
  const existingStats = await prisma.chartEntryStats.findMany({
    where: {
      groupId,
      chartType,
      entryKey: { in: entryKeys },
    },
  })

  const statsMap = new Map(existingStats.map(s => [s.entryKey, s]))
  const entriesToCalculate = entryKeys.filter(key => {
    const stats = statsMap.get(key)
    return !stats || stats.statsStale
  })

  if (entriesToCalculate.length === 0) {
    return // All stats are already up-to-date
  }

  // Calculate stats for all entries that need it
  // Process in parallel but limit concurrency to avoid overwhelming the database
  const BATCH_SIZE = 10
  for (let i = 0; i < entriesToCalculate.length; i += BATCH_SIZE) {
    const batch = entriesToCalculate.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(entryKey => getEntryStats(groupId, chartType, entryKey))
    )
  }
}

export async function invalidateEntryStatsCacheBatch(
  groupId: string,
  entries: Array<{
    entryKey: string
    vibeScore: number | null
    playcount: number
    weekStart: Date
    chartType: ChartType
  }>
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const batchStart = Date.now()

  // Group entries by chartType for efficient batching
  const entriesByChartType = new Map<ChartType, Array<typeof entries[0]>>()
  for (const entry of entries) {
    if (!entriesByChartType.has(entry.chartType)) {
      entriesByChartType.set(entry.chartType, [])
    }
    entriesByChartType.get(entry.chartType)!.push(entry)
  }

  // Process each chart type
  for (const [chartType, typeEntries] of entriesByChartType) {
    const entryKeys = typeEntries.map(e => e.entryKey)
    
    // Fetch all existing entries in one query
    const existingStats = await prisma.chartEntryStats.findMany({
      where: {
        groupId,
        chartType,
        entryKey: {
          in: entryKeys,
        },
      },
    })

    // Create a map for quick lookup
    const statsMap = new Map(existingStats.map(s => [s.entryKey, s]))

    // Find latest weekStart for each entry (to update latestAppearance correctly)
    const latestWeekByEntry = new Map<string, Date>()
    for (const entry of typeEntries) {
      const current = latestWeekByEntry.get(entry.entryKey)
      if (!current || entry.weekStart > current) {
        latestWeekByEntry.set(entry.entryKey, entry.weekStart)
      }
    }

    // Get unique entryKeys to process
    const uniqueEntryKeys = Array.from(new Set(typeEntries.map(e => e.entryKey)))

    // Batch calculate totals and totalWeeksCharting for all entryKeys in a single query
    // This is much faster than querying each entryKey individually
    const totalsByEntryKey = new Map<string, { 
      totalVS: number | null
      totalPlays: number
      totalWeeksCharting: number
    }>()
    
    if (uniqueEntryKeys.length > 0) {
      // Use raw SQL to get aggregated totals and week counts for all entryKeys at once
      const totalsResults = await prisma.$queryRaw<Array<{
        entryKey: string
        totalVS: number | null
        totalPlays: number
        totalWeeksCharting: bigint
      }>>`
        SELECT 
          "entryKey",
          SUM("vibeScore")::float as "totalVS",
          SUM("playcount")::integer as "totalPlays",
          COUNT(DISTINCT "weekStart")::bigint as "totalWeeksCharting"
        FROM "group_chart_entries"
        WHERE "groupId" = ${groupId}::text
          AND "chartType" = ${chartType}
          AND "entryKey" = ANY(${uniqueEntryKeys}::text[])
        GROUP BY "entryKey"
      `

      for (const result of totalsResults) {
        totalsByEntryKey.set(result.entryKey, {
          totalVS: result.totalVS,
          totalPlays: result.totalPlays || 0,
          totalWeeksCharting: Number(result.totalWeeksCharting),
        })
      }
    }

    // Prepare updates and creates
    const updates: Array<{ 
      id: string
      totalVS: number | null
      totalPlays: number
      totalWeeksCharting: number
      latestWeek: Date
    }> = []
    const creates: Array<{
      groupId: string
      chartType: ChartType
      entryKey: string
      slug: string
      totalVS: number | null
      totalPlays: number
      totalWeeksCharting: number
      latestAppearance: Date
    }> = []

    // Process each unique entryKey once
    const processedEntryKeys = new Set<string>()
    for (const entry of typeEntries) {
      if (processedEntryKeys.has(entry.entryKey)) {
        continue // Already processed this entryKey
      }
      processedEntryKeys.add(entry.entryKey)

      const stats = statsMap.get(entry.entryKey)
      const latestWeek = latestWeekByEntry.get(entry.entryKey)!
      // Get totals from the batched query result (or default to 0 if not found)
      const totals = totalsByEntryKey.get(entry.entryKey) || { 
        totalVS: null, 
        totalPlays: 0,
        totalWeeksCharting: 0
      }

      if (stats) {
        // Update existing entry with recalculated totals and totalWeeksCharting
        // This is critical when regenerating charts for weeks that already exist
        updates.push({
          id: stats.id,
          totalVS: totals.totalVS,
          totalPlays: totals.totalPlays,
          totalWeeksCharting: totals.totalWeeksCharting,
          latestWeek,
        })
      } else {
        // Create new entry
        const slug = generateSlug(entry.entryKey, chartType)
        creates.push({
          groupId,
          chartType,
          entryKey: entry.entryKey,
          slug,
          totalVS: totals.totalVS,
          totalPlays: totals.totalPlays,
          totalWeeksCharting: totals.totalWeeksCharting,
          latestAppearance: latestWeek,
        })
      }
    }

    // Batch update existing entries
    // Use Promise.all for parallel execution (no transaction needed for cache invalidation)
    // Partial failures are acceptable - cache will just be stale for those entries
    if (updates.length > 0) {
      const updateStart = Date.now()
      // Process in chunks to avoid overwhelming the database connection pool
      const CHUNK_SIZE = 50
      let updateCount = 0
      for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
        const chunk = updates.slice(i, i + CHUNK_SIZE)
        const results = await Promise.all(
          chunk.map(update =>
            prisma.chartEntryStats.update({
              where: { id: update.id },
              data: {
                majorDriverLastUpdated: null, // Mark major driver as stale
                statsStale: true, // Mark stats as needing recalculation (for other fields)
                totalVS: update.totalVS,
                totalPlays: update.totalPlays,
                totalWeeksCharting: update.totalWeeksCharting, // Update totalWeeksCharting from actual count
                latestAppearance: update.latestWeek,
                lastUpdated: new Date(),
              },
            }).catch((error) => {
              // Log but don't fail - cache invalidation is best-effort
              console.error(`Failed to invalidate cache for entry ${update.id}:`, error)
              return null // Continue with other updates
            })
          )
        )
        updateCount += results.filter(r => r !== null).length
      }
    }

    // Batch create new entries
    if (creates.length > 0) {
      const createStart = Date.now()
      await prisma.chartEntryStats.createMany({
        data: creates.map(create => ({
          ...create,
          peakPosition: 0, // Will be calculated on first access
          weeksAtPeak: 0,
          weeksAtOne: 0,
          debutPosition: 0,
          weeksInTop10: 0,
          totalWeeksCharting: create.totalWeeksCharting, // Use calculated value from actual chart entries
          longestStreak: 0,
          isStreakOngoing: false,
          majorDriverLastUpdated: null, // Will be calculated on first access
          statsStale: true, // Other stats will be calculated on first access
        })),
        skipDuplicates: true,
      })
    }
  }
  
}

