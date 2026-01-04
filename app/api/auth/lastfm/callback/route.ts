import { NextResponse } from 'next/server'
import { createLastFMSession } from '@/lib/lastfm-auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(
      new URL('/auth/signup?error=no_token', request.url)
    )
  }

  const apiKey = process.env.LASTFM_API_KEY
  const apiSecret = process.env.LASTFM_API_SECRET

  if (!apiKey || !apiSecret) {
    console.error('Missing Last.fm API credentials')
    return NextResponse.redirect(
      new URL('/auth/signup?error=config', request.url)
    )
  }

  try {
    // Create Last.fm session from token
    const { sessionKey, username } = await createLastFMSession(
      token,
      apiKey,
      apiSecret
    )

    // Store session info temporarily in a cookie (will be used in account completion)
    // In production, consider using a more secure method like Redis or database
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
    return NextResponse.redirect(
      new URL(
        `/auth/signup?error=${encodeURIComponent(
          error instanceof Error ? error.message : 'authentication_failed'
        )}`,
        request.url
      )
    )
  }
}

