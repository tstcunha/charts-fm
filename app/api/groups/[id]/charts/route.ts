import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSuperuser } from '@/lib/admin'
import { calculateGroupWeeklyStats, deleteOverlappingCharts, updateGroupIconFromChart } from '@/lib/group-service'
import { getLastNFinishedWeeks, getLastNFinishedWeeksForDay, getWeekEndForDay } from '@/lib/weekly-utils'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import { ChartGenerationLogger } from '@/lib/chart-generation-logger'

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

  const chartSize = group.chartSize || 10
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as 'vs' | 'vs_weighted' | 'plays_only'

  // Check if user is a superuser and get request body
  const superuser = await getSuperuser()
  const isSuperuser = superuser !== null
  
  let numberOfWeeks = 5 // Default to 5 weeks
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

  // Initialize logger (infrastructure kept for future use)
  const logger = new ChartGenerationLogger(groupId)

  // Calculate stats for last N finished weeks using group's tracking day
  const weeks = getLastNFinishedWeeksForDay(numberOfWeeks, trackingDayOfWeek)
  
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
  try {
    for (let i = 0; i < weeksInOrder.length; i++) {
      const weekStart = weeksInOrder[i]
      await calculateGroupWeeklyStats(groupId, weekStart, chartSize, trackingDayOfWeek, chartMode, logger, members)
      
      // Small delay between weeks
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Recalculate all-time stats once after all weeks are processed
    await recalculateAllTimeStats(groupId, logger)
  } catch (error: any) {
    console.error('Error generating charts:', error)
    
    // Handle Prisma validation errors
    if (error.message && error.message.includes('did not match the expected pattern')) {
      return NextResponse.json(
        { error: 'Invalid data format detected. Please check that all group members have valid Last.fm usernames and try again.' },
        { status: 400 }
      )
    }
    
    // Re-throw other errors
    throw error
  }

  // Update group icon if dynamic icon is enabled
  // Don't await - let it run in background to avoid blocking the response
  updateGroupIconFromChart(groupId).catch((error) => {
    console.error('Error updating group icon after chart generation:', error)
  })

  // Get updated stats
  const weeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })

  return NextResponse.json({ weeklyStats })
}

