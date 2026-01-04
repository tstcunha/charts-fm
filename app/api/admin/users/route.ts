import { NextResponse } from 'next/server'
import { requireSuperuserApi } from '@/lib/admin'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    // Check superuser access
    await requireSuperuserApi()

    const body = await request.json()
    const { 
      email, 
      name, 
      password, 
      lastfmUsername, 
      lastfmSessionKey, 
      image,
      isSuperuser: isSuperuserInput 
    } = body

    // Validate required fields
    if (!email || !lastfmUsername) {
      return NextResponse.json(
        { error: 'Email and Last.fm username are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Check if Last.fm username already exists
    const existingLastFMUser = await prisma.user.findUnique({
      where: { lastfmUsername },
    })

    if (existingLastFMUser) {
      return NextResponse.json(
        { error: 'This Last.fm account is already connected to another account' },
        { status: 400 }
      )
    }

    // Hash password if provided
    let hashedPassword: string | undefined
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword || null,
        lastfmUsername,
        lastfmSessionKey: lastfmSessionKey || null,
        image: image || null,
        isSuperuser: isSuperuserInput === true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastfmUsername: true,
        lastfmSessionKey: true,
        image: true,
        isSuperuser: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      user,
    }, { status: 201 })
  } catch (error) {
    console.error('Admin user creation error:', error)
    
    // Handle unauthorized error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized: Superuser access required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create user',
      },
      { status: 500 }
    )
  }
}

