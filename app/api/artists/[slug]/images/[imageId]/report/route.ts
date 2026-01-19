import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
    const body = await request.json()
    const { reason } = body

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

    // Check if user already reported this image
    const existingReport = await prisma.artistImageReport.findFirst({
      where: {
        imageId: imageId,
        reportedBy: user.id,
      },
    })

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this image' },
        { status: 400 }
      )
    }

    // Create report
    const report = await prisma.artistImageReport.create({
      data: {
        imageId: imageId,
        reportedBy: user.id,
        reason: reason || null,
        status: 'pending',
      },
    })

    return NextResponse.json({ 
      id: report.id,
      message: 'Image reported successfully' 
    })
  } catch (error) {
    console.error('Error reporting image:', error)
    return NextResponse.json(
      { error: 'Failed to report image' },
      { status: 500 }
    )
  }
}
