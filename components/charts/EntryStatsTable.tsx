'use client'

import { memo, useMemo } from 'react'
import { EntryStats } from '@/lib/chart-deep-dive'
import { formatWeekLabel } from '@/lib/weekly-utils'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface EntryStatsTableProps {
  stats: EntryStats
}

function EntryStatsTable({ stats }: EntryStatsTableProps) {
  const t = useSafeTranslations('deepDive.entryStats')
  const formatDaysAgo = (date: Date | null): string => {
    if (!date) return t('never')
    
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return t('today')
    if (diffDays === 1) return t('dayAgo')
    return t('daysAgo', { count: diffDays })
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return t('notAvailable')
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
            {' '}({weeksAgo === 1 ? t('weeksAgo', { count: weeksAgo }) : t('weeksAgoPlural', { count: weeksAgo })})
          </span>
        )}
      </>
    )
  }

  const formatStreakDates = (startDate: Date | null, endDate: Date | null): string | null => {
    if (!startDate || !endDate) return null
    
    // Format start as week label (e.g., "Jan 16, 2025")
    const startFormatted = formatWeekLabel(startDate)
    
    // End date should represent the end of the last week (start of next week)
    const endOfLastWeek = new Date(endDate)
    endOfLastWeek.setUTCDate(endOfLastWeek.getUTCDate() + 7)
    const endFormatted = formatWeekLabel(endOfLastWeek)
    
    // If start and end are the same week, just show one date
    if (startDate.getTime() === endDate.getTime()) {
      return startFormatted
    }
    
    return `${startFormatted} - ${endFormatted}`
  }

  // Memoize table data to prevent recalculation on every render
  const tableData = useMemo(() => [
    {
      label: t('peakPosition'),
      value: `#${stats.peakPosition}${stats.weeksAtPeak > 1 ? ` (${stats.weeksAtPeak} ${stats.weeksAtPeak === 1 ? t('week') : t('weeks')})` : ''}`,
    },
    {
      label: t('debutPosition'),
      value: `#${stats.debutPosition}`,
    },
    {
      label: t('debutDate'),
      value: formatDebutDate(stats.debutDate),
    },
    {
      label: t('weeksInTop10'),
      value: stats.weeksInTop10.toString(),
    },
    {
      label: t('weeksCharting'),
      value: stats.totalWeeksCharting.toString(),
    },
    {
      label: t('longestStreak'),
      value: (
        <>
          {`${stats.longestStreak} ${stats.longestStreak !== 1 ? t('weeks') : t('week')}${stats.isStreakOngoing ? ' 🔥' : ''}`}
          {formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate) && (
            <span className="text-gray-500 font-normal">
              {' '}({formatStreakDates(stats.longestStreakStartDate, stats.longestStreakEndDate)})
            </span>
          )}
        </>
      ),
    },
    {
      label: t('latestAppearance'),
      value: stats.currentlyCharting ? t('currentlyCharting') : formatDaysAgo(stats.latestAppearance),
    },
  ], [stats, t])

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('title')}</h2>
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

export default memo(EntryStatsTable)

