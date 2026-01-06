'use client'

import { useEffect, useMemo, memo, useCallback } from 'react'
import Link from 'next/link'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import { useNavigation } from '@/contexts/NavigationContext'
import { generateSlug } from '@/lib/chart-slugs'

interface ChartTableProps {
  items: EnrichedChartItem[]
  chartType: 'artists' | 'tracks' | 'albums'
  groupId: string
}

export default function ChartTable({ items, chartType, groupId }: ChartTableProps) {
  const { stopPulse } = useNavigation()

  useEffect(() => {
    if (items.length > 0) {
      stopPulse()
    }
  }, [items, stopPulse])

  // Get the route type (singular form: artist, track, album)
  const routeType = useMemo(() => 
    chartType === 'artists' ? 'artist' : chartType === 'tracks' ? 'track' : 'album',
    [chartType]
  )
  
  // Generate slug if not present (for backward compatibility)
  const getSlug = useCallback((item: EnrichedChartItem): string => {
    if (item.slug) return item.slug
    // Fallback: generate slug from entryKey
    return generateSlug(item.entryKey, chartType)
  }, [chartType])

  const formatPositionChange = useCallback((change: number | null, entryType?: string | null): string => {
    if (change === null) {
      if (entryType === 'new') return 'NEW'
      if (entryType === 're-entry') return 'RE'
      return 'NEW' // fallback for legacy data
    }
    if (change === 0) return ''
    if (change < 0) return `(↑${Math.abs(change)})`
    return `(↓${change})`
  }, [])

  const formatPlaysChange = useCallback((change: number | null): string => {
    if (change === null) return ''
    if (change === 0) return ''
    if (change > 0) return `(↑${change})`
    return `(↓${Math.abs(change)})`
  }, [])

  const formatVSChange = useCallback((change: number | null): string => {
    if (change === null) return ''
    if (change === 0) return ''
    if (change > 0) return `(↑${change.toFixed(2)})`
    return `(↓${Math.abs(change).toFixed(2)})`
  }, [])

  const getPositionChangeColor = useCallback((change: number | null, entryType?: string | null): string => {
    if (change === null) {
      if (entryType === 're-entry') return 'text-blue-400 font-semibold'
      return 'text-blue-600 font-semibold'
    }
    if (change < 0) return 'text-green-600'
    if (change > 0) return 'text-red-600'
    return 'text-gray-600'
  }, [])

  const getPlaysChangeColor = useCallback((change: number | null): string => {
    if (change === null) return 'text-gray-500'
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }, [])

  const getVSChangeColor = useCallback((change: number | null): string => {
    if (change === null) return 'text-gray-500'
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }, [])

  // Memoized table row component
  const TableRow = memo(({ item }: { item: EnrichedChartItem }) => (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-5 text-sm">
        <span className="font-bold text-gray-900">{item.position}</span>
        {(item.positionChange !== null && item.positionChange !== 0) || item.positionChange === null ? (
          <span className={`ml-2 ${getPositionChangeColor(item.positionChange, item.entryType)}`}>
            {formatPositionChange(item.positionChange, item.entryType)}
          </span>
        ) : null}
      </td>
      <td className="px-6 py-5 text-sm">
        <div>
          <Link
            href={`/groups/${groupId}/charts/${routeType}/${encodeURIComponent(getSlug(item))}`}
            className="font-medium text-gray-900 hover:text-[var(--theme-primary-dark)] transition-colors"
          >
            {item.name}
          </Link>
          {item.artist && (
            <div className="text-gray-500 text-xs mt-1">by {item.artist}</div>
          )}
        </div>
      </td>
      <td className="px-6 py-5 text-sm text-right">
        <span className="text-gray-900 font-medium">{item.playcount}</span>
        {item.playsChange !== null && item.playsChange !== 0 && (
          <span className={`ml-2 ${getPlaysChangeColor(item.playsChange)}`}>
            {formatPlaysChange(item.playsChange)}
          </span>
        )}
      </td>
      <td className="px-6 py-5 text-sm text-right">
        {item.vibeScore !== null && item.vibeScore !== undefined ? (
          <>
            <span className="text-gray-900 font-medium">{item.vibeScore.toFixed(2)}</span>
            {item.vibeScoreChange !== null && item.vibeScoreChange !== 0 && (
              <span className={`ml-2 ${getVSChangeColor(item.vibeScoreChange)}`}>
                {formatVSChange(item.vibeScoreChange)}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-5 text-sm text-center text-gray-600">
        {item.totalWeeksAppeared}
      </td>
      <td className="px-6 py-5 text-sm text-center text-gray-600">
        #{item.highestPosition}
      </td>
    </tr>
  ))
  TableRow.displayName = 'TableRow'

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
              #
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              {chartType === 'artists' ? 'Artist' : chartType === 'tracks' ? 'Track' : 'Album'}
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
              Plays
            </th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
              VS
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
              Weeks on Chart
            </th>
            <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
              Peak Position
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <TableRow key={item.position} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

