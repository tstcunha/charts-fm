import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
  const { name, isPrivate, allowFreeJoin } = body

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
  if (name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }
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

  // Update group details
  const updatedGroup = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(isPrivate !== undefined && { isPrivate: finalIsPrivate }),
      ...(allowFreeJoin !== undefined && { allowFreeJoin: finalAllowFreeJoin }),
    },
    select: {
      id: true,
      name: true,
      isPrivate: true,
      allowFreeJoin: true,
    },
  })

  return NextResponse.json({ group: updatedGroup })
}

