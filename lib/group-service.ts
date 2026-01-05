// Service functions for group operations and weekly stats

import { prisma } from './prisma'
import { getWeeklyStats } from './lastfm-weekly'
import { getWeekStart, getLastNFinishedWeeks, getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from './weekly-utils'
import { aggregateGroupStats, aggregateGroupStatsWithVS } from './group-stats'
import { TopItem } from './lastfm-weekly'
import { cacheChartMetrics } from './group-chart-metrics'
import { recalculateAllTimeStats } from './group-alltime-stats'
import { ChartMode } from './vibe-score'
import { ChartGenerationLogger } from './chart-generation-logger'

const API_KEY = process.env.LASTFM_API_KEY!
const API_SECRET = process.env.LASTFM_API_SECRET!

/**
 * Fetch and store weekly stats for a user
 * Returns existing stats if they already exist, otherwise fetches from Last.fm
 */
export async function fetchOrGetUserWeeklyStats(
  userId: string,
  lastfmUsername: string,
  sessionKey: string | null,
  weekStart: Date,
  logger?: ChartGenerationLogger
): Promise<{
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}> {
  // Check if stats already exist
  const existing = await prisma.userWeeklyStats.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  })

  if (existing) {
    return {
      topTracks: (existing.topTracks as unknown as TopItem[]) || [],
      topArtists: (existing.topArtists as unknown as TopItem[]) || [],
      topAlbums: (existing.topAlbums as unknown as TopItem[]) || [],
    }
  }

  // Fetch from Last.fm
  const stats = await getWeeklyStats(
    lastfmUsername,
    weekStart,
    API_KEY,
    API_SECRET,
    sessionKey || undefined
  )

  // Store in database
  await prisma.userWeeklyStats.create({
    data: {
      userId,
      weekStart,
      weekEnd: getWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)),
      topTracks: stats.topTracks as any,
      topArtists: stats.topArtists as any,
      topAlbums: stats.topAlbums as any,
    },
  })

  return stats
}

/**
 * Check if two week ranges overlap
 */
export function weeksOverlap(
  weekStart1: Date,
  weekEnd1: Date,
  weekStart2: Date,
  weekEnd2: Date
): boolean {
  // Two weeks overlap if one starts before the other ends
  return weekStart1 < weekEnd2 && weekStart2 < weekEnd1
}

/**
 * Get the week start of the most recent chart for a group
 */
export async function getLastChartWeek(groupId: string): Promise<Date | null> {
  const lastChart = await prisma.groupWeeklyStats.findFirst({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
    select: { weekStart: true },
  })
  return lastChart ? lastChart.weekStart : null
}

/**
 * Delete charts that overlap with a given week range
 * Optimized to use direct database queries instead of fetching all charts
 */
export async function deleteOverlappingCharts(
  groupId: string,
  newWeekStart: Date,
  newWeekEnd: Date
): Promise<void> {
  // Find overlapping charts using a single query
  // Two weeks overlap if: newWeekStart < chartWeekEnd AND chartWeekStart < newWeekEnd
  const overlappingCharts = await prisma.groupWeeklyStats.findMany({
    where: {
      groupId,
      AND: [
        {
          weekStart: {
            lt: newWeekEnd,
          },
        },
        {
          weekEnd: {
            gt: newWeekStart,
          },
        },
      ],
    },
    select: {
      id: true,
      weekStart: true,
    },
  })

  // Delete overlapping charts and associated data in batches
  if (overlappingCharts.length > 0) {
    const weekStarts = overlappingCharts.map((chart) => chart.weekStart)
    const chartIds = overlappingCharts.map((chart) => chart.id)

    // Delete in parallel
    await Promise.all([
      // Delete group weekly stats
      prisma.groupWeeklyStats.deleteMany({
        where: {
          id: {
            in: chartIds,
          },
        },
      }),
      // Delete associated chart entries
      prisma.groupChartEntry.deleteMany({
        where: {
          groupId,
          weekStart: {
            in: weekStarts,
          },
        },
      }),
      // Delete associated per-user VS entries
      // @ts-ignore - Prisma client will be regenerated after migration
      prisma.userChartEntryVS.deleteMany({
        where: {
          groupId,
          weekStart: {
            in: weekStarts,
          },
        },
      }),
    ])
  }
}

/**
 * Store per-user VS contributions for a week
 */
async function storeUserChartEntryVS(
  groupId: string,
  weekStart: Date,
  perUserVS: {
    topTracks: Array<{ userId: string; entryKey: string; vibeScore: number; playcount: number }>
    topArtists: Array<{ userId: string; entryKey: string; vibeScore: number; playcount: number }>
    topAlbums: Array<{ userId: string; entryKey: string; vibeScore: number; playcount: number }>
  },
  logger?: ChartGenerationLogger
): Promise<void> {
  // Normalize weekStart to start of day in UTC
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  // Delete existing per-user VS entries for this week (for regeneration)
  // @ts-ignore - Prisma client will be regenerated after migration
  await prisma.userChartEntryVS.deleteMany({
    where: {
      groupId,
      weekStart: normalizedWeekStart,
    },
  })

  // Prepare all entries to insert
  const entriesToCreate: Array<{
    userId: string
    groupId: string
    weekStart: Date
    chartType: string
    entryKey: string
    vibeScore: number
    playcount: number
  }> = []

  // Add tracks
  for (const entry of perUserVS.topTracks) {
    entriesToCreate.push({
      userId: entry.userId,
      groupId,
      weekStart: normalizedWeekStart,
      chartType: 'tracks',
      entryKey: entry.entryKey,
      vibeScore: entry.vibeScore,
      playcount: entry.playcount,
    })
  }

  // Add artists
  for (const entry of perUserVS.topArtists) {
    entriesToCreate.push({
      userId: entry.userId,
      groupId,
      weekStart: normalizedWeekStart,
      chartType: 'artists',
      entryKey: entry.entryKey,
      vibeScore: entry.vibeScore,
      playcount: entry.playcount,
    })
  }

  // Add albums
  for (const entry of perUserVS.topAlbums) {
    entriesToCreate.push({
      userId: entry.userId,
      groupId,
      weekStart: normalizedWeekStart,
      chartType: 'albums',
      entryKey: entry.entryKey,
      vibeScore: entry.vibeScore,
      playcount: entry.playcount,
    })
  }

  // Insert all entries in batches
  if (entriesToCreate.length > 0) {
    // @ts-ignore - Prisma client will be regenerated after migration
    await prisma.userChartEntryVS.createMany({
      data: entriesToCreate,
      skipDuplicates: true,
    })
  }
}

/**
 * Calculate and store group weekly stats
 * @param groupId - The group ID
 * @param weekStart - The week start date (should already be calculated based on group's trackingDayOfWeek)
 * @param chartSize - The chart size to use (from group settings)
 * @param trackingDayOfWeek - The tracking day of week (for calculating weekEnd)
 * @param chartMode - The chart mode to use (from group settings)
 * @param logger - Optional logger for performance tracking
 * @param members - Optional pre-fetched group members (to avoid redundant queries)
 */
export async function calculateGroupWeeklyStats(
  groupId: string,
  weekStart: Date,
  chartSize: number,
  trackingDayOfWeek: number,
  chartMode: ChartMode,
  logger?: ChartGenerationLogger,
  members?: Array<{
    user: {
      id: string
      lastfmUsername: string
      lastfmSessionKey: string | null
    }
  }>
): Promise<void> {
  // Get all group members (use provided members if available)
  let membersToUse = members
  if (!membersToUse) {
    membersToUse = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            lastfmUsername: true,
            lastfmSessionKey: true,
          },
        },
      },
    })
  }

  if (membersToUse.length === 0) {
    return
  }

  // Fetch or get stats for all members
  const userStatsPromises = membersToUse.map((member) =>
    fetchOrGetUserWeeklyStats(
      member.user.id,
      member.user.lastfmUsername,
      member.user.lastfmSessionKey,
      weekStart,
      logger
    )
  )

  const userStatsData = await Promise.all(userStatsPromises)

  // Prepare user stats with userId for VS calculation
  const userStats = userStatsData.map((stats, index) => ({
    userId: membersToUse[index].user.id,
    ...stats,
  }))

  // Aggregate stats using VS calculation
  const aggregated = aggregateGroupStatsWithVS(userStats, chartSize, chartMode)

  // Store per-user VS contributions
  await storeUserChartEntryVS(groupId, weekStart, aggregated.perUserVS, logger)

  // Calculate week end based on tracking day
  const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)

  // Prepare stats for storage (remove vibeScore from JSON, it will be stored in GroupChartEntry)
  const statsForStorage = {
    topTracks: aggregated.topTracks.map(({ vibeScore: _vibeScore, ...item }) => item),
    topArtists: aggregated.topArtists.map(({ vibeScore: _vibeScore, ...item }) => item),
    topAlbums: aggregated.topAlbums.map(({ vibeScore: _vibeScore, ...item }) => item),
  }

  // Store or update group stats
  await prisma.groupWeeklyStats.upsert({
    where: {
      groupId_weekStart: {
        groupId,
        weekStart,
      },
    },
    create: {
      groupId,
      weekStart,
      weekEnd,
      topTracks: statsForStorage.topTracks,
      topArtists: statsForStorage.topArtists,
      topAlbums: statsForStorage.topAlbums,
    },
    update: {
      weekEnd,
      topTracks: statsForStorage.topTracks,
      topArtists: statsForStorage.topArtists,
      topAlbums: statsForStorage.topAlbums,
    },
  })

  // Fetch previous weeks stats once (to share across all chart types)
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)
  const previousWeeksStats = await prisma.groupWeeklyStats.findMany({
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

  // Cache metrics for all chart types (with vibeScore) - share previousWeeksStats
  await Promise.all([
    cacheChartMetrics(groupId, weekStart, 'artists', aggregated.topArtists, trackingDayOfWeek, logger, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'tracks', aggregated.topTracks, trackingDayOfWeek, logger, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'albums', aggregated.topAlbums, trackingDayOfWeek, logger, previousWeeksStats),
  ])
}

/**
 * Initialize group with historical data (last 5 finished weeks)
 */
export async function initializeGroupWithHistory(groupId: string): Promise<void> {
  // Get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { 
      chartSize: true, 
      trackingDayOfWeek: true,
      // @ts-ignore - Prisma client will be regenerated after migration
      chartMode: true,
    },
  })

  if (!group) {
    return
  }

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as ChartMode

  // Use the group's tracking day to calculate weeks
  const weeks = getLastNFinishedWeeksForDay(5, trackingDayOfWeek)
  
  // Reverse to process from oldest to newest so previous week comparisons work correctly
  const weeksInOrder = [...weeks].reverse()
  
  // Fetch group members once (to reuse across all weeks)
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          lastfmUsername: true,
          lastfmSessionKey: true,
        },
      },
    },
  })

  // Process weeks sequentially to avoid overwhelming the API
  for (const weekStart of weeksInOrder) {
    await calculateGroupWeeklyStats(groupId, weekStart, chartSize, trackingDayOfWeek, chartMode, undefined, members)
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Recalculate all-time stats once after all weeks are processed
  await recalculateAllTimeStats(groupId)
}

