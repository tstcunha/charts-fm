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
    
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error fetching artist image:', error)
    return NextResponse.json({ error: 'Failed to fetch artist image' }, { status: 500 })
  }
}

