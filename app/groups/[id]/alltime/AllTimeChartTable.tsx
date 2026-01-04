'use client'

import { EnrichedChartItem } from '@/lib/group-chart-metrics'

interface AllTimeChartTableProps {
  items: EnrichedChartItem[]
  chartType: 'artists' | 'tracks' | 'albums'
}

export default function AllTimeChartTable({ items, chartType }: AllTimeChartTableProps) {
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
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.position} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-5 text-sm">
                <span className="font-bold text-gray-900">{item.position}</span>
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

