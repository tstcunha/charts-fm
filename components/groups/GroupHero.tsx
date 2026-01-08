'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import SafeImage from '@/components/SafeImage'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import UpdateChartsButton from './UpdateChartsButton'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'

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
      <div className="mb-6 md:mb-8 relative">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 border border-gray-200">
          <div className="flex items-center justify-center py-8 md:py-12">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mb-6 md:mb-8 relative">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 border border-gray-200">
          <div className="text-center py-6 md:py-8 text-gray-500 text-sm md:text-base">
            <p>{error || 'Failed to load group data'}</p>
          </div>
        </div>
      </div>
    )
  }

  const { group, isOwner, members, daysUntilNextChart, nextChartDateFormatted, canUpdateCharts, chartGenerationInProgress, imageCaption } = data
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
    <div className={`mb-6 md:mb-8 relative ${themeClass}`}>
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm p-4 md:p-6 lg:p-8 border border-theme">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 md:mb-6 flex items-center gap-2 text-xs md:text-sm">
          <Link 
            href="/groups" 
            className="text-gray-500 hover:text-[var(--theme-text)] transition-colors"
          >
            Groups
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
                  src={group.image}
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
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-gray-600">Owner:</span>
                  <span className="font-semibold text-gray-900 truncate">
                    {group.creator ? (group.creator.name || group.creator.lastfmUsername) : 'Deleted User'}
                  </span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-gray-600">Members:</span>
                  <span className="font-semibold text-gray-900">{group.memberCount}</span>
                </div>
                <span className="text-gray-300 hidden sm:inline">•</span>
                <div className="flex items-center gap-1 md:gap-2">
                  <span className="text-gray-600">Tracking:</span>
                  <span className="font-semibold text-gray-900">{group.trackingDayName}</span>
                </div>
              </div>
              
              {/* Member Avatars */}
              {members.length > 0 && (
                <div className="flex items-center gap-2 mb-3 md:mb-4 min-w-0 flex-wrap">
                  <div className="flex -space-x-2 md:-space-x-3 flex-shrink-0">
                    {members.slice(0, 6).map((member: any) => (
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
                  {members.length > 6 && (
                    <span className="text-xs md:text-sm text-gray-600 ml-1 md:ml-2 flex-shrink-0 whitespace-nowrap">+{members.length - 6} more</span>
                  )}
                </div>
              )}
              
              {/* Next Charts Badge or Update Button - Desktop only */}
              <div className="hidden md:block w-auto">
                {canUpdateCharts || chartGenerationInProgress ? (
                  <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} onUpdateComplete={handleUpdateComplete} />
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
                    <span className="whitespace-nowrap">Next charts in {daysUntilNextChart} {daysUntilNextChart === 1 ? 'day' : 'days'}</span>
                    <span className="text-xs opacity-80 hidden sm:inline">({nextChartDateFormatted})</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Next Charts Badge or Update Button - Mobile only */}
          <div className="md:hidden w-full -mt-2 mb-1">
            {canUpdateCharts || chartGenerationInProgress ? (
              <UpdateChartsButton groupId={groupId} initialInProgress={chartGenerationInProgress} onUpdateComplete={handleUpdateComplete} />
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
                <span className="whitespace-nowrap">Next charts in {daysUntilNextChart} {daysUntilNextChart === 1 ? 'day' : 'days'}</span>
                <span className="text-xs opacity-80 hidden sm:inline">({nextChartDateFormatted})</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 items-start mt-2 md:mt-0">
            {isOwner && (
              <LiquidGlassLink
                href={`/groups/${groupId}/settings`}
                variant="primary"
                useTheme
                size="md"
                className="text-sm md:text-base px-2.5 py-1.5 md:px-4 md:py-2"
              >
                Settings
              </LiquidGlassLink>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

