import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserGroups } from '@/lib/group-queries'

// GET - List user's groups
export async function GET() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user ID from session instead of email to avoid issues with stale session data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
  const { name, image, chartSize, trackingDayOfWeek, chartMode, isPrivate, allowFreeJoin, dynamicIconEnabled, dynamicIconSource, tags } = body

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

  // Validate trackingDayOfWeek if provided (only Sunday=0 and Friday=5 are allowed)
  if (trackingDayOfWeek !== undefined && ![0, 5].includes(Number(trackingDayOfWeek))) {
    return NextResponse.json(
      { error: 'Tracking day of week must be either 0 (Sunday) or 5 (Friday)' },
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

  // Validate and process tags
  let processedTags: string[] = []
  if (tags !== undefined) {
    if (typeof tags === 'string') {
      // If tags is a string, split by space and process
      processedTags = tags
        .split(/\s+/)
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
    } else if (Array.isArray(tags)) {
      processedTags = tags
        .map(tag => String(tag).trim())
        .filter(tag => tag.length > 0)
    } else {
      return NextResponse.json(
        { error: 'Tags must be a string or an array' },
        { status: 400 }
      )
    }

    // Validate each tag: no whitespace, max 10 tags
    for (const tag of processedTags) {
      if (/\s/.test(tag)) {
        return NextResponse.json(
          { error: 'Tags cannot contain whitespace' },
          { status: 400 }
        )
      }
    }

    if (processedTags.length > 10) {
      return NextResponse.json(
        { error: 'Maximum of 10 tags allowed' },
        { status: 400 }
      )
    }

    // Remove duplicates (case-insensitive)
    const uniqueTags = Array.from(
      new Map(processedTags.map(tag => [tag.toLowerCase(), tag])).values()
    )
    processedTags = uniqueTags
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
      ...(processedTags.length > 0 && { tags: processedTags }),
      creatorId: user.id,
      members: {
        create: {
          userId: user.id, // Creator is automatically a member
        },
      },
    } as any,
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

