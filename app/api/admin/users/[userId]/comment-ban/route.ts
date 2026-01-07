import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const superuser = await requireSuperuserApi()

    const body = await request.json()
    const { reason } = body

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create or update ban
    const ban = await prisma.userCommentBan.upsert({
      where: { userId: params.userId },
      update: {
        bannedBy: superuser.id,
        reason: reason || null,
        updatedAt: new Date(),
      },
      create: {
        userId: params.userId,
        bannedBy: superuser.id,
        reason: reason || null,
      },
    })

    return NextResponse.json(ban, { status: 201 })
  } catch (error) {
    console.error('Error banning user:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to ban user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await requireSuperuserApi()

    // Check if ban exists
    const ban = await prisma.userCommentBan.findUnique({
      where: { userId: params.userId },
    })

    if (!ban) {
      return NextResponse.json({ error: 'Ban not found' }, { status: 404 })
    }

    // Delete ban
    await prisma.userCommentBan.delete({
      where: { userId: params.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unbanning user:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to unban user' },
      { status: 500 }
    )
  }
}

