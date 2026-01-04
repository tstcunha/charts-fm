import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('lastfm_session')

  if (!sessionCookie) {
    return NextResponse.json(
      { error: 'No Last.fm session found' },
      { status: 404 }
    )
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value)
    return NextResponse.json({
      username: sessionData.username,
      hasSession: !!sessionData.sessionKey,
    })
  } catch {
    return NextResponse.json(
      { error: 'Invalid session data' },
      { status: 400 }
    )
  }
}

