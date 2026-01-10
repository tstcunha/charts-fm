import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getGroupRecords } from '@/lib/group-records'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await checkGroupAccessForAPI(params.id)

    // Try to get from cached records first
    const records = await getGroupRecords(group.id)
    
    if (records && records.status === 'completed') {
      const recordsData = records.records as any
      return NextResponse.json({
        artist: recordsData.mostWeeksOnChart?.artists || null,
        track: recordsData.mostWeeksOnChart?.tracks || null,
        album: recordsData.mostWeeksOnChart?.albums || null,
      })
    }

    // Fallback: query ChartEntryStats directly for preview
    const [artistRecord, trackRecord, albumRecord] = await Promise.all([
      prisma.chartEntryStats.findFirst({
        where: { groupId: group.id, chartType: 'artists' },
        orderBy: { totalWeeksCharting: 'desc' },
      }),
      prisma.chartEntryStats.findFirst({
        where: { groupId: group.id, chartType: 'tracks' },
        orderBy: { totalWeeksCharting: 'desc' },
      }),
      prisma.chartEntryStats.findFirst({
        where: { groupId: group.id, chartType: 'albums' },
        orderBy: { totalWeeksCharting: 'desc' },
      }),
    ])

    // Get entry details
    const [artistEntry, trackEntry, albumEntry] = await Promise.all([
      artistRecord ? prisma.groupChartEntry.findFirst({
        where: { groupId: group.id, chartType: 'artists', entryKey: artistRecord.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      }) : null,
      trackRecord ? prisma.groupChartEntry.findFirst({
        where: { groupId: group.id, chartType: 'tracks', entryKey: trackRecord.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      }) : null,
      albumRecord ? prisma.groupChartEntry.findFirst({
        where: { groupId: group.id, chartType: 'albums', entryKey: albumRecord.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      }) : null,
    ])

    return NextResponse.json({
      artist: artistRecord && artistEntry ? {
        entryKey: artistRecord.entryKey,
        name: artistEntry.name,
        value: artistRecord.totalWeeksCharting,
        slug: artistRecord.slug,
      } : null,
      track: trackRecord && trackEntry ? {
        entryKey: trackRecord.entryKey,
        name: trackEntry.name,
        artist: trackEntry.artist,
        value: trackRecord.totalWeeksCharting,
        slug: trackRecord.slug,
      } : null,
      album: albumRecord && albumEntry ? {
        entryKey: albumRecord.entryKey,
        name: albumEntry.name,
        artist: albumEntry.artist,
        value: albumRecord.totalWeeksCharting,
        slug: albumRecord.slug,
      } : null,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching records preview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch records preview' },
      { status: 500 }
    )
  }
}

