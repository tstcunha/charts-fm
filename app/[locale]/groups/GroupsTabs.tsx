'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faUsers, faEnvelope } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface Group {
  id: string
  name: string
  image: string | null
  colorTheme: string | null
  creator: {
    id: string
    name: string | null
    lastfmUsername: string
  }
  _count: {
    members: number
  }
  createdAt: Date
}

interface Invite {
  id: string
  groupId: string
  group: Group
  createdAt: Date
}

interface GroupsTabsProps {
  ownedGroups: Group[]
  memberGroups: Group[]
  invites: Invite[]
  userId: string
  pendingRequestsMap?: Record<string, number>
}

export default function GroupsTabs({ ownedGroups, memberGroups, invites, userId, pendingRequestsMap = {} }: GroupsTabsProps) {
  const t = useSafeTranslations('groups.list')
  const tHero = useSafeTranslations('groups.hero')
  const [activeTab, setActiveTab] = useState<'groups' | 'invites'>('groups')
  
  // Merge groups with owned groups first
  const allGroups = [...ownedGroups, ...memberGroups]
  const [rejectedInviteIds, setRejectedInviteIds] = useState<Set<string>>(new Set())
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null)
  const router = useRouter()

  const handleAcceptInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToAcceptInvite'))
      }

      // Refresh the page
      router.refresh()
    } catch (err) {
      console.error('Failed to accept invite:', err)
      setProcessingInviteId(null)
    }
  }

  const handleRejectInvite = async (inviteId: string, groupId: string) => {
    setProcessingInviteId(inviteId)
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || t('failedToRejectInvite'))
      }

      // Grey out the card
      setRejectedInviteIds((prev) => new Set(prev).add(inviteId))
      setProcessingInviteId(null)
    } catch (err) {
      console.error('Failed to reject invite:', err)
      setProcessingInviteId(null)
    }
  }

  const renderGroupCard = (group: Group, href: string) => {
    const isOwner = group.creator.id === userId
    const colorTheme = group.colorTheme || 'white'
    const themeClass = `theme-${colorTheme.replace('_', '-')}`
    const groupImage = group.image || getDefaultGroupImage()
    const pendingRequestsCount = pendingRequestsMap[group.id] || 0
    
    return (
      <Link
        key={group.id}
        href={href}
        className={`block bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 md:p-6 border border-[var(--theme-border)] hover:shadow-md transition-all ${themeClass} relative`}
      >
        {pendingRequestsCount > 0 && (
          <span className="absolute top-3 right-3 md:top-4 md:right-4 px-2 md:px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-bold z-10">
            {pendingRequestsCount}
          </span>
        )}
        <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)] transition-all">
              <SafeImage
                src={groupImage}
                alt={group.name}
                className="object-cover w-full h-full"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-xl md:text-2xl font-bold text-[var(--theme-text)] transition-colors truncate">
                {group.name}
              </h3>
            </div>
            <div className="text-xs md:text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2 flex-wrap min-w-0">
                <span>{tHero('owner')}</span>
                <span className="font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{group.creator.name || group.creator.lastfmUsername}</span>
                {isOwner && (
                  <span className="text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-1.5 md:px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                    {t('you')}
                  </span>
                )}
              </p>
              <p className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-[var(--theme-primary)] font-medium text-xs md:text-sm" />
                <span>{t('memberCount', { count: group._count.members })}</span>
              </p>
              <p className="text-xs text-gray-500">
                {t('created', { date: new Date(group.createdAt).toLocaleDateString() })}
              </p>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const renderInviteCard = (invite: Invite) => {
    const isRejected = rejectedInviteIds.has(invite.id)
    const isProcessing = processingInviteId === invite.id
    const colorTheme = invite.group.colorTheme || 'white'
    const themeClass = `theme-${colorTheme.replace('_', '-')}`
    const groupImage = invite.group.image || getDefaultGroupImage()

    return (
      <div
        key={invite.id}
        className={`bg-white rounded-xl shadow-sm p-4 md:p-6 border border-gray-200 transition-all ${
          isRejected ? 'opacity-50' : 'hover:shadow-md'
        }`}
      >
        <Link
          href={`/groups/${invite.groupId}/public`}
          className="block mb-3 md:mb-4"
        >
          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden ring-2 ring-gray-300 bg-gray-100 ${themeClass}`}>
                <SafeImage
                  src={groupImage}
                  alt={invite.group.name}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{invite.group.name}</h3>
                <span className="flex-shrink-0 text-xs bg-gray-900 text-white px-1.5 md:px-2 py-0.5 rounded-full font-bold">
                  {t('invited')}
                </span>
              </div>
              <div className="text-xs md:text-sm text-gray-600 space-y-1">
                <p className="flex items-center gap-1 min-w-0">
                  <span>{tHero('owner')}</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[200px]">{invite.group.creator.name || invite.group.creator.lastfmUsername}</span>
                </p>
                <p className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} className="text-gray-500 font-medium text-xs md:text-sm" />
                  <span>{t('memberCount', { count: invite.group._count.members })}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {t('created', { date: new Date(invite.group.createdAt).toLocaleDateString() })}
                </p>
              </div>
            </div>
          </div>
        </Link>
        <div className="flex gap-2 mt-3 md:mt-4">
          <button
            onClick={(e) => {
              e.preventDefault()
              handleAcceptInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all font-semibold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? t('processing') : t('accept')}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              handleRejectInvite(invite.id, invite.groupId)
            }}
            disabled={isProcessing || isRejected}
            className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all font-semibold text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? t('processing') : t('reject')}
          </button>
        </div>
      </div>
    )
  }

  const tabs: TabItem[] = [
    { id: 'groups', label: t('groupsImIn'), icon: faUsers },
    { id: 'invites', label: t('invites'), icon: faEnvelope, badge: invites.length },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex justify-center mb-4 md:mb-6">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'groups' | 'invites')}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'groups' && (
        <div 
          className="rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          }}
        >
          {allGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {allGroups.map((group) => renderGroupCard(group, `/groups/${group.id}`))}
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <div className="mb-4 text-gray-400">
                <FontAwesomeIcon icon={faMusic} className="text-4xl md:text-5xl" />
              </div>
              <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{t('noGroupsYet')}</p>
              <p className="text-gray-500 text-sm mb-6">{t('noGroupsDescription')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div 
          className="rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
          style={{
            background: 'rgba(255, 255, 255, 0.6)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          }}
        >
          {invites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {invites.map((invite) => renderInviteCard(invite))}
            </div>
          ) : (
            <div className="p-8 md:p-12 text-center">
              <div className="mb-4 text-gray-400">
                <FontAwesomeIcon icon={faEnvelope} className="text-4xl md:text-5xl" />
              </div>
              <p className="text-gray-700 text-base md:text-lg mb-2 font-medium">{t('noInvitesYet')}</p>
              <p className="text-gray-500 text-sm">{t('noInvitesDescription')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

