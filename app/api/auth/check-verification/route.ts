import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email (case insensitive)
    const emailLower = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      select: {
        emailVerified: true,
      },
    })

    // Don't reveal if user exists or not for security
    // Only return verification status if user exists
    if (!user) {
      return NextResponse.json({
        exists: false,
        verified: false,
      })
    }

    return NextResponse.json({
      exists: true,
      verified: user.emailVerified,
    })
  } catch (error) {
    console.error('Check verification error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check verification status',
      },
      { status: 500 }
    )
  }
}

