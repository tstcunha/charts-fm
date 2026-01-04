// Service functions for group operations and weekly stats

import { prisma } from './prisma'
import { getWeeklyStats } from './lastfm-weekly'
import { getWeekStart, getLastNFinishedWeeks, getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from './weekly-utils'
import { aggregateGroupStats, aggregateGroupStatsWithVS } from './group-stats'
import { TopItem } from './lastfm-weekly'
import { cacheChartMetrics } from './group-chart-metrics'
import { recalculateAllTimeStats } from './group-alltime-stats'
import { ChartMode } from './vibe-score'

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
  weekStart: Date
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
 */
export async function deleteOverlappingCharts(
  groupId: string,
  newWeekStart: Date,
  newWeekEnd: Date
): Promise<void> {
  // Get all existing charts for this group
  const existingCharts = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
  })

  // Find charts that overlap
  const overlappingCharts = existingCharts.filter((chart) => {
    const chartWeekStart = new Date(chart.weekStart)
    const chartWeekEnd = new Date(chart.weekEnd)
    return weeksOverlap(newWeekStart, newWeekEnd, chartWeekStart, chartWeekEnd)
  })

  // Delete overlapping charts
  for (const chart of overlappingCharts) {
    await prisma.groupWeeklyStats.delete({
      where: { id: chart.id },
    })
    // Also delete associated chart entries
    await prisma.groupChartEntry.deleteMany({
      where: {
        groupId,
        weekStart: chart.weekStart,
      },
    })
    // Delete associated per-user VS entries
    // @ts-ignore - Prisma client will be regenerated after migration
    await prisma.userChartEntryVS.deleteMany({
      where: {
        groupId,
        weekStart: chart.weekStart,
      },
    })
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
  }
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
 */
export async function calculateGroupWeeklyStats(
  groupId: string,
  weekStart: Date,
  chartSize: number,
  trackingDayOfWeek: number
): Promise<void> {
  // Get group settings including chartMode
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    // @ts-ignore - Prisma client will be regenerated after migration
    select: { chartMode: true },
  })

  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group?.chartMode || 'plays_only') as ChartMode

  // Get all group members
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

  if (members.length === 0) {
    return
  }

  // Fetch or get stats for all members
  const userStatsPromises = members.map((member) =>
    fetchOrGetUserWeeklyStats(
      member.user.id,
      member.user.lastfmUsername,
      member.user.lastfmSessionKey,
      weekStart
    )
  )

  const userStatsData = await Promise.all(userStatsPromises)

  // Prepare user stats with userId for VS calculation
  const userStats = userStatsData.map((stats, index) => ({
    userId: members[index].user.id,
    ...stats,
  }))

  // Aggregate stats using VS calculation
  const aggregated = aggregateGroupStatsWithVS(userStats, chartSize, chartMode)

  // Store per-user VS contributions
  await storeUserChartEntryVS(groupId, weekStart, aggregated.perUserVS)

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

  // Cache metrics for all chart types (with vibeScore)
  await Promise.all([
    cacheChartMetrics(groupId, weekStart, 'artists', aggregated.topArtists),
    cacheChartMetrics(groupId, weekStart, 'tracks', aggregated.topTracks),
    cacheChartMetrics(groupId, weekStart, 'albums', aggregated.topAlbums),
  ])

  // Recalculate all-time stats from all weekly charts
  await recalculateAllTimeStats(groupId)
}

/**
 * Initialize group with historical data (last 5 finished weeks)
 */
export async function initializeGroupWithHistory(groupId: string): Promise<void> {
  // Get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { chartSize: true, trackingDayOfWeek: true },
  })

  if (!group) {
    return
  }

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0

  // Use the group's tracking day to calculate weeks
  const weeks = getLastNFinishedWeeksForDay(5, trackingDayOfWeek)
  
  // Reverse to process from oldest to newest so previous week comparisons work correctly
  const weeksInOrder = [...weeks].reverse()
  
  // Process weeks sequentially to avoid overwhelming the API
  for (const weekStart of weeksInOrder) {
    await calculateGroupWeeklyStats(groupId, weekStart, chartSize, trackingDayOfWeek)
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

