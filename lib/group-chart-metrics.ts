// Functions to calculate and cache historical chart metrics

import { prisma } from './prisma'
import { TopItem } from './lastfm-weekly'
import { ChartGenerationLogger } from './chart-generation-logger'

export type ChartType = 'artists' | 'tracks' | 'albums'

export interface EnrichedChartItem {
  name: string
  artist?: string
  playcount: number
  vibeScore: number | null
  position: number
  positionChange: number | null
  playsChange: number | null
  vibeScoreChange: number | null
  totalWeeksAppeared: number
  highestPosition: number
}

/**
 * Normalize entry key for matching (same logic as aggregation)
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: ChartType): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

/**
 * Find item in chart by entry key
 */
function findItemInChart(
  chart: Array<TopItem | (TopItem & { vibeScore?: number })>,
  entryKey: string,
  chartType: ChartType
): { item: TopItem | (TopItem & { vibeScore?: number }); position: number } | null {
  for (let i = 0; i < chart.length; i++) {
    const item = chart[i]
    const key = getEntryKey(item, chartType)
    if (key === entryKey) {
      return { item, position: i + 1 }
    }
  }
  return null
}

/**
 * Calculate metrics for a single chart entry
 */
function calculateEntryMetrics(
  currentItem: TopItem | (TopItem & { vibeScore?: number }),
  currentPosition: number,
  previousWeekChart: Array<TopItem | (TopItem & { vibeScore?: number })> | null,
  allWeeksCharts: Array<Array<TopItem | (TopItem & { vibeScore?: number })>>,
  chartType: ChartType
): {
  positionChange: number | null
  playsChange: number | null
  vibeScoreChange: number | null
  totalWeeksAppeared: number
  highestPosition: number
} {
  const entryKey = getEntryKey(currentItem, chartType)

  // Calculate position change, plays change, and VS change from previous week
  let positionChange: number | null = null
  let playsChange: number | null = null
  let vibeScoreChange: number | null = null

  if (previousWeekChart) {
    const previousEntry = findItemInChart(previousWeekChart, entryKey, chartType)
    if (previousEntry) {
      positionChange = currentPosition - previousEntry.position
      playsChange = currentItem.playcount - previousEntry.item.playcount
      
      // Calculate VS change if both items have vibeScore
      const currentVS = 'vibeScore' in currentItem && currentItem.vibeScore !== undefined ? currentItem.vibeScore : null
      const previousVS = 'vibeScore' in previousEntry.item && previousEntry.item.vibeScore !== undefined ? previousEntry.item.vibeScore : null
      if (currentVS !== null && previousVS !== null) {
        vibeScoreChange = currentVS - previousVS
      }
    }
  }

  // Calculate total weeks appeared and highest position
  let totalWeeksAppeared = 0
  let highestPosition = currentPosition

  for (const weekChart of allWeeksCharts) {
    const entry = findItemInChart(weekChart, entryKey, chartType)
    if (entry) {
      totalWeeksAppeared++
      if (entry.position < highestPosition) {
        highestPosition = entry.position
      }
    }
  }

  return {
    positionChange,
    playsChange,
    vibeScoreChange,
    totalWeeksAppeared,
    highestPosition,
  }
}

/**
 * Calculate and cache metrics for a chart type
 * @param groupId - The group ID
 * @param weekStart - The week start date
 * @param chartType - The chart type ('artists', 'tracks', or 'albums')
 * @param chartData - The chart data to cache
 * @param trackingDayOfWeek - The tracking day of week (for calculating previous week)
 * @param logger - Optional logger for performance tracking
 * @param previousWeeksStats - Optional pre-fetched previous weeks stats (to avoid redundant queries)
 */
export async function cacheChartMetrics(
  groupId: string,
  weekStart: Date,
  chartType: ChartType,
  chartData: Array<TopItem | (TopItem & { vibeScore?: number })>,
  trackingDayOfWeek: number,
  logger?: ChartGenerationLogger,
  previousWeeksStats?: Array<{
    weekStart: Date
    topArtists: any
    topTracks: any
    topAlbums: any
  }>
): Promise<void> {
  // Normalize weekStart to start of day in UTC for comparison
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  // Calculate what the previous week should be based on the group's tracking day
  // The previous week should be exactly 7 days before the current week
  const previousWeekStart = new Date(normalizedWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

  // Get all weekly stats for this group, excluding the current week (for finding previous week)
  // Use provided previousWeeksStats if available, otherwise fetch
  let statsToUse = previousWeeksStats
  if (!statsToUse) {
    statsToUse = await prisma.groupWeeklyStats.findMany({
      where: {
        groupId,
        weekStart: {
          lt: normalizedWeekStart,
        },
      },
      orderBy: {
        weekStart: 'asc',
      },
    })
  }

  // Get previous week's stats - look for the week that matches the calculated previous week start
  // or find the most recent week before the current week
  const previousWeekStats = statsToUse.find((stats) => {
    const statsWeekStart = new Date(stats.weekStart)
    statsWeekStart.setUTCHours(0, 0, 0, 0)
    // Try to find exact match first (previous week based on tracking day)
    return statsWeekStart.getTime() === previousWeekStart.getTime()
  }) || (statsToUse.length > 0
    ? statsToUse.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())[0]
    : undefined)

  // Get all charts of this type from all weeks (including current week for metrics calculation)
  const allWeeksCharts = [
    ...statsToUse.map((stats) => {
      if (chartType === 'artists') {
        return (stats.topArtists as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
      } else if (chartType === 'tracks') {
        return (stats.topTracks as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
      } else {
        return (stats.topAlbums as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
      }
    }),
    chartData, // Include current week's chart data
  ]

  const previousWeekChart = previousWeekStats
    ? chartType === 'artists'
      ? (previousWeekStats.topArtists as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
      : chartType === 'tracks'
      ? (previousWeekStats.topTracks as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
      : (previousWeekStats.topAlbums as unknown as Array<TopItem | (TopItem & { vibeScore?: number })>) || []
    : null

  // Calculate metrics for all entries first
  const entriesToCreate = []
  
  for (let i = 0; i < chartData.length; i++) {
    const item = chartData[i]
    const position = i + 1
    const entryKey = getEntryKey(item, chartType)
    const vibeScore = 'vibeScore' in item && item.vibeScore !== undefined ? item.vibeScore : null

    const metrics = calculateEntryMetrics(
      item,
      position,
      previousWeekChart,
      allWeeksCharts,
      chartType
    )

    entriesToCreate.push({
      groupId,
      weekStart: normalizedWeekStart,
      chartType,
      entryKey,
      name: item.name,
      artist: 'artist' in item ? item.artist : null,
      position,
      playcount: item.playcount,
      vibeScore: vibeScore ?? undefined,
      positionChange: metrics.positionChange,
      playsChange: metrics.playsChange,
      totalWeeksAppeared: metrics.totalWeeksAppeared,
      highestPosition: metrics.highestPosition,
    })
  }

  // Delete existing entries for this week/chartType, then batch insert
  await prisma.groupChartEntry.deleteMany({
    where: {
      groupId,
      weekStart: normalizedWeekStart,
      chartType,
    },
  })

  // Batch insert all entries
  if (entriesToCreate.length > 0) {
    await prisma.groupChartEntry.createMany({
      data: entriesToCreate,
      skipDuplicates: true,
    })
  }
}

/**
 * Get cached chart entries for a specific week and chart type
 */
export async function getCachedChartEntries(
  groupId: string,
  weekStart: Date,
  chartType: ChartType
): Promise<EnrichedChartItem[]> {
  // Normalize weekStart to start of day in UTC for comparison
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const entries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart: normalizedWeekStart,
      chartType,
    },
    orderBy: {
      position: 'asc',
    },
  })

  // Get previous week's entries to calculate vibeScoreChange
  const previousWeekStart = new Date(normalizedWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

  const previousEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart: previousWeekStart,
      chartType,
    },
  })

  const previousEntriesMap = new Map(
    previousEntries.map((e) => [e.entryKey, e])
  )

  return entries.map((entry) => {
    const previousEntry = previousEntriesMap.get(entry.entryKey)
    const vibeScoreChange =
      entry.vibeScore !== null && entry.vibeScore !== undefined && previousEntry && previousEntry.vibeScore !== null && previousEntry.vibeScore !== undefined
        ? entry.vibeScore - previousEntry.vibeScore
        : null

    return {
      name: entry.name,
      artist: entry.artist || undefined,
      playcount: entry.playcount,
      vibeScore: entry.vibeScore ?? null,
      position: entry.position,
      positionChange: entry.positionChange,
      playsChange: entry.playsChange,
      vibeScoreChange,
      totalWeeksAppeared: entry.totalWeeksAppeared,
      highestPosition: entry.highestPosition,
    }
  })
}

