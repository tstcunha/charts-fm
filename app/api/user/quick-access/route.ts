import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGroupImageUrl } from '@/lib/group-image-utils'

// GET - Get current quick access group
export async function GET() {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      quickAccessGroup: {
        select: {
          id: true,
          name: true,
          image: true,
          colorTheme: true,
          dynamicIconEnabled: true,
          dynamicIconSource: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.quickAccessGroup) {
    return NextResponse.json({ group: null })
  }

  // Get dynamic image URL if applicable
  const dynamicImage = await getGroupImageUrl({
    id: user.quickAccessGroup.id,
    image: user.quickAccessGroup.image,
    dynamicIconEnabled: user.quickAccessGroup.dynamicIconEnabled,
    dynamicIconSource: user.quickAccessGroup.dynamicIconSource,
  })

  return NextResponse.json({
    group: {
      id: user.quickAccessGroup.id,
      name: user.quickAccessGroup.name,
      image: dynamicImage,
      colorTheme: user.quickAccessGroup.colorTheme || 'white',
    },
  })
}

// POST - Set a group as quick access
export async function POST(request: Request) {
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

  const body = await request.json()
  const { groupId } = body

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
  }

  // Verify user is a member of the group
  const membership = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId: user.id,
      },
    },
  })

  if (!membership) {
    return NextResponse.json(
      { error: 'You must be a member of the group to add it to quick access' },
      { status: 403 }
    )
  }

  // Get the group details
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      name: true,
      image: true,
      colorTheme: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
    },
  })

  if (!group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  // Get dynamic image URL if applicable
  const dynamicImage = await getGroupImageUrl({
    id: group.id,
    image: group.image,
    dynamicIconEnabled: group.dynamicIconEnabled,
    dynamicIconSource: group.dynamicIconSource,
  })

  // Update user's quick access group
  await prisma.user.update({
    where: { id: user.id },
    data: {
      quickAccessGroupId: groupId,
    },
  })

  return NextResponse.json({
    group: {
      id: group.id,
      name: group.name,
      image: dynamicImage,
      colorTheme: group.colorTheme || 'white',
    },
  })
}

// DELETE - Remove quick access group
export async function DELETE() {
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      quickAccessGroupId: null,
    },
  })

  return NextResponse.json({ success: true })
}

