import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { prisma } from '@/lib/prisma'
import { getWeekStartForDay, getWeekEndForDay, formatWeekLabel } from '@/lib/weekly-utils'
import { getLastChartWeek, canUpdateCharts as canUpdateChartsHelper } from '@/lib/group-service'
import UpdateChartsButton from './UpdateChartsButton'
import ShareGroupButton from '@/app/[locale]/groups/[id]/ShareGroupButton'
import QuickAccessButton from '@/app/[locale]/groups/[id]/QuickAccessButton'
import RequestToJoinButton from '@/app/[locale]/groups/[id]/public/RequestToJoinButton'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { getTranslations } from 'next-intl/server'
import { getSession } from '@/lib/auth'
import { getArtistImage } from '@/lib/lastfm'

interface GroupHeroServerProps {
  groupId: string
  isOwner: boolean
  colorTheme: string
  isMember?: boolean
  userId?: string | null
}

export default async function GroupHeroServer({ groupId, isOwner, colorTheme, isMember = true, userId }: GroupHeroServerProps) {
  const t = await getTranslations('groups.hero')
  // Fetch members with images (only for members, for privacy)
  const membersWithImages = isMember ? await prisma.groupMember.findMany({
    where: { groupId },
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
  }) : []

  // Get group data
  const group = await prisma.group.findUnique({
    where: { id: groupId },
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

  if (!group) {
    return null
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
          console.log(`[GroupHeroServer] Group ${group.id}, Artist: ${artistName}, Stored: ${group.image}, Dynamic: ${dynamicImage}`)
          if (dynamicImage) {
            groupImage = dynamicImage
          }
        } else {
          console.log(`[GroupHeroServer] Group ${group.id}, No artist name found`)
        }
      } else {
        console.log(`[GroupHeroServer] Group ${group.id}, No latest stats found`)
      }
    } catch (error) {
      // If there's an error, fall back to stored image
      console.error(`[GroupHeroServer] Error fetching dynamic artist image for group ${group.id}:`, error)
    }
  } else {
    console.log(`[GroupHeroServer] Group ${group.id}, Dynamic icon not enabled or not artist-based (enabled: ${group.dynamicIconEnabled}, source: ${group.dynamicIconSource})`)
  }

  const trackingDayOfWeek = group.trackingDayOfWeek ?? 0
  const dayNames = [
    t('daysOfWeek.sunday'),
    t('daysOfWeek.monday'),
    t('daysOfWeek.tuesday'),
    t('daysOfWeek.wednesday'),
    t('daysOfWeek.thursday'),
    t('daysOfWeek.friday'),
    t('daysOfWeek.saturday')
  ]
  const trackingDayName = dayNames[trackingDayOfWeek]
  
  const now = new Date()
  const currentWeekStart = getWeekStartForDay(now, trackingDayOfWeek)
  const currentWeekEnd = getWeekEndForDay(currentWeekStart, trackingDayOfWeek)
  const nextChartDate = currentWeekEnd
  const nextChartDateFormatted = formatWeekLabel(nextChartDate)
  const daysUntilNextChart = Math.ceil((nextChartDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Check if charts can be updated
  const lastChartWeek = await getLastChartWeek(groupId)
  const chartGenerationInProgress = group.chartGenerationInProgress || false
  
  // Charts can be updated if it's at least the next day of the week since the last chart was generated
  // and generation is not already in progress
  let canUpdateCharts = canUpdateChartsHelper(lastChartWeek, trackingDayOfWeek, now) && !chartGenerationInProgress

  // Check for pending request/invite for non-members
  let hasPendingRequest = false
  let hasPendingInvite = false
  if (!isMember && userId) {
    const pendingRequest = await prisma.groupJoinRequest.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })
    hasPendingRequest = pendingRequest?.status === 'pending'

    const pendingInvite = await prisma.groupInvite.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userId,
        },
      },
    })
    hasPendingInvite = pendingInvite?.status === 'pending'
  }

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  return (
    <div className={`mb-6 md:mb-8 relative ${themeClass}`}>
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 border border-theme relative">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 md:mb-6 flex items-center gap-2 text-xs md:text-sm">
          <Link 
            href="/groups" 
            className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
          >
            {t('breadcrumb')}
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium truncate">{group.name}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
          <div className="flex items-start gap-3 md:gap-4 lg:gap-6">
            {/* Large Group Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 rounded-xl md:rounded-2xl overflow-hidden shadow-sm ring-2 md:ring-4 ring-theme bg-[var(--theme-primary-lighter)]">
                <SafeImage
                  key={groupImage} // Force re-render when image URL changes
                  src={groupImage}
                  alt={group.name}
                  className="object-cover w-full h-full"
                />
              </div>
              {imageCaption && (
                <p className="text-xs italic text-gray-600 mt-1 md:mt-2 text-left max-w-[8rem] md:max-w-[10rem]">
                  {imageCaption}
                </p>
              )}
            </div>
            
            {/* Group Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 md:mb-3 text-[var(--theme-primary-dark)] leading-[1.1] pb-1 md:pb-2 overflow-visible break-words">
                {group.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:gap-4 mb-3 md:mb-4 text-xs md:text-sm">
                <div className="flex items-center gap-1 md:gap-2 min-w-0">
                  <span className="text-gray-600">{t('owner')}</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[200px]">
                    {group.creator ? (group.creator.name || group.creator.lastfmUsername) : t('deletedUser')}
                  </span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-gray-600">{t('members')}</span>
                  <span className="font-semibold text-gray-900">{group._count.members}</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-gray-600">{t('tracking')}</span>
                  <span className="font-semibold text-gray-900">{trackingDayName}</span>
                </div>
              </div>
              
              {/* Member Avatars */}
              {membersWithImages.length > 0 && (
                <div className="flex items-center gap-2 mb-3 md:mb-4 min-w-0 flex-wrap">
                  <div className="flex -space-x-2 md:-space-x-3 flex-shrink-0">
                    {membersWithImages.slice(0, 6).map((member) => (
                      <div
                        key={member.user.id}
                        className="relative w-8 h-8 md:w-10 md:h-10 rounded-full ring-2 ring-white bg-[var(--theme-primary-lighter)] overflow-hidden flex-shrink-0"
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
                    <span className="text-xs md:text-sm text-gray-600 ml-1 md:ml-2 flex-shrink-0 whitespace-nowrap">{t('moreMembers', { count: membersWithImages.length - 6 })}</span>
                  )}
                </div>
              )}
              
              {/* Next Charts Badge or Update Button - Desktop only (only for members) */}
              {isMember && (
                <div className="hidden md:block w-auto">
                  {canUpdateCharts || chartGenerationInProgress ? (
                    <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} />
                  ) : (
                  <div 
                    className="inline-flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-semibold text-xs md:text-sm"
                    style={{
                      background: 'var(--theme-primary)',
                      color: 'var(--theme-button-text)',
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    }}
                  >
                    <span className="whitespace-nowrap">{t(daysUntilNextChart === 1 ? 'nextChartsIn' : 'nextChartsInDays', { count: daysUntilNextChart })}</span>
                    <span className="text-xs opacity-80 hidden sm:inline">({nextChartDateFormatted})</span>
                  </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Next Charts Badge or Update Button - Mobile only (only for members) */}
          {isMember && (
            <div className="md:hidden w-full -mt-2 mb-1">
              {canUpdateCharts || chartGenerationInProgress ? (
                <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} />
              ) : (
              <div 
                className="flex items-center justify-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full font-semibold text-xs md:text-sm w-full"
                style={{
                  background: 'var(--theme-primary)',
                  color: 'var(--theme-button-text)',
                  backdropFilter: 'blur(12px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
              >
                <span className="whitespace-nowrap">{t(daysUntilNextChart === 1 ? 'nextChartsIn' : 'nextChartsInDays', { count: daysUntilNextChart })}</span>
                <span className="text-xs opacity-80 hidden sm:inline">({nextChartDateFormatted})</span>
              </div>
              )}
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 items-start mt-2 md:mt-0">
            {isMember && <QuickAccessButton groupId={groupId} />}
            {isOwner && (
              <LiquidGlassLink
                href={`/groups/${groupId}/settings`}
                variant="primary"
                useTheme
                size="md"
                className="text-sm md:text-base px-2.5 py-1.5 md:px-4 md:py-2"
              >
                {t('settings')}
              </LiquidGlassLink>
            )}
            {!isMember && userId && (
              <RequestToJoinButton
                groupId={groupId}
                hasPendingRequest={hasPendingRequest}
                hasPendingInvite={hasPendingInvite}
                allowFreeJoin={group.allowFreeJoin ?? false}
                memberCount={group._count.members}
              />
            )}
          </div>
          
          {/* Share Button - positioned at bottom right (only for members) */}
          {isMember && (
            <ShareGroupButton groupId={groupId} />
          )}
        </div>
      </div>
    </div>
  )
}

