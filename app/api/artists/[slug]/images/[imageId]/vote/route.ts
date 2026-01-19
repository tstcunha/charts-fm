import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; imageId: string }> }
) {
  try {
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

    const { imageId } = await params
    const body = await request.json()
    const { voteType } = body

    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      return NextResponse.json(
        { error: 'Invalid vote type. Must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Check if image exists
    const image = await prisma.artistImage.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Upsert vote (allows changing vote)
    const vote = await prisma.artistImageVote.upsert({
      where: {
        imageId_userId: {
          imageId: imageId,
          userId: user.id,
        },
      },
      update: {
        voteType: voteType,
      },
      create: {
        imageId: imageId,
        userId: user.id,
        voteType: voteType,
      },
    })

    // Get updated vote counts
    const allVotes = await prisma.artistImageVote.findMany({
      where: { imageId: imageId },
    })

    const upvotes = allVotes.filter(v => v.voteType === 'up').length
    const downvotes = allVotes.filter(v => v.voteType === 'down').length

    return NextResponse.json({
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      userVote: voteType,
    })
  } catch (error) {
    console.error('Error voting on image:', error)
    return NextResponse.json(
      { error: 'Failed to vote on image' },
      { status: 500 }
    )
  }
}
