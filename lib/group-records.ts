// Functions to calculate and cache group records
import { prisma } from './prisma'
import { ChartType, generateSlug } from './chart-slugs'
import { RecordsCalculationLogger } from './records-calculation-logger'

export interface RecordHolder {
  entryKey: string
  chartType: ChartType
  name: string
  artist?: string | null
  value: number
  slug: string
}

export interface GroupRecordsData {
  // Artists/Tracks/Albums shared records
  mostWeeksOnChart: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostWeeksAtOne: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostWeeksInTop10: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostConsecutiveWeeks: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostConsecutiveWeeksAtOne: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostConsecutiveWeeksInTop10: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostTotalVS: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  mostPlays: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  totalDifferentEntriesAtOne: {
    artists: number
    tracks: number
    albums: number
  }
  totalDifferentEntriesCharted: {
    artists: number
    tracks: number
    albums: number
  }
  mostPopular: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  longestTimeBetweenAppearances: {
    artists: RecordHolder | null
    tracks: RecordHolder | null
    albums: RecordHolder | null
  }
  // Artist-specific records
  artistMostNumberOneSongs: RecordHolder | null
  artistMostNumberOneAlbums: RecordHolder | null
  artistMostSongsInTop10: RecordHolder | null
  artistMostAlbumsInTop10: RecordHolder | null
  artistMostSongsCharted: RecordHolder | null
  artistMostAlbumsCharted: RecordHolder | null
  // User records
  userMostVS: {
    userId: string
    name: string
    value: number
  } | null
  userMostPlays: {
    userId: string
    name: string
    value: number
  } | null
  userMostEntries: {
    userId: string
    name: string
    value: number
  } | null
  userLeastEntries: {
    userId: string
    name: string
    value: number
  } | null
  userMostNumberOnes: {
    userId: string
    name: string
    value: number
  } | null
  userMostWeeksContributing: {
    userId: string
    name: string
    value: number
  } | null
  userTasteMaker: {
    userId: string
    name: string
    value: number
  } | null
  userPeakPerformer: {
    userId: string
    name: string
    value: number
  } | null
}

/**
 * Get cached records for a group
 */
export async function getGroupRecords(groupId: string) {
  return await prisma.groupRecords.findUnique({
    where: { groupId },
  })
}

/**
 * Phase 1: Query ChartEntryStats cache for pre-calculated metrics
 */
async function calculatePhase1Records(
  groupId: string,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 1: Query ChartEntryStats cache')
  
  const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']
  const records: Partial<GroupRecordsData> = {
    mostWeeksOnChart: { artists: null, tracks: null, albums: null },
    mostConsecutiveWeeks: { artists: null, tracks: null, albums: null },
    mostWeeksInTop10: { artists: null, tracks: null, albums: null },
    mostPlays: { artists: null, tracks: null, albums: null },
  }

  let totalEntries = 0

  for (const chartType of chartTypes) {
    // Most weeks on chart
    const mostWeeks = await prisma.chartEntryStats.findFirst({
      where: { groupId, chartType },
      orderBy: { totalWeeksCharting: 'desc' },
      include: {
        group: {
          select: {
            chartEntries: {
              where: { chartType, entryKey: { in: [] } }, // Will be populated
              select: { name: true, artist: true, entryKey: true },
              take: 1,
            },
          },
        },
      },
    })

    if (mostWeeks) {
      // Get entry details from GroupChartEntry
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: mostWeeks.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostWeeksOnChart![chartType] = {
          entryKey: mostWeeks.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: mostWeeks.totalWeeksCharting,
          slug: mostWeeks.slug,
        }
      }
    }

    // Most consecutive weeks
    const mostConsecutive = await prisma.chartEntryStats.findFirst({
      where: { groupId, chartType },
      orderBy: { longestStreak: 'desc' },
    })

    if (mostConsecutive) {
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: mostConsecutive.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostConsecutiveWeeks![chartType] = {
          entryKey: mostConsecutive.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: mostConsecutive.longestStreak,
          slug: mostConsecutive.slug,
        }
      }
    }

    // Most weeks in top 10
    const mostTop10 = await prisma.chartEntryStats.findFirst({
      where: { groupId, chartType },
      orderBy: { weeksInTop10: 'desc' },
    })

    if (mostTop10) {
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: mostTop10.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostWeeksInTop10![chartType] = {
          entryKey: mostTop10.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: mostTop10.weeksInTop10,
          slug: mostTop10.slug,
        }
      }
    }

    // Most plays
    const mostPlaysEntry = await prisma.chartEntryStats.findFirst({
      where: { groupId, chartType },
      orderBy: { totalPlays: 'desc' },
    })

    if (mostPlaysEntry) {
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: mostPlaysEntry.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostPlays![chartType] = {
          entryKey: mostPlaysEntry.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: mostPlaysEntry.totalPlays,
          slug: mostPlaysEntry.slug,
        }
      }
    }

    // Count total entries
    const count = await prisma.chartEntryStats.count({
      where: { groupId, chartType },
    })
    totalEntries += count
  }

  await phaseStart.end(`Found ${totalEntries} entries in cache`)
  return records
}

/**
 * Phase 2: SQL aggregations for counts
 */
async function calculatePhase2Records(
  groupId: string,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 2: SQL aggregations')
  
  const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']
  const records: Partial<GroupRecordsData> = {
    mostWeeksAtOne: { artists: null, tracks: null, albums: null },
    mostTotalVS: { artists: null, tracks: null, albums: null },
    totalDifferentEntriesAtOne: { artists: 0, tracks: 0, albums: 0 },
    totalDifferentEntriesCharted: { artists: 0, tracks: 0, albums: 0 },
  }

  for (const chartType of chartTypes) {
    // Most weeks at #1 using SQL aggregation
    const mostWeeksAtOneResult = await prisma.$queryRaw<Array<{
      entryKey: string
      weeks_at_one: bigint
      name: string
      artist: string | null
    }>>`
      SELECT 
        gce."entryKey",
        COUNT(*)::bigint as weeks_at_one,
        MAX(gce.name) as name,
        MAX(gce.artist) as artist
      FROM "group_chart_entries" gce
      WHERE gce."groupId" = ${groupId}::text
        AND gce."chartType" = ${chartType}
        AND gce.position = 1
      GROUP BY gce."entryKey"
      ORDER BY weeks_at_one DESC
      LIMIT 1
    `

    if (mostWeeksAtOneResult.length > 0) {
      const result = mostWeeksAtOneResult[0]
      records.mostWeeksAtOne![chartType] = {
        entryKey: result.entryKey,
        chartType,
        name: result.name,
        artist: result.artist,
        value: Number(result.weeks_at_one),
        slug: generateSlug(result.entryKey, chartType),
      }
    }

    // Most total VS
    const mostVSResult = await prisma.chartEntryStats.findFirst({
      where: { groupId, chartType },
      orderBy: { totalVS: 'desc' },
    })

    if (mostVSResult && mostVSResult.totalVS) {
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: mostVSResult.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostTotalVS![chartType] = {
          entryKey: mostVSResult.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: mostVSResult.totalVS,
          slug: mostVSResult.slug,
        }
      }
    }

    // Total different entries at #1
    const totalAtOne = await prisma.groupChartEntry.findMany({
      where: { groupId, chartType, position: 1 },
      select: { entryKey: true },
      distinct: ['entryKey'],
    })
    records.totalDifferentEntriesAtOne![chartType] = totalAtOne.length

    // Total different entries charted
    const totalCharted = await prisma.groupChartEntry.findMany({
      where: { groupId, chartType },
      select: { entryKey: true },
      distinct: ['entryKey'],
    })
    records.totalDifferentEntriesCharted![chartType] = totalCharted.length
  }

  await phaseStart.end(`Processed ${chartTypes.length} chart types`)
  return records
}

/**
 * Phase 3: Incremental calculation for consecutive weeks (if newEntries provided)
 * Otherwise, calculate from ChartEntryStats cache
 */
async function calculatePhase3Records(
  groupId: string,
  existingRecords: GroupRecordsData | null,
  newEntries: Array<{ entryKey: string; chartType: ChartType; position: number }> | undefined,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 3: Incremental calculations')
  
  const records: Partial<GroupRecordsData> = {
    mostConsecutiveWeeksAtOne: { artists: null, tracks: null, albums: null },
    mostConsecutiveWeeksInTop10: { artists: null, tracks: null, albums: null },
    longestTimeBetweenAppearances: { artists: null, tracks: null, albums: null },
  }

  const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']

  // Safety check: ensure existingRecords has the required structure before using it
  if (newEntries && existingRecords && 
      existingRecords.mostConsecutiveWeeksAtOne && 
      existingRecords.mostConsecutiveWeeksInTop10) {
    // Incremental calculation - only check entries in new charts
    logger.setEntriesChecked(newEntries.length)
    
    // For consecutive weeks at #1, check entries that appeared at position 1
    const entriesAtOne = newEntries.filter(e => e.position === 1)
    
    for (const entry of entriesAtOne) {
      const currentRecord = existingRecords.mostConsecutiveWeeksAtOne?.[entry.chartType]
      if (!currentRecord) continue

      // Get entry's chart history to calculate consecutive weeks at #1
      const history = await prisma.groupChartEntry.findMany({
        where: {
          groupId,
          chartType: entry.chartType,
          entryKey: entry.entryKey,
          position: 1,
        },
        orderBy: { weekStart: 'asc' },
        select: { weekStart: true },
      })

      if (history.length > 0) {
        // Calculate longest streak at #1
        let longestStreak = 1
        let currentStreak = 1

        for (let i = 1; i < history.length; i++) {
          const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff <= 7) {
            currentStreak++
            longestStreak = Math.max(longestStreak, currentStreak)
          } else {
            currentStreak = 1
          }
        }

        if (longestStreak > currentRecord.value) {
          // New record found
          const entryDetails = await prisma.groupChartEntry.findFirst({
            where: { groupId, chartType: entry.chartType, entryKey: entry.entryKey },
            orderBy: { weekStart: 'desc' },
            select: { name: true, artist: true },
          })

          if (entryDetails) {
            records.mostConsecutiveWeeksAtOne![entry.chartType] = {
              entryKey: entry.entryKey,
              chartType: entry.chartType,
              name: entryDetails.name,
              artist: entryDetails.artist,
              value: longestStreak,
              slug: generateSlug(entry.entryKey, entry.chartType),
            }
            logger.incrementRecordsUpdated()
          }
        }
      }
    }

    // For consecutive weeks in top 10, check entries that appeared at position <= 10
    const entriesInTop10 = newEntries.filter(e => e.position <= 10)
    
    for (const entry of entriesInTop10) {
      const currentRecord = existingRecords.mostConsecutiveWeeksInTop10?.[entry.chartType]
      if (!currentRecord) continue

      const history = await prisma.groupChartEntry.findMany({
        where: {
          groupId,
          chartType: entry.chartType,
          entryKey: entry.entryKey,
          position: { lte: 10 },
        },
        orderBy: { weekStart: 'asc' },
        select: { weekStart: true },
      })

      if (history.length > 0) {
        let longestStreak = 1
        let currentStreak = 1

        for (let i = 1; i < history.length; i++) {
          const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
          if (daysDiff <= 7) {
            currentStreak++
            longestStreak = Math.max(longestStreak, currentStreak)
          } else {
            currentStreak = 1
          }
        }

        if (longestStreak > currentRecord.value) {
          const entryDetails = await prisma.groupChartEntry.findFirst({
            where: { groupId, chartType: entry.chartType, entryKey: entry.entryKey },
            orderBy: { weekStart: 'desc' },
            select: { name: true, artist: true },
          })

          if (entryDetails) {
            records.mostConsecutiveWeeksInTop10![entry.chartType] = {
              entryKey: entry.entryKey,
              chartType: entry.chartType,
              name: entryDetails.name,
              artist: entryDetails.artist,
              value: longestStreak,
              slug: generateSlug(entry.entryKey, entry.chartType),
            }
            logger.incrementRecordsUpdated()
          }
        }
      }
    }
  } else {
    // Full calculation - calculate consecutive weeks at #1 and in top 10 for all entries
    // This is expensive, so we'll use a simplified approach that checks ChartEntryStats
    // and then calculates streaks for top candidates only
    
    for (const chartType of chartTypes) {
      // Get entries that have appeared at #1
      const entriesAtOne = await prisma.groupChartEntry.findMany({
        where: { groupId, chartType, position: 1 },
        select: { entryKey: true },
        distinct: ['entryKey'],
      })

      let maxConsecutiveAtOne = 0
      let recordEntryAtOne: { entryKey: string; name: string; artist: string | null } | null = null

      // Check top 10 entries by total weeks at #1
      const topEntriesAtOne = await prisma.$queryRaw<Array<{
        entryKey: string
        weeks_at_one: bigint
      }>>`
        SELECT 
          "entryKey",
          COUNT(*)::bigint as weeks_at_one
        FROM "group_chart_entries"
        WHERE "groupId" = ${groupId}::text
          AND "chartType" = ${chartType}
          AND position = 1
        GROUP BY "entryKey"
        ORDER BY weeks_at_one DESC
        LIMIT 10
      `

      for (const topEntry of topEntriesAtOne) {
        const history = await prisma.groupChartEntry.findMany({
          where: {
            groupId,
            chartType,
            entryKey: topEntry.entryKey,
            position: 1,
          },
          orderBy: { weekStart: 'asc' },
          select: { weekStart: true },
        })

        if (history.length > 0) {
          let longestStreak = 1
          let currentStreak = 1

          for (let i = 1; i < history.length; i++) {
            const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
            if (daysDiff <= 7) {
              currentStreak++
              longestStreak = Math.max(longestStreak, currentStreak)
            } else {
              currentStreak = 1
            }
          }

          if (longestStreak > maxConsecutiveAtOne) {
            maxConsecutiveAtOne = longestStreak
            const entryDetails = await prisma.groupChartEntry.findFirst({
              where: { groupId, chartType, entryKey: topEntry.entryKey },
              orderBy: { weekStart: 'desc' },
              select: { name: true, artist: true },
            })
            if (entryDetails) {
              recordEntryAtOne = {
                entryKey: topEntry.entryKey,
                name: entryDetails.name,
                artist: entryDetails.artist,
              }
            }
          }
        }
      }

      if (recordEntryAtOne && maxConsecutiveAtOne > 0) {
        records.mostConsecutiveWeeksAtOne![chartType] = {
          entryKey: recordEntryAtOne.entryKey,
          chartType,
          name: recordEntryAtOne.name,
          artist: recordEntryAtOne.artist,
          value: maxConsecutiveAtOne,
          slug: generateSlug(recordEntryAtOne.entryKey, chartType),
        }
      }

      // Similar for top 10
      const topEntriesInTop10 = await prisma.$queryRaw<Array<{
        entryKey: string
        weeks_in_top10: bigint
      }>>`
        SELECT 
          "entryKey",
          COUNT(*)::bigint as weeks_in_top10
        FROM "group_chart_entries"
        WHERE "groupId" = ${groupId}::text
          AND "chartType" = ${chartType}
          AND position <= 10
        GROUP BY "entryKey"
        ORDER BY weeks_in_top10 DESC
        LIMIT 10
      `

      let maxConsecutiveInTop10 = 0
      let recordEntryInTop10: { entryKey: string; name: string; artist: string | null } | null = null

      for (const topEntry of topEntriesInTop10) {
        const history = await prisma.groupChartEntry.findMany({
          where: {
            groupId,
            chartType,
            entryKey: topEntry.entryKey,
            position: { lte: 10 },
          },
          orderBy: { weekStart: 'asc' },
          select: { weekStart: true },
        })

        if (history.length > 0) {
          let longestStreak = 1
          let currentStreak = 1

          for (let i = 1; i < history.length; i++) {
            const daysDiff = (history[i].weekStart.getTime() - history[i - 1].weekStart.getTime()) / (1000 * 60 * 60 * 24)
            if (daysDiff <= 7) {
              currentStreak++
              longestStreak = Math.max(longestStreak, currentStreak)
            } else {
              currentStreak = 1
            }
          }

          if (longestStreak > maxConsecutiveInTop10) {
            maxConsecutiveInTop10 = longestStreak
            const entryDetails = await prisma.groupChartEntry.findFirst({
              where: { groupId, chartType, entryKey: topEntry.entryKey },
              orderBy: { weekStart: 'desc' },
              select: { name: true, artist: true },
            })
            if (entryDetails) {
              recordEntryInTop10 = {
                entryKey: topEntry.entryKey,
                name: entryDetails.name,
                artist: entryDetails.artist,
              }
            }
          }
        }
      }

      if (recordEntryInTop10 && maxConsecutiveInTop10 > 0) {
        records.mostConsecutiveWeeksInTop10![chartType] = {
          entryKey: recordEntryInTop10.entryKey,
          chartType,
          name: recordEntryInTop10.name,
          artist: recordEntryInTop10.artist,
          value: maxConsecutiveInTop10,
          slug: generateSlug(recordEntryInTop10.entryKey, chartType),
        }
      }

      // Longest time between appearances - use window function to calculate gaps efficiently
      // This replaces the N+1 query problem with a single SQL query
      // We calculate gaps between consecutive appearances for all entries
      const longestGapResult = await prisma.$queryRaw<Array<{
        entryKey: string
        max_gap_weeks: number
        name: string
        artist: string | null
      }>>`
        WITH entry_history AS (
          SELECT DISTINCT
            "entryKey",
            "weekStart"
          FROM "group_chart_entries"
          WHERE "groupId" = ${groupId}::text
            AND "chartType" = ${chartType}
        ),
        entry_with_gaps AS (
          SELECT 
            "entryKey",
            "weekStart",
            LAG("weekStart") OVER (
              PARTITION BY "entryKey" 
              ORDER BY "weekStart" ASC
            ) as previous_week_start
          FROM entry_history
        ),
        entry_gaps AS (
          SELECT 
            "entryKey",
            MAX(EXTRACT(EPOCH FROM ("weekStart" - previous_week_start)) / (7 * 24 * 60 * 60))::int as max_gap_weeks
          FROM entry_with_gaps
          WHERE previous_week_start IS NOT NULL
          GROUP BY "entryKey"
        ),
        top_entry AS (
          SELECT 
            eg."entryKey",
            eg.max_gap_weeks
          FROM entry_gaps eg
          ORDER BY eg.max_gap_weeks DESC
          LIMIT 1
        )
        SELECT 
          te."entryKey",
          te.max_gap_weeks,
          gce."name",
          gce."artist"
        FROM top_entry te
        INNER JOIN "group_chart_entries" gce ON (
          gce."groupId" = ${groupId}::text
          AND gce."chartType" = ${chartType}
          AND gce."entryKey" = te."entryKey"
        )
        ORDER BY gce."weekStart" DESC
        LIMIT 1
      `

      if (longestGapResult.length > 0 && longestGapResult[0].max_gap_weeks > 0) {
        const result = longestGapResult[0]
        records.longestTimeBetweenAppearances![chartType] = {
          entryKey: result.entryKey,
          chartType,
          name: result.name,
          artist: result.artist,
          value: result.max_gap_weeks,
          slug: generateSlug(result.entryKey, chartType),
        }
      }
    }
  }

  await phaseStart.end(newEntries ? `Checked ${newEntries.length} entries` : 'Full calculation')
  return records
}

/**
 * Phase 4: User contributions - Most popular entry
 */
async function calculatePhase4Records(
  groupId: string,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 4: User contributions')
  
  const records: Partial<GroupRecordsData> = {
    mostPopular: { artists: null, tracks: null, albums: null },
  }

  const chartTypes: ChartType[] = ['artists', 'tracks', 'albums']

  for (const chartType of chartTypes) {
    const result = await prisma.$queryRaw<Array<{
      entryKey: string
      distinct_users: bigint
      total_vs: number | null
      total_plays: bigint
    }>>`
      SELECT 
        ucvs."entryKey",
        COUNT(DISTINCT ucvs."userId")::bigint as distinct_users,
        SUM(ucvs."vibeScore")::float as total_vs,
        SUM(ucvs.playcount)::bigint as total_plays
      FROM "user_chart_entry_vs" ucvs
      INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
      WHERE gm."groupId" = ${groupId}::text
        AND ucvs."chartType" = ${chartType}
      GROUP BY ucvs."entryKey"
      ORDER BY distinct_users DESC, total_vs DESC NULLS LAST, total_plays DESC
      LIMIT 1
    `

    if (result.length > 0) {
      const r = result[0]
      const entry = await prisma.groupChartEntry.findFirst({
        where: { groupId, chartType, entryKey: r.entryKey },
        orderBy: { weekStart: 'desc' },
        select: { name: true, artist: true },
      })

      if (entry) {
        records.mostPopular![chartType] = {
          entryKey: r.entryKey,
          chartType,
          name: entry.name,
          artist: entry.artist,
          value: Number(r.distinct_users),
          slug: generateSlug(r.entryKey, chartType),
        }
      }
    }
  }

  await phaseStart.end('Found most popular entries')
  return records
}

/**
 * Phase 5: Artist aggregations
 */
async function calculatePhase5Records(
  groupId: string,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 5: Artist aggregations')
  
  const records: Partial<GroupRecordsData> = {
    artistMostNumberOneSongs: null,
    artistMostNumberOneAlbums: null,
    artistMostSongsInTop10: null,
    artistMostAlbumsInTop10: null,
    artistMostSongsCharted: null,
    artistMostAlbumsCharted: null,
  }

  // Get all tracks and albums with their artists
  const tracksAndAlbums = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      chartType: { in: ['tracks', 'albums'] },
      artist: { not: null },
    },
    select: {
      chartType: true,
      entryKey: true,
      artist: true,
      position: true,
    },
  })

  // Group by artist
  const artistMap = new Map<string, {
    numberOneTracks: Set<string>
    numberOneAlbums: Set<string>
    top10Tracks: Set<string>
    top10Albums: Set<string>
    chartedTracks: Set<string>
    chartedAlbums: Set<string>
  }>()

  for (const entry of tracksAndAlbums) {
    if (!entry.artist) continue
    
    const artist = entry.artist.toLowerCase()
    if (!artistMap.has(artist)) {
      artistMap.set(artist, {
        numberOneTracks: new Set(),
        numberOneAlbums: new Set(),
        top10Tracks: new Set(),
        top10Albums: new Set(),
        chartedTracks: new Set(),
        chartedAlbums: new Set(),
      })
    }

    const stats = artistMap.get(artist)!
    
    if (entry.chartType === 'tracks') {
      stats.chartedTracks.add(entry.entryKey)
      if (entry.position <= 10) stats.top10Tracks.add(entry.entryKey)
      if (entry.position === 1) stats.numberOneTracks.add(entry.entryKey)
    } else {
      stats.chartedAlbums.add(entry.entryKey)
      if (entry.position <= 10) stats.top10Albums.add(entry.entryKey)
      if (entry.position === 1) stats.numberOneAlbums.add(entry.entryKey)
    }
  }

  // Find record holders for each category
  let maxNumberOneSongs = 0
  let maxNumberOneAlbums = 0
  let maxTop10Songs = 0
  let maxTop10Albums = 0
  let maxChartedSongs = 0
  let maxChartedAlbums = 0
  let recordArtistNumberOneSongs: string | null = null
  let recordArtistNumberOneAlbums: string | null = null
  let recordArtistTop10Songs: string | null = null
  let recordArtistTop10Albums: string | null = null
  let recordArtistChartedSongs: string | null = null
  let recordArtistChartedAlbums: string | null = null

  for (const [artist, stats] of artistMap.entries()) {
    if (stats.numberOneTracks.size > maxNumberOneSongs) {
      maxNumberOneSongs = stats.numberOneTracks.size
      recordArtistNumberOneSongs = artist
    }
    if (stats.numberOneAlbums.size > maxNumberOneAlbums) {
      maxNumberOneAlbums = stats.numberOneAlbums.size
      recordArtistNumberOneAlbums = artist
    }
    if (stats.top10Tracks.size > maxTop10Songs) {
      maxTop10Songs = stats.top10Tracks.size
      recordArtistTop10Songs = artist
    }
    if (stats.top10Albums.size > maxTop10Albums) {
      maxTop10Albums = stats.top10Albums.size
      recordArtistTop10Albums = artist
    }
    if (stats.chartedTracks.size > maxChartedSongs) {
      maxChartedSongs = stats.chartedTracks.size
      recordArtistChartedSongs = artist
    }
    if (stats.chartedAlbums.size > maxChartedAlbums) {
      maxChartedAlbums = stats.chartedAlbums.size
      recordArtistChartedAlbums = artist
    }
  }

  // Get artist entries for each record
  const artistEntries = new Map<string, { name: string; slug: string | null }>()
  
  const allRecordArtists = new Set([
    recordArtistNumberOneSongs,
    recordArtistNumberOneAlbums,
    recordArtistTop10Songs,
    recordArtistTop10Albums,
    recordArtistChartedSongs,
    recordArtistChartedAlbums,
  ].filter(Boolean) as string[])

  for (const artist of allRecordArtists) {
    const artistEntry = await prisma.groupChartEntry.findFirst({
      where: { groupId, chartType: 'artists', entryKey: artist },
      orderBy: { weekStart: 'desc' },
      select: { name: true, slug: true },
    })
    if (artistEntry) {
      artistEntries.set(artist, { name: artistEntry.name, slug: artistEntry.slug })
    }
  }

  if (recordArtistNumberOneSongs && maxNumberOneSongs > 0) {
    const artistEntry = artistEntries.get(recordArtistNumberOneSongs)
    if (artistEntry) {
      records.artistMostNumberOneSongs = {
        entryKey: recordArtistNumberOneSongs,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxNumberOneSongs,
        slug: artistEntry.slug || generateSlug(recordArtistNumberOneSongs, 'artists'),
      }
    }
  }

  if (recordArtistNumberOneAlbums && maxNumberOneAlbums > 0) {
    const artistEntry = artistEntries.get(recordArtistNumberOneAlbums)
    if (artistEntry) {
      records.artistMostNumberOneAlbums = {
        entryKey: recordArtistNumberOneAlbums,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxNumberOneAlbums,
        slug: artistEntry.slug || generateSlug(recordArtistNumberOneAlbums, 'artists'),
      }
    }
  }

  if (recordArtistTop10Songs && maxTop10Songs > 0) {
    const artistEntry = artistEntries.get(recordArtistTop10Songs)
    if (artistEntry) {
      records.artistMostSongsInTop10 = {
        entryKey: recordArtistTop10Songs,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxTop10Songs,
        slug: artistEntry.slug || generateSlug(recordArtistTop10Songs, 'artists'),
      }
    }
  }

  if (recordArtistTop10Albums && maxTop10Albums > 0) {
    const artistEntry = artistEntries.get(recordArtistTop10Albums)
    if (artistEntry) {
      records.artistMostAlbumsInTop10 = {
        entryKey: recordArtistTop10Albums,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxTop10Albums,
        slug: artistEntry.slug || generateSlug(recordArtistTop10Albums, 'artists'),
      }
    }
  }

  if (recordArtistChartedSongs && maxChartedSongs > 0) {
    const artistEntry = artistEntries.get(recordArtistChartedSongs)
    if (artistEntry) {
      records.artistMostSongsCharted = {
        entryKey: recordArtistChartedSongs,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxChartedSongs,
        slug: artistEntry.slug || generateSlug(recordArtistChartedSongs, 'artists'),
      }
    }
  }

  if (recordArtistChartedAlbums && maxChartedAlbums > 0) {
    const artistEntry = artistEntries.get(recordArtistChartedAlbums)
    if (artistEntry) {
      records.artistMostAlbumsCharted = {
        entryKey: recordArtistChartedAlbums,
        chartType: 'artists',
        name: artistEntry.name,
        value: maxChartedAlbums,
        slug: artistEntry.slug || generateSlug(recordArtistChartedAlbums, 'artists'),
      }
    }
  }

  await phaseStart.end(`Processed ${artistMap.size} artists`)
  return records
}

/**
 * Phase 6: User records
 */
async function calculatePhase6Records(
  groupId: string,
  logger: RecordsCalculationLogger
): Promise<Partial<GroupRecordsData>> {
  const phaseStart = await logger.logStart('Phase 6: User records')
  
  const records: Partial<GroupRecordsData> = {
    userMostVS: null,
    userMostPlays: null,
    userMostEntries: null,
    userLeastEntries: null,
    userMostNumberOnes: null,
    userMostWeeksContributing: null,
    userTasteMaker: null,
    userPeakPerformer: null,
  }

  // Get all group members
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
    },
  })

  if (members.length === 0) {
    await phaseStart.end('No members found')
    return records
  }

  // Skip user records calculation if fewer than 3 members
  if (members.length < 3) {
    await phaseStart.end(`Skipped: Only ${members.length} member(s), need at least 3 for user awards`)
    return records
  }

  const userIds = members.map(m => m.user.id)
  const userMap = new Map(members.map(m => [m.user.id, m.user]))

  // Most VS
  const mostVSResult = await prisma.$queryRaw<Array<{
    userId: string
    total_vs: number
  }>>`
    SELECT 
      ucvs."userId",
      SUM(ucvs."vibeScore")::float as total_vs
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY total_vs DESC NULLS LAST
    LIMIT 1
  `

  if (mostVSResult.length > 0 && mostVSResult[0].userId) {
    const user = userMap.get(mostVSResult[0].userId)
    if (user) {
      records.userMostVS = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: mostVSResult[0].total_vs,
      }
    }
  }

  // Most plays
  const mostPlaysResult = await prisma.$queryRaw<Array<{
    userId: string
    total_plays: bigint
  }>>`
    SELECT 
      ucvs."userId",
      SUM(ucvs.playcount)::bigint as total_plays
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY total_plays DESC
    LIMIT 1
  `

  if (mostPlaysResult.length > 0 && mostPlaysResult[0].userId) {
    const user = userMap.get(mostPlaysResult[0].userId)
    if (user) {
      records.userMostPlays = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(mostPlaysResult[0].total_plays),
      }
    }
  }

  // Most entries (most mainstream)
  const mostEntriesResult = await prisma.$queryRaw<Array<{
    userId: string
    distinct_entries: bigint
  }>>`
    SELECT 
      ucvs."userId",
      COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType"))::bigint as distinct_entries
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY distinct_entries DESC
    LIMIT 1
  `

  if (mostEntriesResult.length > 0 && mostEntriesResult[0].userId) {
    const user = userMap.get(mostEntriesResult[0].userId)
    if (user) {
      records.userMostEntries = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(mostEntriesResult[0].distinct_entries),
      }
    }
  }

  // Least entries (least mainstream, but at least 1)
  const leastEntriesResult = await prisma.$queryRaw<Array<{
    userId: string
    distinct_entries: bigint
  }>>`
    SELECT 
      ucvs."userId",
      COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType"))::bigint as distinct_entries
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    HAVING COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType")) >= 1
    ORDER BY distinct_entries ASC
    LIMIT 1
  `

  if (leastEntriesResult.length > 0 && leastEntriesResult[0].userId) {
    const user = userMap.get(leastEntriesResult[0].userId)
    if (user) {
      records.userLeastEntries = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(leastEntriesResult[0].distinct_entries),
      }
    }
  }

  // Most #1 entries - count entries where user contributed and entry reached #1
  const mostNumberOnesResult = await prisma.$queryRaw<Array<{
    userId: string
    number_ones: bigint
  }>>`
    SELECT 
      ucvs."userId",
      COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType"))::bigint as number_ones
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart" AND
      gce.position = 1
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY number_ones DESC
    LIMIT 1
  `

  if (mostNumberOnesResult.length > 0 && mostNumberOnesResult[0].userId) {
    const user = userMap.get(mostNumberOnesResult[0].userId)
    if (user) {
      records.userMostNumberOnes = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(mostNumberOnesResult[0].number_ones),
      }
    }
  }

  // Most weeks contributing
  // Only count weeks where user contributed AND group has charts for that week
  const mostWeeksResult = await prisma.$queryRaw<Array<{
    userId: string
    distinct_weeks: bigint
  }>>`
    SELECT 
      ucvs."userId",
      COUNT(DISTINCT ucvs."weekStart")::bigint as distinct_weeks
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."weekStart" = ucvs."weekStart" AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY distinct_weeks DESC
    LIMIT 1
  `

  if (mostWeeksResult.length > 0 && mostWeeksResult[0].userId) {
    const user = userMap.get(mostWeeksResult[0].userId)
    if (user) {
      records.userMostWeeksContributing = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(mostWeeksResult[0].distinct_weeks),
      }
    }
  }

  // Taste Maker - user who introduced most entries that later reached #1
  // This requires tracking which user first introduced each entry
  // Simplified: count distinct entries that reached #1 where user contributed in first week
  const tasteMakerResult = await prisma.$queryRaw<Array<{
    userId: string
    taste_maker_count: bigint
  }>>`
    WITH first_appearances AS (
      SELECT 
        "entryKey",
        "chartType",
        MIN("weekStart") as first_week
      FROM "group_chart_entries"
      WHERE "groupId" = ${groupId}::text
      GROUP BY "entryKey", "chartType"
    ),
    number_ones AS (
      SELECT DISTINCT "entryKey", "chartType"
      FROM "group_chart_entries"
      WHERE "groupId" = ${groupId}::text
        AND position = 1
    )
    SELECT 
      ucvs."userId",
      COUNT(DISTINCT ucvs."entryKey")::bigint as taste_maker_count
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN first_appearances fa ON 
      ucvs."entryKey" = fa."entryKey" AND
      ucvs."chartType" = fa."chartType" AND
      ucvs."weekStart" = fa.first_week
    INNER JOIN number_ones no ON 
      ucvs."entryKey" = no."entryKey" AND
      ucvs."chartType" = no."chartType"
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    ORDER BY taste_maker_count DESC
    LIMIT 1
  `

  if (tasteMakerResult.length > 0 && tasteMakerResult[0].userId) {
    const user = userMap.get(tasteMakerResult[0].userId)
    if (user) {
      records.userTasteMaker = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: Number(tasteMakerResult[0].taste_maker_count),
      }
    }
  }

  // Peak Performer - highest average VS per entry (min 5 entries)
  const peakPerformerResult = await prisma.$queryRaw<Array<{
    userId: string
    avg_vs: number
    entry_count: bigint
  }>>`
    SELECT 
      ucvs."userId",
      AVG(ucvs."vibeScore")::float as avg_vs,
      COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType"))::bigint as entry_count
    FROM "user_chart_entry_vs" ucvs
    INNER JOIN "group_members" gm ON ucvs."userId" = gm."userId"
    INNER JOIN "group_chart_entries" gce ON 
      gce."groupId" = ${groupId}::text AND
      gce."chartType" = ucvs."chartType" AND
      gce."entryKey" = ucvs."entryKey" AND
      gce."weekStart" = ucvs."weekStart"
    WHERE gm."groupId" = ${groupId}::text
      AND ucvs."userId" IS NOT NULL
    GROUP BY ucvs."userId"
    HAVING COUNT(DISTINCT CONCAT(ucvs."entryKey", '|', ucvs."chartType")) >= 5
    ORDER BY avg_vs DESC
    LIMIT 1
  `

  if (peakPerformerResult.length > 0 && peakPerformerResult[0].userId) {
    const user = userMap.get(peakPerformerResult[0].userId)
    if (user) {
      records.userPeakPerformer = {
        userId: user.id,
        name: user.name || user.lastfmUsername,
        value: peakPerformerResult[0].avg_vs,
      }
    }
  }

  await phaseStart.end(`Processed ${members.length} users`)
  return records
}

/**
 * Main function to calculate all group records
 */
export async function calculateGroupRecords(
  groupId: string,
  newEntries?: Array<{ entryKey: string; chartType: ChartType; position: number }>,
  logger?: RecordsCalculationLogger
): Promise<GroupRecordsData> {
  console.log(`[Records] calculateGroupRecords called for group ${groupId}, newEntries: ${newEntries?.length || 0}`)
  const recordsLogger = logger || new RecordsCalculationLogger(groupId)
  const isIncremental = !!newEntries
  recordsLogger.setCalculationType(isIncremental ? 'incremental' : 'full')
  console.log(`[Records] Calculation type: ${isIncremental ? 'incremental' : 'full'}`)

  const startLog = await recordsLogger.logStart(
    `Starting records calculation (${isIncremental ? 'incremental' : 'full'})`
  )

  // Get existing records if incremental
  const existingRecords = isIncremental ? await getGroupRecords(groupId) : null
  let existingRecordsData = existingRecords?.records as GroupRecordsData | null
  
  // Validate that existing records have the expected structure
  // Check that all required nested properties exist
  if (existingRecordsData) {
    const hasValidStructure = 
      existingRecordsData.mostConsecutiveWeeksAtOne &&
      typeof existingRecordsData.mostConsecutiveWeeksAtOne === 'object' &&
      existingRecordsData.mostConsecutiveWeeksInTop10 &&
      typeof existingRecordsData.mostConsecutiveWeeksInTop10 === 'object'
    
    if (!hasValidStructure) {
      console.warn(`[Records] Existing records structure is incomplete, falling back to full calculation`)
      // If structure is incomplete, treat as full calculation
      existingRecordsData = null
    }
  }

  try {
    // Phase 1: ChartEntryStats cache
    const phase1 = await calculatePhase1Records(groupId, recordsLogger)

    // Phase 2: SQL aggregations
    const phase2 = await calculatePhase2Records(groupId, recordsLogger)

    // Phase 3: Incremental calculations
    const phase3 = await calculatePhase3Records(groupId, existingRecordsData, newEntries, recordsLogger)

    // Phase 4: User contributions
    const phase4 = await calculatePhase4Records(groupId, recordsLogger)

    // Phase 5: Artist aggregations
    const phase5 = await calculatePhase5Records(groupId, recordsLogger)

    // Phase 6: User records
    const phase6 = await calculatePhase6Records(groupId, recordsLogger)

    // Merge all records
    // For incremental updates, merge with existing records (only update changed ones)
    const allRecords: GroupRecordsData = isIncremental && existingRecordsData
      ? {
          ...existingRecordsData,
          ...phase1,
          ...phase2,
          ...phase3,
          ...phase4,
          ...phase5,
          ...phase6,
        } as GroupRecordsData
      : {
          ...phase1,
          ...phase2,
          ...phase3,
          ...phase4,
          ...phase5,
          ...phase6,
        } as GroupRecordsData

    await startLog.end('Calculation completed')
    await recordsLogger.logSummary()

    return allRecords
  } catch (error) {
    await recordsLogger.log('Error during calculation', 0, String(error))
    await recordsLogger.logSummary()
    throw error
  }
}

/**
 * Trigger records calculation (check if it should run)
 */
export async function triggerRecordsCalculation(groupId: string): Promise<boolean> {
  const existing = await getGroupRecords(groupId)
  
  if (!existing) {
    return true // No records exist, should calculate
  }

  if (existing.status === 'failed') {
    return true // Previous calculation failed, allow retry
  }

  if (existing.status === 'calculating') {
    // Check if calculation has been running for more than 1 hour
    if (existing.calculationStartedAt) {
      const hoursSinceStart = (Date.now() - existing.calculationStartedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceStart > 1) {
        return true // Stuck calculation, allow retry
      }
    }
    return false // Still calculating
  }

  if (existing.status === 'completed' && existing.chartsGeneratedAt) {
    // Check if charts were generated more than 1 hour ago
    const hoursSinceCharts = (Date.now() - existing.chartsGeneratedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSinceCharts > 1) {
      return true // Allow manual retry after 1 hour
    }
  }

  return false
}

