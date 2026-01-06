'use client'

import { EntryStats } from '@/lib/chart-deep-dive'

interface EntryStatsTableProps {
  stats: EntryStats
}

export default function EntryStatsTable({ stats }: EntryStatsTableProps) {
  const formatDaysAgo = (date: Date | null): string => {
    if (!date) return 'Never'
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const calculateWeeksAgo = (date: Date | null): number | null => {
    if (!date) return null
    const now = new Date()
    const diffTime = now.getTime() - new Date(date).getTime()
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
    return diffWeeks
  }

  const formatDebutDate = (date: Date | null) => {
    const formattedDate = formatDate(date)
    const weeksAgo = calculateWeeksAgo(date)
    
    if (!date || weeksAgo === null) {
      return formattedDate
    }

    return (
      <>
        {formattedDate}
        {weeksAgo !== null && (
          <span className="text-gray-500 font-normal">
            {' '}({weeksAgo} {weeksAgo === 1 ? 'week' : 'weeks'} ago)
          </span>
        )}
      </>
    )
  }

  const formatStreakDates = (startDate: Date | null, endDate: Date | null): string | null => {
    if (!startDate || !endDate) return null
    
    const startFormatted = new Date(startDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const endFormatted = new Date(endDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    
    // If start and end are the same, just show one date
    if (startDate.getTime() === endDate.getTime()) {
      return startFormatted
    }
    
    return `${startFormatted} - ${endFormatted}`
  }

  const tableData = [
    {
      label: 'Peak Position',
      value: `#${stats.peakPosition}${stats.weeksAtPeak > 1 ? ` (${stats.weeksAtPeak} weeks)` : ''}`,
    },
    {
      label: 'Debut Position',
      value: `#${stats.debutPosition}`,
    },
    {
      label: 'Debut Date',
      value: formatDebutDate(stats.debutDate),
    },
    {
      label: 'Weeks in Top 10',
      value: stats.weeksInTop10.toString(),
    },
    {
      label: 'Weeks Charting',
      value: stats.totalWeeksCharting.toString(),
    },
    {
      label: 'Longest Streak',
      value: (
        <>
          {`${stats.longestStreak} week${stats.longestStreak !== 1 ? 's' : ''}${stats.isStreakOngoing ? ' 🔥' : ''}`}
          {formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate) && (
            <span className="text-gray-500 font-normal">
              {' '}({formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate)})
            </span>
          )}
        </>
      ),
    },
    {
      label: 'Latest Appearance',
      value: stats.currentlyCharting ? 'Currently charting' : formatDaysAgo(stats.latestAppearance),
    },
  ]

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-xl p-6 border border-white/30">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>
      <table className="w-full">
        <tbody className="divide-y divide-gray-200/50">
          {tableData.map((row, index) => (
            <tr key={index} className="hover:bg-white/20 transition-colors">
              <td className="py-3 px-4 text-sm font-medium text-gray-700 w-1/2">
                {row.label}
              </td>
              <td className="py-3 px-4 text-sm text-gray-900 font-semibold">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

