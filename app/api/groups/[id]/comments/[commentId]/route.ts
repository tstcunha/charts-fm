import { NextResponse } from 'next/server'
import { requireGroupMembership } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'

const MAX_CONTENT_LENGTH = 500

// PATCH - Update a comment
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
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

    const commentId = params.commentId

    // Validate commentId
    if (!commentId || typeof commentId !== 'string') {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // Get the comment
    const comment = await prisma.groupComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Verify comment belongs to this group
    if (comment.groupId !== group.id) {
      return NextResponse.json(
        { error: 'Comment does not belong to this group' },
        { status: 400 }
      )
    }

    // Check if user is the comment author or group owner
    const isOwner = group.creatorId === user.id
    if (comment.userId !== user.id && !isOwner) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { content } = body

    // Validate content
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

    // Update comment
    const updatedComment = await prisma.groupComment.update({
      where: { id: commentId },
      data: {
        content: trimmedContent,
        updatedAt: new Date(),
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

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const { user, group } = await requireGroupMembership(params.id)

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const commentId = params.commentId

    // Validate commentId
    if (!commentId || typeof commentId !== 'string') {
      return NextResponse.json(
        { error: 'Comment ID is required' },
        { status: 400 }
      )
    }

    // Get the comment
    const comment = await prisma.groupComment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Verify comment belongs to this group
    if (comment.groupId !== group.id) {
      return NextResponse.json(
        { error: 'Comment does not belong to this group' },
        { status: 400 }
      )
    }

    // Check if user is the comment author or group owner
    const isOwner = group.creatorId === user.id
    if (comment.userId !== user.id && !isOwner) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      )
    }

    // Delete comment
    await prisma.groupComment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}






