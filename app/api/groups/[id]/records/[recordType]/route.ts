import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getRecordTypeFieldMapping, isRecordTypeSupported, isArtistSpecificRecordType, getArtistAggregationRecords } from '@/lib/group-records'
import { ChartType } from '@/lib/chart-slugs'
import { calculateEntryStatsBatch } from '@/lib/chart-deep-dive'

export async function GET(
  request: Request,
  { params }: { params: { id: string; recordType: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    // Validate record type
    if (!isRecordTypeSupported(params.recordType)) {
      return NextResponse.json({ error: 'Unsupported record type' }, { status: 400 })
    }

    // Handle artist-specific record types
    if (isArtistSpecificRecordType(params.recordType)) {
      const entries = await getArtistAggregationRecords(group.id, params.recordType, 100)
      
      return NextResponse.json({
        recordType: params.recordType,
        entryType: 'artists', // Artist-specific records always return artists
        entries,
      })
    }

    const fieldName = getRecordTypeFieldMapping(params.recordType)
    if (!fieldName) {
      return NextResponse.json({ error: 'Invalid record type mapping' }, { status: 400 })
    }

    // Get query params for entry type filter
    const url = new URL(request.url)
    const entryType = url.searchParams.get('type') || 'artists'
    const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']
    
    if (!chartTypes.includes(entryType as ChartType)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
    }

    // First, get a rough estimate of top entries (even if stats are stale)
    // This helps us identify which entries are likely to be in the top 100
    const roughTopEntries = await prisma.chartEntryStats.findMany({
      where: {
        groupId: group.id,
        chartType: entryType as ChartType,
      },
      orderBy: {
        [fieldName]: 'desc',
      },
      take: 150, // Get slightly more than 100 to account for reordering after calculation
      select: {
        entryKey: true,
        statsStale: true,
      },
    })

    // Also get entries that might not have ChartEntryStats yet but should be included
    // (entries that charted but don't have stats records)
    const entryKeysWithStats = new Set(roughTopEntries.map(e => e.entryKey))
    const staleEntryKeys = roughTopEntries
      .filter(e => e.statsStale)
      .map(e => e.entryKey)

    // Get additional entries that might be in top 100 but don't have stats yet
    // We'll get entries with the most chart appearances that don't have ChartEntryStats
    let missingEntryKeys: string[] = []
    if (entryKeysWithStats.size > 0) {
      // Get all entries that charted but don't have ChartEntryStats
      const entriesWithoutStats = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          chartType: entryType as ChartType,
          entryKey: { notIn: Array.from(entryKeysWithStats) },
        },
        select: {
          entryKey: true,
        },
        distinct: ['entryKey'],
      })
      
      // Get top 50 by counting weeks (using raw SQL for efficiency)
      if (entriesWithoutStats.length > 0) {
        const entryKeysArray = entriesWithoutStats.map(e => e.entryKey)
        const topEntriesByWeeks = await prisma.$queryRaw<Array<{
          entryKey: string
        }>>`
          SELECT 
            "entryKey",
            COUNT(DISTINCT "weekStart")::bigint as weeks_count
          FROM "group_chart_entries"
          WHERE "groupId" = ${group.id}::text
            AND "chartType" = ${entryType}
            AND "entryKey" = ANY(${entryKeysArray}::text[])
          GROUP BY "entryKey"
          ORDER BY weeks_count DESC
          LIMIT 50
        `
        missingEntryKeys = topEntriesByWeeks.map(e => e.entryKey)
      }
    } else {
      // If no entries have stats, get top entries by weeks
      const topEntriesByWeeks = await prisma.$queryRaw<Array<{
        entryKey: string
      }>>`
        SELECT 
          "entryKey",
          COUNT(DISTINCT "weekStart")::bigint as weeks_count
        FROM "group_chart_entries"
        WHERE "groupId" = ${group.id}::text
          AND "chartType" = ${entryType}
        GROUP BY "entryKey"
        ORDER BY weeks_count DESC
        LIMIT 50
      `
      missingEntryKeys = topEntriesByWeeks.map(e => e.entryKey)
    }

    // Combine all entry keys that need calculation
    const allEntryKeysToCalculate = Array.from(new Set([
      ...staleEntryKeys,
      ...missingEntryKeys,
    ]))

    // Calculate stats for entries that need it (in bulk)
    if (allEntryKeysToCalculate.length > 0) {
      await calculateEntryStatsBatch(group.id, entryType as ChartType, allEntryKeysToCalculate)
    }

    // Now query ChartEntryStats ordered by the appropriate field, limit 100
    // This will have accurate, up-to-date stats
    const stats = await prisma.chartEntryStats.findMany({
      where: {
        groupId: group.id,
        chartType: entryType as ChartType,
      },
      orderBy: {
        [fieldName]: 'desc',
      },
      take: 100,
      select: {
        entryKey: true,
        slug: true,
        [fieldName]: true,
      },
    })

    // Get entry details (name, artist) from GroupChartEntry
    const entryKeys = stats.map(s => s.entryKey)
    const entries = await prisma.groupChartEntry.findMany({
      where: {
        groupId: group.id,
        chartType: entryType as ChartType,
        entryKey: { in: entryKeys },
      },
      select: {
        entryKey: true,
        name: true,
        artist: true,
      },
      distinct: ['entryKey'],
    })

    // Create a map for quick lookup
    const entryMap = new Map(entries.map(e => [e.entryKey, e]))

    // Combine stats with entry details and filter out entries with value 0
    const rankedEntries = stats
      .map((stat, index) => {
        const entry = entryMap.get(stat.entryKey)
        if (!entry) return null

        const value = stat[fieldName as keyof typeof stat] as number
        
        // Filter out entries with value 0
        if (value === 0 || value === null || value === undefined) {
          return null
        }

        return {
          rank: index + 1,
          entryKey: stat.entryKey,
          name: entry.name,
          artist: entry.artist,
          slug: stat.slug,
          value,
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      // Re-rank after filtering
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))

    return NextResponse.json({
      recordType: params.recordType,
      entryType,
      entries: rankedEntries,
    })
  } catch (error) {
    console.error('Error fetching record details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch record details' },
      { status: 500 }
    )
  }
}

