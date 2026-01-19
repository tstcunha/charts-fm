import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { uploadFile, deleteFile } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

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

export async function POST(request: Request) {
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

    // Check if user has verified email
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Email verification required. Please verify your email address before uploading images.' },
        { status: 403 }
      )
    }

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

    // Delete old image from storage if it exists and is from uploaded storage
    if (user.image) {
      const isUploadedImage = 
        user.image.startsWith('/uploads/profile-pictures/') ||
        user.image.includes('blob.vercel-storage.com')
      
      if (isUploadedImage) {
        try {
          await deleteFile(user.image)
        } catch (error) {
          // Log error but continue - we still want to upload the new image
          console.error('Error deleting old profile picture:', error)
        }
      }
    }

    // Generate a unique filename
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const uniqueFileName = `${user.id}/${timestamp}-${randomString}${fileExtension}`

    // Upload file (uses local storage in dev, Vercel Blob in production)
    const result = await uploadFile(uniqueFileName, file, file.type)

    // Update user's image URL in database
    await prisma.user.update({
      where: { id: user.id },
      data: { image: result.url },
    })

    return NextResponse.json({ 
      url: result.url,
      message: 'Profile picture uploaded successfully' 
    })
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    
    if (error instanceof Error) {
      // Handle storage-specific errors
      if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
        return NextResponse.json(
          { error: 'Blob storage not configured. Please set BLOB_READ_WRITE_TOKEN in your environment variables, or set STORAGE_TYPE=local for local storage.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Failed to upload profile picture' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload profile picture' },
      { status: 500 }
    )
  }
}

