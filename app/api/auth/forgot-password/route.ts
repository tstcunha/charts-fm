import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateVerificationToken, sendPasswordResetEmail } from '@/lib/email'
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        lastPasswordResetEmailSentAt: true,
      },
    })

    // Don't reveal if email exists or not for security
    // Always return success message
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Check if user has a password (can't reset if they only use Last.fm auth)
    if (!user.password) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Check rate limit - prevent resending too frequently (60 seconds cooldown)
    const RESEND_COOLDOWN_SECONDS = 60
    if (user.lastPasswordResetEmailSentAt) {
      const timeSinceLastEmail = Date.now() - user.lastPasswordResetEmailSentAt.getTime()
      const cooldownMs = RESEND_COOLDOWN_SECONDS * 1000
      
      if (timeSinceLastEmail < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastEmail) / 1000)
        return NextResponse.json(
          { 
            error: `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before requesting another password reset email.`,
            retryAfter: remainingSeconds,
          },
          { status: 429 } // Too Many Requests
        )
      }
    }

    // Generate new password reset token
    const resetToken = generateVerificationToken()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 1) // 1 hour from now

    // Update user with new token and timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpires: tokenExpires,
        lastPasswordResetEmailSentAt: new Date(),
      },
    })

    // Send password reset email
    try {
      // Detect locale from request (will fall back to user's saved locale in email function)
      const locale = await detectLocale(request)
      await sendPasswordResetEmail(user.email, resetToken, user.name || 'User', locale)
    } catch (error) {
      console.error('Failed to send password reset email:', error)
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to process password reset request',
      },
      { status: 500 }
    )
  }
}

