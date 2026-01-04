import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Add a member to a group
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
  const body = await request.json()
  const { lastfmUsername } = body

  if (!lastfmUsername || typeof lastfmUsername !== 'string') {
    return NextResponse.json(
      { error: 'Last.fm username is required' },
      { status: 400 }
    )
  }

  // Check if user is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can add members' },
      { status: 403 }
    )
  }

  // Find user by Last.fm username
  const memberUser = await prisma.user.findUnique({
    where: { lastfmUsername: lastfmUsername.trim() },
  })

  if (!memberUser) {
    return NextResponse.json(
      { error: 'User with this Last.fm username not found' },
      { status: 404 }
    )
  }

  // Check if already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: memberUser.id,
      },
    },
  })

  if (existingMember) {
    return NextResponse.json(
      { error: 'User is already a member of this group' },
      { status: 400 }
    )
  }

  // Add member
  await prisma.groupMember.create({
    data: {
      groupId,
      userId: memberUser.id,
    },
  })

  return NextResponse.json({ success: true })
}

// DELETE - Remove a member from a group (or leave)
export async function DELETE(
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
  const { searchParams } = new URL(request.url)
  const userIdToRemove = searchParams.get('userId') || user.id

  // Check if user is removing themselves or is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Users can always leave, but only creator can remove others
  if (userIdToRemove !== user.id && group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can remove other members' },
      { status: 403 }
    )
  }

  // Can't remove the creator
  if (userIdToRemove === group.creatorId) {
    return NextResponse.json(
      { error: 'Cannot remove the group creator' },
      { status: 400 }
    )
  }

  // Remove member
  await prisma.groupMember.deleteMany({
    where: {
      groupId,
      userId: userIdToRemove,
    },
  })

  return NextResponse.json({ success: true })
}

