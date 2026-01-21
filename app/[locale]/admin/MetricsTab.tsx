'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUsers,
  faUserGroup,
  faChartLine,
  faUserCheck,
  faUserClock,
  faStar,
  faComments,
  faImage,
  faLock,
  faUnlock,
  faPalette,
  faTrendingUp,
  faTrophy,
  faHeart,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'

interface Metrics {
  totalGroups: number
  groupsWithRecentActivity: number
  totalUsers: number
  usersCreatedLast7Days: number
  usersCreatedLast30Days: number
  usersWithRecentAccess7Days: number
  usersWithRecentAccess30Days: number
  usersWithQuickAccess: number
  activeGroups: number
  totalChartEntries: number
  groupsWithTrends: number
  avgGroupSize: number
  totalComments: number
  usersWithEmailVerified: number
  groupsWithDynamicIcons: number
  privateGroups: number
  publicGroups: number
  groupsWithRecentChartGeneration: number
  totalFriendships: number
  groupsWithWeeklyStats: number
  totalArtistImages: number
  groupsWithRecords: number
  engagementRate: string
  activeUserRate7Days: string
  activeUserRate30Days: string
  groupsActivityRate: string
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: any
}

function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon
              icon={icon}
              className="text-lg text-gray-600"
            />
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs mt-1 text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

export default function MetricsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/metrics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      
      const data = await response.json()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <FontAwesomeIcon icon={faSpinner} className="text-4xl text-theme animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 bg-theme text-white rounded-lg hover:bg-theme/90 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Metrics</h2>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="px-4 py-2 bg-theme text-white rounded-lg hover:bg-theme/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FontAwesomeIcon
            icon={faSpinner}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Core Metrics Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Core Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Total Groups"
            value={metrics.totalGroups.toLocaleString()}
            icon={faUserGroup}
          />
          <MetricCard
            title="Groups with Recent Activity"
            value={metrics.groupsWithRecentActivity.toLocaleString()}
            subtitle={`${metrics.groupsActivityRate}% of all groups (last 7 days)`}
            icon={faChartLine}
          />
          <MetricCard
            title="Total Users"
            value={metrics.totalUsers.toLocaleString()}
            icon={faUsers}
          />
          <MetricCard
            title="Users Created (7 days)"
            value={metrics.usersCreatedLast7Days.toLocaleString()}
            icon={faUserCheck}
          />
          <MetricCard
            title="Users Created (30 days)"
            value={metrics.usersCreatedLast30Days.toLocaleString()}
            icon={faUserCheck}
          />
          <MetricCard
            title="Users with Recent Access (7 days)"
            value={metrics.usersWithRecentAccess7Days.toLocaleString()}
            subtitle={`${metrics.activeUserRate7Days}% active`}
            icon={faUserClock}
          />
          <MetricCard
            title="Users with Recent Access (30 days)"
            value={metrics.usersWithRecentAccess30Days.toLocaleString()}
            subtitle={`${metrics.activeUserRate30Days}% active`}
            icon={faUserClock}
          />
          <MetricCard
            title="Users with Quick Access Group"
            value={metrics.usersWithQuickAccess.toLocaleString()}
            subtitle={`${metrics.engagementRate}% engagement rate`}
            icon={faStar}
          />
        </div>
      </div>

      {/* Engagement & Activity Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Engagement & Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Active Groups"
            value={metrics.activeGroups.toLocaleString()}
            subtitle="Groups with members"
            icon={faUserGroup}
          />
          <MetricCard
            title="Total Chart Entries"
            value={metrics.totalChartEntries.toLocaleString()}
            icon={faChartLine}
          />
          <MetricCard
            title="Groups with Trends"
            value={metrics.groupsWithTrends.toLocaleString()}
            icon={faTrendingUp}
          />
          <MetricCard
            title="Total Comments"
            value={metrics.totalComments.toLocaleString()}
            icon={faComments}
          />
          <MetricCard
            title="Total Friendships"
            value={metrics.totalFriendships.toLocaleString()}
            icon={faHeart}
          />
          <MetricCard
            title="Groups with Records"
            value={metrics.groupsWithRecords.toLocaleString()}
            icon={faTrophy}
          />
        </div>
      </div>

      {/* Platform Health Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Platform Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Average Group Size"
            value={metrics.avgGroupSize.toFixed(1)}
            subtitle="Members per group"
            icon={faUsers}
          />
          <MetricCard
            title="Email Verified Users"
            value={metrics.usersWithEmailVerified.toLocaleString()}
            subtitle={`${((metrics.usersWithEmailVerified / metrics.totalUsers) * 100).toFixed(1)}% verification rate`}
            icon={faUserCheck}
          />
          <MetricCard
            title="Groups with Dynamic Icons"
            value={metrics.groupsWithDynamicIcons.toLocaleString()}
            icon={faPalette}
          />
          <MetricCard
            title="Private Groups"
            value={metrics.privateGroups.toLocaleString()}
            icon={faLock}
          />
          <MetricCard
            title="Public Groups"
            value={metrics.publicGroups.toLocaleString()}
            icon={faUnlock}
          />
          <MetricCard
            title="Groups with Weekly Stats"
            value={metrics.groupsWithWeeklyStats.toLocaleString()}
            icon={faChartLine}
          />
        </div>
      </div>

      {/* Content & Features Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Content & Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            title="Artist Images Uploaded"
            value={metrics.totalArtistImages.toLocaleString()}
            icon={faImage}
          />
          <MetricCard
            title="Recent Chart Generations"
            value={metrics.groupsWithRecentChartGeneration.toLocaleString()}
            subtitle="Last 7 days"
            icon={faChartLine}
          />
        </div>
      </div>
    </div>
  )
}
