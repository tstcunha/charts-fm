import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getGroupWeeklyStats } from '@/lib/group-queries'
import { calculateConsecutiveStreaks } from '@/lib/group-trends'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { group } = await checkGroupAccessForAPI(params.id)

    const weeklyStats = await getGroupWeeklyStats(group.id)
    const chartMode = (group.chartMode || 'plays_only') as string

    // Calculate total plays for latest week
    let totalPlaysThisWeek = 0
    if (weeklyStats.length > 0) {
      const latestWeek = weeklyStats[0]
      const artists = (latestWeek.topArtists as any[]) || []
      const tracks = (latestWeek.topTracks as any[]) || []
      const albums = (latestWeek.topAlbums as any[]) || []
      
      totalPlaysThisWeek = artists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
                          tracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
                          albums.reduce((sum, a) => sum + (a.playcount || 0), 0)
    }

    // Get the artist with the longest current consecutive streak in top 10 (Obsession)
    let obsessionArtist: { name: string; weeks: number } | null = null
    if (weeklyStats.length > 0) {
      const latestWeekStart = weeklyStats[0].weekStart
      const normalizedWeekStart = new Date(latestWeekStart)
      normalizedWeekStart.setUTCHours(0, 0, 0, 0)
      
      // Calculate streaks for artists only, using shared function
      const artistStreaks = await calculateConsecutiveStreaks(
        group.id,
        normalizedWeekStart,
        'artists',
        2 // Minimum 2 weeks
      )
      
      if (artistStreaks.length > 0) {
        // Get the artist with the longest streak (already sorted by streak desc)
        const topStreak = artistStreaks[0]
        obsessionArtist = {
          name: topStreak.name,
          weeks: topStreak.currentStreak,
        }
      }
    }

    return NextResponse.json({
      totalPlaysThisWeek,
      weeksTracked: weeklyStats.length,
      chartMode,
      obsessionArtist,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching quick stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quick stats' },
      { status: 500 }
    )
  }
}

