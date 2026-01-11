// Dashboard-specific database queries

import { prisma } from './prisma'
import { getWeekStart, getWeekStartForDay, getWeekEndForDay } from './weekly-utils'
import { canUpdateCharts } from './group-service'

export interface PersonalListeningStats {
  currentWeek: {
    topArtists: Array<{ name: string; playcount: number }>
    topTracks: Array<{ name: string; artist: string; playcount: number }>
    topAlbums: Array<{ name: string; artist: string; playcount: number }>
    totalPlays: number
    uniqueArtists: number
    uniqueTracks: number
  } | null
  previousWeek: {
    topArtists: Array<{ name: string; playcount: number }>
    topTracks: Array<{ name: string; artist: string; playcount: number }>
    topAlbums: Array<{ name: string; artist: string; playcount: number }>
    totalPlays: number
  } | null
  weekStart: Date
}

export interface GroupQuickView {
  id: string
  name: string
  image: string | null
  colorTheme: string
  isOwner: boolean
  latestWeek: {
    weekStart: Date
    topArtist: { name: string; playcount: number } | null
    topTrack: { name: string; artist: string; playcount: number } | null
  } | null
  userContributions: {
    tracksInChart: number
    topContribution: { name: string; position: number; chartType: string } | null
  }
  daysUntilNextChart: number
  memberCount: number
  chartMode: string
  canUpdateCharts: boolean
}

export interface ActivityItem {
  type: 'chart_update' | 'new_member' | 'invite' | 'join_request' | 'position_change'
  groupId: string
  groupName: string
  message: string
  timestamp: Date
  metadata?: any
}

/**
 * Get personal listening stats for the most recent week with data and the previous week
 * First checks groups to find the most recent compiled week, then uses that to get user stats
 * Only shows data if there's actual data (non-empty arrays)
 */
export async function getPersonalListeningStats(userId: string): Promise<PersonalListeningStats> {
  // First, find the most recent week that has compiled data in any group the user is in
  const userGroups = await prisma.group.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
    },
  })

  const groupIds = userGroups.map((g) => g.id)

  // Find the most recent week with group weekly stats (compiled data)
  let mostRecentWeekStart: Date | null = null

  if (groupIds.length > 0) {
    const mostRecentGroupStats = await prisma.groupWeeklyStats.findFirst({
      where: {
        groupId: { in: groupIds },
      },
      orderBy: {
        weekStart: 'desc',
      },
      select: {
        weekStart: true,
      },
    })

    if (mostRecentGroupStats) {
      mostRecentWeekStart = mostRecentGroupStats.weekStart
    }
  }

  // If no compiled data exists in groups, return empty data without a specific week
  if (!mostRecentWeekStart) {
    return {
      currentWeek: null,
      previousWeek: null,
      weekStart: new Date(), // Will not be displayed since currentWeek is null
    }
  }

  // Use the most recent compiled week as the "current" week
  const currentWeekStart = mostRecentWeekStart
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)

  const [currentWeekStats, previousWeekStats] = await Promise.all([
    prisma.userWeeklyStats.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: currentWeekStart,
        },
      },
    }),
    prisma.userWeeklyStats.findUnique({
      where: {
        userId_weekStart: {
          userId,
          weekStart: previousWeekStart,
        },
      },
    }),
  ])

  // Only create currentWeek if stats exist AND have actual data
  let currentWeek: PersonalListeningStats['currentWeek'] = null
  if (currentWeekStats) {
    const topArtists = (currentWeekStats.topArtists as Array<{ name: string; playcount: number }>) || []
    const topTracks = (currentWeekStats.topTracks as Array<{ name: string; artist: string; playcount: number }>) || []
    const topAlbums = (currentWeekStats.topAlbums as Array<{ name: string; artist: string; playcount: number }>) || []

    // Only show data if there's actual content (at least one item)
    if (topArtists.length > 0 || topTracks.length > 0 || topAlbums.length > 0) {
      currentWeek = {
        topArtists,
        topTracks,
        topAlbums,
        totalPlays: 0,
        uniqueArtists: 0,
        uniqueTracks: 0,
      }

      // Calculate totals
      currentWeek.totalPlays =
        currentWeek.topArtists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
        currentWeek.topTracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
        currentWeek.topAlbums.reduce((sum, a) => sum + (a.playcount || 0), 0)
      currentWeek.uniqueArtists = new Set(currentWeek.topArtists.map((a) => a.name)).size
      currentWeek.uniqueTracks = new Set(currentWeek.topTracks.map((t) => `${t.name}|${t.artist}`)).size
    }
  }

  const previousWeek = previousWeekStats
    ? {
        topArtists: (previousWeekStats.topArtists as Array<{ name: string; playcount: number }>) || [],
        topTracks: (previousWeekStats.topTracks as Array<{ name: string; artist: string; playcount: number }>) || [],
        topAlbums: (previousWeekStats.topAlbums as Array<{ name: string; artist: string; playcount: number }>) || [],
        totalPlays: 0,
      }
    : null

  if (previousWeek) {
    previousWeek.totalPlays =
      previousWeek.topArtists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
      previousWeek.topTracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
      previousWeek.topAlbums.reduce((sum, a) => sum + (a.playcount || 0), 0)
  }

  return {
    currentWeek,
    previousWeek,
    weekStart: currentWeekStart,
  }
}

/**
 * Get quick view data for all user's groups
 */
export async function getGroupQuickViews(userId: string): Promise<GroupQuickView[]> {
  const groups = await prisma.group.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    include: {
      creator: {
        select: {
          id: true,
        },
      },
      members: {
        select: {
          userId: true,
        },
      },
      weeklyStats: {
        orderBy: {
          weekStart: 'desc',
        },
        take: 1,
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  const now = new Date()
  const quickViews: GroupQuickView[] = []

  for (const group of groups) {
    const isOwner = group.creatorId === userId
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0

    // Get latest week stats
    const latestWeekStats = group.weeklyStats[0]
    let latestWeek: GroupQuickView['latestWeek'] = null

    if (latestWeekStats) {
      const topArtists = (latestWeekStats.topArtists as Array<{ name: string; playcount: number }>) || []
      const topTracks = (latestWeekStats.topTracks as Array<{ name: string; artist: string; playcount: number }>) || []

      latestWeek = {
        weekStart: latestWeekStats.weekStart,
        topArtist: topArtists[0] || null,
        topTrack: topTracks[0] || null,
      }
    }

    // Get user's contributions to latest chart
    let tracksInChart = 0
    let topContribution: { name: string; position: number; chartType: string } | null = null

    if (latestWeekStats) {
      const chartEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          weekStart: latestWeekStats.weekStart,
        },
        orderBy: {
          position: 'asc',
        },
      })

      // Get user's VS entries for this week to see what they contributed
      const userVS = await prisma.userChartEntryVS.findMany({
        where: {
          userId,
          weekStart: latestWeekStats.weekStart,
        },
      })

      // Match user's VS entries with chart entries
      const userVSMap = new Map(
        userVS.map((vs) => [`${vs.chartType}|${vs.entryKey}`, { chartType: vs.chartType, entryKey: vs.entryKey }])
      )

      for (const entry of chartEntries) {
        const key = `${entry.chartType}|${entry.entryKey}`
        if (userVSMap.has(key)) {
          tracksInChart++
          if (!topContribution || entry.position < topContribution.position) {
            topContribution = {
              name: entry.name,
              position: entry.position,
              chartType: entry.chartType,
            }
          }
        }
      }
    }

    // Calculate canUpdateCharts and daysUntilNextChart using the same logic
    const lastChartWeek = latestWeekStats ? latestWeekStats.weekStart : null
    let daysUntilNextChart: number
    let canUpdate: boolean

    if (!lastChartWeek) {
      // No charts exist, can always update
      canUpdate = true
      daysUntilNextChart = 0
    } else {
      // Get the end of the last chart week
      const lastChartWeekEnd = getWeekEndForDay(lastChartWeek, trackingDayOfWeek)
      
      // Get the next occurrence of the tracking day after the end of the last chart week,
      // not counting the day immediately after it
      const dayAfterLastChartWeekEnd = new Date(lastChartWeekEnd)
      dayAfterLastChartWeekEnd.setUTCDate(dayAfterLastChartWeekEnd.getUTCDate() + 1)
      dayAfterLastChartWeekEnd.setUTCHours(0, 0, 0, 0)
      
      // Find the next occurrence of the tracking day after dayAfterLastChartWeekEnd
      const dateCanGenerateCharts = new Date(dayAfterLastChartWeekEnd)
      const currentDayOfWeek = dateCanGenerateCharts.getUTCDay()
      
      // Calculate days to add to get to the next tracking day
      let daysToAdd = trackingDayOfWeek - currentDayOfWeek
      if (daysToAdd <= 0) {
        daysToAdd += 7 // Move to next week
      }
      
      dateCanGenerateCharts.setUTCDate(dateCanGenerateCharts.getUTCDate() + daysToAdd)
      dateCanGenerateCharts.setUTCHours(0, 0, 0, 0)
      
      // Check if charts can be updated now
      canUpdate = now >= dateCanGenerateCharts
      
      // Calculate days until next chart can be generated
      if (canUpdate) {
        daysUntilNextChart = 0
      } else {
        daysUntilNextChart = Math.ceil((dateCanGenerateCharts.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    quickViews.push({
      id: group.id,
      name: group.name,
      image: group.image,
      colorTheme: (group.colorTheme || 'yellow') as string,
      isOwner,
      latestWeek,
      userContributions: {
        tracksInChart,
        topContribution,
      },
      daysUntilNextChart,
      memberCount: group._count.members,
      chartMode: (group.chartMode || 'plays_only') as string,
      canUpdateCharts: canUpdate,
    })
  }

  return quickViews
}

/**
 * Get recent activity feed for the user
 */
export async function getActivityFeed(userId: string, limit: number = 10): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = []

  // Get recent group chart updates (last 2 weeks)
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14)

  const userGroups = await prisma.group.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
    },
  })

  const groupIds = userGroups.map((g) => g.id)
  const groupMap = new Map(userGroups.map((g) => [g.id, g.name]))

  // Get recent chart updates
  const recentCharts = await prisma.groupWeeklyStats.findMany({
    where: {
      groupId: { in: groupIds },
      weekStart: { gte: twoWeeksAgo },
    },
    include: {
      group: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      weekStart: 'desc',
    },
    take: limit,
  })

  for (const chart of recentCharts) {
    activities.push({
      type: 'chart_update',
      groupId: chart.groupId,
      groupName: chart.group.name,
      message: `New charts available for ${chart.group.name}`,
      timestamp: chart.createdAt,
      metadata: {
        weekStart: chart.weekStart,
      },
    })
  }

  // Get recent new members (user's groups)
  const recentMembers = await prisma.groupMember.findMany({
    where: {
      groupId: { in: groupIds },
      userId: { not: userId }, // Exclude self
      joinedAt: { gte: twoWeeksAgo },
    },
    include: {
      group: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          name: true,
          lastfmUsername: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
    take: limit,
  })

  for (const member of recentMembers) {
    activities.push({
      type: 'new_member',
      groupId: member.groupId,
      groupName: member.group.name,
      message: `${member.user.name || member.user.lastfmUsername} joined ${member.group.name}`,
      timestamp: member.joinedAt,
      metadata: {
        userId: member.userId,
        userName: member.user.name || member.user.lastfmUsername,
      },
    })
  }

  // Get pending invites
  const pendingInvites = await prisma.groupInvite.findMany({
    where: {
      userId,
      status: 'pending',
    },
    include: {
      group: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  for (const invite of pendingInvites) {
    activities.push({
      type: 'invite',
      groupId: invite.groupId,
      groupName: invite.group.name,
      message: `You've been invited to join ${invite.group.name}`,
      timestamp: invite.createdAt,
      metadata: {
        inviteId: invite.id,
      },
    })
  }

  // Get pending join requests (for group owners)
  const ownedGroups = await prisma.group.findMany({
    where: {
      creatorId: userId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (ownedGroups.length > 0) {
    const ownedGroupIds = ownedGroups.map((g) => g.id)
    const pendingRequests = await prisma.groupJoinRequest.findMany({
      where: {
        groupId: { in: ownedGroupIds },
        status: 'pending',
      },
      include: {
        group: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            name: true,
            lastfmUsername: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    })

    for (const request of pendingRequests) {
      activities.push({
        type: 'join_request',
        groupId: request.groupId,
        groupName: request.group.name,
        message: `${request.user.name || request.user.lastfmUsername} wants to join ${request.group.name}`,
        timestamp: request.createdAt,
        metadata: {
          requestId: request.id,
          userId: request.userId,
          userName: request.user.name || request.user.lastfmUsername,
        },
      })
    }
  }

  // Sort all activities by timestamp (most recent first)
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return activities.slice(0, limit)
}

