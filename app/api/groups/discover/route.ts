import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all public groups for discovery
export async function GET(request: Request) {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() || ''
  const allowFreeJoinParam = searchParams.get('allowFreeJoin')
  const minMembersParam = searchParams.get('minMembers')
  const sort = searchParams.get('sort') || 'newest'
  // Validate and parse page and limit
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10) || 20)) // Max 100 items per page
  const skip = (page - 1) * limit

  // Build where clause
  const where: any = {
    isPrivate: false, // Only public groups
  }

  // Search filter
  if (search) {
    where.name = {
      contains: search,
      mode: 'insensitive',
    }
  }

  // Free join filter
  if (allowFreeJoinParam === 'true') {
    where.allowFreeJoin = true
  }

  // Min members filter
  if (minMembersParam) {
    const minMembers = Math.max(0, parseInt(minMembersParam, 10) || 0)
    if (!isNaN(minMembers) && minMembers > 0) {
      // This will be handled via having clause or post-query filtering
      // For now, we'll filter after fetching
    }
  }

  // Get total count for pagination
  const totalCount = await prisma.group.count({ where })

  // Determine orderBy based on sort parameter
  let orderBy: any = { createdAt: 'desc' } // Default
  if (sort === 'newest') {
    orderBy = { createdAt: 'desc' }
  } else if (sort === 'oldest') {
    orderBy = { createdAt: 'asc' }
  } else if (sort === 'most_members' || sort === 'least_members') {
    // For member count sorting, we'll need to sort after fetching _count
    // For now, use createdAt as fallback and sort after
    orderBy = { createdAt: 'desc' }
  } else if (sort === 'most_active') {
    // For activity sorting, we'll sort after fetching activity data
    orderBy = { createdAt: 'desc' }
  }

  // Get paginated public groups with member counts
  const groups = await prisma.group.findMany({
    where,
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
      weeklyStats: {
        select: {
          weekStart: true,
        },
        orderBy: {
          weekStart: 'desc',
        },
        take: 1,
      },
    },
    orderBy,
    skip,
    take: limit,
  })

  // Filter by min members if specified
  let filteredGroups = groups
  if (minMembersParam) {
    const minMembers = Math.max(0, parseInt(minMembersParam, 10) || 0)
    if (!isNaN(minMembers) && minMembers > 0) {
      filteredGroups = groups.filter((g) => g._count.members >= minMembers)
    }
  }

  // Get latest chart update and week count for activity sorting
  const groupsWithActivity = await Promise.all(
    filteredGroups.map(async (group) => {
      const [latestChart, weekCount] = await Promise.all([
        prisma.groupChartEntry.findFirst({
          where: { groupId: group.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        prisma.groupWeeklyStats.count({
          where: { groupId: group.id },
        }),
      ])

      return {
        id: group.id,
        name: group.name,
        image: group.image,
        colorTheme: group.colorTheme,
        allowFreeJoin: group.allowFreeJoin,
        createdAt: group.createdAt.toISOString(),
        creator: group.creator,
        _count: group._count,
        lastChartUpdate: latestChart?.updatedAt.toISOString() || null,
        weekCount,
      }
    })
  )

  // Sort groups
  let sortedGroups = groupsWithActivity
  switch (sort) {
    case 'newest':
      sortedGroups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      break
    case 'oldest':
      sortedGroups.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      break
    case 'most_members':
      sortedGroups.sort((a, b) => b._count.members - a._count.members)
      break
    case 'least_members':
      sortedGroups.sort((a, b) => a._count.members - b._count.members)
      break
    case 'most_active':
      sortedGroups.sort((a, b) => {
        const aTime = a.lastChartUpdate ? new Date(a.lastChartUpdate).getTime() : 0
        const bTime = b.lastChartUpdate ? new Date(b.lastChartUpdate).getTime() : 0
        return bTime - aTime
      })
      break
    default:
      // Default to newest
      sortedGroups.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  }

  const hasMore = skip + sortedGroups.length < totalCount

  return NextResponse.json({ 
    groups: sortedGroups,
    pagination: {
      page,
      limit,
      total: totalCount,
      hasMore,
    },
  })
}

