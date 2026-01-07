// Functions to calculate and cache group trends

import { prisma } from './prisma'
import { getGroupChartEntriesForWeek, getGroupWeeklyStats } from './group-queries'
import { getUserVSForWeek } from './vibe-score'
import { getWeekEndForDay } from './weekly-utils'
import { TopItem } from './lastfm-weekly'

export type ChartType = 'artists' | 'tracks' | 'albums'

interface EntryHighlight {
  chartType: ChartType
  entryKey: string
  name: string
  artist?: string
  position: number
  positionChange?: number
  oldPosition?: number
  newPosition?: number
  lastPosition?: number
  highestPosition?: number
}

interface MemberContribution {
  userId: string
  name: string
  totalPlays: number
  totalVS: number
  contributions: Array<{
    chartType: ChartType
    entryKey: string
    name: string
    artist?: string
    position: number
    plays: number
    vs: number
  }>
}

interface MemberSpotlight {
  userId: string
  name: string
  highlight: string
  topContributions: Array<{
    chartType: ChartType
    name: string
    artist?: string
    position: number
    contribution: number
  }>
}

interface PersonalizedStats {
  totalContribution: {
    plays: number
    vs: number
    percentageOfGroup: number
  }
  topContributions: Array<{
    chartType: ChartType
    entryKey: string
    name: string
    artist?: string
    position: number
    userPlays: number
    userVS: number
    groupPlays: number
    groupVS: number
    percentage: number
  }>
  entriesDriven: Array<{
    chartType: ChartType
    entryKey: string
    name: string
    artist?: string
    position: number
    userContribution: number
    totalContribution: number
    percentage: number
  }>
  biggestMovers: Array<{
    chartType: ChartType
    entryKey: string
    name: string
    artist?: string
    positionChange: number
    oldPosition: number
    newPosition: number
    userContribution: number
  }>
  tasteMatch: {
    overlapPercentage: number
    sharedEntries: number
    totalGroupEntries: number
  }
  vsMVP?: {
    mvpUserId: string
    mvpName: string
    userTotal: number
    mvpTotal: number
    percentage: number
  }
  vsHighlightedMembers?: Array<{
    memberUserId: string
    memberName: string
    userTotal: number
    memberTotal: number
    percentage: number
  }>
}

/**
 * Get entry key for an item
 */
function getEntryKey(item: { name: string; artist?: string }, chartType: ChartType): string {
  if (chartType === 'artists') {
    return (item.name || '').trim().toLowerCase()
  }
  const name = (item.name || '').trim()
  const artist = (item.artist || '').trim()
  return `${name}|${artist}`.toLowerCase()
}

/**
 * Identify new entries in current week that weren't in previous week
 * Excludes comebacks (entries that have appeared before, totalWeeksAppeared > 1)
 */
function identifyNewEntries(
  currentEntries: Array<{ chartType: string; entryKey: string; name: string; artist?: string | null; position: number; totalWeeksAppeared?: number }>,
  previousEntries: Array<{ chartType: string; entryKey: string }>
): EntryHighlight[] {
  const previousKeys = new Set(
    previousEntries.map((e) => `${e.chartType}|${e.entryKey}`)
  )

  return currentEntries
    .filter((entry) => {
      const wasInPreviousWeek = previousKeys.has(`${entry.chartType}|${entry.entryKey}`)
      const isFirstTime = (entry.totalWeeksAppeared || 0) <= 1
      // New entry: not in previous week AND this is their first time appearing
      return !wasInPreviousWeek && isFirstTime
    })
    .map((entry) => ({
      chartType: entry.chartType as ChartType,
      entryKey: entry.entryKey,
      name: entry.name,
      artist: entry.artist || undefined,
      position: entry.position,
    }))
}

/**
 * Identify comebacks - entries that returned to charts after being away
 */
function identifyComebacks(
  currentEntries: Array<{ chartType: string; entryKey: string; name: string; artist?: string | null; position: number; totalWeeksAppeared?: number }>,
  previousEntries: Array<{ chartType: string; entryKey: string }>,
  groupId: string,
  weekStart: Date
): Promise<Array<EntryHighlight & { weeksAway: number }>> {
  return new Promise(async (resolve) => {
    const previousKeys = new Set(
      previousEntries.map((e) => `${e.chartType}|${e.entryKey}`)
    )

    // Find entries that weren't in previous week but have appeared before
    const potentialComebacks = currentEntries.filter((entry) => {
      const wasInPreviousWeek = previousKeys.has(`${entry.chartType}|${entry.entryKey}`)
      const hasAppearedBefore = (entry.totalWeeksAppeared || 0) > 1
      return !wasInPreviousWeek && hasAppearedBefore
    })

    if (potentialComebacks.length === 0) {
      resolve([])
      return
    }

    // Get historical entries to find when they last appeared
    const normalizedWeekStart = new Date(weekStart)
    normalizedWeekStart.setUTCHours(0, 0, 0, 0)

    const allHistoricalEntries = await prisma.groupChartEntry.findMany({
      where: {
        groupId,
        weekStart: {
          lt: normalizedWeekStart,
        },
      },
      select: {
        weekStart: true,
        entryKey: true,
        chartType: true,
      },
      orderBy: {
        weekStart: 'desc',
      },
    })

    const comebacks: Array<EntryHighlight & { weeksAway: number }> = []

    for (const entry of potentialComebacks) {
      const historicalForEntry = allHistoricalEntries
        .filter(e => e.entryKey === entry.entryKey && e.chartType === entry.chartType)
        .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
      
      if (historicalForEntry.length > 0) {
        const lastAppearance = historicalForEntry[0]
        const weeksSince = Math.floor((normalizedWeekStart.getTime() - lastAppearance.weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeksSince > 0) {
          comebacks.push({
            chartType: entry.chartType as ChartType,
            entryKey: entry.entryKey,
            name: entry.name,
            artist: entry.artist || undefined,
            position: entry.position,
            weeksAway: weeksSince,
          })
        }
      }
    }

    // Sort by weeks away (longest away first)
    comebacks.sort((a, b) => b.weeksAway - a.weeksAway)
    resolve(comebacks)
  })
}

/**
 * Identify entries that exited (were in previous week but not in current)
 */
function identifyExits(
  currentEntries: Array<{ chartType: string; entryKey: string }>,
  previousEntries: Array<{ chartType: string; entryKey: string; name: string; artist?: string | null; position: number }>
): EntryHighlight[] {
  const currentKeys = new Set(
    currentEntries.map((e) => `${e.chartType}|${e.entryKey}`)
  )

  return previousEntries
    .filter((entry) => !currentKeys.has(`${entry.chartType}|${entry.entryKey}`))
    .map((entry) => ({
      chartType: entry.chartType as ChartType,
      entryKey: entry.entryKey,
      name: entry.name,
      artist: entry.artist || undefined,
      position: entry.position,
      lastPosition: entry.position,
    }))
}

/**
 * Identify biggest climbers and fallers
 */
function identifyBiggestMovers(
  currentEntries: Array<{ chartType: string; entryKey: string; name: string; artist?: string | null; position: number; positionChange: number | null; highestPosition?: number }>,
  previousEntries: Array<{ chartType: string; entryKey: string; position: number }>
): { climbers: EntryHighlight[]; fallers: EntryHighlight[] } {
  const previousMap = new Map(
    previousEntries.map((e) => [`${e.chartType}|${e.entryKey}`, e.position])
  )

  const climbers: EntryHighlight[] = []
  const fallers: EntryHighlight[] = []

  for (const entry of currentEntries) {
    if (entry.positionChange === null) continue

    const key = `${entry.chartType}|${entry.entryKey}`
    const previousPosition = previousMap.get(key)
    if (!previousPosition) continue

    const highlight: EntryHighlight = {
      chartType: entry.chartType as ChartType,
      entryKey: entry.entryKey,
      name: entry.name,
      artist: entry.artist || undefined,
      position: entry.position,
      positionChange: entry.positionChange,
      oldPosition: previousPosition,
      newPosition: entry.position,
      highestPosition: entry.highestPosition,
    }

    if (entry.positionChange < 0) {
      // Moved up (negative change)
      climbers.push(highlight)
    } else if (entry.positionChange > 0) {
      // Moved down (positive change)
      fallers.push(highlight)
    }
  }

  // Sort climbers by biggest position change (most negative first)
  climbers.sort((a, b) => (a.positionChange || 0) - (b.positionChange || 0))
  // Sort fallers by biggest position change (most positive first)
  fallers.sort((a, b) => (b.positionChange || 0) - (a.positionChange || 0))

  return { climbers, fallers }
}

/**
 * Calculate member contributions for the week
 */
async function calculateMemberContributions(
  groupId: string,
  weekStart: Date,
  chartMode: string
): Promise<{ topContributors: MemberContribution[]; memberSpotlight: MemberSpotlight | null }> {
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

  if (members.length < 3) {
    return { topContributors: [], memberSpotlight: null }
  }

  // Get current week's chart entries
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const chartEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart: normalizedWeekStart,
    },
  })

  // Get all members' VS contributions for this week
  const memberContributions: MemberContribution[] = []

  for (const member of members) {
    const userVS = await getUserVSForWeek(member.user.id, normalizedWeekStart, prisma)

    let totalPlays = 0
    let totalVS = 0
    const contributions: MemberContribution['contributions'] = []

    // Calculate contributions to chart entries
    for (const entry of chartEntries) {
      const vsKey = entry.chartType === 'artists' ? userVS.topArtists : entry.chartType === 'tracks' ? userVS.topTracks : userVS.topAlbums
      const userEntry = vsKey.find((v) => v.entryKey === entry.entryKey)

      if (userEntry) {
        const plays = userEntry.playcount
        const vs = userEntry.vibeScore

        totalPlays += plays
        if (chartMode === 'vs' || chartMode === 'vs_weighted') {
          totalVS += vs
        } else {
          totalVS += plays // For plays_only mode, use plays as VS
        }

        contributions.push({
          chartType: entry.chartType as ChartType,
          entryKey: entry.entryKey,
          name: entry.name,
          artist: entry.artist || undefined,
          position: entry.position,
          plays,
          vs,
        })
      }
    }

    memberContributions.push({
      userId: member.user.id,
      name: member.user.name || member.user.lastfmUsername,
      totalPlays,
      totalVS,
      contributions,
    })
  }

  // Sort by total contribution (VS if available, otherwise plays)
  memberContributions.sort((a, b) => b.totalVS - a.totalVS)

  // Find MVP (top contributor)
  const mvp = memberContributions[0]
  let memberSpotlight: MemberSpotlight | null = null

  if (mvp) {
    // Find most diverse listener (most unique entries)
    const mostDiverse = [...memberContributions].sort((a, b) => b.contributions.length - a.contributions.length)[0]

    // Determine highlight
    let highlight = `Most Active Listener`
    if (mostDiverse.userId === mvp.userId) {
      highlight = `MVP & Most Diverse Listener`
    }

    // Get top 3 contributions
    const topContributions = mvp.contributions
      .sort((a, b) => b.vs - a.vs)
      .slice(0, 3)
      .map((c) => ({
        chartType: c.chartType,
        name: c.name,
        artist: c.artist,
        position: c.position,
        contribution: c.vs,
      }))

    memberSpotlight = {
      userId: mvp.userId,
      name: mvp.name,
      highlight,
      topContributions,
    }
  }

  return {
    topContributors: memberContributions.slice(0, 5), // Top 5 contributors
    memberSpotlight,
  }
}

/**
 * Generate fun facts based on trends
 */
async function generateFunFacts(
  trends: {
    newEntries: EntryHighlight[]
    biggestClimbers: EntryHighlight[]
    biggestFallers: EntryHighlight[]
    exits: EntryHighlight[]
    totalPlays: number
    totalPlaysChange: number | null
    chartTurnover: number
    topContributors?: MemberContribution[]
  },
  groupStats: { weekStart: Date; weekEnd: Date },
  currentEntries: Array<{ 
    chartType: string
    entryKey: string
    name: string
    artist?: string | null
    position: number
    totalWeeksAppeared: number
    highestPosition: number
    positionChange: number | null
  }>,
  previousEntries: Array<{ entryKey: string; chartType: string }>,
  groupId: string
): Promise<string[]> {
  const facts: string[] = []

  // Get historical entries to detect returns
  const normalizedWeekStart = new Date(groupStats.weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)
  
  const allHistoricalEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart: {
        lt: normalizedWeekStart,
      },
    },
    select: {
      weekStart: true,
      entryKey: true,
      chartType: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  // Get previous week stats for percentage calculations
  const previousWeekStats = await prisma.groupWeeklyStats.findFirst({
    where: {
      groupId,
      weekStart: {
        lt: normalizedWeekStart,
      },
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  let previousTotalPlays = 0
  if (previousWeekStats) {
    const prevArtists = (previousWeekStats.topArtists as unknown as TopItem[]) || []
    const prevTracks = (previousWeekStats.topTracks as unknown as TopItem[]) || []
    const prevAlbums = (previousWeekStats.topAlbums as unknown as TopItem[]) || []
    previousTotalPlays = prevArtists.reduce((sum, a) => sum + a.playcount, 0) +
                        prevTracks.reduce((sum, t) => sum + t.playcount, 0) +
                        prevAlbums.reduce((sum, a) => sum + a.playcount, 0)
  }

  // RETURN/COMEBACK FACTS
  const previousEntryKeys = new Set(previousEntries.map(e => `${e.chartType}|${e.entryKey}`))
  const returnedEntries = currentEntries.filter(entry => {
    const key = `${entry.chartType}|${entry.entryKey}`
    return !previousEntryKeys.has(key) && entry.totalWeeksAppeared > 1
  })

  if (returnedEntries.length > 0) {
    for (const entry of returnedEntries.slice(0, 2)) {
      const historicalForEntry = allHistoricalEntries
        .filter(e => e.entryKey === entry.entryKey && e.chartType === entry.chartType)
        .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime())
      
      if (historicalForEntry.length > 0) {
        const lastAppearance = historicalForEntry[0]
        const weeksSince = Math.floor((normalizedWeekStart.getTime() - lastAppearance.weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeksSince > 1) {
          const typeLabel = entry.chartType === 'artists' ? 'Artist' : entry.chartType === 'tracks' ? 'Track' : 'Album'
          facts.push(`${typeLabel} "${entry.name}"${entry.artist ? ` by ${entry.artist}` : ''} made a comeback! Returned to the top 10 after ${weeksSince} weeks away!`)
        }
      }
    }
  }

  // STREAK FACTS
  const longStreaks = currentEntries
    .filter(e => e.totalWeeksAppeared >= 3)
    .sort((a, b) => b.totalWeeksAppeared - a.totalWeeksAppeared)
    .slice(0, 2)

  for (const entry of longStreaks) {
    if (entry.totalWeeksAppeared >= 5) {
      const typeLabel = entry.chartType === 'artists' ? 'Artist' : entry.chartType === 'tracks' ? 'Track' : 'Album'
      facts.push(`${typeLabel} "${entry.name}"${entry.artist ? ` by ${entry.artist}` : ''} is on fire! ${entry.totalWeeksAppeared} weeks in a row in the top 10!`)
    } else if (entry.totalWeeksAppeared >= 3) {
      const typeLabel = entry.chartType === 'artists' ? 'Artist' : entry.chartType === 'tracks' ? 'Track' : 'Album'
      facts.push(`Unstoppable! "${entry.name}"${entry.artist ? ` by ${entry.artist}` : ''} has been charting for ${entry.totalWeeksAppeared} consecutive weeks`)
    }
  }

  // PEAK POSITION FACTS
  const newPeaks = currentEntries.filter(e => {
    // Entry is at its highest position (current position equals highest position)
    // and it's in top 5, and it's actually a new peak (not just maintaining)
    return e.position === e.highestPosition && e.position <= 5 && e.totalWeeksAppeared > 1
  })
  if (newPeaks.length > 0) {
    const peak = newPeaks[0]
    const typeLabel = peak.chartType === 'artists' ? 'Artist' : peak.chartType === 'tracks' ? 'Track' : 'Album'
    facts.push(`New peak! "${peak.name}"${peak.artist ? ` by ${peak.artist}` : ''} reached #${peak.position}, their highest ever!`)
  }

  // FIRST TIME FACTS
  const firstTimers = currentEntries.filter(e => e.totalWeeksAppeared === 1)
  if (firstTimers.length > 0) {
    if (firstTimers.length === 1) {
      const entry = firstTimers[0]
      const typeLabel = entry.chartType === 'artists' ? 'Artist' : entry.chartType === 'tracks' ? 'Track' : 'Album'
      facts.push(`First timer! "${entry.name}"${entry.artist ? ` by ${entry.artist}` : ''} entered the charts for the very first time!`)
    } else {
      facts.push(`Welcome to the club! ${firstTimers.length} entries are charting for the first time ever`)
    }
  }

  // ARTIST DOMINANCE
  const artistCounts = new Map<string, number>()
  currentEntries.forEach(entry => {
    if (entry.artist) {
      artistCounts.set(entry.artist, (artistCounts.get(entry.artist) || 0) + 1)
    }
  })
  
  for (const [artist, count] of artistCounts.entries()) {
    if (count >= 2) {
      facts.push(`${artist} is dominating with ${count} entries in the charts!`)
      break // Only one dominance fact
    }
  }


  // STABILITY FACTS
  const stableEntries = currentEntries.filter(e => e.positionChange === 0).length
  if (stableEntries >= 3) {
    facts.push(`Steady as a rock! ${stableEntries} entries held their position this week`)
  }

  // TOP 3 STABILITY
  const top3 = currentEntries.filter(e => e.position <= 3)
  const top3Stable = top3.filter(e => e.positionChange === 0).length
  if (top3Stable === 3) {
    facts.push(`The top 3 stayed strong - no changes at the top!`)
  }

  // PERCENTAGE INCREASE
  if (trends.totalPlaysChange !== null && trends.totalPlaysChange > 0 && previousTotalPlays > 0) {
    const percentIncrease = Math.round((trends.totalPlaysChange / previousTotalPlays) * 100)
    if (percentIncrease >= 20) {
      facts.push(`This week was wild! ${trends.totalPlaysChange.toLocaleString()} more plays than last week - that's a ${percentIncrease}% increase!`)
    }
  }

  // MEMBER FACTS (if 3+ members)
  if (trends.topContributors && trends.topContributors.length >= 3) {
    const topTwo = trends.topContributors.slice(0, 2)
    const difference = topTwo[0].totalPlays - topTwo[1].totalPlays
    if (difference < 50 && difference > 0) {
      facts.push(`Close race! Top contributor only ${difference} plays ahead of second place`)
    }
  }


  // MVP FACT (enhanced)
  if (trends.topContributors && trends.topContributors.length > 0) {
    const mvp = trends.topContributors[0]
    facts.push(`This week's MVP: ${mvp.name} with ${mvp.totalPlays.toLocaleString()} plays - absolute legend!`)
  }

  // TOTAL PLAYS CELEBRATION
  if (trends.totalPlays > 0) {
    facts.push(`The group listened to ${trends.totalPlays.toLocaleString()} songs this week - that's dedication!`)
  }

  // Return top facts (prioritize more interesting ones)
  // Sort to prioritize comeback, streaks, peaks, first timers, then others
  const prioritizedFacts = facts.sort((a, b) => {
    const aScore = a.includes('comeback') || a.includes('on fire') || a.includes('Unstoppable') ? 3 :
                   a.includes('New peak') || a.includes('First timer') ? 2 :
                   a.includes('dominating') || a.includes('wild') ? 1 : 0
    const bScore = b.includes('comeback') || b.includes('on fire') || b.includes('Unstoppable') ? 3 :
                   b.includes('New peak') || b.includes('First timer') ? 2 :
                   b.includes('dominating') || b.includes('wild') ? 1 : 0
    return bScore - aScore
  })

  return prioritizedFacts.slice(0, 10) // Return up to 10, UI will show top 3
}

/**
 * Calculate and store group trends
 */
export async function calculateGroupTrends(
  groupId: string,
  weekStart: Date,
  trackingDayOfWeek: number,
  
): Promise<void> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  const weekEnd = getWeekEndForDay(weekStart, trackingDayOfWeek)

  // Get current week's chart entries
  const fetchCurrentStart = Date.now()
  const currentEntries = await getGroupChartEntriesForWeek(groupId, normalizedWeekStart)

  // Get previous week's entries
  const previousWeekStart = new Date(normalizedWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

  const fetchPreviousStart = Date.now()
  const previousEntries = await getGroupChartEntriesForWeek(groupId, previousWeekStart)

  // Get group stats for total plays calculation
  const fetchStatsStart = Date.now()
  const weeklyStats = await getGroupWeeklyStats(groupId)
  const currentWeekStats = weeklyStats.find(
    (s) => new Date(s.weekStart).getTime() === normalizedWeekStart.getTime()
  )
  const previousWeekStats = weeklyStats.find(
    (s) => new Date(s.weekStart).getTime() === previousWeekStart.getTime()
  )

  // Calculate total plays
  let totalPlays = 0
  if (currentWeekStats) {
    const artists = (currentWeekStats.topArtists as unknown as TopItem[]) || []
    const tracks = (currentWeekStats.topTracks as unknown as TopItem[]) || []
    const albums = (currentWeekStats.topAlbums as unknown as TopItem[]) || []
    totalPlays = artists.reduce((sum, a) => sum + a.playcount, 0) +
                 tracks.reduce((sum, t) => sum + t.playcount, 0) +
                 albums.reduce((sum, a) => sum + a.playcount, 0)
  }

  let totalPlaysChange: number | null = null
  if (previousWeekStats) {
    const prevArtists = (previousWeekStats.topArtists as unknown as TopItem[]) || []
    const prevTracks = (previousWeekStats.topTracks as unknown as TopItem[]) || []
    const prevAlbums = (previousWeekStats.topAlbums as unknown as TopItem[]) || []
    const prevTotal = prevArtists.reduce((sum, a) => sum + a.playcount, 0) +
                      prevTracks.reduce((sum, t) => sum + t.playcount, 0) +
                      prevAlbums.reduce((sum, a) => sum + a.playcount, 0)
    totalPlaysChange = totalPlays - prevTotal
  }

  // Identify trends
  const identifyTrendsStart = Date.now()
  const newEntries = identifyNewEntries(
    currentEntries.map(e => ({
      chartType: e.chartType,
      entryKey: e.entryKey,
      name: e.name,
      artist: e.artist || undefined,
      position: e.position,
      totalWeeksAppeared: e.totalWeeksAppeared || 0,
    })),
    previousEntries
  )
  const exits = identifyExits(currentEntries, previousEntries)
  const { climbers, fallers } = identifyBiggestMovers(currentEntries, previousEntries)
  // Trend identification is very fast, skip detailed logging

  // Get group to determine chart mode
  const fetchGroupStart = Date.now()
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { chartMode: true },
  })

  const chartMode = (group?.chartMode || 'plays_only') as string

  // Calculate member contributions (if 3+ members)
  const memberContribStart = Date.now()
  const { topContributors, memberSpotlight } = await calculateMemberContributions(
    groupId,
    normalizedWeekStart,
    chartMode
  )

  // Generate fun facts
  const funFactsStart = Date.now()
  const funFacts = await generateFunFacts(
    {
      newEntries,
      biggestClimbers: climbers.slice(0, 5),
      biggestFallers: fallers.slice(0, 5),
      exits,
      totalPlays,
      totalPlaysChange,
      chartTurnover: newEntries.length,
      topContributors: topContributors.length > 0 ? topContributors : undefined,
    },
    { weekStart: normalizedWeekStart, weekEnd },
    currentEntries.map(e => ({
      chartType: e.chartType,
      entryKey: e.entryKey,
      name: e.name,
      artist: e.artist || undefined,
      position: e.position,
      totalWeeksAppeared: e.totalWeeksAppeared || 0,
      highestPosition: e.highestPosition || e.position,
      positionChange: e.positionChange,
    })),
    previousEntries.map(e => ({
      entryKey: e.entryKey,
      chartType: e.chartType,
    })),
    groupId
  )

  // Store trends
  const storeTrendsStart = Date.now()
  await prisma.groupTrends.upsert({
    where: { groupId },
    create: {
      groupId,
      weekStart: normalizedWeekStart,
      weekEnd,
      newEntries: newEntries as any,
      biggestClimbers: climbers.slice(0, 5) as any,
      biggestFallers: fallers.slice(0, 5) as any,
      exits: exits as any,
      topContributors: topContributors.length > 0 ? (topContributors as any) : null,
      memberSpotlight: memberSpotlight ? (memberSpotlight as any) : null,
      totalPlays,
      totalPlaysChange,
      chartTurnover: newEntries.length,
      funFacts: funFacts as any,
      previousWeekStart: previousEntries.length > 0 ? previousWeekStart : null,
    },
    update: {
      weekStart: normalizedWeekStart,
      weekEnd,
      newEntries: newEntries as any,
      biggestClimbers: climbers.slice(0, 5) as any,
      biggestFallers: fallers.slice(0, 5) as any,
      exits: exits as any,
      topContributors: topContributors.length > 0 ? (topContributors as any) : null,
      memberSpotlight: memberSpotlight ? (memberSpotlight as any) : null,
      totalPlays,
      totalPlaysChange,
      chartTurnover: newEntries.length,
      funFacts: funFacts as any,
      previousWeekStart: previousEntries.length > 0 ? previousWeekStart : null,
    },
  })
}

/**
 * Get cached trends for a group
 */
/**
 * Calculate consecutive streak in top 10 for chart entries
 * Returns entries with their current consecutive streak (minimum 2 weeks)
 */
export async function calculateConsecutiveStreaks(
  groupId: string,
  weekStart: Date,
  chartType?: 'artists' | 'tracks' | 'albums',
  minStreak: number = 2
): Promise<Array<{
  chartType: string
  entryKey: string
  name: string
  artist?: string
  position: number
  currentStreak: number
}>> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)
  
  // Limit historical lookback to 52 weeks (1 year) for performance
  const maxLookbackWeeks = 52
  const lookbackDate = new Date(normalizedWeekStart)
  lookbackDate.setUTCDate(lookbackDate.getUTCDate() - (maxLookbackWeeks * 7))
  
  // Get current week's top 10 entries
  const whereClause: any = {
    groupId,
    weekStart: normalizedWeekStart,
    position: {
      lte: 10,
    },
  }
  
  if (chartType) {
    whereClause.chartType = chartType
  }
  
  const currentTop10 = await prisma.groupChartEntry.findMany({
    where: whereClause,
  })
  
  if (currentTop10.length === 0) {
    return []
  }
  
  // Get entry keys grouped by chart type
  const entryKeysByType = new Map<string, Set<string>>()
  for (const entry of currentTop10) {
    if (!entryKeysByType.has(entry.chartType)) {
      entryKeysByType.set(entry.chartType, new Set())
    }
    entryKeysByType.get(entry.chartType)!.add(entry.entryKey)
  }
  
  // Batch fetch historical entries (only last 52 weeks for performance)
  const historicalQueries = Array.from(entryKeysByType.entries()).map(([type, keys]) =>
    prisma.groupChartEntry.findMany({
      where: {
        groupId,
        chartType: type,
        weekStart: {
          gte: lookbackDate,
          lt: normalizedWeekStart,
        },
        entryKey: {
          in: Array.from(keys),
        },
        position: {
          lte: 10, // Only fetch entries that were in top 10
        },
      },
      select: {
        weekStart: true,
        chartType: true,
        entryKey: true,
        position: true,
      },
      orderBy: {
        weekStart: 'desc',
      },
    })
  )
  
  const allHistoricalResults = await Promise.all(historicalQueries)
  const allHistoricalEntries = allHistoricalResults.flat()
  
  // Group historical entries by entry key for quick lookup
  const historicalByEntry = new Map<string, Map<number, number>>()
  for (const histEntry of allHistoricalEntries) {
    const key = `${histEntry.chartType}|${histEntry.entryKey}`
    if (!historicalByEntry.has(key)) {
      historicalByEntry.set(key, new Map())
    }
    const weekTime = histEntry.weekStart.getTime()
    historicalByEntry.get(key)!.set(weekTime, histEntry.position)
  }
  
  // Calculate consecutive streaks for each current top 10 entry
  const streakCalculations = currentTop10.map((entry) => {
    let streak = 1 // Start with current week
    const key = `${entry.chartType}|${entry.entryKey}`
    const historicalByWeek = historicalByEntry.get(key) || new Map()
    
    // Go backwards week by week to count consecutive appearances in top 10
    let weekToCheck = new Date(normalizedWeekStart)
    while (true) {
      weekToCheck.setUTCDate(weekToCheck.getUTCDate() - 7)
      const weekTime = weekToCheck.getTime()
      
      // Stop if we've gone beyond our lookback limit
      if (weekTime < lookbackDate.getTime()) {
        break
      }
      
      const position = historicalByWeek.get(weekTime)
      
      // If entry exists in this week and was in top 10, continue streak
      if (position !== undefined && position <= 10) {
        streak++
      } else {
        // Streak broken
        break
      }
    }
    
    return {
      entry,
      streak,
    }
  })
  
  // Filter to only entries with streak >= minStreak and sort by streak length
  return streakCalculations
    .filter(({ streak }) => streak >= minStreak)
    .sort((a, b) => b.streak - a.streak)
    .map(({ entry, streak }) => ({
      chartType: entry.chartType,
      entryKey: entry.entryKey,
      name: entry.name,
      artist: entry.artist || undefined,
      position: entry.position,
      currentStreak: streak,
    }))
}

export async function getTrendsForGroup(groupId: string) {
  return await prisma.groupTrends.findUnique({
    where: { groupId },
  })
}

/**
 * Calculate personalized stats for a user
 */
export async function calculatePersonalizedStats(
  userId: string,
  groupId: string,
  weekStart: Date,
  trends: NonNullable<Awaited<ReturnType<typeof getTrendsForGroup>>>
): Promise<PersonalizedStats> {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setUTCHours(0, 0, 0, 0)

  // Get user's VS contributions
  const userVS = await getUserVSForWeek(userId, normalizedWeekStart, prisma)

  // Get current week's chart entries
  const chartEntries = await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart: normalizedWeekStart,
    },
  })

  // Get group to determine chart mode
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { chartMode: true },
  })

  const chartMode = (group?.chartMode || 'plays_only') as string

  // Calculate user's total contribution
  let userTotalPlays = 0
  let userTotalVS = 0

  const userContributionsMap = new Map<string, { plays: number; vs: number }>()

  for (const entry of chartEntries) {
    const vsKey = entry.chartType === 'artists' ? userVS.topArtists : entry.chartType === 'tracks' ? userVS.topTracks : userVS.topAlbums
    const userEntry = vsKey.find((v) => v.entryKey === entry.entryKey)

    if (userEntry) {
      userTotalPlays += userEntry.playcount
      if (chartMode === 'vs' || chartMode === 'vs_weighted') {
        userTotalVS += userEntry.vibeScore
      } else {
        userTotalVS += userEntry.playcount
      }

      userContributionsMap.set(`${entry.chartType}|${entry.entryKey}`, {
        plays: userEntry.playcount,
        vs: userEntry.vibeScore,
      })
    }
  }

  const groupTotal = chartMode === 'vs' || chartMode === 'vs_weighted' ? 
    chartEntries.reduce((sum, e) => sum + (e.vibeScore || 0), 0) :
    chartEntries.reduce((sum, e) => sum + e.playcount, 0)

  const percentageOfGroup = groupTotal > 0 ? (userTotalVS / groupTotal) * 100 : 0

  // Get top contributions
  const topContributions = chartEntries
    .filter((entry) => userContributionsMap.has(`${entry.chartType}|${entry.entryKey}`))
    .map((entry) => {
      const userCont = userContributionsMap.get(`${entry.chartType}|${entry.entryKey}`)!
      const groupCont = chartMode === 'vs' || chartMode === 'vs_weighted' ? (entry.vibeScore || 0) : entry.playcount
      return {
        chartType: entry.chartType as ChartType,
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist || undefined,
        position: entry.position,
        userPlays: userCont.plays,
        userVS: userCont.vs,
        groupPlays: entry.playcount,
        groupVS: entry.vibeScore || 0,
        percentage: groupCont > 0 ? (userCont.vs / groupCont) * 100 : 0,
      }
    })
    .sort((a, b) => b.userVS - a.userVS)
    .slice(0, 10)

  // Find entries user drove (where user is main contributor)
  const entriesDriven = chartEntries
    .filter((entry) => userContributionsMap.has(`${entry.chartType}|${entry.entryKey}`))
    .map((entry) => {
      const userCont = userContributionsMap.get(`${entry.chartType}|${entry.entryKey}`)!
      const groupCont = chartMode === 'vs' || chartMode === 'vs_weighted' ? (entry.vibeScore || 0) : entry.playcount
      return {
        chartType: entry.chartType as ChartType,
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist || undefined,
        position: entry.position,
        userContribution: userCont.vs,
        totalContribution: groupCont,
        percentage: groupCont > 0 ? (userCont.vs / groupCont) * 100 : 0,
      }
    })
    .filter((e) => e.percentage >= 50) // User contributed 50% or more
    .sort((a, b) => b.percentage - a.percentage)

  // Find biggest movers user contributed to
  const biggestMovers = chartEntries
    .filter((entry) => entry.positionChange !== null && userContributionsMap.has(`${entry.chartType}|${entry.entryKey}`))
    .map((entry) => {
      const userCont = userContributionsMap.get(`${entry.chartType}|${entry.entryKey}`)!
      return {
        chartType: entry.chartType as ChartType,
        entryKey: entry.entryKey,
        name: entry.name,
        artist: entry.artist || undefined,
        positionChange: entry.positionChange!,
        oldPosition: entry.position - entry.positionChange!,
        newPosition: entry.position,
        userContribution: userCont.vs,
      }
    })
    .filter((m) => m.positionChange < 0) // Only climbers
    .sort((a, b) => a.positionChange - b.positionChange) // Biggest climbers first
    .slice(0, 5)

  // Calculate taste match (overlap with group)
  const userEntryKeys = new Set(
    [...userVS.topArtists, ...userVS.topTracks, ...userVS.topAlbums].map((e) => e.entryKey)
  )
  const groupEntryKeys = new Set(chartEntries.map((e) => e.entryKey))
  
  let sharedEntries = 0
  for (const key of userEntryKeys) {
    if (groupEntryKeys.has(key)) {
      sharedEntries++
    }
  }

  const tasteMatch = {
    overlapPercentage: groupEntryKeys.size > 0 ? (sharedEntries / groupEntryKeys.size) * 100 : 0,
    sharedEntries,
    totalGroupEntries: groupEntryKeys.size,
  }

  // Compare with MVP if available
  let vsMVP: PersonalizedStats['vsMVP'] | undefined
  if (trends.topContributors && Array.isArray(trends.topContributors) && trends.topContributors.length > 0) {
    const mvp = trends.topContributors[0] as unknown as MemberContribution
    vsMVP = {
      mvpUserId: mvp.userId,
      mvpName: mvp.name,
      userTotal: userTotalVS,
      mvpTotal: mvp.totalVS,
      percentage: mvp.totalVS > 0 ? (userTotalVS / mvp.totalVS) * 100 : 0,
    }
  }

  // Compare with highlighted members
  const vsHighlightedMembers: PersonalizedStats['vsHighlightedMembers'] = []
  if (trends.topContributors && Array.isArray(trends.topContributors)) {
    for (const member of trends.topContributors.slice(0, 3) as unknown as MemberContribution[]) {
      if (member.userId === userId) continue // Skip self
      vsHighlightedMembers.push({
        memberUserId: member.userId,
        memberName: member.name,
        userTotal: userTotalVS,
        memberTotal: member.totalVS,
        percentage: member.totalVS > 0 ? (userTotalVS / member.totalVS) * 100 : 0,
      })
    }
  }

  return {
    totalContribution: {
      plays: userTotalPlays,
      vs: userTotalVS,
      percentageOfGroup,
    },
    topContributions,
    entriesDriven,
    biggestMovers,
    tasteMatch,
    vsMVP,
    vsHighlightedMembers: vsHighlightedMembers.length > 0 ? vsHighlightedMembers : undefined,
  }
}


