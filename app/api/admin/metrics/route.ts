import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Total groups
    const totalGroups = await prisma.group.count()

    // Groups with recent activity (updated in last 7 days or with recent chart entries)
    const groupsWithRecentActivity = await prisma.group.count({
      where: {
        OR: [
          { updatedAt: { gte: sevenDaysAgo } },
          {
            chartEntries: {
              some: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          },
          {
            comments: {
              some: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          }
        ]
      }
    })

    // Total users
    const totalUsers = await prisma.user.count()

    // Users created recently
    const usersCreatedLast7Days = await prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    })

    const usersCreatedLast30Days = await prisma.user.count({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    // Users with recent access
    const usersWithRecentAccess7Days = await prisma.user.count({
      where: {
        lastAccessedAt: { gte: sevenDaysAgo }
      }
    })

    const usersWithRecentAccess30Days = await prisma.user.count({
      where: {
        lastAccessedAt: { gte: thirtyDaysAgo }
      }
    })

    // Users with quick access group (engagement metric)
    const usersWithQuickAccess = await prisma.user.count({
      where: {
        quickAccessGroupId: { not: null }
      }
    })

    // Active groups (groups with at least one member)
    const activeGroups = await prisma.group.count({
      where: {
        members: {
          some: {}
        }
      }
    })

    // Total chart entries
    const totalChartEntries = await prisma.groupChartEntry.count()

    // Groups with trends
    const groupsWithTrends = await prisma.groupTrends.count()

    // Average group size
    const groupSizes = await prisma.groupMember.groupBy({
      by: ['groupId'],
      _count: {
        id: true
      }
    })
    const avgGroupSize = groupSizes.length > 0
      ? groupSizes.reduce((sum, g) => sum + g._count.id, 0) / groupSizes.length
      : 0

    // Total comments
    const totalComments = await prisma.groupComment.count()

    // Users with email verified
    const usersWithEmailVerified = await prisma.user.count({
      where: {
        emailVerified: true
      }
    })

    // Groups with dynamic icons enabled
    const groupsWithDynamicIcons = await prisma.group.count({
      where: {
        dynamicIconEnabled: true
      }
    })

    // Private vs public groups
    const privateGroups = await prisma.group.count({
      where: {
        isPrivate: true
      }
    })

    const publicGroups = await prisma.group.count({
      where: {
        isPrivate: false
      }
    })

    // Groups with recent chart generation
    const groupsWithRecentChartGeneration = await prisma.group.count({
      where: {
        chartGenerationStartedAt: { gte: sevenDaysAgo }
      }
    })

    // Total friendships
    const totalFriendships = await prisma.friendship.count({
      where: {
        status: 'accepted'
      }
    })

    // Groups with weekly stats
    const groupsWithWeeklyStats = await prisma.groupWeeklyStats.groupBy({
      by: ['groupId'],
      _count: {
        id: true
      }
    })

    // Total artist images uploaded
    const totalArtistImages = await prisma.artistImage.count()

    // Groups with records calculated
    const groupsWithRecords = await prisma.groupRecords.count({
      where: {
        status: 'completed'
      }
    })

    // Calculate engagement rate (users with quick access / total users)
    const engagementRate = totalUsers > 0
      ? ((usersWithQuickAccess / totalUsers) * 100).toFixed(1)
      : '0.0'

    // Calculate active user rate (users with recent access / total users)
    const activeUserRate7Days = totalUsers > 0
      ? ((usersWithRecentAccess7Days / totalUsers) * 100).toFixed(1)
      : '0.0'

    const activeUserRate30Days = totalUsers > 0
      ? ((usersWithRecentAccess30Days / totalUsers) * 100).toFixed(1)
      : '0.0'

    // Calculate groups activity rate
    const groupsActivityRate = totalGroups > 0
      ? ((groupsWithRecentActivity / totalGroups) * 100).toFixed(1)
      : '0.0'

    return NextResponse.json({
      // Core metrics
      totalGroups,
      groupsWithRecentActivity,
      totalUsers,
      usersCreatedLast7Days,
      usersCreatedLast30Days,
      usersWithRecentAccess7Days,
      usersWithRecentAccess30Days,
      usersWithQuickAccess,
      
      // Additional metrics
      activeGroups,
      totalChartEntries,
      groupsWithTrends,
      avgGroupSize: Math.round(avgGroupSize * 10) / 10,
      totalComments,
      usersWithEmailVerified,
      groupsWithDynamicIcons,
      privateGroups,
      publicGroups,
      groupsWithRecentChartGeneration,
      totalFriendships,
      groupsWithWeeklyStats: groupsWithWeeklyStats.length,
      totalArtistImages,
      groupsWithRecords,
      
      // Calculated rates
      engagementRate,
      activeUserRate7Days,
      activeUserRate30Days,
      groupsActivityRate,
    })
  } catch (error) {
    console.error('Admin metrics error:', error)
    
    // Handle unauthorized error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch metrics',
      },
      { status: 500 }
    )
  }
}
