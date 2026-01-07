import { NextResponse } from 'next/server'
import { getLastFMAuthUrl } from '@/lib/lastfm-auth'
import { cookies } from 'next/headers'
import { routing } from '@/i18n/routing'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') || 'signup' // 'signin' or 'signup'

  const apiKey = process.env.LASTFM_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Last.fm API key not configured' },
      { status: 500 }
    )
  }

  // Detect and store locale for use in callback
  // Try to extract from referer header (where the user came from)
  let detectedLocale = routing.defaultLocale
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const pathParts = refererUrl.pathname.split('/').filter(Boolean)
      if (pathParts.length > 0 && routing.locales.includes(pathParts[0])) {
        detectedLocale = pathParts[0]
      }
    } catch (error) {
      // Invalid referer URL, use default
    }
  }

  // Store mode and locale in cookies so we can retrieve them in the callback
  // (Last.fm callback URL is configured in app settings, so we can't pass it as a parameter)
  const cookieStore = await cookies()
  cookieStore.set('lastfm_auth_mode', mode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })
  cookieStore.set('lastfm_auth_locale', detectedLocale, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  // Generate Last.fm authorization URL
  const authUrl = getLastFMAuthUrl(apiKey)

  return NextResponse.json({ authUrl })
}

