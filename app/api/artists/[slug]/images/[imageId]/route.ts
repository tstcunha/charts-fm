import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; imageId: string }> }
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

    const { imageId } = await params

    // Check if image exists
    const image = await prisma.artistImage.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Check if user is uploader or superuser
    if (image.uploadedBy !== user.id && !user.isSuperuser) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this image' },
        { status: 403 }
      )
    }

    // Delete file from storage
    try {
      await deleteFile(image.imageUrl, 'artist-images')
    } catch (error) {
      console.error('Error deleting image file:', error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database (cascades will delete votes and reports)
    await prisma.artistImage.delete({
      where: { id: imageId },
    })

    return NextResponse.json({ message: 'Image deleted successfully' })
  } catch (error) {
    console.error('Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}
