import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSuperuser } from '@/lib/admin'
import { calculateGroupWeeklyStats, deleteOverlappingCharts, updateGroupIconFromChart } from '@/lib/group-service'
import { getLastNFinishedWeeks, getLastNFinishedWeeksForDay, getWeekEndForDay } from '@/lib/weekly-utils'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { getGroupRecords, triggerRecordsCalculation } from '@/lib/group-records'
import type { ChartType } from '@/lib/chart-slugs'

const LOCK_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

// GET - Get group charts (weekly stats)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const groupId = params.id

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // If group is private, require authentication and membership
  if (group.isPrivate) {
    const session = await getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    })

    if (!membership && group.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }
  }
  // If group is public, allow unauthenticated access

  // Get all weekly stats for this group
  const weeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })

  return NextResponse.json({ weeklyStats })
}

// POST - Generate/refresh charts for a group
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const groupId = params.id

  // Check if user is the creator and get group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      chartSize: true,
      trackingDayOfWeek: true,
      // @ts-ignore - Prisma client will be regenerated after migration
      chartMode: true,
      chartGenerationInProgress: true,
      chartGenerationStartedAt: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can generate charts' },
      { status: 403 }
    )
  }

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

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only'

  // Check if user is a superuser and get request body
  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null
  
  let numberOfWeeks = 10 // Default to 10 weeks
  if (isSuperuser) {
    try {
      const body = await request.json()
      if (body.weeks !== undefined) {
        const requestedWeeks = parseInt(body.weeks, 10)
        if (!isNaN(requestedWeeks) && requestedWeeks > 0 && requestedWeeks <= 52) {
          numberOfWeeks = requestedWeeks
        }
      }
    } catch {
      // If body parsing fails, use default
    }
  }

  // Calculate stats for last N finished weeks using group's tracking day
  const weeks = getLastNFinishedWeeksForDay(numberOfWeeks, trackingDayOfWeek)
  const totalWeeks = weeks.length

  // Acquire lock
  const updatedGroup = await prisma.group.update({
    where: {
      id: groupId,
      chartGenerationInProgress: false, // Optimistic locking
    },
    data: {
      chartGenerationInProgress: true,
      chartGenerationStartedAt: now,
      chartGenerationProgress: {
        currentWeek: 0,
        totalWeeks: totalWeeks,
        stage: 'initializing',
      },
    },
  })

  if (!updatedGroup) {
    // Lock acquisition failed (another process got it)
    return NextResponse.json(
      { error: 'Chart generation is already in progress' },
      { status: 409 }
    )
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
  
  // Before generating, delete any overlapping charts for the weeks we're about to regenerate
  for (const weekStart of weeks) {
    const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)
    await deleteOverlappingCharts(groupId, weekStart, weekEnd)
  }
  
  // Reverse to process from oldest to newest so previous week comparisons work correctly
  const weeksInOrder = [...weeks].reverse()
  
  // Process sequentially to avoid API rate limits
  // Collect entries for deferred cache invalidation
  const allEntriesForInvalidation: Array<{
    entryKey: string
    vibeScore: number | null
    playcount: number
    weekStart: Date
    chartType: 'artists' | 'tracks' | 'albums'
  }> = []
  
  // Track failed users across all weeks - once a user fails, skip them for all subsequent weeks
  // Declare outside try block so it's accessible in catch block
  let allFailedUsers = new Set<string>()
  let shouldAbortGeneration = false
  
  try {
    // Update progress to fetching stage
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationProgress: {
          currentWeek: 0,
          totalWeeks: totalWeeks,
          stage: 'fetching',
        },
      },
    })

    for (let i = 0; i < weeksInOrder.length; i++) {
      const weekStart = weeksInOrder[i]
      const currentWeekNumber = i + 1
      
      // Update progress to show current week being processed
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationProgress: {
            currentWeek: currentWeekNumber,
            totalWeeks: totalWeeks,
            stage: 'processing',
          },
        },
      }).catch((err) => {
        console.error('Error updating progress:', err)
        // Continue even if progress update fails
      })
      
      const result = await calculateGroupWeeklyStats(
        groupId,
        weekStart,
        chartSize,
        trackingDayOfWeek,
        chartMode,
        members,
        true, // skipTrends = true
        allFailedUsers // Pass failed users to skip them for this week
      )
      
      // Collect failed users - add them to the set so they're skipped in future weeks
      result.failedUsers.forEach(username => allFailedUsers.add(username))
      
      // Check if we should abort
      if (result.shouldAbort) {
        shouldAbortGeneration = true
      }
      
      // Collect entries for batch invalidation at the end
      allEntriesForInvalidation.push(...result.entries)
      
      // Small delay between weeks
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // If generation should be aborted, return error with failed users info
    if (shouldAbortGeneration) {
      // Release lock before returning error
      await prisma.group.update({
        where: { id: groupId },
        data: {
          chartGenerationInProgress: false,
          chartGenerationStartedAt: null,
          chartGenerationProgress: Prisma.JsonNull,
        },
      }).catch((err) => {
        console.error('Error releasing lock after abort:', err)
      })
      
      return NextResponse.json(
        {
          error: 'Chart generation aborted due to too many user failures',
          failedUsers: Array.from(allFailedUsers),
          aborted: true,
        },
        { status: 400 }
      )
    }

    // Update progress to finalizing stage
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationProgress: {
          currentWeek: totalWeeks,
          totalWeeks: totalWeeks,
          stage: 'finalizing',
        },
      },
    }).catch((err) => {
      console.error('Error updating progress:', err)
    })

    // Recalculate all-time stats once after all weeks are processed
    await recalculateAllTimeStats(groupId)

    // Batch invalidate cache for all entries from all weeks (deferred for performance)
    if (allEntriesForInvalidation.length > 0) {
      const { invalidateEntryStatsCacheBatch } = await import('@/lib/chart-deep-dive')
      await invalidateEntryStatsCacheBatch(groupId, allEntriesForInvalidation)
    }

    // Calculate trends only for the latest week
    if (weeksInOrder.length > 0) {
      const latestWeek = weeksInOrder[weeksInOrder.length - 1] // Last week is the latest
      const { calculateGroupTrends } = await import('@/lib/group-trends')
      await calculateGroupTrends(groupId, latestWeek, trackingDayOfWeek)
    }

    // Trigger records calculation after charts are generated
    if (weeksInOrder.length > 0) {
      // Collect all entries that appeared in newly generated week(s)
      const newEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId,
          weekStart: { in: weeksInOrder },
        },
        select: {
          entryKey: true,
          chartType: true,
          position: true,
        },
      })

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

      // Check if GroupRecords exists
      const existingRecords = await getGroupRecords(groupId)
      const useIncremental = existingRecords && existingRecords.status === 'completed'

      // Delete existing GroupRecords if exists (for fresh calculation)
      if (existingRecords) {
        try {
          await prisma.groupRecords.delete({
            where: { groupId },
          })
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
      } catch (err) {
        console.error('[Records] Error creating GroupRecords:', err)
        // Don't proceed if we can't create the record
      }

      // Trigger records calculation via separate API endpoint
      // This ensures the calculation runs in its own execution context
      // and won't be terminated when this request completes (important for serverless)
      try {
        // Get base URL from environment or request
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!baseUrl) {
          if (process.env.VERCEL_URL) {
            baseUrl = `https://${process.env.VERCEL_URL}`
          } else {
            // Try to get from request headers (for local development)
            const origin = request.headers.get('origin')
            const host = request.headers.get('host')
            baseUrl = origin || (host ? `https://${host}` : 'http://localhost:3000')
          }
        }
        
        const calculateUrl = `${baseUrl}/api/groups/${groupId}/records/calculate`
        
        // Call the calculation endpoint (fire-and-forget)
        fetch(calculateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newEntries: useIncremental ? uniqueEntries : undefined }),
        }).catch((error) => {
          console.error('[Records] Error triggering calculation endpoint:', error)
          // Update status to failed if we can't even trigger the calculation
          prisma.groupRecords.update({
            where: { groupId },
            data: { status: 'failed' },
          }).catch((err) => {
            console.error('[Records] Error updating records status to failed:', err)
          })
        })
      } catch (err) {
        console.error('[Records] Error setting up calculation endpoint call:', err)
        // Update status to failed
        prisma.groupRecords.update({
          where: { groupId },
          data: { status: 'failed' },
        }).catch((updateErr) => {
          console.error('[Records] Error updating records status to failed:', updateErr)
        })
      }
    }
  } catch (error: any) {
    console.error('Error generating charts:', error)
    
    // Release lock on error
    await prisma.group.update({
      where: { id: groupId },
      data: {
        chartGenerationInProgress: false,
        chartGenerationStartedAt: null,
        chartGenerationProgress: Prisma.JsonNull,
      },
    }).catch((err) => {
      console.error('Error releasing lock after error:', err)
    })
    
    // Check if error has failed users information (from abort logic)
    if (allFailedUsers && allFailedUsers.size > 0) {
      return NextResponse.json(
        {
          error: shouldAbortGeneration 
            ? 'Chart generation aborted due to too many user failures'
            : 'Chart generation completed with some user failures',
          failedUsers: Array.from(allFailedUsers),
          aborted: shouldAbortGeneration,
        },
        { status: shouldAbortGeneration ? 400 : 200 }
      )
    }
    
    // Handle Prisma validation errors
    if (error.message && error.message.includes('did not match the expected pattern')) {
      return NextResponse.json(
        { error: 'Invalid data format detected. Please check that all group members have valid Last.fm usernames and try again.' },
        { status: 400 }
      )
    }
    
    // Return error response instead of throwing (prevents 500)
    // Always include failedUsers array (even if empty) so frontend can check for it
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate charts',
        failedUsers: allFailedUsers && allFailedUsers.size > 0 ? Array.from(allFailedUsers) : [],
        aborted: allFailedUsers && allFailedUsers.size > 0 ? shouldAbortGeneration : false,
      },
      { status: 500 }
    )
  }

  // Update group icon if dynamic icon is enabled
  // Don't await - let it run in background to avoid blocking the response
  updateGroupIconFromChart(groupId).catch((error) => {
    console.error('Error updating group icon after chart generation:', error)
  })

  // Release lock
  await prisma.group.update({
    where: { id: groupId },
    data: {
      chartGenerationInProgress: false,
      chartGenerationStartedAt: null,
      chartGenerationProgress: Prisma.JsonNull,
    },
  })

  // Get updated stats
  const weeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Return success response, but include failed users info if any
  const response: any = { weeklyStats }
  if (allFailedUsers.size > 0) {
    response.failedUsers = Array.from(allFailedUsers)
    response.aborted = false
  }

  return NextResponse.json(response)
}


