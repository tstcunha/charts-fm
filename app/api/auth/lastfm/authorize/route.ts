import { NextResponse } from 'next/server'
import { getLastFMAuthUrl } from '@/lib/lastfm-auth'

export async function GET() {
  const apiKey = process.env.LASTFM_API_KEY
  const callbackUrl = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/lastfm/callback`
    : 'http://localhost:3000/api/auth/lastfm/callback'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Last.fm API key not configured' },
      { status: 500 }
    )
  }

  // Generate Last.fm authorization URL
  const authUrl = getLastFMAuthUrl(apiKey)

  return NextResponse.json({ authUrl })
}

