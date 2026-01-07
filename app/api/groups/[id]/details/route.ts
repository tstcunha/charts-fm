import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateGroupIconFromChart } from '@/lib/group-service'

// PATCH - Update group details (name and isPrivate)
export async function PATCH(
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
  const { name, isPrivate, allowFreeJoin, dynamicIconEnabled, dynamicIconSource } = body

  // Check if user is the creator
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      creatorId: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.creatorId !== user.id) {
    return NextResponse.json(
      { error: 'Only the group creator can update group details' },
      { status: 403 }
    )
  }

  // Validate name
  let validatedName: string | undefined
  if (name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }
    const trimmedName = name.trim()
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Group name cannot exceed 100 characters' },
        { status: 400 }
      )
    }
    validatedName = trimmedName
  }

  // Validate isPrivate
  if (isPrivate !== undefined && typeof isPrivate !== 'boolean') {
    return NextResponse.json(
      { error: 'isPrivate must be a boolean' },
      { status: 400 }
    )
  }

  // Validate allowFreeJoin
  if (allowFreeJoin !== undefined && typeof allowFreeJoin !== 'boolean') {
    return NextResponse.json(
      { error: 'allowFreeJoin must be a boolean' },
      { status: 400 }
    )
  }

  // Validate dynamicIconEnabled
  if (dynamicIconEnabled !== undefined && typeof dynamicIconEnabled !== 'boolean') {
    return NextResponse.json(
      { error: 'dynamicIconEnabled must be a boolean' },
      { status: 400 }
    )
  }

  // Validate dynamicIconSource
  if (dynamicIconSource !== undefined && dynamicIconSource !== null) {
    if (!['top_artist', 'top_album', 'top_track_artist'].includes(dynamicIconSource)) {
      return NextResponse.json(
        { error: 'dynamicIconSource must be "top_artist", "top_album", or "top_track_artist"' },
        { status: 400 }
      )
    }
  }

  // Get current group state to check if it's private
  const currentGroup = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      isPrivate: true,
    },
  })

  if (!currentGroup) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Determine final values
  const finalIsPrivate = isPrivate !== undefined ? isPrivate : currentGroup.isPrivate
  const finalAllowFreeJoin = allowFreeJoin !== undefined 
    ? (finalIsPrivate ? false : allowFreeJoin) // Can't allow free join if private
    : (finalIsPrivate ? false : undefined) // If becoming private, disable free join

  // Determine final values for dynamic icon settings
  const finalDynamicIconEnabled = dynamicIconEnabled !== undefined ? dynamicIconEnabled : undefined
  const finalDynamicIconSource = finalDynamicIconEnabled && dynamicIconSource !== undefined 
    ? dynamicIconSource 
    : (finalDynamicIconEnabled === false ? null : undefined)

  // Update group details
  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(validatedName !== undefined && { name: validatedName }),
      ...(isPrivate !== undefined && { isPrivate: finalIsPrivate }),
      ...(allowFreeJoin !== undefined && { allowFreeJoin: finalAllowFreeJoin }),
      ...(dynamicIconEnabled !== undefined && { dynamicIconEnabled: finalDynamicIconEnabled }),
      ...(dynamicIconSource !== undefined && { dynamicIconSource: finalDynamicIconSource }),
    },
    select: {
      id: true,
      name: true,
      isPrivate: true,
      allowFreeJoin: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
    },
  })

  // If dynamic icon is enabled and source is set, trigger icon update
  if (finalDynamicIconEnabled && finalDynamicIconSource) {
    // Don't await - let it run in background
    updateGroupIconFromChart(groupId).catch((error) => {
      console.error('Error updating group icon:', error)
    })
  }

  // Revalidate the cache for the group page and settings page
  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/settings`)

  return NextResponse.json({ group: updatedGroup })
}

