import { getPublicGroupById, getGroupWeeklyStats } from '@/lib/group-queries'
import { formatWeekDate } from '@/lib/weekly-utils'
import SafeImage from '@/components/SafeImage'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import RequestToJoinButton from './RequestToJoinButton'
import InviteNotification from './InviteNotification'

// Helper function to get entry key for matching
function getEntryKey(item: { name: string; artist?: string }, chartType: string): string {
  if (chartType === 'artists') {
    return item.name.toLowerCase()
  }
  return `${item.name}|${item.artist || ''}`.toLowerCase()
}

// Helper function to format display value (VS or plays)
function formatDisplayValue(
  item: { name: string; artist?: string; playcount: number },
  chartType: string,
  showVS: boolean,
  vsMap: Map<string, number>
): string {
  if (showVS) {
    const entryKey = getEntryKey(item, chartType)
    const vs = vsMap.get(`${chartType}|${entryKey}`)
    if (vs !== undefined && vs !== null) {
      return `${vs.toFixed(2)} VS`
    }
  }
  return `${item.playcount} plays`
}

export default async function PublicGroupPage({ params }: { params: { id: string } }) {
  const group = await getPublicGroupById(params.id)
  
  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <p className="text-gray-600 mb-4">
            This group may not exist or may be private.
          </p>
        </div>
      </main>
    )
  }

  const weeklyStats = await getGroupWeeklyStats(group.id)
  
  // Get group's chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  // Get VS data for all weeks if we have stats
  const vsMapsByWeek = new Map<string, Map<string, number>>()
  if (weeklyStats.length > 0 && showVS) {
    for (const week of weeklyStats) {
      // Normalize weekStart to start of day in UTC for comparison
      const normalizedWeekStart = new Date(week.weekStart)
      normalizedWeekStart.setUTCHours(0, 0, 0, 0)
      
      const chartEntries = await prisma.groupChartEntry.findMany({
        where: {
          groupId: group.id,
          weekStart: normalizedWeekStart,
        },
        select: {
          chartType: true,
          entryKey: true,
          vibeScore: true,
        },
      })
      
      const vsMap = new Map<string, number>()
      chartEntries.forEach((entry) => {
        if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
          vsMap.set(`${entry.chartType}|${entry.entryKey}`, entry.vibeScore)
        }
      })
      vsMapsByWeek.set(week.weekStart.toISOString(), vsMap)
    }
  }
  
  // Check if user is logged in and is a member (for optional "View as Member" link)
  const session = await getSession()
  let isMember = false
  let hasPendingRequest = false
  let hasPendingInvite = false
  let pendingInviteId: string | null = null
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (user) {
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId: user.id,
          },
        },
      })
      isMember = !!membership || user.id === group.creatorId

      // Check if user has a pending request or invite
      if (!isMember) {
        const pendingRequest = await prisma.groupJoinRequest.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId: user.id,
            },
          },
        })
        hasPendingRequest = pendingRequest?.status === 'pending'

        const pendingInvite = await prisma.groupInvite.findUnique({
          where: {
            groupId_userId: {
              groupId: group.id,
              userId: user.id,
            },
          },
        })
        hasPendingInvite = pendingInvite?.status === 'pending'
        pendingInviteId = pendingInvite?.id || null
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-8">
          {isMember && (
            <Link href={`/groups/${group.id}`} className="text-yellow-600 hover:underline mb-4 inline-block">
              ← View as Member
            </Link>
          )}
          {hasPendingInvite && pendingInviteId && (
            <InviteNotification groupId={group.id} inviteId={pendingInviteId} />
          )}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <SafeImage
                  src={group.image}
                  alt={group.name}
                  className="rounded-lg object-cover w-24 h-24"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{group.name}</h1>
                <div className="text-sm text-gray-500">
                  <p>Owner: {group.creator.name || group.creator.lastfmUsername}</p>
                  <p>Members: {group._count.members}</p>
                </div>
              </div>
            </div>
            {session?.user?.email && !isMember && (
              <RequestToJoinButton
                groupId={group.id}
                hasPendingRequest={hasPendingRequest}
                hasPendingInvite={hasPendingInvite}
                allowFreeJoin={group.allowFreeJoin ?? false}
              />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Weekly Charts</h2>
          {weeklyStats.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600 mb-4">No charts available yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeklyStats.map((week: any) => (
                <div key={week.id} className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Week of {formatWeekDate(week.weekStart)}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Top Artists</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topArtists as any[]).map((artist: any, idx: number) => {
                          const weekKey = week.weekStart.toISOString()
                          const vsMap = vsMapsByWeek.get(weekKey) || new Map()
                          return (
                            <li key={idx} className="text-sm">
                              {artist.name} ({formatDisplayValue(artist, 'artists', showVS, vsMap)})
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Tracks</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topTracks as any[]).map((track: any, idx: number) => {
                          const weekKey = week.weekStart.toISOString()
                          const vsMap = vsMapsByWeek.get(weekKey) || new Map()
                          return (
                            <li key={idx} className="text-sm">
                              {track.name} by {track.artist} ({formatDisplayValue(track, 'tracks', showVS, vsMap)})
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Albums</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {(week.topAlbums as any[]).map((album: any, idx: number) => {
                          const weekKey = week.weekStart.toISOString()
                          const vsMap = vsMapsByWeek.get(weekKey) || new Map()
                          return (
                            <li key={idx} className="text-sm">
                              {album.name} by {album.artist} ({formatDisplayValue(album, 'albums', showVS, vsMap)})
                            </li>
                          )
                        })}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

