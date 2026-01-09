import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { deleteFile } from '@/lib/storage'
import { prisma } from '@/lib/prisma'

// DELETE - Remove profile picture
export async function DELETE() {
  try {
    const session = await getSession()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        image: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If user has no image, nothing to delete
    if (!user.image) {
      return NextResponse.json({ 
        message: 'No profile picture to remove',
        success: true 
      })
    }

    // Delete the file from storage
    try {
      await deleteFile(user.image)
    } catch (error) {
      // Log error but continue - we still want to remove the URL from database
      console.error('Error deleting file from storage:', error)
    }

    // Update user's image to null in database
    await prisma.user.update({
      where: { id: user.id },
      data: { image: null },
    })

    return NextResponse.json({ 
      success: true,
      message: 'Profile picture removed successfully' 
    })
  } catch (error) {
    console.error('Error removing profile picture:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error 
          ? error.message 
          : 'Failed to remove profile picture' 
      },
      { status: 500 }
    )
  }
}

