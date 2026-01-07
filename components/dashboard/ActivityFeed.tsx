'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMusic,
  faUserPlus,
  faEnvelope,
  faHandPaper,
  faArrowUp,
  faArrowDown,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ActivityItem {
  type: 'chart_update' | 'new_member' | 'invite' | 'join_request' | 'position_change'
  groupId: string
  groupName: string
  message: string
  timestamp: string
  metadata?: any
}

export default function ActivityFeed() {
  const t = useSafeTranslations('dashboard.activityFeed')
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simple relative time formatter
  function formatRelativeTime(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('justNow')
    if (diffMins < 60) return t(diffMins === 1 ? 'minuteAgo' : 'minutesAgo', { count: diffMins })
    if (diffHours < 24) return t(diffHours === 1 ? 'hourAgo' : 'hoursAgo', { count: diffHours })
    if (diffDays < 7) return t(diffDays === 1 ? 'dayAgo' : 'daysAgo', { count: diffDays })
    
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 4) return t(diffWeeks === 1 ? 'weekAgo' : 'weeksAgo', { count: diffWeeks })
    
    const diffMonths = Math.floor(diffDays / 30)
    return t(diffMonths === 1 ? 'monthAgo' : 'monthsAgo', { count: diffMonths })
  }

  useEffect(() => {
    fetch('/api/dashboard/activity')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setActivities(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError(t('failedToLoad'))
        setIsLoading(false)
        console.error('Error fetching activity:', err)
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
        <h2 className="text-2xl font-bold mb-4 text-gray-900">{t('title')}</h2>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-yellow-500" />
        </div>
      </div>
    )
  }

  if (error || activities.length === 0) {
    return (
      <div 
        className="rounded-xl shadow-lg p-6 border border-gray-200"
        style={glassStyle}
      >
        <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">{t('title')}</h2>
        <div className="text-center py-8 text-gray-500">
          <p>{t('noActivity')}</p>
        </div>
      </div>
    )
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'chart_update':
        return faMusic
      case 'new_member':
        return faUserPlus
      case 'invite':
        return faEnvelope
      case 'join_request':
        return faHandPaper
      case 'position_change':
        return faArrowUp
      default:
        return faMusic
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'chart_update':
        return 'bg-blue-100 text-blue-600'
      case 'new_member':
        return 'bg-green-100 text-green-600'
      case 'invite':
        return 'bg-yellow-100 text-yellow-600'
      case 'join_request':
        return 'bg-purple-100 text-purple-600'
      case 'position_change':
        return 'bg-orange-100 text-orange-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div 
      className="rounded-xl shadow-lg p-6 border border-theme"
      style={{
        background: 'rgba(255, 255, 255, 0.6)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      }}
    >
      <h2 className="text-2xl font-bold mb-4 text-[var(--theme-primary-dark)]">{t('title')}</h2>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <Link
            key={idx}
            href={`/groups/${activity.groupId}`}
            className="flex items-start gap-3 p-3 rounded-lg transition-all hover:shadow-sm"
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              backdropFilter: 'blur(8px) saturate(180%)',
              WebkitBackdropFilter: 'blur(8px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(
                activity.type
              )}`}
            >
              <FontAwesomeIcon icon={getActivityIcon(activity.type)} className="text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {(() => {
                  // Translate activity messages based on type
                  switch (activity.type) {
                    case 'chart_update':
                      return t('messages.chartUpdate', { groupName: activity.groupName })
                    case 'new_member':
                      return t('messages.newMember', { 
                        userName: activity.metadata?.userName || 'Someone',
                        groupName: activity.groupName 
                      })
                    case 'invite':
                      return t('messages.invite', { groupName: activity.groupName })
                    case 'join_request':
                      return t('messages.joinRequest', { 
                        userName: activity.metadata?.userName || 'Someone',
                        groupName: activity.groupName 
                      })
                    default:
                      return activity.message // Fallback to original message
                  }
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatRelativeTime(new Date(activity.timestamp))}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

