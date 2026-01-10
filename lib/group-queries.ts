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
 * Get group by ID without membership restriction (for access control)
 * Returns group data with basic info, but members list only if userId is provided and is a member
 * IMPORTANT: Does NOT filter by isPrivate - that check is done in getGroupAccess
 * This function is only called from getGroupAccess which handles private group filtering
 */
export async function getGroupByIdForAccess(groupId: string, userId?: string | null) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  })

  if (!group) {
    return null
  }

  // If userId is provided and user is a member, include members list
  if (userId) {
    const isCreator = group.creatorId === userId
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    })

    if (isCreator || membership) {
      // User is a member, include full group data with members
      return await getGroupById(groupId, userId)
    }
  }

  // Return group without members list
  // Note: isPrivate check is handled in getGroupAccess, not here
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

/**
 * Get all-time stats for a group
 */
export async function getGroupAllTimeStats(groupId: string) {
  return await prisma.groupAllTimeStats.findUnique({
    where: { groupId },
  })
}

/**
 * Get pending group invites for a user
 */
export async function getUserGroupInvites(userId: string) {
  const invites = await prisma.groupInvite.findMany({
    where: {
      userId,
      status: 'pending',
    },
    include: {
      group: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return invites
}

