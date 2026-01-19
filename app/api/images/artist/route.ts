import { NextResponse } from 'next/server'
import { getArtistImage } from '@/lib/lastfm'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get('artist')

  if (!artist) {
    return NextResponse.json({ error: 'Artist name is required' }, { status: 400 })
  }

  try {
    const apiKey = process.env.LASTFM_API_KEY || ''
    const imageUrl = await getArtistImage(artist, apiKey)
    
    const response = NextResponse.json({ imageUrl })
    // Set cache headers - allow short-term caching but allow revalidation
    // This ensures new uploaded images can be fetched while still benefiting from caching
    response.headers.set('Cache-Control', 'public, max-age=300, must-revalidate') // 5 minutes
    return response
  } catch (error) {
    console.error('Error fetching artist image:', error)
    return NextResponse.json({ error: 'Failed to fetch artist image' }, { status: 500 })
  }
}







