import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const CHART_SIZES = [10, 20, 50]
const CHART_MODES = ['vs', 'vs_weighted', 'plays_only']
const COLOR_THEMES = ['yellow', 'royal_blue', 'cyan', 'bright_red', 'maroon', 'graphite', 'hot_pink', 'neon_green', 'white']
const DYNAMIC_ICON_SOURCES = ['top_artist', 'top_album', 'top_track_artist']

export async function POST(request: Request) {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const body = await request.json()
    const { lastfmUsernames } = body

    if (!lastfmUsernames || !Array.isArray(lastfmUsernames) || lastfmUsernames.length === 0) {
      return NextResponse.json(
        { error: 'Last.fm usernames array is required' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash('12345', 10)
    const createdUsers: any[] = []
    const errors: string[] = []

    // Create users
    for (const lastfmUsername of lastfmUsernames) {
      const trimmedUsername = lastfmUsername.trim()
      if (!trimmedUsername) continue

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { lastfmUsername: trimmedUsername },
        })

        if (existingUser) {
          errors.push(`User with Last.fm username "${trimmedUsername}" already exists`)
          continue
        }

        // Generate email from lastfm username
        const email = `${trimmedUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@test.chartsfm.local`

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
          where: { email },
        })

        if (existingEmail) {
          errors.push(`Email ${email} already exists`)
          continue
        }

        // Create user (admin-created users are verified by default)
        const user = await prisma.user.create({
          data: {
            email,
            name: trimmedUsername,
            password: hashedPassword,
            lastfmUsername: trimmedUsername,
            isSuperuser: false,
            emailVerified: true, // Admin-created users are verified by default
          },
          select: {
            id: true,
            email: true,
            name: true,
            lastfmUsername: true,
            isSuperuser: true,
            createdAt: true,
          },
        })

        createdUsers.push(user)
      } catch (error: any) {
        errors.push(`Failed to create user "${trimmedUsername}": ${error.message}`)
      }
    }

    if (createdUsers.length === 0) {
      return NextResponse.json(
        { 
          error: 'No users were created',
          errors,
        },
        { status: 400 }
      )
    }

    // Create groups with random settings
    const numGroups = Math.max(2, Math.floor(createdUsers.length / 3)) // At least 2 groups, roughly 1 per 3 users
    const createdGroups: any[] = []

    for (let i = 0; i < numGroups; i++) {
      try {
        // Pick a random creator from created users
        const creator = createdUsers[Math.floor(Math.random() * createdUsers.length)]

        // Random settings
        const chartSize = CHART_SIZES[Math.floor(Math.random() * CHART_SIZES.length)]
        const chartMode = CHART_MODES[Math.floor(Math.random() * CHART_MODES.length)]
        const trackingDayOfWeek = Math.floor(Math.random() * 7)
        const isPrivate = Math.random() > 0.5
        const allowFreeJoin = !isPrivate && Math.random() > 0.7
        const dynamicIconEnabled = Math.random() > 0.6
        const dynamicIconSource = dynamicIconEnabled 
          ? DYNAMIC_ICON_SOURCES[Math.floor(Math.random() * DYNAMIC_ICON_SOURCES.length)]
          : null
        const colorTheme = COLOR_THEMES[Math.floor(Math.random() * COLOR_THEMES.length)]

        const groupName = `Test Group ${i + 1}`

        // Create group
        const group = await prisma.group.create({
          data: {
            name: groupName,
            creatorId: creator.id,
            chartSize,
            chartMode,
            trackingDayOfWeek,
            isPrivate,
            allowFreeJoin,
            dynamicIconEnabled,
            dynamicIconSource,
            colorTheme,
            members: {
              create: {
                userId: creator.id, // Creator is automatically a member
              },
            },
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                lastfmUsername: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastfmUsername: true,
                  },
                },
              },
            },
          },
        })

        // Randomly assign other users to groups
        // Each group gets 2-5 members (including creator)
        const numMembers = Math.min(
          Math.floor(Math.random() * 4) + 2, // 2-5 members
          createdUsers.length
        )

        const availableUsers = createdUsers.filter(u => u.id !== creator.id)
        const shuffled = [...availableUsers].sort(() => Math.random() - 0.5)
        const membersToAdd = shuffled.slice(0, numMembers - 1) // -1 because creator is already added

        for (const user of membersToAdd) {
          await prisma.groupMember.create({
            data: {
              groupId: group.id,
              userId: user.id,
            },
          })
        }

        // Fetch updated group with all members
        const updatedGroup = await prisma.group.findUnique({
          where: { id: group.id },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                lastfmUsername: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    lastfmUsername: true,
                  },
                },
              },
            },
          },
        })

        createdGroups.push(updatedGroup)
      } catch (error: any) {
        errors.push(`Failed to create group ${i + 1}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      users: createdUsers,
      groups: createdGroups,
      errors: errors.length > 0 ? errors : undefined,
    }, { status: 201 })
  } catch (error) {
    console.error('Bulk generation error:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate users and groups',
      },
      { status: 500 }
    )
  }
}

