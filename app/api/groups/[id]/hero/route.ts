import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import { getLastChartWeek, canUpdateCharts } from '@/lib/group-service'
import { getArtistImage } from '@/lib/lastfm'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group, isMember } = await checkGroupAccessForAPI(params.id)
    
    // Only return member list if user is a member (for privacy)
    let membersWithImages: any[] = []
    if (isMember) {
      membersWithImages = await prisma.groupMember.findMany({
        where: { groupId: group.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastfmUsername: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      })
    }

    const isOwner = user?.id === group.creatorId
    const chartMode = (group.chartMode || 'plays_only') as string
    const colorTheme = (group.colorTheme || 'yellow') as string
    const trackingDayOfWeek = group.trackingDayOfWeek ?? 0

    // Calculate tracking day info and next chart date
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const trackingDayName = dayNames[trackingDayOfWeek]
    
    const now = new Date()
    const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
    const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
    const nextChartDate = currentWeekEnd
    const nextChartDateFormatted = formatWeekLabel(nextChartDate)
    const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // Check if charts can be updated (only for members)
    let canUpdateChartsValue = false
    if (isMember) {
      const lastChartWeek = await getLastChartWeek(group.id)
      const chartGenerationInProgress = group.chartGenerationInProgress || false
      
      // Charts can be updated if it's at least the next day of the week since the last chart was generated
      // and generation is not already in progress
      canUpdateChartsValue = canUpdateCharts(lastChartWeek, trackingDayOfWeek, now) && !chartGenerationInProgress
    }

    // Get caption from stored data (set when icon is updated)
    const imageCaption = group.dynamicIconCaption || null

    // If dynamic icon is enabled for artists, check for user-chosen images dynamically
    let groupImage = group.image
    if (group.dynamicIconEnabled && (group.dynamicIconSource === 'top_artist' || group.dynamicIconSource === 'top_track_artist')) {
      try {
        // Get latest weekly stats to find current top artist
        const latestStats = await prisma.groupWeeklyStats.findFirst({
          where: { groupId: group.id },
          orderBy: { weekStart: 'desc' },
        })

        if (latestStats) {
          let artistName: string | null = null
          
          if (group.dynamicIconSource === 'top_artist') {
            const topArtists = latestStats.topArtists as unknown as Array<{ name: string }>
            if (topArtists && topArtists.length > 0) {
              artistName = topArtists[0].name
            }
          } else if (group.dynamicIconSource === 'top_track_artist') {
            const topTracks = latestStats.topTracks as unknown as Array<{ artist: string }>
            if (topTracks && topTracks.length > 0 && topTracks[0].artist) {
              artistName = topTracks[0].artist
            }
          }

          // If we have an artist name, check for user-chosen image
          if (artistName) {
            const apiKey = process.env.LASTFM_API_KEY || ''
            // This will check uploaded images first, then fallback to MusicBrainz
            const dynamicImage = await getArtistImage(artistName, apiKey)
            console.log(`[Dynamic Cover] Group ${group.id}, Artist: ${artistName}, Stored image: ${group.image}, Dynamic image: ${dynamicImage}`)
            if (dynamicImage) {
              groupImage = dynamicImage
            }
          } else {
            console.log(`[Dynamic Cover] Group ${group.id}, No artist name found`)
          }
        } else {
          console.log(`[Dynamic Cover] Group ${group.id}, No latest stats found`)
        }
      } catch (error) {
        // If there's an error, fall back to stored image
        console.error('Error fetching dynamic artist image:', error)
      }
    } else {
      console.log(`[Dynamic Cover] Group ${group.id}, Dynamic icon not enabled or not artist-based (enabled: ${group.dynamicIconEnabled}, source: ${group.dynamicIconSource})`)
    }

    const response = NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        image: groupImage,
        colorTheme,
        chartMode,
        trackingDayOfWeek,
        trackingDayName,
        creator: group.creator ? {
          id: group.creator.id,
          name: group.creator.name,
          lastfmUsername: group.creator.lastfmUsername,
        } : null,
        memberCount: group._count.members,
      },
      isOwner: isOwner || false,
      isMember,
      members: membersWithImages.map((m) => ({
        id: m.id,
        userId: m.userId,
        joinedAt: m.joinedAt.toISOString(),
        user: {
          id: m.user.id,
          name: m.user.name,
          lastfmUsername: m.user.lastfmUsername,
          image: m.user.image,
        },
      })),
      daysUntilNextChart,
      nextChartDateFormatted,
      canUpdateCharts: canUpdateChartsValue,
      chartGenerationInProgress: group.chartGenerationInProgress || false,
      imageCaption,
    })
    
    // Add cache headers to prevent stale responses when dynamic covers are enabled
    if (group.dynamicIconEnabled && (group.dynamicIconSource === 'top_artist' || group.dynamicIconSource === 'top_track_artist')) {
      // For dynamic covers, use shorter cache to allow fresh images
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    } else {
      // For static covers, allow some caching
      response.headers.set('Cache-Control', 'public, max-age=300, must-revalidate')
    }
    
    return response
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching group hero data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group data' },
      { status: 500 }
    )
  }
}

