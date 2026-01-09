import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getPublicGroupById } from '@/lib/group-queries'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RequestToJoinButton from './RequestToJoinButton'
import InviteNotification from './InviteNotification'
import CompatibilityScore from './CompatibilityScore'
import { getTranslations } from 'next-intl/server'

interface PublicGroupHeroServerProps {
  groupId: string
  colorTheme: string
}

export default async function PublicGroupHeroServer({ groupId, colorTheme }: PublicGroupHeroServerProps) {
  const group = await getPublicGroupById(groupId)
  const t = await getTranslations('groups.hero')
  
  if (!group) {
    return null
  }

  const themeClass = `theme-${colorTheme.replace('_', '-')}`

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
                  src={group.image}
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

