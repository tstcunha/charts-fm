import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLastChartWeek, deleteOverlappingCharts } from '@/lib/group-service'
import { getWeekStartForDay, getWeekEndForDay, getLastNFinishedWeeksForDay } from '@/lib/weekly-utils'

// GET - Get group settings
export async function GET(
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

  // Get group with settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      chartSize: true,
      trackingDayOfWeek: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Only owner can view settings
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can view settings' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    chartSize: group.chartSize || 10,
    trackingDayOfWeek: group.trackingDayOfWeek ?? 0,
  })
}

// PATCH - Update group settings
export async function PATCH(
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

  // Get current group settings
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
      chartSize: true,
      trackingDayOfWeek: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Only owner can update settings
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can update settings' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const { chartSize, trackingDayOfWeek } = body

  // Validate chartSize
  if (chartSize !== undefined) {
    if (![10, 20, 50, 100].includes(chartSize)) {
      return NextResponse.json(
        { error: 'chartSize must be 10, 20, 50, or 100' },
        { status: 400 }
      )
    }
  }

  // Validate trackingDayOfWeek
  if (trackingDayOfWeek !== undefined) {
    if (typeof trackingDayOfWeek !== 'number' || trackingDayOfWeek < 0 || trackingDayOfWeek > 6) {
      return NextResponse.json(
        { error: 'trackingDayOfWeek must be a number between 0 and 6' },
        { status: 400 }
      )
    }
  }

  const oldTrackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const newTrackingDayOfWeek = trackingDayOfWeek !== undefined ? trackingDayOfWeek : oldTrackingDayOfWeek
  const trackingDayChanged = oldTrackingDayOfWeek !== newTrackingDayOfWeek

  // If tracking day changed, handle overlap cleanup
  if (trackingDayChanged) {
    // Calculate what the next week would be with the new tracking day
    const now = new Date()
    const nextWeekStart = getWeekStartForDay(now, newTrackingDayOfWeek)
    const nextWeekEnd = getWeekEndForDay(nextWeekStart, newTrackingDayOfWeek)

    // Get the last existing chart
    const lastChartWeek = await getLastChartWeek(groupId)

    if (lastChartWeek) {
      // Check if the next week with new tracking day overlaps with the last chart
      const lastChartWeekEnd = getWeekEndForDay(lastChartWeek, oldTrackingDayOfWeek)
      
      // Check if they overlap
      const overlaps = nextWeekStart < lastChartWeekEnd && lastChartWeek < nextWeekEnd

      if (overlaps) {
        // Delete the last chart
        await prisma.groupWeeklyStats.deleteMany({
          where: {
            groupId,
            weekStart: lastChartWeek,
          },
        })
        // Also delete associated chart entries
        await prisma.groupChartEntry.deleteMany({
          where: {
            groupId,
            weekStart: lastChartWeek,
          },
        })
      }

      // Also clean up any overlapping charts for the last 5 weeks that would be recalculated
      const weeksToRegenerate = getLastNFinishedWeeksForDay(5, newTrackingDayOfWeek)
      for (const weekStart of weeksToRegenerate) {
        const weekEnd = getWeekEndForDay(weekStart, newTrackingDayOfWeek)
        await deleteOverlappingCharts(groupId, weekStart, weekEnd)
      }
    }
  }

  // Update group settings
  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(chartSize !== undefined && { chartSize }),
      ...(trackingDayOfWeek !== undefined && { trackingDayOfWeek: newTrackingDayOfWeek }),
    },
    select: {
      chartSize: true,
      trackingDayOfWeek: true,
    },
  })

  return NextResponse.json({
    chartSize: updatedGroup.chartSize || 10,
    trackingDayOfWeek: updatedGroup.trackingDayOfWeek ?? 0,
  })
}

