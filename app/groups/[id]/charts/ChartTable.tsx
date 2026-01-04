'use client'

import { useEffect } from 'react'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import { useNavigation } from '@/contexts/NavigationContext'

interface ChartTableProps {
  items: EnrichedChartItem[]
  chartType: 'artists' | 'tracks' | 'albums'
}

export default function ChartTable({ items, chartType }: ChartTableProps) {
  const { stopPulse } = useNavigation()

  // Stop pulse when table data changes (new items loaded)
  useEffect(() => {
    if (items.length > 0) {
      stopPulse()
    }
  }, [items, stopPulse])
  const formatPositionChange = (change: number | null): string => {
    if (change === null) return 'NEW'
    if (change === 0) return ''
    if (change < 0) return `(↑${Math.abs(change)})`
    return `(↓${change})`
  }

  const formatPlaysChange = (change: number | null): string => {
    if (change === null) return ''
    if (change === 0) return ''
    if (change > 0) return `(↑${change})`
    return `(↓${Math.abs(change)})`
  }

  const getPositionChangeColor = (change: number | null): string => {
    if (change === null) return 'text-blue-600 font-semibold'
    if (change < 0) return 'text-green-600'
    if (change > 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getPlaysChangeColor = (change: number | null): string => {
    if (change === null) return 'text-gray-500'
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

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
            <tr key={item.position} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 text-sm">
                <span className="font-bold text-gray-900">{item.position}</span>
                {item.positionChange !== null && item.positionChange !== 0 && (
                  <span className={`ml-2 ${getPositionChangeColor(item.positionChange)}`}>
                    {formatPositionChange(item.positionChange)}
                  </span>
                )}
                {item.positionChange === null && (
                  <span className={`ml-2 ${getPositionChangeColor(item.positionChange)}`}>
                    {formatPositionChange(item.positionChange)}
                  </span>
                )}
              </td>
              <td className="px-6 py-5 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{item.name}</div>
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
              <td className="px-6 py-5 text-sm text-center text-gray-600">
                {item.totalWeeksAppeared}
              </td>
              <td className="px-6 py-5 text-sm text-center text-gray-600">
                #{item.highestPosition}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

