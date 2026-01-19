import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getGroupByIdForAccess } from '@/lib/group-queries'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RequestToJoinButton from './RequestToJoinButton'
import InviteNotification from './InviteNotification'
import CompatibilityScore from './CompatibilityScore'
import { getTranslations } from 'next-intl/server'
import { getArtistImage } from '@/lib/lastfm'

interface PublicGroupHeroServerProps {
  groupId: string
  colorTheme: string
}

export default async function PublicGroupHeroServer({ groupId, colorTheme }: PublicGroupHeroServerProps) {
  // Get user if authenticated to check membership
  const session = await getSession()
  let userId: string | null = null
  let isMember = false
  let hasPendingRequest = false
  let hasPendingInvite = false
  let pendingInviteId: string | null = null
  
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    userId = user?.id || null
    
    if (user) {
      // Check membership
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: user.id,
          },
        },
      })
      isMember = !!membership
      
      // Check if user is creator (will be checked after we get the group)
      // Also check for pending request or invite
      const [pendingRequest, pendingInvite] = await Promise.all([
        prisma.groupJoinRequest.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        }),
        prisma.groupInvite.findUnique({
          where: {
            groupId_userId: {
              groupId,
              userId: user.id,
            },
          },
        }),
      ])
      hasPendingRequest = pendingRequest?.status === 'pending'
      hasPendingInvite = pendingInvite?.status === 'pending'
      pendingInviteId = pendingInvite?.id || null
    }
  }
  
  // Use getGroupByIdForAccess to get the group (works for both public and private groups)
  const group = await getGroupByIdForAccess(groupId, userId)
  const t = await getTranslations('groups.hero')
  
  if (!group) {
    return null
  }

  // Check if user is creator (now that we have the group)
  if (userId && group.creatorId === userId) {
    isMember = true
  }

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

  // Calculate tracking day info
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

  // Get chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string

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
          const { getArtistImage } = await import('@/lib/lastfm')
          // This will check uploaded images first, then fallback to MusicBrainz
          const dynamicImage = await getArtistImage(artistName, apiKey)
          if (dynamicImage) {
            groupImage = dynamicImage
          }
        }
      }
    } catch (error) {
      // If there's an error, fall back to stored image
      console.error('Error fetching dynamic artist image:', error)
    }
  }

  return (
    <div className={`mb-6 md:mb-8 relative ${themeClass}`}>
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 border border-theme">
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

        {hasPendingInvite && pendingInviteId && (
          <div className="mb-4 md:mb-6">
            <InviteNotification groupId={group.id} inviteId={pendingInviteId} />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6">
            {/* Large Group Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl md:rounded-2xl overflow-hidden shadow-sm ring-2 md:ring-4 ring-theme bg-[var(--theme-primary-lighter)]">
                <SafeImage
                  key={groupImage} // Force re-render when image URL changes
                  src={groupImage}
                  alt={group.name}
                  className="object-cover w-full h-full"
                />
              </div>
              {imageCaption && (
                <p className="text-xs italic text-gray-600 mt-2 text-left max-w-[10rem]">
                  {imageCaption}
                </p>
              )}
            </div>
            
            {/* Group Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 text-[var(--theme-primary-dark)] leading-[1.1] pb-2 overflow-visible">
                {group.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3 md:mb-4">
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                  <span className="text-xs md:text-sm text-gray-600">{t('owner')}</span>
                  <span className="font-semibold text-xs md:text-sm text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{group.creator?.name || group.creator?.lastfmUsername || t('deletedUser')}</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-xs md:text-sm text-gray-600">{t('members')}</span>
                  <span className="font-semibold text-xs md:text-sm text-gray-900">{group._count.members}</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-xs md:text-sm text-gray-600">{t('tracking')}</span>
                  <span className="font-semibold text-xs md:text-sm text-gray-900">{trackingDayName}</span>
                </div>
              </div>
              
              {/* Tags - Only shown on public pages */}
              {Array.isArray((group as any).tags) && (group as any).tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                  {(group as any).tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-xs md:text-sm font-medium border"
                      style={{
                        backgroundColor: 'var(--theme-primary-lighter)',
                        color: 'var(--theme-primary-dark)',
                        borderColor: 'var(--theme-primary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {isMember && (
                <div className="mb-3 md:mb-4">
                  <Link 
                    href={`/groups/${group.id}`} 
                    className="inline-flex items-center gap-2 text-[var(--theme-primary-dark)] hover:text-[var(--theme-primary-darker)] hover:underline font-medium text-xs md:text-sm transition-colors"
                  >
                    <span>←</span>
                    <span>{t('public.viewAsMember')}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 items-center justify-start sm:justify-end">
            {session?.user?.email && !isMember && (
              <>
                <CompatibilityScore groupId={group.id} />
                <RequestToJoinButton
                  groupId={group.id}
                  hasPendingRequest={hasPendingRequest}
                  hasPendingInvite={hasPendingInvite}
                  allowFreeJoin={group.allowFreeJoin ?? false}
                  memberCount={group._count.members}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

