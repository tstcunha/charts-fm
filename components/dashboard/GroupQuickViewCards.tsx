'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { getDefaultGroupImage } from '@/lib/default-images'
import { formatWeekLabel } from '@/lib/weekly-utils'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faMicrophone, faCrown, faUsers, faSpinner } from '@fortawesome/free-solid-svg-icons'

interface GroupQuickView {
  id: string
  name: string
  image: string | null
  colorTheme: string
  isOwner: boolean
  latestWeek: {
    weekStart: string
    topArtist: { name: string; playcount: number } | null
    topTrack: { name: string; artist: string; playcount: number } | null
  } | null
  userContributions: {
    tracksInChart: number
    topContribution: { name: string; position: number; chartType: string } | null
  }
  daysUntilNextChart: number
  memberCount: number
  chartMode: string
}

// Memoized group card component to prevent unnecessary re-renders
const GroupCard = memo(({ group }: { group: GroupQuickView }) => {
  const themeClass = `theme-${group.colorTheme.replace('_', '-')}`
  const groupImage = useMemo(() => group.image || getDefaultGroupImage(), [group.image])

  return (
    <Link
      href={`/groups/${group.id}`}
      className={`block bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 border border-[var(--theme-border)] hover:shadow-md transition-all ${themeClass}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden ring-2 ring-[var(--theme-ring)] bg-[var(--theme-primary-lighter)]">
          <SafeImage
            src={groupImage}
            alt={group.name}
            className="object-cover w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[var(--theme-text)] truncate">{group.name}</h3>
            {group.isOwner && (
              <FontAwesomeIcon icon={faCrown} className="text-[var(--theme-primary)] text-xs" title="Owner" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <FontAwesomeIcon icon={faUsers} className="text-xs" />
            <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
          </div>
        </div>
      </div>

      {group.latestWeek ? (
        <div className="space-y-2 mb-3">
          {group.latestWeek.topArtist && (
            <div 
              className="flex items-center gap-2 text-sm rounded-lg p-2"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              }}
            >
              <FontAwesomeIcon icon={faMicrophone} className="text-[var(--theme-primary)] text-xs" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{group.latestWeek.topArtist.name}</div>
                <div className="text-xs text-gray-500">{group.latestWeek.topArtist.playcount} plays</div>
              </div>
            </div>
          )}
          {group.latestWeek.topTrack && (
            <div 
              className="flex items-center gap-2 text-sm rounded-lg p-2"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              }}
            >
              <FontAwesomeIcon icon={faMusic} className="text-[var(--theme-primary)] text-xs" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{group.latestWeek.topTrack.name}</div>
                <div className="text-xs text-gray-500">by {group.latestWeek.topTrack.artist}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 mb-3 italic">No charts yet</div>
      )}

      {group.userContributions.tracksInChart > 0 && (
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-medium">You contributed {group.userContributions.tracksInChart} items</span>
          {group.userContributions.topContribution && (
            <span className="text-gray-500">
              {' '}• #{group.userContributions.topContribution.position} {group.userContributions.topContribution.name}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--theme-border)]/50">
        <span className="text-xs text-gray-500">
          {group.daysUntilNextChart === 0
            ? 'Charts update today'
            : group.daysUntilNextChart === 1
            ? 'Next chart tomorrow'
            : `${group.daysUntilNextChart} days until next chart`}
        </span>
        <span className="text-xs bg-[var(--theme-primary)] text-[var(--theme-button-text)] px-2 py-1 rounded font-medium">
          {group.chartMode === 'vs' ? 'VS' : group.chartMode === 'vs_weighted' ? 'VS+' : 'Plays'}
        </span>
      </div>
    </Link>
  )
})
GroupCard.displayName = 'GroupCard'

export default function GroupQuickViewCards() {
  const [groups, setGroups] = useState<GroupQuickView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/groups')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setGroups(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load groups')
        setIsLoading(false)
        console.error('Error fetching groups:', err)
      })
  }, [])

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
  }

  if (isLoading) {
    return (
      <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200"
        style={glassStyle}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Your Groups</h2>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || groups.length === 0) {
    return (
      <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200"
        style={glassStyle}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">Your Groups</h2>
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">You're not in any groups yet.</p>
          <Link
            href="/groups/create"
            className="inline-block px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 transition-colors font-semibold"
          >
            Create Your First Group
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="rounded-xl shadow-lg p-6 border border-theme"
      style={glassStyle}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Groups</h2>
        <Link
          href="/groups"
          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    </div>
  )
}

