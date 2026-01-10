import { NextResponse } from 'next/server'
import { checkGroupAccessForAPI } from '@/lib/group-auth'
import { getGroupAllTimeStats } from '@/lib/group-queries'
import { getGroupWeeklyStats } from '@/lib/group-queries'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, group } = await checkGroupAccessForAPI(params.id)

    const isOwner = user?.id === group.creatorId
    const weeklyStats = await getGroupWeeklyStats(group.id)
    const allTimeStats = await getGroupAllTimeStats(group.id)

    return NextResponse.json({
      allTimeStats: allTimeStats
        ? {
            topArtists: allTimeStats.topArtists,
            topTracks: allTimeStats.topTracks,
            topAlbums: allTimeStats.topAlbums,
          }
        : null,
      isOwner,
      hasWeeklyStats: weeklyStats.length > 0,
    })
  } catch (error: any) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Error fetching all-time stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch all-time stats' },
      { status: 500 }
    )
  }
}

