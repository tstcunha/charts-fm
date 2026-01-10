import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { ChartType } from '@/lib/chart-slugs'

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
    const { group } = await checkGroupAccessForAPI(params.id)

    // Get query params for chart type
    const url = new URL(request.url)
    const chartType = url.searchParams.get('type') || 'artists'
    const validChartTypes: ChartType[] = ['artists', 'tracks', 'albums']
    
    if (!validChartTypes.includes(chartType as ChartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    const chartMode = (group.chartMode || 'plays_only') as string
    const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

    // Query all #1 entries for this chart type, ordered by week (most recent first)
    const numberOneEntries = await prisma.groupChartEntry.findMany({
      where: {
        groupId: group.id,
        chartType: chartType as ChartType,
        position: 1,
      },
      orderBy: {
        weekStart: 'desc',
      },
      select: {
        weekStart: true,
        entryKey: true,
        name: true,
        artist: true,
        slug: true,
        playcount: true,
        vibeScore: true,
      },
    })

    // Format entries with week information
    const entries = numberOneEntries.map((entry) => {
      const weekStartFormatted = formatDateWritten(entry.weekStart)
      
      // Determine value to display (VS score if available and showVS is true, otherwise playcount)
      let value: number
      if (showVS && entry.vibeScore !== null && entry.vibeScore !== undefined) {
        value = entry.vibeScore
      } else {
        value = entry.playcount
      }

      return {
        weekStart: entry.weekStart.toISOString(),
        weekStartFormatted,
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist,
        slug: entry.slug,
        value,
        isVS: showVS && entry.vibeScore !== null && entry.vibeScore !== undefined,
        playcount: entry.playcount,
      }
    })

    return NextResponse.json({
      chartType,
      showVS,
      entries,
    })
  } catch (error) {
    console.error('Error fetching chart toppers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chart toppers' },
      { status: 500 }
    )
  }
}

