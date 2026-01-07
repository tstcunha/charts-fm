import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupMembership } from '@/lib/group-auth'
import { calculateGroupWeeklyStats, deleteOverlappingCharts, updateGroupIconFromChart, getLastChartWeek } from '@/lib/group-service'
import { getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from '@/lib/weekly-utils'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { invalidateEntryStatsCacheBatch } from '@/lib/chart-deep-dive'
import { calculateGroupTrends } from '@/lib/group-trends'
import { calculateGroupRecords, getGroupRecords } from '@/lib/group-records'
import { RecordsCalculationLogger } from '@/lib/records-calculation-logger'
import { ChartType } from '@/lib/chart-slugs'

const LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// GET - Check generation status
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
    const now = new Date()
    const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
    const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
    
    // Check if there are missing weeks
    const lastChartWeek = await getLastChartWeek(group.id)
    let canUpdate = false
    
    if (!lastChartWeek) {
      // No charts exist, can update
      canUpdate = true
    } else {
      // Check if current week has finished (currentWeekEnd is in the past)
      if (currentWeekEnd < now) {
        // Check if we need to generate the current finished week
        const nextExpectedWeek = new Date(lastChartWeek)
        nextExpectedWeek.setUTCDate(nextExpectedWeek.getUTCDate() + 7)
        
        // If next expected week is before or equal to current finished week, we can update
        if (nextExpectedWeek <= currentWeekStart) {
          canUpdate = true
        }
      }
    }

    const inProgress = group.chartGenerationInProgress || false

    return NextResponse.json({
      inProgress,
      canUpdate: canUpdate && !inProgress,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error checking chart update status:', error)
    return NextResponse.json(
      { error: 'Failed to check update status' },
      { status: 500 }
    )
  }
}

// POST - Trigger chart update (fire-and-forget)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const groupId = group.id
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
    const chartSize = group.chartSize || 10
    // @ts-ignore - Prisma client will be regenerated after migration
    const chartMode = (group.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only'

    // Check and acquire lock
    const now = new Date()
    
    // Check if lock exists and handle timeout
    if (group.chartGenerationInProgress && group.chartGenerationStartedAt) {
      const lockAge = now.getTime() - group.chartGenerationStartedAt.getTime()
      if (lockAge > LOCK_TIMEOUT_MS) {
        // Lock timed out, reset it
        await prisma.group.update({
          where: { id: groupId },
          data: {
            chartGenerationInProgress: false,
            chartGenerationStartedAt: null,
          },
        })
      } else {
        // Lock is still valid, return error
        return NextResponse.json(
          { error: 'Chart generation is already in progress' },
          { status: 409 }
        )
      }
    }

    // Acquire lock
    const updatedGroup = await prisma.group.update({
      where: {
        id: groupId,
        chartGenerationInProgress: false, // Optimistic locking
      },
      data: {
        chartGenerationInProgress: true,
        chartGenerationStartedAt: now,
      },
    })

    if (!updatedGroup) {
      // Lock acquisition failed (another process got it)
      return NextResponse.json(
        { error: 'Chart generation is already in progress' },
        { status: 409 }
      )
    }

    // Start generation in background (fire-and-forget)
    generateChartsInBackground(groupId, trackingDayOfWeek, chartSize, chartMode).catch((error) => {
      console.error('Error generating charts in background:', error)
      // Release lock on error
      prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
        },
      }).catch((err) => {
        console.error('Error releasing lock:', err)
      })
    })

    // Return immediately
    return NextResponse.json({ success: true, message: 'Chart generation started' })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error starting chart update:', error)
    return NextResponse.json(
      { error: 'Failed to start chart update' },
      { status: 500 }
    )
  }
}

// Background function to generate charts
async function generateChartsInBackground(
  groupId: string,
  trackingDayOfWeek: number,
  chartSize: number,
  chartMode: 'vs' | 'vs_weighted' | 'plays_only'
): Promise<void> {
  try {
    // Get last chart week
    const lastChartWeek = await getLastChartWeek(groupId)
    
    let weeksToGenerate: Date[] = []

    if (!lastChartWeek) {
      // No charts exist, generate last 5 finished weeks
      weeksToGenerate = getLastNFinishedWeeksForDay(5, trackingDayOfWeek)
    } else {
      // Calculate missing weeks
      const now = new Date()
      const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
      const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
      
      // Only generate if current week has finished
      if (currentWeekEnd < now) {
        // Calculate next expected week (last chart + 7 days)
        const nextExpectedWeek = new Date(lastChartWeek)
        nextExpectedWeek.setUTCDate(nextExpectedWeek.getUTCDate() + 7)
        nextExpectedWeek.setUTCHours(0, 0, 0, 0)
        
        // Generate weeks from nextExpectedWeek to currentWeekStart (inclusive)
        // But limit to maximum 5 weeks
        const weeks: Date[] = []
        let weekToCheck = new Date(currentWeekStart)
        weekToCheck.setUTCHours(0, 0, 0, 0)
        
        // Work backwards from current week, collecting up to 5 weeks
        while (weeks.length < 5 && weekToCheck >= nextExpectedWeek) {
          weeks.push(new Date(weekToCheck))
          // Move back 7 days
          weekToCheck.setUTCDate(weekToCheck.getUTCDate() - 7)
        }
        
        // Reverse to get oldest to newest order
        weeksToGenerate = weeks.reverse()
      }
    }

    if (weeksToGenerate.length === 0) {
      // No weeks to generate, release lock and return
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
        },
      })
      return
    }

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

    // Sort weeks from oldest to newest
    weeksToGenerate.sort((a, b) => a.getTime() - b.getTime())

    // Process each week sequentially
    // Collect entries for deferred cache invalidation
    const allEntriesForInvalidation: Array<{
      entryKey: string
      vibeScore: number | null
      playcount: number
      weekStart: Date
      chartType: 'artists' | 'tracks' | 'albums'
    }> = []
    
    try {
      for (let weekIndex = 0; weekIndex < weeksToGenerate.length; weekIndex++) {
        const weekStart = weeksToGenerate[weekIndex]
        const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)
        
        // Delete overlapping charts (handles tracking date changes automatically)
        await deleteOverlappingCharts(groupId, weekStart, weekEnd)
        
        // Generate chart for the week (skip trends, collect entries for invalidation)
        const entriesForInvalidation = await calculateGroupWeeklyStats(
          groupId,
          weekStart,
          chartSize,
          trackingDayOfWeek,
          chartMode,
          members,
          true // skipTrends = true
        )
        
        // Collect entries for batch invalidation at the end
        allEntriesForInvalidation.push(...entriesForInvalidation)
        
        // Small delay between weeks
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Recalculate all-time stats once after all weeks are processed
      await recalculateAllTimeStats(groupId)

      // Batch invalidate cache for all entries from all weeks (deferred for performance)
      if (allEntriesForInvalidation.length > 0) {
        await invalidateEntryStatsCacheBatch(groupId, allEntriesForInvalidation)
      }

      // Calculate trends only for the latest week (all previous calculations were wasted)
      if (weeksToGenerate.length > 0) {
        const latestWeek = weeksToGenerate[weeksToGenerate.length - 1] // Last week is the latest
        await calculateGroupTrends(groupId, latestWeek, trackingDayOfWeek)
      }
    } catch (error: any) {
      console.error('Error generating charts in background:', error)
      
      // Handle Prisma validation errors
      if (error.message && error.message.includes('did not match the expected pattern')) {
        // Don't throw - we want to release the lock even on validation errors
      } else {
        // Re-throw other errors
        throw error
      }
    }

    // Update group icon if dynamic icon is enabled (don't await - let it run in background)
    updateGroupIconFromChart(groupId).catch((error) => {
      console.error('Error updating group icon after chart generation:', error)
    })

    // Trigger records calculation after charts are generated
    console.log(`[Records] Checking if records calculation should run. weeksToGenerate.length: ${weeksToGenerate.length}`)
    if (weeksToGenerate.length > 0) {
      console.log(`[Records] Collecting new entries for weeks: ${weeksToGenerate.map(w => w.toISOString()).join(', ')}`)
      // Collect all entries that appeared in newly generated week(s)
      const newEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId,
          weekStart: { in: weeksToGenerate },
        },
        select: {
          entryKey: true,
          chartType: true,
          position: true,
        },
      })
      console.log(`[Records] Found ${newEntries.length} entries in newly generated weeks`)

      // Extract unique entryKey + chartType combinations (for incremental calculation)
      // We only need to check each entry once, not per week
      const uniqueEntriesMap = new Map<string, {
        entryKey: string
        chartType: ChartType
        position: number
      }>()

      for (const entry of newEntries) {
        const key = `${entry.entryKey}|${entry.chartType}`
        if (!uniqueEntriesMap.has(key)) {
          // Use the best (lowest) position for this entry across all new weeks
          uniqueEntriesMap.set(key, {
            entryKey: entry.entryKey,
            chartType: entry.chartType as ChartType,
            position: entry.position,
          })
        } else {
          // Update if this position is better (lower)
          const existing = uniqueEntriesMap.get(key)!
          if (entry.position < existing.position) {
            existing.position = entry.position
          }
        }
      }

      const uniqueEntries = Array.from(uniqueEntriesMap.values())
      console.log(`[Records] Unique entries to check: ${uniqueEntries.length}`)

      // Check if GroupRecords exists
      const existingRecords = await getGroupRecords(groupId)
      const useIncremental = existingRecords && existingRecords.status === 'completed'
      console.log(`[Records] Existing records found: ${!!existingRecords}, status: ${existingRecords?.status}, useIncremental: ${useIncremental}`)

      // Delete existing GroupRecords if exists (for fresh calculation)
      if (existingRecords) {
        try {
          await prisma.groupRecords.delete({
            where: { groupId },
          })
          console.log(`[Records] Deleted existing GroupRecords`)
        } catch (err) {
          console.error('[Records] Error deleting existing records:', err)
        }
      }

      // Create new GroupRecords with status "calculating"
      try {
        await prisma.groupRecords.create({
          data: {
            groupId,
            status: 'calculating',
            calculationStartedAt: new Date(),
            chartsGeneratedAt: new Date(),
            records: {},
          },
        })
        console.log(`[Records] Created new GroupRecords with status 'calculating'`)
      } catch (err) {
        console.error('[Records] Error creating GroupRecords:', err)
        // Don't proceed if we can't create the record
        return
      }

      // Trigger async records calculation (fire-and-forget)
      console.log(`[Records] Triggering records calculation for group ${groupId} (${useIncremental ? 'incremental' : 'full'}, ${uniqueEntries.length} new entries)`)
      calculateRecordsInBackgroundAfterCharts(
        groupId,
        useIncremental ? uniqueEntries : undefined
      ).catch((error) => {
        console.error('[Records] Error calculating records in background:', error)
        // Update status to failed
        prisma.groupRecords.update({
          where: { groupId },
          data: { status: 'failed' },
        }).catch((err) => {
          console.error('[Records] Error updating records status to failed:', err)
        })
      })
    }

    // Release lock
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationInProgress: false,
        chartGenerationStartedAt: null,
      },
    })
  } catch (error) {
    console.error('Error in background chart generation:', error)
    // Release lock on error
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationInProgress: false,
        chartGenerationStartedAt: null,
      },
    }).catch((err) => {
      console.error('Error releasing lock after error:', err)
    })
    throw error
  }
}

// Background function to calculate records after charts are generated
async function calculateRecordsInBackgroundAfterCharts(
  groupId: string,
  newEntries?: Array<{ entryKey: string; chartType: ChartType; position: number }>
): Promise<void> {
  console.log(`[Records] Starting records calculation for group ${groupId}`)
  const logger = new RecordsCalculationLogger(groupId)
  const logFile = logger.getLogFile()
  console.log(`[Records] Log file will be: ${logFile}`)
  
  try {
    const records = await calculateGroupRecords(groupId, newEntries, logger)
    
    console.log(`[Records] Calculation completed for group ${groupId}`)
    
    // Update records with completed status
    await prisma.groupRecords.update({
      where: { groupId },
      data: {
        status: 'completed',
        records: records as any,
        updatedAt: new Date(),
      },
    })
    
    console.log(`[Records] Records saved to database for group ${groupId}`)
    if (logFile) {
      console.log(`[Records] Full log saved to: ${logFile}`)
    }
  } catch (error) {
    console.error(`[Records] Error during calculation for group ${groupId}:`, error)
    logger.log('Error during calculation', 0, String(error))
    await logger.logSummary()
    
    // Update status to failed
    await prisma.groupRecords.update({
      where: { groupId },
      data: { status: 'failed' },
    }).catch((err) => {
      console.error('[Records] Error updating records status to failed:', err)
    })
    
    throw error
  }
}

