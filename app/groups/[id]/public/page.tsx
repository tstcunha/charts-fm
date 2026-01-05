import { getPublicGroupById, getGroupWeeklyStats } from '@/lib/group-queries'
import { formatWeekDate } from '@/lib/weekly-utils'
import SafeImage from '@/components/SafeImage'
import PositionMovementIcon from '@/components/PositionMovementIcon'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCompactDisc } from '@fortawesome/free-solid-svg-icons'

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

  // Get color theme
  // @ts-ignore - Prisma client will be regenerated after migration
  const colorTheme = (group.colorTheme || 'white') as string
  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Get VS data and position changes for all weeks if we have stats
  const vsMapsByWeek = new Map<string, Map<string, number>>()
  const positionChangeMapsByWeek = new Map<string, Map<string, number | null>>()
  if (weeklyStats.length > 0) {
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
          positionChange: true,
        },
      })
      
      const vsMap = new Map<string, number>()
      const positionChangeMap = new Map<string, number | null>()
      chartEntries.forEach((entry) => {
        const key = `${entry.chartType}|${entry.entryKey}`
        if (entry.vibeScore !== null && entry.vibeScore !== undefined) {
          vsMap.set(key, entry.vibeScore)
        }
        positionChangeMap.set(key, entry.positionChange)
      })
      vsMapsByWeek.set(week.weekStart.toISOString(), vsMap)
      positionChangeMapsByWeek.set(week.weekStart.toISOString(), positionChangeMap)
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

  // Calculate tracking day info
  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const trackingDayName = dayNames[trackingDayOfWeek]

  // Calculate quick stats
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

            {hasPendingInvite && pendingInviteId && (
              <div className="mb-6">
                <InviteNotification groupId={group.id} inviteId={pendingInviteId} />
              </div>
            )}

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
                  
                  {isMember && (
                    <div className="mb-4">
                      <Link 
                        href={`/groups/${group.id}`} 
                        className="inline-flex items-center gap-2 text-[var(--theme-primary-dark)] hover:text-[var(--theme-primary-darker)] hover:underline font-medium text-sm transition-colors"
                      >
                        <span>←</span>
                        <span>View as Member</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
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

        <div>
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)] mb-6">
            Weekly Charts
          </h2>
          {weeklyStats.length === 0 ? (
            <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
              <div className="mb-4 text-[var(--theme-primary)]">
                <FontAwesomeIcon icon={faMusic} size="3x" />
              </div>
              <p className="text-gray-700 text-lg mb-2 font-medium">No charts available yet.</p>
              <p className="text-gray-500 text-sm">This group hasn't generated any charts yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weeklyStats.map((week: any) => {
                const weekKey = week.weekStart.toISOString()
                const vsMap = vsMapsByWeek.get(weekKey) || new Map()
                const positionChangeMap = positionChangeMapsByWeek.get(weekKey) || new Map()
                const topArtists = (week.topArtists as any[]) || []
                const topTracks = (week.topTracks as any[]) || []
                const topAlbums = (week.topAlbums as any[]) || []
                
                const weekStartDate = new Date(week.weekStart)
                const weekEndDate = getWeekEndDate(weekStartDate)
                const weekStartFormatted = formatDateWritten(weekStartDate)
                const weekEndFormatted = formatDateWritten(weekEndDate)
                
                return (
                  <div key={week.id} className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      Week of {weekStartFormatted}
                      <span className="text-sm font-normal italic text-gray-500 ml-2">
                        (from {weekStartFormatted} to {weekEndFormatted})
                      </span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Top Artists */}
                      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
                        <h4 className="font-bold text-lg mb-4 text-[var(--theme-primary-dark)] flex items-center gap-2">
                          <FontAwesomeIcon icon={faMicrophone} style={{ width: '1em', height: '1em' }} />
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
                          <FontAwesomeIcon icon={faMusic} style={{ width: '1em', height: '1em' }} />
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
                          <FontAwesomeIcon icon={faCompactDisc} style={{ width: '1em', height: '1em' }} />
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
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

