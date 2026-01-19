import { prisma } from './prisma'
import { getArtistImage } from './lastfm'

/**
 * Get the dynamic image URL for a group if dynamic covers are enabled for artists
 * Returns the user-chosen image if available, otherwise returns the stored image
 */
export async function getGroupImageUrl(group: {
  id: string
  image: string | null
  dynamicIconEnabled: boolean | null
  dynamicIconSource: string | null
}): Promise<string | null> {
  // If dynamic icon is not enabled for artists, return stored image
  if (!group.dynamicIconEnabled || (group.dynamicIconSource !== 'top_artist' && group.dynamicIconSource !== 'top_track_artist')) {
    return group.image
  }

  try {
    // Get latest weekly stats to find current top artist
    const latestStats = await prisma.groupWeeklyStats.findFirst({
      where: { groupId: group.id },
      orderBy: { weekStart: 'desc' },
    })

    if (!latestStats) {
      return group.image
    }

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
      return dynamicImage || group.image
    }
  } catch (error) {
    // If there's an error, fall back to stored image
    console.error(`Error fetching dynamic artist image for group ${group.id}:`, error)
  }

  return group.image
}
