'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import SafeImage from '@/components/SafeImage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import UpdateChartsButton from './UpdateChartsButton'

interface GroupHeroProps {
  groupId: string
}

export default function GroupHero({ groupId }: GroupHeroProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/hero`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load group data')
        setIsLoading(false)
        console.error('Error fetching group hero:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div className="mb-8 relative">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-8 border border-gray-200">
          <div className="flex items-center justify-center py-12">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mb-8 relative">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-8 border border-gray-200">
          <div className="text-center py-8 text-gray-500">
            <p>{error || 'Failed to load group data'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { group, isOwner, members, daysUntilNextChart, nextChartDateFormatted, canUpdateCharts, chartGenerationInProgress } = data
  const themeClass = `theme-${group.colorTheme.replace('_', '-')}`
  
  const handleUpdateComplete = () => {
    // Refresh data after update completes
    fetch(`/api/groups/${groupId}/hero`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data)
        }
      })
      .catch((err) => {
        console.error('Error refreshing group hero:', err)
      })
  }

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
                  <span className="font-semibold text-gray-900">{group.memberCount}</span>
                </div>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tracking:</span>
                  <span className="font-semibold text-gray-900">{group.trackingDayName}</span>
                </div>
              </div>
              
              {/* Member Avatars */}
              {members.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-3">
                    {members.slice(0, 6).map((member: any) => (
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
                  {members.length > 6 && (
                    <span className="text-sm text-gray-600 ml-2">+{members.length - 6} more</span>
                  )}
                </div>
              )}
              
              {/* Next Charts Badge or Update Button */}
              {canUpdateCharts || chartGenerationInProgress ? (
                <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} onUpdateComplete={handleUpdateComplete} />
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-full font-semibold shadow-sm">
                  <span className="text-sm">Next charts in {daysUntilNextChart} {daysUntilNextChart === 1 ? 'day' : 'days'}</span>
                  <span className="text-xs opacity-80">({nextChartDateFormatted})</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <Link
                href={`/groups/${groupId}/settings`}
                className="px-5 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-button-text)] rounded-lg hover:bg-[var(--theme-primary-light)] transition-all shadow-sm hover:shadow font-semibold"
              >
                Settings
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

