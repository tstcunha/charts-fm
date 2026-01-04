// Service functions for group operations and weekly stats

import { prisma } from './prisma'
import { getWeeklyStats } from './lastfm-weekly'
import { getWeekStart, getLastNFinishedWeeks } from './weekly-utils'
import { aggregateGroupStats } from './group-stats'
import { TopItem } from './lastfm-weekly'
import { cacheChartMetrics } from './group-chart-metrics'

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
      topTracks: existing.topTracks as TopItem[],
      topArtists: existing.topArtists as TopItem[],
      topAlbums: existing.topAlbums as TopItem[],
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
      topTracks: stats.topTracks,
      topArtists: stats.topArtists,
      topAlbums: stats.topAlbums,
    },
  })

  return stats
}

/**
 * Calculate and store group weekly stats
 */
export async function calculateGroupWeeklyStats(
  groupId: string,
  weekStart: Date
): Promise<void> {
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

  const userStats = await Promise.all(userStatsPromises)

  // Aggregate stats
  const aggregated = aggregateGroupStats(userStats)

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
      weekEnd: getWeekStart(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)),
      topTracks: aggregated.topTracks,
      topArtists: aggregated.topArtists,
      topAlbums: aggregated.topAlbums,
    },
    update: {
      topTracks: aggregated.topTracks,
      topArtists: aggregated.topArtists,
      topAlbums: aggregated.topAlbums,
    },
  })

  // Cache metrics for all chart types
  await Promise.all([
    cacheChartMetrics(groupId, weekStart, 'artists', aggregated.topArtists),
    cacheChartMetrics(groupId, weekStart, 'tracks', aggregated.topTracks),
    cacheChartMetrics(groupId, weekStart, 'albums', aggregated.topAlbums),
  ])
}

/**
 * Initialize group with historical data (last 5 finished weeks)
 */
export async function initializeGroupWithHistory(groupId: string): Promise<void> {
  const weeks = getLastNFinishedWeeks(5)
  
  // Process weeks sequentially to avoid overwhelming the API
  for (const weekStart of weeks) {
    await calculateGroupWeeklyStats(groupId, weekStart)
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

