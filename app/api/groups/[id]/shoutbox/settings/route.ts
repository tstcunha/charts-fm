import { NextResponse } from 'next/server'
import { requireGroupCreator } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Get silenced users
    const silencedPermissions = await prisma.groupShoutboxPermission.findMany({
      where: {
        groupId: group.id,
        permission: 'silenced',
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

    // Get allowed users
    const allowedPermissions = await prisma.groupShoutboxPermission.findMany({
      where: {
        groupId: group.id,
        permission: 'allowed',
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

    return NextResponse.json({
      shoutboxEnabled: group.shoutboxEnabled ?? true,
      shoutboxRestrictiveMode: group.shoutboxRestrictiveMode ?? false,
      silencedUsers: silencedPermissions.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        lastfmUsername: p.user.lastfmUsername,
        image: p.user.image,
        permissionId: p.id,
      })),
      allowedUsers: allowedPermissions.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        lastfmUsername: p.user.lastfmUsername,
        image: p.user.image,
        permissionId: p.id,
      })),
    })
  } catch (error) {
    console.error('Error fetching shoutbox settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shoutbox settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupCreator(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const body = await request.json()
    const { shoutboxEnabled, shoutboxRestrictiveMode } = body

    const updateData: { shoutboxEnabled?: boolean; shoutboxRestrictiveMode?: boolean } = {}

    if (typeof shoutboxEnabled === 'boolean') {
      updateData.shoutboxEnabled = shoutboxEnabled
    }

    if (typeof shoutboxRestrictiveMode === 'boolean') {
      updateData.shoutboxRestrictiveMode = shoutboxRestrictiveMode
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update group settings
    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: updateData,
    })

    return NextResponse.json({
      shoutboxEnabled: updatedGroup.shoutboxEnabled,
      shoutboxRestrictiveMode: updatedGroup.shoutboxRestrictiveMode,
    })
  } catch (error) {
    console.error('Error updating shoutbox settings:', error)
    return NextResponse.json(
      { error: 'Failed to update shoutbox settings' },
      { status: 500 }
    )
  }
}

