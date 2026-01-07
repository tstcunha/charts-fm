import { NextResponse } from 'next/server'
import { createLastFMSession } from '@/lib/lastfm-auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  // Get mode from cookie (set during authorization)
  const cookieStore = await cookies()
  const modeCookie = cookieStore.get('lastfm_auth_mode')
  const mode = modeCookie?.value || 'signup' // 'signin' or 'signup'
  
  // Clear the mode cookie after reading
  if (modeCookie) {
    cookieStore.delete('lastfm_auth_mode')
  }

  if (!token) {
    const errorUrl = mode === 'signin' 
      ? '/?error=no_token&signin=true'
      : '/auth/signup?error=no_token'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  const apiKey = process.env.LASTFM_API_KEY
  const apiSecret = process.env.LASTFM_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('Missing Last.fm API credentials')
    const errorUrl = mode === 'signin'
      ? '/?error=config&signin=true'
      : '/auth/signup?error=config'
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }

  try {
    // Create Last.fm session from token
    const { sessionKey, username } = await createLastFMSession(
      token,
      apiKey,
      apiSecret
    )

    // Always check if user already exists first, regardless of mode
    // This prevents redirecting existing users to signup if the mode cookie is lost
    const existingUser = await prisma.user.findUnique({
      where: { lastfmUsername: username },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        lastfmSessionKey: true,
      }
    })

    if (existingUser) {
      // User exists - handle signin flow
      // Check if email is verified
      if (!existingUser.emailVerified) {
        // Redirect to verification page with email
        return NextResponse.redirect(
          new URL(`/auth/verify-email?email=${encodeURIComponent(existingUser.email)}&error=email_not_verified`, request.url)
        )
      }

      // Update session key
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastfmSessionKey: sessionKey }
      })

      // Store credentials temporarily for client-side signin
      const cookieStore = await cookies()
      cookieStore.set('lastfm_signin', JSON.stringify({ sessionKey, username }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5, // 5 minutes
        path: '/',
      })

      // Redirect to a page that will handle the client-side signin
      return NextResponse.redirect(
        new URL('/auth/signin/lastfm', request.url)
      )
    }

    // User doesn't exist - proceed with signup flow
    // But only if mode is 'signup' (or default). If mode is 'signin' and user doesn't exist, show error
    if (mode === 'signin') {
      // User tried to sign in but account doesn't exist
      return NextResponse.redirect(
        new URL('/auth/signup?error=user_not_found&lastfm_username=' + encodeURIComponent(username), request.url)
      )
    }

    // Signup flow - store session info temporarily in a cookie
    const cookieStore = await cookies()
    cookieStore.set('lastfm_session', JSON.stringify({ sessionKey, username }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour (tokens are valid for 60 minutes)
      path: '/',
    })

    // Redirect to account completion page
    return NextResponse.redirect(
      new URL('/auth/signup/complete', request.url)
    )
  } catch (error) {
    console.error('Last.fm callback error:', error)
    const errorUrl = mode === 'signin'
      ? `/?error=${encodeURIComponent(error instanceof Error ? error.message : 'authentication_failed')}&signin=true`
      : `/auth/signup?error=${encodeURIComponent(error instanceof Error ? error.message : 'authentication_failed')}`
    return NextResponse.redirect(new URL(errorUrl, request.url))
  }
}

