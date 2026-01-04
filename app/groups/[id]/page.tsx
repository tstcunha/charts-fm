import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGroupWeeklyStats, getGroupAllTimeStats } from '@/lib/group-queries'
import { requireGroupMembership } from '@/lib/group-auth'
import Link from 'next/link'
import { formatWeekDate, getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import LeaveGroupButton from './LeaveGroupButton'
import EditGroupIconButton from './EditGroupIconButton'
import RemoveMemberButton from './RemoveMemberButton'
import InviteMemberButton from './InviteMemberButton'
import RevokeInviteButton from './RevokeInviteButton'
import SafeImage from '@/components/SafeImage'
import GroupTabs from './GroupTabs'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import RequestsButton from './RequestsButton'

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

export default async function GroupPage({ params }: { params: { id: string } }) {
  const { user, group } = await requireGroupMembership(params.id)

  if (!group) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <Link href="/groups" className="text-yellow-600 hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  const weeklyStats = await getGroupWeeklyStats(group.id)
  const isOwner = user.id === group.creatorId
  const isMember = group.members.some((m: any) => m.userId === user.id)

  // Get group's chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  // Get VS data for latest week if we have stats
  let vsMap: Map<string, number> = new Map()
  if (weeklyStats.length > 0 && showVS) {
    const latestWeek = weeklyStats[0]
    // Normalize weekStart to start of day in UTC for comparison
    const normalizedWeekStart = new Date(latestWeek.weekStart)
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
    
    // Create map: "chartType|entryKey" -> vibeScore
    chartEntries.forEach((entry) => {
      if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
        vsMap.set(`${entry.chartType}|${entry.entryKey}`, entry.vibeScore)
      }
    })
  }

  // Get pending invites for the group (owner only)
  let pendingInvites: any[] = []
  if (isOwner) {
    pendingInvites = await prisma.groupInvite.findMany({
      where: {
        groupId: group.id,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastfmUsername: true,
          },
        },
      },
    })
  }

  // Get pending request count for group owner (for join requests, not invites)
  let requestCount = 0
  if (isOwner) {
    requestCount = await prisma.groupJoinRequest.count({
      where: {
        groupId: group.id,
        status: 'pending',
      },
    })
  }

  // Get all-time stats, recalculate if missing
  let allTimeStats = await getGroupAllTimeStats(group.id)
  if (!allTimeStats && weeklyStats.length > 0) {
    // Recalculate on first access if missing but we have weekly stats
    await recalculateAllTimeStats(group.id)
    allTimeStats = await getGroupAllTimeStats(group.id)
  }

  // Calculate tracking day info and next chart date
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const trackingDayName = dayNames[trackingDayOfWeek]
  
  // Calculate when the next charts will be available (when current week ends)
  const currentWeekStart = getWeekStartForDay(new Date(), trackingDayOfWeek)
  const nextChartDate = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
  const nextChartDateFormatted = formatWeekLabel(nextChartDate)

  return (
    <main className="flex min-h-screen flex-col p-24">
      <div className="max-w-6xl w-full mx-auto">
        <div className="mb-8">
          <Link href="/groups" className="text-yellow-600 hover:underline mb-4 inline-block">
            ← Back to Groups
          </Link>
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
                  <p className="mt-2">Tracking day: {trackingDayName} • Next charts: {nextChartDateFormatted}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isOwner && (
                <>
                  <EditGroupIconButton groupId={group.id} currentImage={group.image} />
                  <Link
                    href={`/groups/${group.id}/settings`}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Settings
                  </Link>
                </>
              )}
              {isMember && (
                <LeaveGroupButton groupId={group.id} isOwner={isOwner} />
              )}
            </div>
          </div>
        </div>

        <GroupTabs
          defaultTab="charts"
          allTimeContent={
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">All-Time Stats</h2>
                {allTimeStats && (
                  <Link
                    href={`/groups/${group.id}/alltime`}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
                  >
                    View All-Time Stats
                  </Link>
                )}
              </div>
              {!allTimeStats || (allTimeStats.topArtists as any[]).length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No all-time stats available yet.</p>
                  {weeklyStats.length === 0 && isOwner && (
                    <Link
                      href={`/groups/${group.id}/generate`}
                      className="text-yellow-600 hover:underline"
                    >
                      Generate charts to see all-time stats
                    </Link>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Top 100 All-Time</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Top Artists</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {((allTimeStats.topArtists as any[]).slice(0, 10)).map((artist: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {artist.name} ({artist.playcount} plays)
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topArtists as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-2">
                          ...and {(allTimeStats.topArtists as any[]).length - 10} more
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Tracks</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {((allTimeStats.topTracks as any[]).slice(0, 10)).map((track: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {track.name} by {track.artist} ({track.playcount} plays)
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topTracks as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-2">
                          ...and {(allTimeStats.topTracks as any[]).length - 10} more
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Top Albums</h4>
                      <ol className="list-decimal list-inside space-y-1">
                        {((allTimeStats.topAlbums as any[]).slice(0, 10)).map((album: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {album.name} by {album.artist} ({album.playcount} plays)
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topAlbums as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-2">
                          ...and {(allTimeStats.topAlbums as any[]).length - 10} more
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
          membersContent={
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Members</h2>
                {isOwner && (
                  <div className="flex gap-2">
                    <InviteMemberButton groupId={group.id} />
                    <RequestsButton groupId={group.id} requestCount={requestCount} />
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="space-y-2">
                  {/* Display actual members */}
                  {group.members.map((member: any) => (
                    <div key={member.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{member.user.name || member.user.lastfmUsername}</p>
                        <p className="text-sm text-gray-500">@{member.user.lastfmUsername}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.user.id === group.creatorId && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Owner
                          </span>
                        )}
                        {isOwner && member.user.id !== group.creatorId && (
                          <RemoveMemberButton
                            groupId={group.id}
                            userId={member.user.id}
                            memberName={member.user.name || member.user.lastfmUsername}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Display invited users */}
                  {isOwner && pendingInvites.map((invite: any) => (
                    <div key={invite.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{invite.user.name || invite.user.lastfmUsername}</p>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Invited
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">@{invite.user.lastfmUsername}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RevokeInviteButton
                          groupId={group.id}
                          inviteId={invite.id}
                          userName={invite.user.name || invite.user.lastfmUsername}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
          chartsContent={
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Weekly Charts</h2>
                {weeklyStats.length > 1 && (
                  <Link
                    href={`/groups/${group.id}/charts`}
                    className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
                  >
                    Explore Charts
                  </Link>
                )}
              </div>
              {weeklyStats.length === 0 ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No charts available yet.</p>
                  {isOwner && (
                    <Link
                      href={`/groups/${group.id}/generate`}
                      className="text-yellow-600 hover:underline"
                    >
                      Generate charts
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const latestWeek = weeklyStats[0]
                    return (
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-semibold mb-4">
                          Week of {formatWeekDate(latestWeek.weekStart)}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2">Top Artists</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topArtists as any[]).map((artist: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {artist.name} ({formatDisplayValue(artist, 'artists', showVS, vsMap)})
                                </li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Top Tracks</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topTracks as any[]).map((track: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {track.name} by {track.artist} ({formatDisplayValue(track, 'tracks', showVS, vsMap)})
                                </li>
                              ))}
                            </ol>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold mb-2">Top Albums</h4>
                            <ol className="list-decimal list-inside space-y-1">
                              {(latestWeek.topAlbums as any[]).map((album: any, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {album.name} by {album.artist} ({formatDisplayValue(album, 'albums', showVS, vsMap)})
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          }
        />
      </div>
    </main>
  )
}

