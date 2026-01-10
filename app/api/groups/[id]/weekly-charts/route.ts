import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getGroupWeeklyStats } from '@/lib/group-queries'
import { prisma } from '@/lib/prisma'

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

// Helper function to get entry key for matching
function getEntryKey(item: { name: string; artist?: string }, chartType: string): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    const weeklyStats = await getGroupWeeklyStats(group.id)
    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Get VS data and position changes for latest week if we have stats
    let vsMap: Map<string, number> = new Map()
    let positionChangeMap: Map<string, number | null> = new Map()
    let entryTypeMap: Map<string, string | null> = new Map()
    
    if (weeklyStats.length > 0) {
      const latestWeek = weeklyStats[0]
      const normalizedWeekStart = new Date(latestWeek.weekStart)
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
      
      chartEntries.forEach((entry) => {
        const key = `${entry.chartType}|${entry.entryKey}`
        if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
          vsMap.set(key, entry.vibeScore)
        }
        positionChangeMap.set(key, entry.positionChange)
        entryTypeMap.set(key, entry.entryType)
      })
    }

    // Format latest week data
    let latestWeekData = null
    if (weeklyStats.length > 0) {
      const latestWeek = weeklyStats[0]
      const weekStartDate = new Date(latestWeek.weekStart)
      const weekEndDate = getWeekEndDate(weekStartDate)
      
      latestWeekData = {
        weekStart: latestWeek.weekStart.toISOString(),
        weekStartFormatted: formatDateWritten(weekStartDate),
        weekEndFormatted: formatDateWritten(weekEndDate),
        topArtists: (latestWeek.topArtists as any[]) || [],
        topTracks: (latestWeek.topTracks as any[]) || [],
        topAlbums: (latestWeek.topAlbums as any[]) || [],
        vsMap: Object.fromEntries(vsMap),
        positionChangeMap: Object.fromEntries(positionChangeMap),
        entryTypeMap: Object.fromEntries(entryTypeMap),
      }
    }

    return NextResponse.json({
      latestWeek: latestWeekData,
      showVS,
      chartMode,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching weekly charts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly charts' },
      { status: 500 }
    )
  }
}

