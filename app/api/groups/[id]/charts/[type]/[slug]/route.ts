import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
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
    const { group } = await checkGroupAccessForAPI(params.id)

    const chartType = params.type as ChartType
    if (!['artists', 'tracks', 'albums'].includes(chartType)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })
    }

    // Find entry by slug to get entryKey
    let entry = await prisma.groupChartEntry.findFirst({
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
      orderBy: {
        weekStart: 'desc',
      },
    })

    // Fallback: if not found by slug, try to find by matching entryKey pattern
    // This handles cases where the slug field might not be set or doesn't match exactly
    if (!entry) {
      const { generateSlug } = await import('@/lib/chart-slugs')
      // Try to find entries where the slug would match the entryKey
      const allEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType,
        },
        select: {
          entryKey: true,
          name: true,
          artist: true,
        },
        orderBy: {
          weekStart: 'desc',
        },
      })

      // Find entry where slug would match entryKey
      for (const e of allEntries) {
        const expectedSlug = generateSlug(e.entryKey, chartType)
        if (expectedSlug === params.slug) {
          entry = e
          break
        }
      }
    }

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

