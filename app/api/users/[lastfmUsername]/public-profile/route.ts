import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getGroupImageUrl } from '@/lib/group-image-utils'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lastfmUsername: string }> }
) {
  const { lastfmUsername } = await params
  const username = decodeURIComponent(lastfmUsername).trim()

  if (!username) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const user = await prisma.user.findUnique({
    where: { lastfmUsername: username },
    select: {
      id: true,
      name: true,
      image: true,
      lastfmUsername: true,
      bio: true,
      profilePublic: true,
      showProfileStats: true,
      showProfileGroups: true,
      createdAt: true,
    },
  })

  if (!user || !user.profilePublic) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const session = await getSession()
  const viewerUserId = session?.user?.id || null
  const isSelf = viewerUserId === user.id

  const groups = await prisma.group.findMany({
    where: {
      OR: [{ creatorId: user.id }, { members: { some: { userId: user.id } } }],
    },
    select: {
      id: true,
      name: true,
      image: true,
      dynamicIconEnabled: true,
      dynamicIconSource: true,
      colorTheme: true,
      isPrivate: true,
      creatorId: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  const privateGroupIds = !isSelf && viewerUserId
    ? groups.filter((g) => g.isPrivate).map((g) => g.id)
    : []

  const viewerPrivateMemberships = privateGroupIds.length
    ? await prisma.groupMember.findMany({
        where: { userId: viewerUserId!, groupId: { in: privateGroupIds } },
        select: { groupId: true },
      })
    : []

  const viewerPrivateGroupIdSet = new Set(viewerPrivateMemberships.map((m) => m.groupId))

  const safeGroups = await Promise.all(
    groups
      .filter((g) => {
        if (!g.isPrivate) return true
        if (isSelf) return true
        if (!viewerUserId) return false
        if (g.creatorId === viewerUserId) return true
        return viewerPrivateGroupIdSet.has(g.id)
      })
      .map(async (g) => {
        const dynamicImage = await getGroupImageUrl({
          id: g.id,
          image: g.image,
          dynamicIconEnabled: g.dynamicIconEnabled,
          dynamicIconSource: g.dynamicIconSource,
        })
        return {
          id: g.id,
          name: g.name,
          image: dynamicImage,
          colorTheme: g.colorTheme || 'yellow',
          isPrivate: g.isPrivate,
        }
      })
  )

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
      lastfmUsername: user.lastfmUsername,
      bio: user.bio,
      profilePublic: user.profilePublic,
      showProfileStats: user.showProfileStats,
      showProfileGroups: user.showProfileGroups,
      createdAt: user.createdAt.toISOString(),
    },
    groups: safeGroups,
  })
}

