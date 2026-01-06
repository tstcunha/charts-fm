import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import { getLastChartWeek } from '@/lib/group-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Fetch members with images
    const membersWithImages = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    const isOwner = user.id === group.creatorId
    const chartMode = (group.chartMode || 'plays_only') as string
    const colorTheme = (group.colorTheme || 'yellow') as string
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0

    // Calculate tracking day info and next chart date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const trackingDayName = dayNames[trackingDayOfWeek]
    
    const now = new Date()
    const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
    const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
    const nextChartDate = currentWeekEnd
    const nextChartDateFormatted = formatWeekLabel(nextChartDate)
    const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Check if charts can be updated
    const lastChartWeek = await getLastChartWeek(group.id)
    let canUpdateCharts = false
    
    if (!lastChartWeek) {
      // No charts exist, can update
      canUpdateCharts = true
    } else {
      // Check if current week has finished (currentWeekEnd is in the past)
      if (currentWeekEnd < now) {
        // Check if we need to generate the current finished week
        const nextExpectedWeek = new Date(lastChartWeek)
        nextExpectedWeek.setUTCDate(nextExpectedWeek.getUTCDate() + 7)
        
        // If next expected week is before or equal to current finished week, we can update
        if (nextExpectedWeek <= currentWeekStart) {
          canUpdateCharts = true
        }
      }
    }

    const chartGenerationInProgress = group.chartGenerationInProgress || false
    // Can only update if not already in progress
    canUpdateCharts = canUpdateCharts && !chartGenerationInProgress

    // Get caption from stored data (set when icon is updated)
    const imageCaption = group.dynamicIconCaption || null

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        image: group.image,
        colorTheme,
        chartMode,
        trackingDayOfWeek,
        trackingDayName,
        creator: {
          id: group.creator.id,
          name: group.creator.name,
          lastfmUsername: group.creator.lastfmUsername,
        },
        memberCount: group._count.members,
      },
      isOwner,
      members: membersWithImages.map((m) => ({
        id: m.id,
        userId: m.userId,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          lastfmUsername: m.user.lastfmUsername,
          image: m.user.image,
        },
      })),
      daysUntilNextChart,
      nextChartDateFormatted,
      canUpdateCharts,
      chartGenerationInProgress,
      imageCaption,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching group hero data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group data' },
      { status: 500 }
    )
  }
}

