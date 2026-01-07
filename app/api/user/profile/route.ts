import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { routing } from '@/i18n/routing'

// GET - Get user profile
export async function GET() {
  const session = await getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
      locale: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ user })
}

// PATCH - Update user profile (including image)
export async function PATCH(request: Request) {
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

  const body = await request.json()
  const { name, image, locale } = body

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name must be a string' },
        { status: 400 }
      )
    }
    const trimmedName = name.trim()
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Name cannot exceed 100 characters' },
        { status: 400 }
      )
    }
  }

  // Validate image URL if provided
  if (image !== undefined && image !== null) {
    if (typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image must be a string' },
        { status: 400 }
      )
    }
    const trimmedImage = image.trim()
    if (trimmedImage.length > 500) {
      return NextResponse.json(
        { error: 'Image URL cannot exceed 500 characters' },
        { status: 400 }
      )
    }
    // Basic URL validation
    if (trimmedImage && !trimmedImage.match(/^https?:\/\/.+/i) && !trimmedImage.startsWith('/')) {
      return NextResponse.json(
        { error: 'Image must be a valid URL or path' },
        { status: 400 }
      )
    }
  }

  // Validate locale if provided
  if (locale !== undefined && locale !== null) {
    if (typeof locale !== 'string') {
      return NextResponse.json(
        { error: 'Locale must be a string' },
        { status: 400 }
      )
    }
    if (!routing.locales.includes(locale)) {
      return NextResponse.json(
        { error: `Locale must be one of: ${routing.locales.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Check if name is being updated and if it's different
  // Normalize both values: trim and convert empty strings to null for comparison
  const newNameValue = name !== undefined ? (name.trim() || null) : undefined
  const currentNameValue = user.name || null
  const nameChanged = name !== undefined && newNameValue !== currentNameValue

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined && { name: name.trim() || null }),
      ...(image !== undefined && { image: image.trim() || null }),
      ...(locale !== undefined && { locale: locale || null }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
      locale: true,
    },
  })

  // If name changed, invalidate caches that store user names
  if (nameChanged) {
    // Invalidate major driver cache for all chart entries where this user is the major driver
    await prisma.chartEntryStats.updateMany({
      where: {
        majorDriverUserId: user.id,
      },
      data: {
        majorDriverLastUpdated: null, // Force recalculation on next access
      },
    })

    // Update GroupTrends cache - update user names in JSON fields (topContributors, memberSpotlight)
    // This preserves trends data while updating names
    const newName = updatedUser.name || updatedUser.lastfmUsername || 'Unknown'
    
    // Get all groups where user is a member
    const userGroups = await prisma.groupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })

    if (userGroups.length > 0) {
      const groupIds = userGroups.map(g => g.groupId)
      
      // Get all trends for these groups
      const trendsToUpdate = await prisma.groupTrends.findMany({
        where: { groupId: { in: groupIds } },
      })

      // Update each trend's JSON fields
      for (const trend of trendsToUpdate) {
        const updates: {
          topContributors?: any
          memberSpotlight?: any
        } = {}
        let hasUpdates = false

        // Update topContributors if user appears there
        if (trend.topContributors && Array.isArray(trend.topContributors)) {
          const topContributors = trend.topContributors as Array<{
            userId: string
            name: string
            [key: string]: any
          }>
          
          const userInContributors = topContributors.some(c => c.userId === user.id)
          if (userInContributors) {
            const updatedContributors = topContributors.map(contributor => {
              if (contributor.userId === user.id) {
                return { ...contributor, name: newName }
              }
              return contributor
            })
            updates.topContributors = updatedContributors
            hasUpdates = true
          }
        }

        // Update memberSpotlight if user is the spotlighted member
        if (trend.memberSpotlight) {
          const memberSpotlight = trend.memberSpotlight as {
            userId: string
            name: string
            [key: string]: any
          }

          if (memberSpotlight.userId === user.id) {
            updates.memberSpotlight = { ...memberSpotlight, name: newName }
            hasUpdates = true
          }
        }

        // Only update if changes were made
        if (hasUpdates) {
          await prisma.groupTrends.update({
            where: { id: trend.id },
            data: updates,
          })
        }
      }
    }
  }

  return NextResponse.json({ user: updatedUser })
}





