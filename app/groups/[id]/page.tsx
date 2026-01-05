import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getGroupWeeklyStats, getGroupAllTimeStats } from '@/lib/group-queries'
import { requireGroupMembership } from '@/lib/group-auth'
import Link from 'next/link'
import { formatWeekDate, getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'

// Helper function to format date as "Dec. 28, 2025"
function formatDateWritten(date: Date): string {
  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']
  const month = monthNames[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  return `${month} ${day}, ${year}`
}

// Helper function to get week end date (6 days after week start)
function getWeekEndDate(weekStart: Date): Date {
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  return weekEnd
}
import LeaveGroupButton from './LeaveGroupButton'
import RemoveMemberButton from './RemoveMemberButton'
import InviteMemberButton from './InviteMemberButton'
import RevokeInviteButton from './RevokeInviteButton'
import SafeImage from '@/components/SafeImage'
import GroupTabs from './GroupTabs'
import { recalculateAllTimeStats } from '@/lib/group-alltime-stats'
import RequestsButton from './RequestsButton'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc, faTrophy } from '@fortawesome/free-solid-svg-icons'

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
          <Link href="/groups" className="text-[var(--theme-text)] hover:underline">
            Back to Groups
          </Link>
        </div>
      </main>
    )
  }

  // Fetch members with images for hero section
  const membersWithImages = await prisma.groupMember.findMany({
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

  const weeklyStats = await getGroupWeeklyStats(group.id)
  const isOwner = user.id === group.creatorId
  const isMember = group.members.some((m: any) => m.userId === user.id)

  // Get group's chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string
  const showVS = chartMode === 'vs' || chartMode === 'vs_weighted'

  // Get color theme
  // @ts-ignore - Prisma client will be regenerated after migration
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get VS data and position changes for latest week if we have stats
  let vsMap: Map<string, number> = new Map()
  let positionChangeMap: Map<string, number | null> = new Map()
  if (weeklyStats.length > 0) {
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
        positionChange: true,
      },
    })
    
    // Create maps: "chartType|entryKey" -> vibeScore and positionChange
    chartEntries.forEach((entry) => {
      const key = `${entry.chartType}|${entry.entryKey}`
      if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
        vsMap.set(key, entry.vibeScore)
      }
      positionChangeMap.set(key, entry.positionChange)
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
            image: true,
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
  
  // Calculate days until next chart
  const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  // Calculate quick stats
  let totalPlaysThisWeek = 0
  let mostActiveMember: { name: string; plays: number } | null = null
  if (weeklyStats.length > 0) {
    const latestWeek = weeklyStats[0]
    const artists = (latestWeek.topArtists as any[]) || []
    const tracks = (latestWeek.topTracks as any[]) || []
    const albums = (latestWeek.topAlbums as any[]) || []
    
    totalPlaysThisWeek = artists.reduce((sum, a) => sum + (a.playcount || 0), 0) +
                        tracks.reduce((sum, t) => sum + (t.playcount || 0), 0) +
                        albums.reduce((sum, a) => sum + (a.playcount || 0), 0)
  }

  return (
    <main 
      className={`flex min-h-screen flex-col pt-8 pb-24 px-6 md:px-12 lg:px-24 ${themeClass} bg-gradient-to-b from-[var(--theme-background-from)] to-[var(--theme-background-to)]`}
    >
      <div className="max-w-6xl w-full mx-auto">
        {/* Hero Section */}
        <div className="mb-8 relative">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-8 border border-theme">
            {/* Breadcrumb Navigation */}
            <nav className="mb-6 flex items-center gap-2 text-sm">
              <Link 
                href="/groups" 
                className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
              >
                Groups
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium truncate">{group.name}</span>
            </nav>
            
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start gap-6">
                {/* Large Group Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shadow-sm ring-4 ring-theme bg-[var(--theme-primary-lighter)]">
                    <SafeImage
                      src={group.image}
                      alt={group.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                
                {/* Group Info */}
                <div className="flex-1">
                  <h1 className="text-5xl font-bold mb-3 text-[var(--theme-primary-dark)] leading-[1.1] pb-2 overflow-visible">
                    {group.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Owner:</span>
                      <span className="font-semibold text-gray-900">{group.creator.name || group.creator.lastfmUsername}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Members:</span>
                      <span className="font-semibold text-gray-900">{group._count.members}</span>
                    </div>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Tracking:</span>
                      <span className="font-semibold text-gray-900">{trackingDayName}</span>
                    </div>
                  </div>
                  
                  {/* Member Avatars */}
                  {membersWithImages.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex -space-x-3">
                        {membersWithImages.slice(0, 6).map((member) => (
                          <div
                            key={member.user.id}
                            className="relative w-10 h-10 rounded-full ring-2 ring-white bg-[var(--theme-primary-lighter)] overflow-hidden"
                            title={member.user.name || member.user.lastfmUsername}
                          >
                            <SafeImage
                              src={member.user.image}
                              alt={member.user.name || member.user.lastfmUsername}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                      </div>
                      {membersWithImages.length > 6 && (
                        <span className="text-sm text-gray-600 ml-2">+{membersWithImages.length - 6} more</span>
                      )}
                    </div>
                  )}
                  
                  {/* Next Charts Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-full font-semibold shadow-sm">
                    <span className="text-sm">Next charts in {daysUntilNextChart} {daysUntilNextChart === 1 ? 'day' : 'days'}</span>
                    <span className="text-xs opacity-80">({nextChartDateFormatted})</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {isOwner && (
                  <Link
                    href={`/groups/${group.id}/settings`}
                    className="px-5 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>
            
            {/* Quick Stats Cards */}
            {weeklyStats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Total Plays This Week</div>
                  <div className="text-3xl font-bold text-[var(--theme-text)]">{totalPlaysThisWeek.toLocaleString()}</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Weeks Tracked</div>
                  <div className="text-3xl font-bold text-[var(--theme-text)]">{weeklyStats.length}</div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-theme shadow-sm">
                  <div className="text-sm text-gray-600 mb-1">Chart Mode</div>
                  <div className="text-lg font-bold text-[var(--theme-text)] capitalize">
                    {chartMode === 'vs' ? 'VS' : chartMode === 'vs_weighted' ? 'VS Weighted' : 'Plays Only'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <GroupTabs
          defaultTab="charts"
          allTimeContent={
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">
                  All-Time Stats
                </h2>
                {allTimeStats && (
                  <Link
                    href={`/groups/${group.id}/alltime`}
                    className="px-5 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
                  >
                    View All-Time Stats
                  </Link>
                )}
              </div>
              {!allTimeStats || (allTimeStats.topArtists as any[]).length === 0 ? (
                <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
                  <div className="mb-4 text-[var(--theme-primary)]">
                    <FontAwesomeIcon icon={faTrophy} size="3x" />
                  </div>
                  <p className="text-gray-700 text-lg mb-2 font-medium">No all-time stats available yet.</p>
                  <p className="text-gray-500 text-sm mb-6">Generate charts to start building your all-time rankings!</p>
                  {weeklyStats.length === 0 && isOwner && (
                    <Link
                      href={`/groups/${group.id}/generate`}
                      className="inline-block px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
                    >
                      Generate Charts
                    </Link>
                  )}
                </div>
              ) : (
                <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
                  <h3 className="text-2xl font-bold mb-6 text-gray-900">Top 100 All-Time</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                      <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                        <FontAwesomeIcon icon={faMicrophone} className="text-lg" />
                        Top Artists
                      </h4>
                      <ol className="space-y-2">
                        {((allTimeStats.topArtists as any[]).slice(0, 10)).map((artist: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{artist.name}</div>
                              <div className="text-sm text-[var(--theme-text)]">{artist.playcount.toLocaleString()} plays</div>
                            </div>
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topArtists as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
                          ...and {(allTimeStats.topArtists as any[]).length - 10} more
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                      <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                        <FontAwesomeIcon icon={faMusic} className="text-lg" />
                        Top Tracks
                      </h4>
                      <ol className="space-y-2">
                        {((allTimeStats.topTracks as any[]).slice(0, 10)).map((track: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{track.name}</div>
                              <div className="text-xs text-gray-600 truncate">by {track.artist}</div>
                              <div className="text-sm text-[var(--theme-text)] mt-0.5">{track.playcount.toLocaleString()} plays</div>
                            </div>
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topTracks as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
                          ...and {(allTimeStats.topTracks as any[]).length - 10} more
                        </p>
                      )}
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                      <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                        <FontAwesomeIcon icon={faCompactDisc} className="text-lg" />
                        Top Albums
                      </h4>
                      <ol className="space-y-2">
                        {((allTimeStats.topAlbums as any[]).slice(0, 10)).map((album: any, idx: number) => (
                          <li key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--theme-primary-lighter)] transition-colors">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 truncate">{album.name}</div>
                              <div className="text-xs text-gray-600 truncate">by {album.artist}</div>
                              <div className="text-sm text-[var(--theme-text)] mt-0.5">{album.playcount.toLocaleString()} plays</div>
                            </div>
                          </li>
                        ))}
                      </ol>
                      {(allTimeStats.topAlbums as any[]).length > 10 && (
                        <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[var(--theme-border)]">
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">
                  Members
                </h2>
                {isOwner && (
                  <div className="flex gap-2">
                    <InviteMemberButton groupId={group.id} />
                    <RequestsButton groupId={group.id} requestCount={requestCount} />
                  </div>
                )}
              </div>
              <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-primary-lighter)]/30 rounded-xl shadow-sm p-6 border border-theme">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Display actual members */}
                  {membersWithImages.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-theme shadow-sm hover:shadow transition-all hover:bg-[var(--theme-primary-lighter)]/30"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-full ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden">
                          <SafeImage
                            src={member.user.image}
                            alt={member.user.name || member.user.lastfmUsername}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {member.user.name || member.user.lastfmUsername}
                            </p>
                            {member.user.id === group.creatorId && (
                              <span className="flex-shrink-0 text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-0.5 rounded-full font-bold shadow-sm">
                                Owner
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">@{member.user.lastfmUsername}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
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
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-theme shadow-sm hover:shadow transition-all hover:bg-[var(--theme-primary-lighter)]/30"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-full ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] flex-shrink-0 overflow-hidden">
                          <SafeImage
                            src={invite.user.image}
                            alt={invite.user.name || invite.user.lastfmUsername}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 truncate">
                              {invite.user.name || invite.user.lastfmUsername}
                            </p>
                            <span className="flex-shrink-0 text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-0.5 rounded-full font-bold shadow-sm">
                              Invited
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">@{invite.user.lastfmUsername}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <RevokeInviteButton
                          groupId={group.id}
                          inviteId={invite.id}
                          userName={invite.user.name || invite.user.lastfmUsername}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Leave Group Button - Less prominent, at the bottom */}
                {isMember && !isOwner && (
                  <div className="mt-6 pt-6 border-t border-[var(--theme-border)]/50">
                    <div className="flex justify-end">
                      <LeaveGroupButton groupId={group.id} isOwner={isOwner} subtle={true} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
          chartsContent={
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">
                  Weekly Charts
                </h2>
                {weeklyStats.length > 1 && (
                  <Link
                    href={`/groups/${group.id}/charts`}
                    className="px-5 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
                  >
                    Explore Charts
                  </Link>
                )}
              </div>
              {weeklyStats.length === 0 ? (
                <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
                  <div className="mb-4 text-[var(--theme-primary)]">
                    <FontAwesomeIcon icon={faMusic} size="3x" />
                  </div>
                  <p className="text-gray-700 text-lg mb-2 font-medium">No charts available yet.</p>
                  <p className="text-gray-500 text-sm mb-6">Start tracking your group's listening habits!</p>
                  {isOwner && (
                    <Link
                      href={`/groups/${group.id}/generate`}
                      className="inline-block px-6 py-3 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
                    >
                      Generate Charts
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const latestWeek = weeklyStats[0]
                    const topArtists = (latestWeek.topArtists as any[]) || []
                    const topTracks = (latestWeek.topTracks as any[]) || []
                    const topAlbums = (latestWeek.topAlbums as any[]) || []
                    
                    const weekStartDate = new Date(latestWeek.weekStart)
                    const weekEndDate = getWeekEndDate(weekStartDate)
                    const weekStartFormatted = formatDateWritten(weekStartDate)
                    const weekEndFormatted = formatDateWritten(weekEndDate)
                    
                    return (
                      <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-bold text-gray-900">
                            Week of {weekStartFormatted}
                            <span className="text-sm font-normal italic text-gray-500 ml-2">
                              (from {weekStartFormatted} to {weekEndFormatted})
                            </span>
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Top Artists */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                              <FontAwesomeIcon icon={faMicrophone} className="text-lg" />
                              Top Artists
                            </h4>
                            <div className="space-y-3">
                              {topArtists.slice(0, 3).map((artist: any, idx: number) => {
                                const displayValue = formatDisplayValue(artist, 'artists', showVS, vsMap)
                                const entryKey = getEntryKey(artist, 'artists')
                                const positionChange = positionChangeMap.get(`artists|${entryKey}`)
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                        {artist.name}
                                        <PositionMovementIcon positionChange={positionChange} className="text-sm" />
                                      </div>
                                      <div className="text-sm text-[var(--theme-text)] font-medium">{displayValue}</div>
                                    </div>
                                  </div>
                                )
                              })}
                              {topArtists.length > 3 && (
                                <div className="pt-2 border-t border-[var(--theme-border)]">
                                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                    {topArtists.slice(3, 10).map((artist: any, idx: number) => {
                                      const entryKey = getEntryKey(artist, 'artists')
                                      const positionChange = positionChangeMap.get(`artists|${entryKey}`)
                                      return (
                                        <li key={idx + 3} className="truncate flex items-center gap-1">
                                          {artist.name} <PositionMovementIcon positionChange={positionChange} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(artist, 'artists', showVS, vsMap)})</span>
                                        </li>
                                      )
                                    })}
                                  </ol>
                                  {topArtists.length > 10 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      ...and {topArtists.length - 10} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Top Tracks */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                              <FontAwesomeIcon icon={faMusic} className="text-lg" />
                              Top Tracks
                            </h4>
                            <div className="space-y-3">
                              {topTracks.slice(0, 3).map((track: any, idx: number) => {
                                const displayValue = formatDisplayValue(track, 'tracks', showVS, vsMap)
                                const entryKey = getEntryKey(track, 'tracks')
                                const positionChange = positionChangeMap.get(`tracks|${entryKey}`)
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                        {track.name}
                                        <PositionMovementIcon positionChange={positionChange} className="text-sm" />
                                      </div>
                                      <div className="text-xs text-gray-600 truncate">by {track.artist}</div>
                                      <div className="text-sm text-[var(--theme-text)] font-medium mt-1">{displayValue}</div>
                                    </div>
                                  </div>
                                )
                              })}
                              {topTracks.length > 3 && (
                                <div className="pt-2 border-t border-[var(--theme-border)]">
                                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                    {topTracks.slice(3, 10).map((track: any, idx: number) => {
                                      const entryKey = getEntryKey(track, 'tracks')
                                      const positionChange = positionChangeMap.get(`tracks|${entryKey}`)
                                      return (
                                        <li key={idx + 3} className="truncate flex items-center gap-1">
                                          {track.name} by {track.artist} <PositionMovementIcon positionChange={positionChange} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(track, 'tracks', showVS, vsMap)})</span>
                                        </li>
                                      )
                                    })}
                                  </ol>
                                  {topTracks.length > 10 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      ...and {topTracks.length - 10} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Top Albums */}
                          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                            <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                              <FontAwesomeIcon icon={faCompactDisc} className="text-lg" />
                              Top Albums
                            </h4>
                            <div className="space-y-3">
                              {topAlbums.slice(0, 3).map((album: any, idx: number) => {
                                const displayValue = formatDisplayValue(album, 'albums', showVS, vsMap)
                                const entryKey = getEntryKey(album, 'albums')
                                const positionChange = positionChangeMap.get(`albums|${entryKey}`)
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--theme-background-from)] hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                                        {album.name}
                                        <PositionMovementIcon positionChange={positionChange} className="text-sm" />
                                      </div>
                                      <div className="text-xs text-gray-600 truncate">by {album.artist}</div>
                                      <div className="text-sm text-[var(--theme-text)] font-medium mt-1">{displayValue}</div>
                                    </div>
                                  </div>
                                )
                              })}
                              {topAlbums.length > 3 && (
                                <div className="pt-2 border-t border-[var(--theme-border)]">
                                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                                    {topAlbums.slice(3, 10).map((album: any, idx: number) => {
                                      const entryKey = getEntryKey(album, 'albums')
                                      const positionChange = positionChangeMap.get(`albums|${entryKey}`)
                                      return (
                                        <li key={idx + 3} className="truncate flex items-center gap-1">
                                          {album.name} by {album.artist} <PositionMovementIcon positionChange={positionChange} className="text-xs" /> <span className="text-[var(--theme-text)]">({formatDisplayValue(album, 'albums', showVS, vsMap)})</span>
                                        </li>
                                      )
                                    })}
                                  </ol>
                                  {topAlbums.length > 10 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                      ...and {topAlbums.length - 10} more
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
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

