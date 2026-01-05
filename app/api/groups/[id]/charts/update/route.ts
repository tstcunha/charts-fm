import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireGroupMembership } from '@/lib/group-auth'
import { calculateGroupWeeklyStats, deleteOverlappingCharts, updateGroupIconFromChart, getLastChartWeek } from '@/lib/group-service'
import { getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from '@/lib/weekly-utils'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { ChartGenerationLogger } from '@/lib/chart-generation-logger'

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
  const logger = new ChartGenerationLogger(groupId)

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
    for (const weekStart of weeksToGenerate) {
      const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)
      
      // Delete overlapping charts (handles tracking date changes automatically)
      await deleteOverlappingCharts(groupId, weekStart, weekEnd)
      
      // Generate chart for the week
      await calculateGroupWeeklyStats(
        groupId,
        weekStart,
        chartSize,
        trackingDayOfWeek,
        chartMode,
        logger,
        members
      )
      
      // Small delay between weeks
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Recalculate all-time stats once after all weeks are processed
    await recalculateAllTimeStats(groupId, logger)

    // Update group icon if dynamic icon is enabled (don't await - let it run in background)
    updateGroupIconFromChart(groupId).catch((error) => {
      console.error('Error updating group icon after chart generation:', error)
    })

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

