import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { getPublicGroupById } from '@/lib/group-queries'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RequestToJoinButton from './RequestToJoinButton'
import InviteNotification from './InviteNotification'

interface PublicGroupHeroServerProps {
  groupId: string
  colorTheme: string
}

export default async function PublicGroupHeroServer({ groupId, colorTheme }: PublicGroupHeroServerProps) {
  const group = await getPublicGroupById(groupId)
  
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
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const trackingDayName = dayNames[trackingDayOfWeek]

  // Get chart mode
  // @ts-ignore - Prisma client will be regenerated after migration
  const chartMode = (group.chartMode || 'plays_only') as string

  return (
    <div className={`mb-8 relative ${themeClass}`}>
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
      </div>
    </div>
  )
}

