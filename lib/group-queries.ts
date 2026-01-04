// Shared database queries for groups (used by both API routes and server components)

import { prisma } from './prisma'

export async function getUserGroups(userId: string) {
  return await prisma.group.findMany({
    where: {
      OR: [
        { creatorId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getGroupById(groupId: string, userId: string) {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      OR: [
        { creatorId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  return group
}

export async function getGroupWeeklyStats(groupId: string) {
  return await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })
}

export async function getPublicGroupById(groupId: string) {
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      isPrivate: false, // Only return public groups
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      // Do NOT include members list for privacy
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  return group
}

/**
 * Get cached chart entries for a specific week and chart type
 */
export async function getGroupChartEntries(
  groupId: string,
  weekStart: Date,
  chartType: 'artists' | 'tracks' | 'albums'
) {
  return await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart,
      chartType,
    },
    orderBy: {
      position: 'asc',
    },
  })
}

/**
 * Get all chart entries for a specific week (all chart types)
 */
export async function getGroupChartEntriesForWeek(groupId: string, weekStart: Date) {
  return await prisma.groupChartEntry.findMany({
    where: {
      groupId,
      weekStart,
    },
    orderBy: [
      { chartType: 'asc' },
      { position: 'asc' },
    ],
  })
}

/**
 * Get all available weeks for a group (for week selector)
 */
export async function getGroupAvailableWeeks(groupId: string) {
  return await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    select: {
      weekStart: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
    distinct: ['weekStart'],
  })
}

