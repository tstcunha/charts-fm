import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateGroupWeeklyStats } from '@/lib/group-service'
import { getLastNFinishedWeeks } from '@/lib/weekly-utils'

// GET - Get group charts (weekly stats)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const groupId = params.id

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // If group is private, require authentication and membership
  if (group.isPrivate) {
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

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: user.id,
        },
      },
    })

    if (!membership && group.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }
  }
  // If group is public, allow unauthenticated access

  // Get all weekly stats for this group
  const weeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })

  return NextResponse.json({ weeklyStats })
}

// POST - Generate/refresh charts for a group
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const groupId = params.id

  // Check if user is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can generate charts' },
      { status: 403 }
    )
  }

  // Calculate stats for last 5 finished weeks (excluding current week)
  const weeks = getLastNFinishedWeeks(5)
  
  // Process sequentially to avoid API rate limits
  for (const weekStart of weeks) {
    await calculateGroupWeeklyStats(groupId, weekStart)
    // Small delay between weeks
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Get updated stats
  const weeklyStats = await prisma.groupWeeklyStats.findMany({
    where: { groupId },
    orderBy: {
      weekStart: 'desc',
    },
  })

  return NextResponse.json({ weeklyStats })
}

