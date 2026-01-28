// Pre-filtering logic for group compatibility (Stage 1)

import { prisma } from './prisma'

const MIN_MEMBERS = 2
const MIN_WEEKS_OLD = 0 // Group must be at least 0 weeks old (lowered for development)

/**
 * Pre-filter groups for compatibility calculation
 * Stage 1: Quick filtering based on basic criteria
 * Returns group IDs that pass the minimum requirements
 */
export async function preFilterGroups(userId: string): Promise<string[]> {
  const now = new Date()
  const oneWeekAgo = new Date(now)
  oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - MIN_WEEKS_OLD * 7)

  // Get user's group memberships and rejections
  const [userGroups, rejections] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    }),
    prisma.groupRecommendationRejection.findMany({
      where: { userId },
      select: { groupId: true },
    }),
  ])

  const userGroupIds = new Set(userGroups.map(g => g.groupId))
  const rejectedGroupIds = new Set(rejections.map(r => r.groupId))

  // Find public groups that meet minimum criteria
  const groups = await prisma.group.findMany({
    where: {
      isPrivate: false,
      isSolo: false,
      createdAt: { lte: oneWeekAgo },
      id: {
        notIn: Array.from(userGroupIds),
      },
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      allTimeStats: {
        select: {
          id: true,
        },
      },
      weeklyStats: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  })

  // Filter by minimum members and stats availability
  const filtered = groups
    .filter(group => {
      // Must have minimum members
      if (group._count.members < MIN_MEMBERS) {
        return false
      }

      // Must not be rejected
      if (rejectedGroupIds.has(group.id)) {
        return false
      }

      // Must have some stats (either all-time or weekly)
      if (!group.allTimeStats && group.weeklyStats.length === 0) {
        return false
      }

      return true
    })
    .map(group => group.id)

  return filtered
}

