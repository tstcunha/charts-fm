import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email'
import { detectLocale } from '@/lib/locale-utils'

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

    // Find unverified user by email (case insensitive)
    const emailLower = email.toLowerCase().trim()
    const user = await prisma.user.findUnique({
      where: { email: emailLower },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        lastVerificationEmailSentAt: true,
      },
    })

    if (!user) {
      // Don't reveal if email exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification email has been sent.',
      })
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Check rate limit - prevent resending too frequently (60 seconds cooldown)
    const RESEND_COOLDOWN_SECONDS = 60
    if (user.lastVerificationEmailSentAt) {
      const timeSinceLastEmail = Date.now() - user.lastVerificationEmailSentAt.getTime()
      const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000
      
      if (timeSinceLastEmail < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastEmail) / 1000)
        return NextResponse.json(
          { 
            error: `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before requesting another verification email.`,
            retryAfter: remainingSeconds,
          },
          { status: 429 } // Too Many Requests
        )
      }
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24) // 24 hours from now

    // Update user with new token and timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: tokenExpires,
        lastVerificationEmailSentAt: new Date(),
      },
    })

    // Send verification email
    try {
      // Detect locale from request (will fall back to user's saved locale in email function)
      const locale = await detectLocale(request)
      await sendVerificationEmail(user.email, verificationToken, user.name || 'User', locale)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to resend verification email',
      },
      { status: 500 }
    )
  }
}

