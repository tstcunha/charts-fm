import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MAX_GROUP_MEMBERS = 100

// PATCH - Accept invite
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; inviteId: string } }
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
  const inviteId = params.inviteId

  // Validate invite exists and belongs to the group
  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.groupId !== groupId) {
    return NextResponse.json(
      { error: 'Invite does not belong to this group' },
      { status: 400 }
    )
  }

  // Verify the authenticated user is the invitee
  if (invite.userId !== user.id) {
    return NextResponse.json(
      { error: 'You can only accept your own invites' },
      { status: 403 }
    )
  }

  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: 'Invite is not pending' },
      { status: 400 }
    )
  }

  // Check if user is not already a member (race condition protection)
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: invite.userId,
      },
    },
  })

  if (existingMember) {
    // User is already a member, just update the invite status
    await prisma.groupInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted' },
    })
    return NextResponse.json({ success: true })
  }

  // Check if group has reached the maximum member limit
  const memberCount = await prisma.groupMember.count({
    where: { groupId },
  })

  if (memberCount >= MAX_GROUP_MEMBERS) {
    return NextResponse.json(
      { error: `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members` },
      { status: 400 }
    )
  }

  // Update invite status to accepted and create GroupMember entry
  await prisma.$transaction([
    prisma.groupInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted' },
    }),
    prisma.groupMember.create({
      data: {
        groupId,
        userId: invite.userId,
      },
    }),
  ])

  return NextResponse.json({ success: true })
}

// DELETE - Reject invite
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; inviteId: string } }
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
  const inviteId = params.inviteId

  // Validate invite exists and belongs to the group
  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
  })

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.groupId !== groupId) {
    return NextResponse.json(
      { error: 'Invite does not belong to this group' },
      { status: 400 }
    )
  }

  // Verify the authenticated user is the invitee
  if (invite.userId !== user.id) {
    return NextResponse.json(
      { error: 'You can only reject your own invites' },
      { status: 403 }
    )
  }

  if (invite.status !== 'pending') {
    return NextResponse.json(
      { error: 'Invite is not pending' },
      { status: 400 }
    )
  }

  // Update invite status to rejected
  await prisma.groupInvite.update({
    where: { id: inviteId },
    data: { status: 'rejected' },
  })

  return NextResponse.json({ success: true })
}

