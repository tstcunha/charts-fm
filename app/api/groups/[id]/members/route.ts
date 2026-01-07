import { NextResponse } from 'next/server'
import { requireGroupMembership, requireGroupCreator } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

const MAX_GROUP_MEMBERS = 100

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    const { lastfmUsername } = body

    if (!lastfmUsername || typeof lastfmUsername !== 'string') {
      return NextResponse.json(
        { error: 'Last.fm username is required' },
        { status: 400 }
      )
    }

    // Find the user by lastfmUsername
    const invitee = await prisma.user.findUnique({
      where: { lastfmUsername: lastfmUsername.trim() },
    })

    if (!invitee) {
      return NextResponse.json(
        { error: 'User with this Last.fm username not found' },
        { status: 404 }
      )
    }

    // Check if user is trying to invite themselves
    if (invitee.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot invite yourself to the group' },
        { status: 400 }
      )
    }

    // Check if group has reached the maximum member limit
    const memberCount = await prisma.groupMember.count({
      where: { groupId: group.id },
    })

    if (memberCount >= MAX_GROUP_MEMBERS) {
      return NextResponse.json(
        { error: `Group has reached the maximum limit of ${MAX_GROUP_MEMBERS} members` },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: invitee.id,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this group' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invite
    const existingInvite = await prisma.groupInvite.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: invitee.id,
        },
      },
    })

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return NextResponse.json(
          { error: 'User already has a pending invite' },
          { status: 400 }
        )
      }
      // If there's a rejected/accepted invite, we can create a new one
      // Delete the old invite first
      await prisma.groupInvite.delete({
        where: { id: existingInvite.id },
      })
    }

    // Create the invite
    const invite = await prisma.groupInvite.create({
      data: {
        groupId: group.id,
        userId: invitee.id,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        invite: {
          id: invite.id,
          userId: invite.userId,
          createdAt: invite.createdAt.toISOString(),
          user: {
            id: invite.user.id,
            name: invite.user.name,
            lastfmUsername: invite.user.lastfmUsername,
            image: invite.user.image,
          },
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error creating invite:', error)
    
    // Handle Prisma validation errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Invite already exists' },
        { status: 400 }
      )
    }
    
    // Handle Prisma invalid ID format errors
    if (error.message && error.message.includes('did not match the expected pattern')) {
      return NextResponse.json(
        { error: 'Invalid group ID format' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create invite' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const isOwner = user.id === group.creatorId

    // Fetch members with images
    const membersWithImages = await prisma.groupMember.findMany({
      where: { groupId: group.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    })

    // Get pending invites for the group (owner only)
    let pendingInvites: any[] = []
    if (isOwner) {
      pendingInvites = await prisma.groupInvite.findMany({
        where: {
          groupId: group.id,
          status: 'pending',
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
              image: true,
            },
          },
        },
      })
    }

    // Get pending request count for group owner
    let requestCount = 0
    if (isOwner) {
      requestCount = await prisma.groupJoinRequest.count({
        where: {
          groupId: group.id,
          status: 'pending',
        },
      })
    }

    return NextResponse.json({
      members: membersWithImages.map((m) => ({
        id: m.id,
        userId: m.userId,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          lastfmUsername: m.user.lastfmUsername,
          image: m.user.image,
        },
      })),
      pendingInvites: pendingInvites.map((invite) => ({
        id: invite.id,
        userId: invite.userId,
        createdAt: invite.createdAt.toISOString(),
        user: {
          id: invite.user.id,
          name: invite.user.name,
          lastfmUsername: invite.user.lastfmUsername,
          image: invite.user.image,
        },
      })),
      isOwner,
      requestCount,
      creatorId: group.creatorId,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
