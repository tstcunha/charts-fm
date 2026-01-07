import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email'
import { detectLocale } from '@/lib/locale-utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, password } = body

    // Validate input
    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, name, and password are required' },
        { status: 400 }
      )
    }

    // Validate password requirements
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check for at least one special character
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/
    if (!specialCharRegex.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one special character' },
        { status: 400 }
      )
    }

    // Get Last.fm session from cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('lastfm_session')

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No Last.fm session found. Please start over.' },
        { status: 400 }
      )
    }

    const sessionData = JSON.parse(sessionCookie.value)
    const { sessionKey, username: lastfmUsername } = sessionData

    if (!sessionKey || !lastfmUsername) {
      return NextResponse.json(
        { error: 'Invalid Last.fm session. Please start over.' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if Last.fm username already exists
    const existingLastFMUser = await prisma.user.findUnique({
      where: { lastfmUsername },
    })

    if (existingLastFMUser) {
      return NextResponse.json(
        { error: 'This Last.fm account is already connected to another account' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate verification token
    const verificationToken = generateVerificationToken()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24) // 24 hours from now

    // Create user with emailVerified: false
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        lastfmUsername,
        lastfmSessionKey: sessionKey,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpires: tokenExpires,
        lastVerificationEmailSentAt: new Date(), // Track when email was sent for rate limiting
      },
    })

    // Send verification email
    try {
      // Detect locale from request for new users
      const locale = await detectLocale(request)
      await sendVerificationEmail(email, verificationToken, name, locale)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      // Continue even if email fails - user can request resend
    }

    // Clear the temporary session cookie
    cookieStore.delete('lastfm_session')

    return NextResponse.json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastfmUsername: user.lastfmUsername,
      },
    })
  } catch (error) {
    console.error('Signup completion error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create account',
      },
      { status: 500 }
    )
  }
}

