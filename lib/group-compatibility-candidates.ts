// Candidate selection for group compatibility (Stage 2)

import { prisma } from './prisma'
import { TopItem } from './lastfm-weekly'

/**
 * Find candidate groups with artist overlap
 * Stage 2: Uses artist overlap as a quick filter to reduce candidate set
 * Returns group IDs that have at least one overlapping artist
 */
export async function findCandidateGroups(
  userId: string,
  userTopArtists: TopItem[]
): Promise<string[]> {
  if (userTopArtists.length === 0) {
    return []
  }

  // Get top 20-30 artists (normalized names)
  const topArtistNames = userTopArtists
    .slice(0, 30)
    .map(artist => artist.name.toLowerCase().trim())
    .filter(Boolean)

  if (topArtistNames.length === 0) {
    return []
  }

  // Get all public groups with all-time stats
  const groupsWithStats = await prisma.group.findMany({
    where: {
      isPrivate: false,
      isSolo: false,
      allTimeStats: {
        isNot: null,
      },
    },
    include: {
      allTimeStats: {
        select: {
          topArtists: true,
        },
      },
    },
  })

  const candidateGroupIds: string[] = []

  // Check each group for artist overlap
  for (const group of groupsWithStats) {
    if (!group.allTimeStats) {
      continue
    }

    const groupArtists = (group.allTimeStats.topArtists as unknown as TopItem[]) || []
    const groupArtistNames = new Set(
      groupArtists.map(artist => artist.name.toLowerCase().trim())
    )

    // Check if any user artist matches any group artist
    const hasOverlap = topArtistNames.some(artistName => 
      groupArtistNames.has(artistName)
    )

    if (hasOverlap) {
      candidateGroupIds.push(group.id)
    }
  }

  return candidateGroupIds
}

