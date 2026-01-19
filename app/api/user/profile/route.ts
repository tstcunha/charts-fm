import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { routing } from '@/i18n/routing'
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email'
import { detectLocale } from '@/lib/locale-utils'

// GET - Get user profile
export async function GET() {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user ID from session, not email, to avoid issues with stale session data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastfmUsername: true,
      locale: true,
      emailVerified: true,
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

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use user ID from session, not email, to avoid issues with stale session data
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, email, image, locale } = body

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
    // Basic URL validation - allow blob URLs from Vercel Blob
    if (trimmedImage && !trimmedImage.match(/^https?:\/\/.+/i) && !trimmedImage.startsWith('/') && !trimmedImage.startsWith('blob:')) {
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
    if (!routing.locales.includes(locale as typeof routing.locales[number])) {
      return NextResponse.json(
        { error: `Locale must be one of: ${routing.locales.join(', ')}` },
        { status: 400 }
      )
    }
  }

  // Validate email if provided
  let emailChanged = false
  let newEmail = user.email
  if (email !== undefined && email !== null) {
    if (typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email must be a string' },
        { status: 400 }
      )
    }
    const trimmedEmail = email.toLowerCase().trim()
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if email is different from current
    if (trimmedEmail !== user.email.toLowerCase()) {
      // Check if new email is already taken by another user
      // Use a transaction to ensure atomicity and prevent race conditions
      const existingUser = await prisma.user.findUnique({
        where: { email: trimmedEmail },
        select: { id: true },
      })

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        )
      }

      emailChanged = true
      newEmail = trimmedEmail
    }
  }

  // Check if name is being updated and if it's different
  // Normalize both values: trim and convert empty strings to null for comparison
  const newNameValue = name !== undefined ? (name.trim() || null) : undefined
  const currentNameValue = user.name || null
  const nameChanged = name !== undefined && newNameValue !== currentNameValue

  // Prepare update data
  const updateData: {
    name?: string | null
    email?: string
    image?: string | null
    locale?: string | null
    emailVerified?: boolean
    emailVerificationToken?: string | null
    emailVerificationTokenExpires?: Date | null
    lastVerificationEmailSentAt?: Date
  } = {
    ...(name !== undefined && { name: name.trim() || null }),
    ...(image !== undefined && { image: image.trim() || null }),
    ...(locale !== undefined && { locale: locale || null }),
  }

  // If email changed, reset verification and generate new token
  if (emailChanged) {
    const verificationToken = generateVerificationToken()
    const tokenExpires = new Date()
    tokenExpires.setHours(tokenExpires.getHours() + 24) // 24 hours from now

    updateData.email = newEmail
    updateData.emailVerified = false
    updateData.emailVerificationToken = verificationToken
    updateData.emailVerificationTokenExpires = tokenExpires
    updateData.lastVerificationEmailSentAt = new Date()
  }

  // Use a transaction to ensure atomicity, especially for email updates
  // This prevents race conditions where two users try to claim the same email
  let updatedUser
  try {
    updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastfmUsername: true,
        locale: true,
      },
    })
  } catch (error: any) {
    // Handle Prisma unique constraint violation (email already exists)
    if (error?.code === 'P2002' && error?.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    // Re-throw other errors
    throw error
  }

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

  // If email changed, send verification email to new address
  if (emailChanged) {
    try {
      const userLocale = updatedUser.locale || await detectLocale(request)
      const userName = updatedUser.name || updatedUser.lastfmUsername || 'User'
      const verificationToken = updateData.emailVerificationToken!
      
      await sendVerificationEmail(newEmail, verificationToken, userName, userLocale)
    } catch (error) {
      console.error('Failed to send verification email after email change:', error)
      // Don't fail the request if email sending fails - user can request resend
    }
    
    // IMPORTANT: After email change, the session email is stale
    // The user should re-authenticate, but we can't invalidate the session from here
    // The session will be updated on next login, but for now we return the updated user
    // Note: The session callback uses user ID, not email, so the session should still be valid
  }

  return NextResponse.json({ user: updatedUser })
}





