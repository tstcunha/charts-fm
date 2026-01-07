import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups } from '@/lib/group-queries'

// GET - List user's groups
export async function GET() {
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

  const groups = await getUserGroups(user.id)

  return NextResponse.json({ groups })
}

// POST - Create a new group
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
  const { name, image, chartSize, trackingDayOfWeek, chartMode, isPrivate, allowFreeJoin, dynamicIconEnabled, dynamicIconSource } = body

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

  // Validate chartSize if provided
  if (chartSize !== undefined && ![10, 20, 50].includes(Number(chartSize))) {
    return NextResponse.json(
      { error: 'Chart size must be 10, 20, or 50' },
      { status: 400 }
    )
  }

  // Validate trackingDayOfWeek if provided
  if (trackingDayOfWeek !== undefined && (Number(trackingDayOfWeek) < 0 || Number(trackingDayOfWeek) > 6)) {
    return NextResponse.json(
      { error: 'Tracking day of week must be between 0 (Sunday) and 6 (Saturday)' },
      { status: 400 }
    )
  }

  // Validate chartMode if provided
  if (chartMode !== undefined && !['vs', 'vs_weighted', 'plays_only'].includes(chartMode)) {
    return NextResponse.json(
      { error: 'chartMode must be "vs", "vs_weighted", or "plays_only"' },
      { status: 400 }
    )
  }

  // Validate dynamicIconSource if dynamicIconEnabled is true
  if (dynamicIconEnabled === true) {
    if (!dynamicIconSource || typeof dynamicIconSource !== 'string') {
      return NextResponse.json(
        { error: 'dynamicIconSource is required when dynamicIconEnabled is true' },
        { status: 400 }
      )
    }
    if (!['top_artist', 'top_album', 'top_track_artist'].includes(dynamicIconSource)) {
      return NextResponse.json(
        { error: 'dynamicIconSource must be "top_artist", "top_album", or "top_track_artist"' },
        { status: 400 }
      )
    }
  }

  // Create group
  const group = await prisma.group.create({
    data: {
      name: trimmedName,
      image: image?.trim() || null,
      chartSize: chartSize !== undefined ? Number(chartSize) : 10,
      trackingDayOfWeek: trackingDayOfWeek !== undefined ? Number(trackingDayOfWeek) : 0,
      chartMode: chartMode !== undefined ? chartMode : 'vs', // Default to 'vs' instead of schema default
      isPrivate: isPrivate === true,
      allowFreeJoin: isPrivate === true ? false : (allowFreeJoin === true), // Only allow free join for public groups
      dynamicIconEnabled: dynamicIconEnabled === true,
      dynamicIconSource: dynamicIconEnabled === true ? dynamicIconSource : null,
      creatorId: user.id,
      members: {
        create: {
          userId: user.id, // Creator is automatically a member
        },
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          lastfmUsername: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
            },
          },
        },
      },
    },
  })

  // Note: Do not initialize with historical data or connect to Last.fm
  // Charts will be generated later when the user explicitly requests it

  return NextResponse.json({ group }, { status: 201 })
}

