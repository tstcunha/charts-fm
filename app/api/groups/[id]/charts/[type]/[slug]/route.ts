import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import {
  getEntryStats,
  getEntryMajorDriver,
  getEntryTotals,
  getArtistChartEntries,
  getArtistNumberOnes,
} from '@/lib/chart-deep-dive'
import { ChartType } from '@/lib/chart-slugs'

export async function GET(
  request: Request,
  { params }: { params: { id: string; type: string; slug: string } }
) {
  try {
    const { group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const chartType = params.type as ChartType
    if (!['artists', 'tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    // Find entry by slug to get entryKey
    const entry = await prisma.groupChartEntry.findFirst({
      where: {
        groupId: group.id,
        chartType,
        slug: params.slug,
      },
      select: {
        entryKey: true,
        name: true,
        artist: true,
      },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Fetch all data in parallel
    const [stats, majorDriver, totals, artistEntries, numberOnes] = await Promise.all([
      getEntryStats(group.id, chartType, entry.entryKey),
      getEntryMajorDriver(group.id, chartType, entry.entryKey, group.chartMode || 'vs'),
      getEntryTotals(group.id, chartType, entry.entryKey),
      chartType === 'artists' ? getArtistChartEntries(group.id, entry.name) : Promise.resolve(null),
      chartType === 'artists' ? getArtistNumberOnes(group.id, entry.name) : Promise.resolve(null),
    ])

    return NextResponse.json({
      stats,
      majorDriver,
      totals,
      artistEntries: chartType === 'artists' ? artistEntries : null,
      numberOnes: chartType === 'artists' ? numberOnes : null,
    })
  } catch (error) {
    console.error('Error fetching deep dive data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deep dive data' },
      { status: 500 }
    )
  }
}

