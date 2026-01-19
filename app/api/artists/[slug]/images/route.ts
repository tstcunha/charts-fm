import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadFile, deleteFile } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
import { normalizeArtistName, getArtistImages } from '@/lib/artist-images'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

/**
 * Convert slug back to normalized artist name
 * For artists, slug is the entryKey with spaces replaced by hyphens
 * We'll try to find the actual artist name from GroupChartEntry, or use slug as fallback
 */
async function getArtistNameFromSlug(slug: string): Promise<string> {
  // Try to find an artist entry with this slug
  const entry = await prisma.groupChartEntry.findFirst({
    where: {
      chartType: 'artists',
      slug: slug,
    },
    select: {
      entryKey: true,
      name: true,
    },
    orderBy: {
      weekStart: 'desc',
    },
  })

  if (entry) {
    // Use the entryKey (normalized name) from the entry
    return entry.entryKey
  }

  // Fallback: convert slug back to normalized name
  // Replace hyphens with spaces and normalize
  const artistName = slug.replace(/-/g, ' ').trim()
  return normalizeArtistName(artistName)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await getSession()
    const userId = session?.user?.id

    const artistName = await getArtistNameFromSlug(slug)
    const images = await getArtistImages(artistName, userId)

    return NextResponse.json({ images })
  } catch (error) {
    console.error('Error fetching artist images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch artist images' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { slug } = await params
    const artistName = await getArtistNameFromSlug(slug)

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file extension
    const fileName = file.name.toLowerCase()
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext))
    
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .gif files are allowed.' },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const uniqueFileName = `${normalizeArtistName(artistName).replace(/[^a-z0-9]/g, '-')}/${timestamp}-${randomString}${fileExtension}`

    // Upload file (uses local storage in dev, Vercel Blob in production)
    const result = await uploadFile(uniqueFileName, file, file.type, 'artist-images')

    // Create ArtistImage record and automatically add an upvote from the uploader
    const image = await prisma.artistImage.create({
      data: {
        artistName: normalizeArtistName(artistName),
        imageUrl: result.url,
        uploadedBy: user.id,
        votes: {
          create: {
            userId: user.id,
            voteType: 'up',
          },
        },
      },
    })

    // Return response with cache-busting header
    const response = NextResponse.json({ 
      id: image.id,
      imageUrl: result.url,
      message: 'Image uploaded successfully' 
    })
    
    // Add headers to prevent caching of this response
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
  } catch (error) {
    console.error('Error uploading artist image:', error)
    
    if (error instanceof Error) {
      // Handle storage-specific errors
      if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
        return NextResponse.json(
          { error: 'Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN in your environment variables, or set STORAGE_TYPE=local for local storage.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to upload image' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
