import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { preFilterGroups } from '@/lib/group-compatibility-filters'
import { findCandidateGroups } from '@/lib/group-compatibility-candidates'
import { getOrCalculateCompatibilityScore } from '@/lib/group-compatibility'
import { TopItem } from '@/lib/lastfm-weekly'

const API_KEY = process.env.LASTFM_API_KEY!
const BATCH_SIZE = 10
const RECOMMENDATION_CACHE_HOURS = 24 // Cache recommendations for 24 hours

// POST - Calculate and return group recommendations
export async function POST(request: Request) {
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

  try {
    const now = new Date()
    
    // Check cache first
    const cached = await prisma.groupRecommendationCache.findUnique({
      where: { userId: user.id },
    })

    if (cached) {
      const cacheExpiry = new Date(
        cached.lastCalculated.getTime() + RECOMMENDATION_CACHE_HOURS * 60 * 60 * 1000
      )

      // Return cached recommendations if fresh
      if (now < cacheExpiry) {
        const recommendations = cached.recommendations as any[]
        return NextResponse.json({
          groups: recommendations,
          isCalculating: false,
          progress: 1,
        })
      }
    }
    // Stage 1: Pre-filter groups
    const preFilteredGroupIds = await preFilterGroups(user.id)

    if (preFilteredGroupIds.length === 0) {
      return NextResponse.json({
        groups: [],
        isCalculating: false,
        progress: 1,
      })
    }

    // Get user's top artists for candidate selection
    const weeksAgo = new Date(now)
    weeksAgo.setUTCDate(weeksAgo.getUTCDate() - 8 * 7)

    const userWeeklyStats = await prisma.userWeeklyStats.findMany({
      where: {
        userId: user.id,
        weekStart: { gte: weeksAgo },
      },
      orderBy: {
        weekStart: 'desc',
      },
    })

    // Aggregate user's top artists
    const artistMap = new Map<string, { name: string; playcount: number }>()
    for (const stat of userWeeklyStats) {
      const topArtists = (stat.topArtists as unknown as TopItem[]) || []
      for (const artist of topArtists) {
        const key = artist.name.toLowerCase().trim()
        const existing = artistMap.get(key)
        if (existing) {
          existing.playcount += artist.playcount
        } else {
          artistMap.set(key, {
            name: artist.name,
            playcount: artist.playcount,
          })
        }
      }
    }

    const userTopArtists = Array.from(artistMap.values())
      .sort((a, b) => b.playcount - a.playcount)
      .slice(0, 30)

    // Stage 2: Find candidate groups with artist overlap
    const candidateGroupIds = await findCandidateGroups(user.id, userTopArtists)

    // Filter candidates to only include pre-filtered groups
    const finalCandidateIds = candidateGroupIds.filter(id => 
      preFilteredGroupIds.includes(id)
    )

    if (finalCandidateIds.length === 0) {
      return NextResponse.json({
        groups: [],
        isCalculating: false,
        progress: 1,
        message: 'No groups found with similar artists. Try exploring groups manually!',
      })
    }

    // Stage 3: Calculate compatibility scores for candidates
    const scores: Array<{ groupId: string; score: number; components: any }> = []

    for (let i = 0; i < finalCandidateIds.length; i += BATCH_SIZE) {
      const batch = finalCandidateIds.slice(i, i + BATCH_SIZE)
      
      const batchScores = await Promise.all(
        batch.map(async (groupId) => {
          try {
            const score = await getOrCalculateCompatibilityScore(
              user.id,
              groupId,
              API_KEY
            )
            return {
              groupId,
              score: score.score,
              components: {
                artistOverlap: score.artistOverlap,
                trackOverlap: score.trackOverlap,
                genreOverlap: score.genreOverlap,
                patternScore: score.patternScore,
              },
            }
          } catch (error) {
            console.error(`Error calculating score for group ${groupId}:`, error)
            return null
          }
        })
      )

      scores.push(...batchScores.filter((s): s is NonNullable<typeof s> => s !== null))
    }

    // Sort by score and get top 5
    scores.sort((a, b) => b.score - a.score)
    const topScores = scores.slice(0, 5)

    // Fetch group details
    const groupIds = topScores.map(s => s.groupId)
    const groups = await prisma.group.findMany({
      where: {
        id: { in: groupIds },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    // Map groups with scores
    const groupsWithScores = groups.map(group => {
      const scoreData = topScores.find(s => s.groupId === group.id)
      return {
        group: {
          id: group.id,
          name: group.name,
          image: group.image,
          colorTheme: group.colorTheme,
          allowFreeJoin: group.allowFreeJoin,
          creator: group.creator,
          _count: group._count,
        },
        score: scoreData?.score || 0,
        components: scoreData?.components || {
          artistOverlap: 0,
          trackOverlap: 0,
          genreOverlap: 0,
          patternScore: 0,
        },
      }
    })

    // Sort by score (descending)
    groupsWithScores.sort((a, b) => b.score - a.score)

    // Cache the results
    await prisma.groupRecommendationCache.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        recommendations: groupsWithScores,
        lastCalculated: now,
      },
      update: {
        recommendations: groupsWithScores,
        lastCalculated: now,
      },
    })

    return NextResponse.json({
      groups: groupsWithScores,
      isCalculating: false,
      progress: 1,
    })
  } catch (error) {
    console.error('Error calculating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to calculate recommendations' },
      { status: 500 }
    )
  }
}

