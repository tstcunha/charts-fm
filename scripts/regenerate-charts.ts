// Admin script to regenerate charts for groups
// 
// Usage:
//   npx tsx scripts/regenerate-charts.ts --weeks 5
//   npx tsx scripts/regenerate-charts.ts --weeks 10 --group <groupId>
//   npx tsx scripts/regenerate-charts.ts --weeks 5 --groups <id1>,<id2>,<id3>
//
// Options:
//   --weeks, -w    Number of weeks to regenerate (required)
//   --group, -g    Single group ID to regenerate
//   --groups, -G   Comma-separated list of group IDs to regenerate
//                  If neither --group nor --groups is provided, all groups will be processed

import { PrismaClient } from '@prisma/client'
import { 
  calculateGroupWeeklyStats, 
  deleteOverlappingCharts,
  getLastChartWeek 
} from '../lib/group-service'
import { recalculateAllTimeStats } from '../lib/group-alltime-stats'
import { calculateGroupTrends } from '../lib/group-trends'
import { 
  getLastNFinishedWeeksForDay, 
  getWeekEndForDay 
} from '../lib/weekly-utils'
import { ChartType } from '../lib/chart-slugs'

const prisma = new PrismaClient()

interface ScriptOptions {
  weeks: number
  groupIds: string[] | null // null means all groups
}

function parseArguments(): ScriptOptions {
  const args = process.argv.slice(2)
  let weeks: number | null = null
  let groupIds: string[] | null = null

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg === '--weeks' || arg === '-w') {
      const value = args[i + 1]
      if (!value) {
        throw new Error('--weeks requires a value')
      }
      weeks = parseInt(value, 10)
      if (isNaN(weeks) || weeks < 1) {
        throw new Error('--weeks must be a positive integer')
      }
      i++
    } else if (arg === '--group' || arg === '-g') {
      const value = args[i + 1]
      if (!value) {
        throw new Error('--group requires a value')
      }
      if (groupIds !== null) {
        throw new Error('Cannot use both --group and --groups')
      }
      groupIds = [value]
      i++
    } else if (arg === '--groups' || arg === '-G') {
      const value = args[i + 1]
      if (!value) {
        throw new Error('--groups requires a value')
      }
      if (groupIds !== null) {
        throw new Error('Cannot use both --group and --groups')
      }
      groupIds = value.split(',').map(id => id.trim()).filter(id => id.length > 0)
      if (groupIds.length === 0) {
        throw new Error('--groups must contain at least one group ID')
      }
      i++
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage:
  npx tsx scripts/regenerate-charts.ts --weeks <number> [options]

Options:
  --weeks, -w <number>     Number of weeks to regenerate (required)
  --group, -g <id>         Single group ID to regenerate
  --groups, -G <id1,id2>   Comma-separated list of group IDs to regenerate
  --help, -h               Show this help message

Examples:
  # Regenerate last 5 weeks for all groups
  npx tsx scripts/regenerate-charts.ts --weeks 5

  # Regenerate last 10 weeks for a specific group
  npx tsx scripts/regenerate-charts.ts --weeks 10 --group abc123

  # Regenerate last 5 weeks for multiple groups
  npx tsx scripts/regenerate-charts.ts --weeks 5 --groups abc123,def456,ghi789
`)
      process.exit(0)
    }
  }

  if (weeks === null) {
    throw new Error('--weeks is required')
  }

  return { weeks, groupIds }
}

async function getGroupsToProcess(groupIds: string[] | null): Promise<Array<{ id: string; name: string; trackingDayOfWeek: number; chartSize: number; chartMode: 'vs' | 'vs_weighted' | 'plays_only' }>> {
  if (groupIds === null) {
    // Get all groups
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        trackingDayOfWeek: true,
        chartSize: true,
        chartMode: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    return groups.map(g => ({
      id: g.id,
      name: g.name,
      trackingDayOfWeek: g.trackingDayOfWeek ?? 0,
      chartSize: g.chartSize || 10,
      chartMode: (g.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only',
    }))
  } else {
    // Get specific groups
    const groups = await prisma.group.findMany({
      where: {
        id: { in: groupIds },
      },
      select: {
        id: true,
        name: true,
        trackingDayOfWeek: true,
        chartSize: true,
        chartMode: true,
      },
    })

    // Check if all groups were found
    const foundIds = new Set(groups.map(g => g.id))
    const missingIds = groupIds.filter(id => !foundIds.has(id))
    if (missingIds.length > 0) {
      throw new Error(`Groups not found: ${missingIds.join(', ')}`)
    }

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      trackingDayOfWeek: g.trackingDayOfWeek ?? 0,
      chartSize: g.chartSize || 10,
      chartMode: (g.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only',
    }))
  }
}

async function regenerateChartsForGroup(
  groupId: string,
  groupName: string,
  weeks: number,
  trackingDayOfWeek: number,
  chartSize: number,
  chartMode: 'vs' | 'vs_weighted' | 'plays_only'
): Promise<void> {
  console.log(`\n📊 Processing group: ${groupName} (${groupId})`)
  console.log(`   Settings: ${weeks} weeks, tracking day ${trackingDayOfWeek}, chart size ${chartSize}, mode ${chartMode}`)

  // Get group members
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
    console.log(`   ⚠️  Skipping: No members in group`)
    return
  }

  console.log(`   👥 Found ${members.length} member(s)`)

  // Calculate weeks to regenerate
  const weeksToGenerate = getLastNFinishedWeeksForDay(weeks, trackingDayOfWeek)
  
  if (weeksToGenerate.length === 0) {
    console.log(`   ⚠️  No finished weeks to generate`)
    return
  }

  console.log(`   📅 Generating charts for ${weeksToGenerate.length} week(s):`)
  weeksToGenerate.forEach((week, idx) => {
    const weekEnd = getWeekEndForDay(week, trackingDayOfWeek)
    console.log(`      Week ${idx + 1}: ${week.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`)
  })

  // Sort weeks from oldest to newest
  const weeksInOrder = [...weeksToGenerate].sort((a, b) => a.getTime() - b.getTime())

  // Track failed users across all weeks
  const allFailedUsers = new Set<string>()
  let shouldAbortGeneration = false

  // Collect entries for batch invalidation
  const allEntriesForInvalidation: Array<{
    entryKey: string
    vibeScore: number | null
    playcount: number
    weekStart: Date
    chartType: ChartType
  }> = []

  // Process each week sequentially
  for (let weekIndex = 0; weekIndex < weeksInOrder.length; weekIndex++) {
    const weekStart = weeksInOrder[weekIndex]
    const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)
    const currentWeekNumber = weekIndex + 1

    console.log(`\n   🔄 Processing week ${currentWeekNumber}/${weeksInOrder.length} (${weekStart.toISOString().split('T')[0]})...`)

    try {
      // Delete overlapping charts
      await deleteOverlappingCharts(groupId, weekStart, weekEnd)
      console.log(`      ✓ Deleted overlapping charts (if any)`)

      // Generate chart for the week
      const result = await calculateGroupWeeklyStats(
        groupId,
        weekStart,
        chartSize,
        trackingDayOfWeek,
        chartMode,
        members,
        true, // skipTrends = true (will calculate at the end)
        allFailedUsers
      )

      // Collect failed users
      result.failedUsers.forEach(username => allFailedUsers.add(username))

      // Check if we should abort
      if (result.shouldAbort) {
        shouldAbortGeneration = true
        console.log(`      ⚠️  Generation should be aborted due to too many user failures`)
      }

      // Collect entries for batch invalidation
      allEntriesForInvalidation.push(...result.entries)

      console.log(`      ✓ Generated chart (${result.entries.length} entries)`)

      // Small delay between weeks
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error: any) {
      console.error(`      ❌ Error processing week: ${error.message}`)
      throw error
    }
  }

  if (shouldAbortGeneration) {
    console.log(`\n   ⚠️  Generation was aborted due to too many user failures (${allFailedUsers.size} users)`)
  } else if (allFailedUsers.size > 0) {
    console.log(`\n   ⚠️  Some users failed (${allFailedUsers.size} users), but generation continued`)
  }

  // Recalculate all-time stats
  console.log(`\n   📈 Recalculating all-time stats...`)
  try {
    await recalculateAllTimeStats(groupId)
    console.log(`      ✓ All-time stats recalculated`)
  } catch (error: any) {
    console.error(`      ❌ Error recalculating all-time stats: ${error.message}`)
    throw error
  }

  // Batch invalidate cache for all entries from all weeks
  if (allEntriesForInvalidation.length > 0) {
    console.log(`\n   🗑️  Invalidating cache for ${allEntriesForInvalidation.length} entries...`)
    try {
      const { invalidateEntryStatsCacheBatch } = await import('../lib/chart-deep-dive')
      await invalidateEntryStatsCacheBatch(groupId, allEntriesForInvalidation)
      console.log(`      ✓ Cache invalidated`)
    } catch (error: any) {
      console.error(`      ⚠️  Error invalidating cache: ${error.message}`)
      // Don't throw - cache invalidation is not critical
    }
  }

  // Calculate trends for the latest week
  if (weeksInOrder.length > 0) {
    const latestWeek = weeksInOrder[weeksInOrder.length - 1]
    console.log(`\n   📊 Calculating trends for latest week...`)
    try {
      await calculateGroupTrends(groupId, latestWeek, trackingDayOfWeek)
      console.log(`      ✓ Trends calculated`)
    } catch (error: any) {
      console.error(`      ❌ Error calculating trends: ${error.message}`)
      // Don't throw - trends are not critical
    }
  }

  console.log(`\n   ✅ Successfully regenerated charts for ${groupName}`)
}

async function main() {
  let options: ScriptOptions

  try {
    options = parseArguments()
  } catch (error: any) {
    console.error(`❌ Error parsing arguments: ${error.message}`)
    console.error(`\nRun with --help for usage information`)
    process.exit(1)
  }

  console.log(`🚀 Starting chart regeneration`)
  console.log(`   Weeks to regenerate: ${options.weeks}`)
  if (options.groupIds === null) {
    console.log(`   Groups: ALL`)
  } else {
    console.log(`   Groups: ${options.groupIds.length} group(s)`)
  }

  try {
    // Get groups to process
    const groups = await getGroupsToProcess(options.groupIds)
    
    if (groups.length === 0) {
      console.log(`\n⚠️  No groups found to process`)
      return
    }

    console.log(`\n📋 Found ${groups.length} group(s) to process\n`)

    // Process each group
    let successCount = 0
    let errorCount = 0

    for (const group of groups) {
      try {
        await regenerateChartsForGroup(
          group.id,
          group.name,
          options.weeks,
          group.trackingDayOfWeek,
          group.chartSize,
          group.chartMode
        )
        successCount++
      } catch (error: any) {
        console.error(`\n❌ Error processing group ${group.name} (${group.id}): ${error.message}`)
        errorCount++
        // Continue with next group
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`)
    console.log(`📊 Summary:`)
    console.log(`   ✅ Successfully processed: ${successCount} group(s)`)
    if (errorCount > 0) {
      console.log(`   ❌ Errors: ${errorCount} group(s)`)
    }
    console.log(`${'='.repeat(60)}\n`)

  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

