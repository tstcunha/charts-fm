// Service functions for group operations and weekly stats

import { prisma } from './prisma'
import { getWeeklyStats } from './lastfm-weekly'
import { getWeekStart, getLastNFinishedWeeks, getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from './weekly-utils'
import { aggregateGroupStats, aggregateGroupStatsWithVS } from './group-stats'
import { TopItem } from './lastfm-weekly'
import { cacheChartMetrics, ChartType } from './group-chart-metrics'
import { recalculateAllTimeStats } from './group-alltime-stats'
import { ChartMode, calculateUserVS, getUserVSForWeek, aggregateGroupStatsVS } from './vibe-score'
import { getArtistImage, getAlbumImage } from './lastfm'
import { calculateGroupTrends } from './group-trends'

const API_KEY = process.env.LASTFM_API_KEY!
const API_SECRET = process.env.LASTFM_API_SECRET!

/**
 * Check if an error is a "User not found" error from Last.fm API
 * Last.fm returns error code 6 with message "User not found" for deleted/non-existent users
 */
function isUserNotFoundError(error: any): boolean {
  if (!error) return false
  
  const errorMessage = error.message || String(error)
  const errorString = errorMessage.toLowerCase()
  
  // Check for Last.fm API error code 6 or "User not found" message
  // Error can appear in various formats:
  // - Error message: "Last.fm API error: User not found"
  // - Error message: "User not found"
  // - Response body: { error: 6, message: "User not found" }
  return (
    errorString.includes('user not found') ||
    errorString.includes('error: 6') ||
    errorString.includes('error 6') ||
    (error.responseBody && (error.responseBody.error === 6 || error.responseBody.error === '6')) ||
    (typeof error === 'object' && 'error' in error && (error.error === 6 || error.error === '6'))
  )
}

/**
 * Process items in parallel with a concurrency limit
 * This allows controlled parallelization while respecting rate limits
 * Returns results with success/error information
 */
async function processWithConcurrencyLimit<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T, index: number, total: number) => Promise<R>,
  itemLabel?: (item: T) => string
): Promise<Array<{ success: boolean; result?: R; error?: any; item: T }>> {
  const results: Array<{ success: boolean; result?: R; error?: any; item: T }> = new Array(items.length)
  const executing: Array<Promise<void>> = []
  let index = 0
  let completed = 0
  const startTime = Date.now()
  
  console.log(`[Parallel Processing] 🚀 Starting to process ${items.length} items with concurrency limit of ${concurrency}`)
  
  async function runNext(): Promise<void> {
    if (index >= items.length) {
      return
    }
    
    const currentIndex = index++
    const item = items[currentIndex]
    const label = itemLabel ? itemLabel(item) : `item ${currentIndex + 1}`
    
    try {
      console.log(`[Parallel Processing] ▶️  Starting ${label} (${currentIndex + 1}/${items.length})`)
      const result = await processor(item, currentIndex, items.length)
      results[currentIndex] = { success: true, result, item }
      completed++
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[Parallel Processing] ✅ Completed ${label} (${completed}/${items.length}) - ${elapsed}s elapsed`)
    } catch (error) {
      completed++
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      const isUserNotFound = isUserNotFoundError(error)
      
      if (isUserNotFound) {
        console.warn(`[Parallel Processing] ⚠️  Skipping ${label} - Last.fm user not found (${completed}/${items.length}) - ${elapsed}s elapsed`)
        results[currentIndex] = { success: false, error, item }
      } else {
        console.error(`[Parallel Processing] ❌ Error processing ${label} (${completed}/${items.length}) - ${elapsed}s elapsed:`, error)
        results[currentIndex] = { success: false, error, item }
      }
    }
    
    // Process next item
    await runNext()
  }
  
  // Start up to concurrency number of parallel workers
  for (let i = 0; i < Math.min(concurrency, items.length); i++) {
    executing.push(runNext())
  }
  
  await Promise.all(executing)
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[Parallel Processing] 🎉 Finished processing all ${items.length} items in ${totalTime}s`)
  return results
}

/**
 * Get entry key for an item (same format as GroupChartEntry)
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: 'artists' | 'tracks' | 'albums'): string {
  if (chartType === 'artists') {
    return (item.name || '').trim().toLowerCase()
  }
  const name = (item.name || '').trim()
  const artist = (item.artist || '').trim()
  return `${name}|${artist}`.toLowerCase()
}

/**
 * Calculate and store VS for a user's weekly stats
 * VS is calculated using top 100 entries and stored in UserChartEntryVS
 */
async function calculateAndStoreUserVS(
  userId: string,
  weekStart: Date,
  topTracks: TopItem[],
  topArtists: TopItem[],
  topAlbums: TopItem[]
): Promise<void> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  // Calculate VS for top 100 entries
  const vsCalcStart = Date.now()
  const tracksVS = calculateUserVS(topTracks)
  const artistsVS = calculateUserVS(topArtists)
  const albumsVS = calculateUserVS(topAlbums)
  // VS calculation is very fast (<1ms), skip logging unless needed for debugging

  // Prepare entries to upsert
  const entriesToUpsert: Array<{
    userId: string
    weekStart: Date
    chartType: string
    entryKey: string
    vibeScore: number
    playcount: number
  }> = []

  // Add tracks
  for (const { item, vibeScore } of tracksVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'tracks',
      entryKey: getEntryKey(item, 'tracks'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Add artists
  for (const { item, vibeScore } of artistsVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'artists',
      entryKey: getEntryKey(item, 'artists'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Add albums
  for (const { item, vibeScore } of albumsVS) {
    if (vibeScore === 0) continue // Skip items beyond top 100
    entriesToUpsert.push({
      userId,
      weekStart: normalizedWeekStart,
      chartType: 'albums',
      entryKey: getEntryKey(item, 'albums'),
      vibeScore,
      playcount: item.playcount,
    })
  }

  // Delete existing entries for this user/week (for regeneration)
  const deleteStart = Date.now()
  await prisma.userChartEntryVS.deleteMany({
    where: {
      userId,
      weekStart: normalizedWeekStart,
    },
  })

  // Insert all entries
  if (entriesToUpsert.length > 0) {
    const insertStart = Date.now()
    await prisma.userChartEntryVS.createMany({
      data: entriesToUpsert,
      skipDuplicates: true,
    })
  }
}

/**
 * Fetch and store weekly stats for a user
 * Returns existing stats if they already exist, otherwise fetches from Last.fm
 * Automatically calculates and stores VS for top 100 entries
 */
export async function fetchOrGetUserWeeklyStats(
  userId: string,
  lastfmUsername: string,
  sessionKey: string | null,
  weekStart: Date,
  
): Promise<{
  topTracks: TopItem[]
  topArtists: TopItem[]
  topAlbums: TopItem[]
}> {
  // Check if stats already exist
  const dbLookupStart = Date.now()
  const existing = await prisma.userWeeklyStats.findUnique({
    where: {
      userId_weekStart: {
        userId,
        weekStart,
      },
    },
  })

  const stats = existing
    ? {
        topTracks: (existing.topTracks as unknown as TopItem[]) || [],
        topArtists: (existing.topArtists as unknown as TopItem[]) || [],
        topAlbums: (existing.topAlbums as unknown as TopItem[]) || [],
      }
    : await (async () => {
        console.log(`[User Stats] 🔄 Fetching fresh data from Last.fm for ${lastfmUsername} (week: ${weekStart.toISOString().split('T')[0]})`)
        const apiStart = Date.now()
        const result = await getWeeklyStats(
          lastfmUsername,
          weekStart,
          API_KEY,
          API_SECRET,
          sessionKey || undefined
        )
        const apiTime = ((Date.now() - apiStart) / 1000).toFixed(1)
        console.log(`[User Stats] ✅ Fetched data for ${lastfmUsername} in ${apiTime}s (tracks: ${result.topTracks.length}, artists: ${result.topArtists.length}, albums: ${result.topAlbums.length})`)
        return result
      })()
  
  if (existing) {
    console.log(`[User Stats] 💾 Using cached data for ${lastfmUsername} (tracks: ${stats.topTracks.length}, artists: ${stats.topArtists.length}, albums: ${stats.topAlbums.length})`)
  }

  // If stats were just fetched, store them
  if (!existing) {
    const storeStart = Date.now()
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
  }

  // Calculate and store VS for top 100 entries (always recalculate to ensure consistency)
  await calculateAndStoreUserVS(userId, weekStart, stats.topTracks, stats.topArtists, stats.topAlbums)

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
      // Note: UserChartEntryVS is now user-specific (no groupId), so we don't delete it here
      // VS entries are shared across all groups and will be recalculated when needed
    ])
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
export interface ChartGenerationResult {
  entries: Array<{ entryKey: string; vibeScore: number | null; playcount: number; weekStart: Date; chartType: ChartType }>
  failedUsers: string[]
  shouldAbort: boolean
}

export async function calculateGroupWeeklyStats(
  groupId: string,
  weekStart: Date,
  chartSize: number,
  trackingDayOfWeek: number,
  chartMode: ChartMode,
  members?: Array<{
    user: {
      id: string
      lastfmUsername: string
      lastfmSessionKey: string | null
    }
  }>,
  skipTrends: boolean = false,
  excludedUsers?: Set<string> // Users to skip (failed in previous weeks)
): Promise<ChartGenerationResult> {
  const overallStart = Date.now()
  console.log(`[Group Stats] 🎯 Starting group weekly stats calculation for week ${weekStart.toISOString().split('T')[0]}`)
  
  // Get all group members (use provided members if available)
  let membersToUse = members
  if (!membersToUse) {
    const fetchMembersStart = Date.now()
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

  // Store original total users count BEFORE filtering (for abort calculation)
  const originalTotalUsers = membersToUse.length

  // Filter out excluded users (failed in previous weeks)
  if (excludedUsers && excludedUsers.size > 0) {
    const excludedCount = membersToUse.length
    membersToUse = membersToUse.filter(member => !excludedUsers.has(member.user.lastfmUsername))
    if (excludedCount > membersToUse.length) {
      console.log(`[Group Stats] ⏭️  Skipping ${excludedCount - membersToUse.length} user(s) that failed in previous weeks`)
    }
  }

  if (membersToUse.length === 0) {
    return {
      entries: [],
      failedUsers: [],
      shouldAbort: false,
    }
  }

  // Fetch or get stats for all members (this also calculates and stores VS automatically)
  // Process in parallel with concurrency limit to respect rate limits while improving performance
  // The rate limiter will handle spacing between requests automatically
  const fetchStatsStart = Date.now()
  console.log(`[Group Stats] 📊 Fetching weekly stats for ${membersToUse.length} members for week ${weekStart.toISOString().split('T')[0]}`)
  const userStatsResults = await processWithConcurrencyLimit(
    membersToUse,
    3, // Process 3 members concurrently to avoid rate limits (each makes 3 API calls = 9 max concurrent)
    async (member, index, total) => {
      return await fetchOrGetUserWeeklyStats(
        member.user.id,
        member.user.lastfmUsername,
        member.user.lastfmSessionKey,
        weekStart
      )
    },
    (member) => `member ${member.user.lastfmUsername}`
  )
  const fetchStatsTime = ((Date.now() - fetchStatsStart) / 1000).toFixed(1)
  
  // Filter out failed users - ALL failures are tracked (not just user not found)
  const successfulResults = userStatsResults.filter(r => r.success)
  const allFailedResults = userStatsResults.filter(r => !r.success)
  
  // Collect all failed usernames (any failure reason)
  const allFailedUsernames: string[] = []
  
  if (allFailedResults.length > 0) {
    const failedUsernames = allFailedResults.map(r => {
      const member = r.item as typeof membersToUse[0]
      return member.user.lastfmUsername
    })
    allFailedUsernames.push(...failedUsernames)
    
    // Log with more detail about failure types
    const userNotFoundCount = allFailedResults.filter(r => isUserNotFoundError(r.error)).length
    const otherFailureCount = allFailedResults.length - userNotFoundCount
    
    if (userNotFoundCount > 0) {
      console.warn(`[Group Stats] ⚠️  ${userNotFoundCount} user(s) with invalid Last.fm accounts (user not found)`)
    }
    if (otherFailureCount > 0) {
      console.error(`[Group Stats] ❌ ${otherFailureCount} user(s) failed to fetch stats (other errors)`)
    }
    console.error(`[Group Stats] ❌ Total failed: ${allFailedResults.length} user(s): ${failedUsernames.join(', ')}`)
  }
  
  // Determine if chart generation should be aborted based on failure rate
  // Use originalTotalUsers (before exclusions) + excludedUsers count to get true total
  // This ensures we count unique users that failed, not week failures
  const totalFailedUniqueUsers = allFailedUsernames.length + (excludedUsers?.size || 0)
  const totalUsers = originalTotalUsers
  let shouldAbort = false
  
  if (totalFailedUniqueUsers > 0) {
    if (totalUsers <= 5) {
      // For groups of 5 or less: abort if any user failed
      shouldAbort = true
    } else {
      // For groups of 6 or more: abort if at least 1/3rd failed
      const failureThreshold = Math.ceil(totalUsers / 3)
      shouldAbort = totalFailedUniqueUsers >= failureThreshold
    }
  }
  
  if (shouldAbort) {
    console.error(`[Group Stats] 🛑 Aborting chart generation: ${totalFailedUniqueUsers}/${totalUsers} users failed (threshold exceeded)`)
    return {
      entries: [],
      failedUsers: allFailedUsernames,
      shouldAbort: true,
    }
  }
  
  if (successfulResults.length === 0) {
    console.warn(`[Group Stats] ⚠️  No valid users to generate charts for`)
    return {
      entries: [],
      failedUsers: allFailedUsernames,
      shouldAbort: false,
    }
  }
  
  console.log(`[Group Stats] ✅ Fetched stats for ${successfulResults.length}/${membersToUse.length} members in ${fetchStatsTime}s`)
  
  // Get only successful members for VS data fetching
  const successfulMembers = successfulResults.map(r => r.item as typeof membersToUse[0])
  const userStatsArray = successfulResults.map(r => r.result!)

  // Fetch pre-calculated VS data for successful members only
  const fetchVSStart = Date.now()
  const userVSDataPromises = successfulMembers.map((member) =>
    getUserVSForWeek(member.user.id, weekStart, prisma)
  )

  const userVSDataArray = await Promise.all(userVSDataPromises)

  // Prepare VS data with userId and original stats for aggregation
  const userVSData = userVSDataArray.map((vsData: { topTracks: any[]; topArtists: any[]; topAlbums: any[] }, index: number) => ({
    userId: successfulMembers[index].user.id,
    ...vsData,
    originalStats: userStatsArray[index], // Include original stats for name lookup
  }))

  // Aggregate stats using pre-calculated VS
  const aggregateStart = Date.now()
  const aggregated = aggregateGroupStatsVS(userVSData, chartSize, chartMode)

  // Calculate week end based on tracking day
  const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)

  // Prepare stats for storage (remove vibeScore from JSON, it will be stored in GroupChartEntry)
  const statsForStorage = {
    topTracks: aggregated.topTracks.map(({ vibeScore: _vibeScore, ...item }) => item),
    topArtists: aggregated.topArtists.map(({ vibeScore: _vibeScore, ...item }) => item),
    topAlbums: aggregated.topAlbums.map(({ vibeScore: _vibeScore, ...item }) => item),
  }

  // Store or update group stats
  const upsertStart = Date.now()
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
  const fetchPreviousStart = Date.now()
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
  // Returns entries for deferred cache invalidation
  const cacheMetricsStart = Date.now()
  const [artistsEntries, tracksEntries, albumsEntries] = await Promise.all([
    cacheChartMetrics(groupId, weekStart, 'artists', aggregated.topArtists, trackingDayOfWeek, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'tracks', aggregated.topTracks, trackingDayOfWeek, previousWeeksStats),
    cacheChartMetrics(groupId, weekStart, 'albums', aggregated.topAlbums, trackingDayOfWeek, previousWeeksStats),
  ])

  // Collect entries for cache invalidation (with chartType for batching)
  const entriesForInvalidation: Array<{ entryKey: string; vibeScore: number | null; playcount: number; weekStart: Date; chartType: ChartType }> = []
  entriesForInvalidation.push(
    ...artistsEntries.map(e => ({ ...e, chartType: 'artists' as ChartType })),
    ...tracksEntries.map(e => ({ ...e, chartType: 'tracks' as ChartType })),
    ...albumsEntries.map(e => ({ ...e, chartType: 'albums' as ChartType }))
  )

  // Skip trends calculation during processing - will be done at the end for latest week only
  if (!skipTrends) {
    // Calculate and store trends for the latest week
    // Only calculate trends for the most recent week (when this is the latest week)
    const checkLatestStart = Date.now()
    const allWeeklyStats = await prisma.groupWeeklyStats.findMany({
      where: { groupId },
      orderBy: { weekStart: 'desc' },
      take: 1,
    })

    if (allWeeklyStats.length > 0) {
      const latestWeek = allWeeklyStats[0]
      const latestWeekStart = new Date(latestWeek.weekStart)
      latestWeekStart.setUTCHours(0, 0, 0, 0)
      
      // Only calculate trends if this is the latest week
      if (latestWeekStart.getTime() === normalizedWeekStart.getTime()) {
        const trendsStart = Date.now()
        await calculateGroupTrends(groupId, weekStart, trackingDayOfWeek)
      }
    }
  }

  const overallTime = ((Date.now() - overallStart) / 1000).toFixed(1)
  console.log(`[Group Stats] 🎉 Completed group weekly stats calculation in ${overallTime}s`)

  return {
    entries: entriesForInvalidation,
    failedUsers: allFailedUsernames,
    shouldAbort: false,
  }
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
      chartMode: true,
    },
  })

  if (!group) {
    return
  }

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
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
  // Collect entries for deferred cache invalidation
  const allEntriesForInvalidation: Array<{
    entryKey: string
    vibeScore: number | null
    playcount: number
    weekStart: Date
    chartType: ChartType
  }> = []
  
  for (const weekStart of weeksInOrder) {
    const result = await calculateGroupWeeklyStats(
      groupId,
      weekStart,
      chartSize,
      trackingDayOfWeek,
      chartMode,
      members,
      true // skipTrends = true
    )
    // Collect entries for batch invalidation at the end
    allEntriesForInvalidation.push(...result.entries)
    // Small delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Recalculate all-time stats once after all weeks are processed
  await recalculateAllTimeStats(groupId)

  // Batch invalidate cache for all entries from all weeks (deferred for performance)
  if (allEntriesForInvalidation.length > 0) {
    const { invalidateEntryStatsCacheBatch } = await import('./chart-deep-dive')
    await invalidateEntryStatsCacheBatch(groupId, allEntriesForInvalidation)
  }

  // Calculate trends only for the latest week
  if (weeksInOrder.length > 0) {
    const latestWeek = weeksInOrder[weeksInOrder.length - 1] // Last week is the latest
    await calculateGroupTrends(groupId, latestWeek, trackingDayOfWeek)
  }
}

/**
 * Update group icon based on the latest weekly chart
 * Fetches image from Last.fm API based on the group's dynamicIconSource setting
 */
export async function updateGroupIconFromChart(groupId: string): Promise<void> {
  // Get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
      image: true,
    },
  })

  if (!group) {
    return
  }

  // Check if dynamic icon is enabled
  if (!group.dynamicIconEnabled || !group.dynamicIconSource) {
    return
  }

  // Get the latest weekly stats
  const latestStats = await prisma.groupWeeklyStats.findFirst({
    where: { groupId },
    orderBy: { weekStart: 'desc' },
  })

  if (!latestStats) {
    // No charts yet, keep existing icon
    return
  }

  let imageUrl: string | null = null
  let caption: string | null = null

    try {
    // Extract the appropriate item based on source type
    if (group.dynamicIconSource === 'top_artist') {
      const topArtists = latestStats.topArtists as unknown as TopItem[]
      if (topArtists && topArtists.length > 0) {
        const topArtist = topArtists[0]
        if (topArtist.name) {
          imageUrl = await getArtistImage(topArtist.name, API_KEY)
          caption = topArtist.name
        }
      }
    } else if (group.dynamicIconSource === 'top_album') {
      const topAlbums = latestStats.topAlbums as unknown as TopItem[]
      if (topAlbums && topAlbums.length > 0) {
        const topAlbum = topAlbums[0]
        if (topAlbum.name && topAlbum.artist) {
          imageUrl = await getAlbumImage(topAlbum.artist, topAlbum.name, API_KEY)
          caption = topAlbum.name
        }
      }
    } else if (group.dynamicIconSource === 'top_track_artist') {
      const topTracks = latestStats.topTracks as unknown as TopItem[]
      if (topTracks && topTracks.length > 0) {
        const topTrack = topTracks[0]
        if (topTrack.artist) {
          imageUrl = await getArtistImage(topTrack.artist, API_KEY)
          if (topTrack.name) {
            caption = topTrack.name
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error updating group icon for group ${groupId}:`, error)
    // Keep existing icon on error
    return
  }

  // Only update if we got a valid image URL
  if (imageUrl) {
    await prisma.group.update({
      where: { id: groupId },
      data: { 
        image: imageUrl,
        dynamicIconCaption: caption,
      },
    })
  }
  // If imageUrl is null, keep the existing icon (don't update)
}

