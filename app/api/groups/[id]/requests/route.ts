import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Create a join request
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

  // Check if group exists and is public
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.isPrivate) {
    return NextResponse.json(
      { error: 'Cannot request to join a private group' },
      { status: 403 }
    )
  }

  // Check if user is already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (existingMember) {
    return NextResponse.json(
      { error: 'You are already a member of this group' },
      { status: 400 }
    )
  }

  // Check if user is the creator
  if (group.creatorId === user.id) {
    return NextResponse.json(
      { error: 'You are the creator of this group' },
      { status: 400 }
    )
  }

  // Check if user has already sent a pending request
  const existingRequest = await prisma.groupJoinRequest.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (existingRequest && existingRequest.status === 'pending') {
    return NextResponse.json(
      { error: 'You have already sent a request to join this group' },
      { status: 400 }
    )
  }

  // If group allows free join, add user directly as a member
  if (group.allowFreeJoin) {
    // Delete any existing request first (in case there was a rejected one)
    if (existingRequest) {
      await prisma.groupJoinRequest.delete({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })
    }

    // Add user as a member directly
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true, joined: true })
  }

  // Otherwise, create a join request
  await prisma.groupJoinRequest.create({
    data: {
      groupId,
      userId: user.id,
      status: 'pending',
    },
  })

  return NextResponse.json({ success: true, joined: false })
}

// GET - Get all pending requests for a group (owner only)
export async function GET(
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

  // Check if group exists
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Verify user is the group owner
  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group owner can view requests' },
      { status: 403 }
    )
  }

  // Get all pending requests with user details
  const requests = await prisma.groupJoinRequest.findMany({
    where: {
      groupId,
      status: 'pending',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return NextResponse.json({ requests })
}

