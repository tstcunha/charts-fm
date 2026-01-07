import { NextResponse } from 'next/server'
import { requireGroupCreator } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

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
    const { userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })

    if (!membership && group.creatorId !== userId) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 400 }
      )
    }

    // Create or update silence permission
    const permission = await prisma.groupShoutboxPermission.upsert({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
      update: {
        permission: 'silenced',
        grantedBy: user.id,
        updatedAt: new Date(),
      },
      create: {
        groupId: group.id,
        userId: userId,
        permission: 'silenced',
        grantedBy: user.id,
      },
    })

    return NextResponse.json(permission, { status: 201 })
  } catch (error) {
    console.error('Error silencing user:', error)
    return NextResponse.json(
      { error: 'Failed to silence user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if permission exists
    const permission = await prisma.groupShoutboxPermission.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })

    if (!permission || permission.permission !== 'silenced') {
      return NextResponse.json(
        { error: 'User is not silenced in this group' },
        { status: 404 }
      )
    }

    // Delete permission
    await prisma.groupShoutboxPermission.delete({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing silence:', error)
    return NextResponse.json(
      { error: 'Failed to remove silence' },
      { status: 500 }
    )
  }
}

