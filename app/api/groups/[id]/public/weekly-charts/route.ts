import { NextResponse } from 'next/server'
import { getGroupByIdForAccess } from '@/lib/group-queries'
import { getGroupWeeklyStats } from '@/lib/group-queries'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Helper function to get week end date (6 days after week start)
function getWeekEndDate(weekStart: Date): Date {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  return weekEnd
}

// Helper function to format date as "Dec. 28, 2025"
function formatDateWritten(date: Date): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get user if authenticated to check membership
    const session = await getSession()
    let userId: string | null = null
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      userId = user?.id || null
    }
    
    // Use getGroupByIdForAccess to get the group (works for both public and private groups)
    const group = await getGroupByIdForAccess(params.id, userId)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const weeklyStats = await getGroupWeeklyStats(group.id)
    // @ts-ignore - Prisma client will be regenerated after migration
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get VS data and position changes for all weeks if we have stats
    const weeksData = []
    if (weeklyStats.length > 0) {
      for (const week of weeklyStats) {
        // Normalize weekStart to start of day in UTC for comparison
        const normalizedWeekStart = new Date(week.weekStart)
        normalizedWeekStart.setUTCHours(0, 0, 0, 0)
        
        const chartEntries = await prisma.groupChartEntry.findMany({
          where: {
            groupId: group.id,
            weekStart: normalizedWeekStart,
          },
          select: {
            chartType: true,
            entryKey: true,
            vibeScore: true,
            positionChange: true,
            entryType: true,
          },
        })
        
        const vsMap = new Map<string, number>()
        const positionChangeMap = new Map<string, number | null>()
        const entryTypeMap = new Map<string, string | null>()
        chartEntries.forEach((entry) => {
          const key = `${entry.chartType}|${entry.entryKey}`
          if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
            vsMap.set(key, entry.vibeScore)
          }
          positionChangeMap.set(key, entry.positionChange)
          entryTypeMap.set(key, entry.entryType)
        })

        const weekStartDate = new Date(week.weekStart)
        const weekEndDate = getWeekEndDate(weekStartDate)
        
        weeksData.push({
          id: week.id,
          weekStart: week.weekStart.toISOString(),
          weekStartFormatted: formatDateWritten(weekStartDate),
          weekEndFormatted: formatDateWritten(weekEndDate),
          topArtists: (week.topArtists as any[]) || [],
          topTracks: (week.topTracks as any[]) || [],
          topAlbums: (week.topAlbums as any[]) || [],
          vsMap: Object.fromEntries(vsMap),
          positionChangeMap: Object.fromEntries(positionChangeMap),
          entryTypeMap: Object.fromEntries(entryTypeMap),
        })
      }
    }

    // Calculate quick stats
    let totalPlaysThisWeek = 0
    if (weeklyStats.length > 0) {
      const latestWeek = weeklyStats[0]
      const artists = (latestWeek.topArtists as any[]) || []
      const tracks = (latestWeek.topTracks as any[]) || []
      const albums = (latestWeek.topAlbums as any[]) || []
      
      totalPlaysThisWeek = artists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
                          tracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
                          albums.reduce((sum, a) => sum + (a.playcount || 0), 0)
    }

    return NextResponse.json({
      weeks: weeksData,
      showVS,
      chartMode,
      totalPlaysThisWeek,
      weeksTracked: weeklyStats.length,
    })
  } catch (error: any) {
    console.error('Error fetching public weekly charts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly charts' },
      { status: 500 }
    )
  }
}

