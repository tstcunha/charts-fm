import { NextResponse } from 'next/server'
import { getAlbumImage } from '@/lib/lastfm'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get('artist')
  const album = searchParams.get('album')

  if (!artist || !album) {
    return NextResponse.json({ error: 'Artist and album names are required' }, { status: 400 })
  }

  try {
    const apiKey = process.env.LASTFM_API_KEY || ''
    const imageUrl = await getAlbumImage(artist, album, apiKey)
    
    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error fetching album image:', error)
    return NextResponse.json({ error: 'Failed to fetch album image' }, { status: 500 })
  }
}

