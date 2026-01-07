import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

const THROTTLE_WINDOW_SECONDS = parseInt(process.env.SHOUTBOX_THROTTLE_WINDOW_SECONDS || '60')
const THROTTLE_MAX_COMMENTS = parseInt(process.env.SHOUTBOX_THROTTLE_MAX_COMMENTS || '3')
const MAX_CONTENT_LENGTH = 500

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if shoutbox is enabled
    if (!group.shoutboxEnabled) {
      return NextResponse.json({ comments: [], total: 0, page: 1, totalPages: 0 })
    }

    const url = new URL(request.url)
    const pageParam = url.searchParams.get('page') || '1'
    const limitParam = url.searchParams.get('limit') || '20'
    
    // Validate and parse page and limit
    const page = Math.max(1, parseInt(pageParam, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(limitParam, 10) || 20)) // Max 100 items per page

    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.groupComment.count({
      where: { groupId: group.id },
    })

    // Get comments with user info
    const comments = await prisma.groupComment.findMany({
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    // Map comments to handle null user (deleted users)
    const mappedComments = comments.map(comment => ({
      ...comment,
      user: comment.user || {
        id: null,
        name: 'Deleted User',
        lastfmUsername: 'deleted',
        image: null,
      },
    }))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      comments: mappedComments,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if shoutbox is enabled
    if (!group.shoutboxEnabled) {
      return NextResponse.json(
        { error: 'Shoutbox is disabled for this group' },
        { status: 403 }
      )
    }

    // Check for global ban
    const globalBan = await prisma.userCommentBan.findUnique({
      where: { userId: user.id },
    })

    if (globalBan) {
      return NextResponse.json(
        { error: 'You are banned from posting comments' },
        { status: 403 }
      )
    }

    // Check for group silence
    const silencePermission = await prisma.groupShoutboxPermission.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: user.id,
        },
      },
    })

    if (silencePermission?.permission === 'silenced') {
      return NextResponse.json(
        { error: 'You are silenced in this group' },
        { status: 403 }
      )
    }

    // Check restrictive mode
    if (group.shoutboxRestrictiveMode) {
      const allowPermission = await prisma.groupShoutboxPermission.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: user.id,
          },
        },
      })

      if (allowPermission?.permission !== 'allowed') {
        return NextResponse.json(
          { error: 'You do not have permission to post in this group' },
          { status: 403 }
        )
      }
    }

    // Throttling check
    const throttleWindow = new Date(Date.now() - THROTTLE_WINDOW_SECONDS * 1000)
    const recentComments = await prisma.groupComment.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: throttleWindow,
        },
      },
    })

    if (recentComments >= THROTTLE_MAX_COMMENTS) {
      return NextResponse.json(
        { error: `Too many comments. Please wait before posting again. (Limit: ${THROTTLE_MAX_COMMENTS} per ${THROTTLE_WINDOW_SECONDS} seconds)` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const trimmedContent = content.trim()

    if (trimmedContent.length === 0) {
      return NextResponse.json(
        { error: 'Content cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `Content cannot exceed ${MAX_CONTENT_LENGTH} characters` },
        { status: 400 }
      )
    }

    // Create comment
    const comment = await prisma.groupComment.create({
      data: {
        groupId: group.id,
        userId: user.id,
        content: trimmedContent,
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

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

