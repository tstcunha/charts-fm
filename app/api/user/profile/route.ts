import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get user profile
export async function GET() {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// PATCH - Update user profile (including image)
export async function PATCH(request: Request) {
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
  const { name, image } = body

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name: name.trim() || null }),
      ...(image !== undefined && { image: image.trim() || null }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
    },
  })

  return NextResponse.json({ user: updatedUser })
}

