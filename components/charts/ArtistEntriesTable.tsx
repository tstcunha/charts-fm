'use client'

import { useState } from 'react'
import { ArtistChartEntry } from '@/lib/chart-deep-dive'
import LiquidGlassTabs from '@/components/LiquidGlassTabs'
import Link from 'next/link'

interface ArtistEntriesTableProps {
  tracks: ArtistChartEntry[]
  albums: ArtistChartEntry[]
  groupId: string
}

export default function ArtistEntriesTable({ tracks, albums, groupId }: ArtistEntriesTableProps) {
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks')

  const tabs = [
    { id: 'tracks', label: 'Tracks', count: tracks.length },
    { id: 'albums', label: 'Albums', count: albums.length },
  ]

  const currentEntries = activeTab === 'tracks' ? tracks : albums

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-xl p-6 border border-white/30">
      <h2 className="text-xl font-bold text-gray-900 mb-4">This Artist's Chart Entries</h2>
      
      <div className="mb-6">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'tracks' | 'albums')}
        />
      </div>

      {currentEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No {activeTab} by this artist have charted yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Peak
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Weeks at Peak
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Weeks on Chart
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {currentEntries.map((entry) => {
                const href = `/groups/${groupId}/charts/${entry.chartType.slice(0, -1)}/${entry.slug}`
                return (
                  <tr key={entry.entryKey} className="hover:bg-white/20 transition-colors">
                    <td className="py-3 px-4 text-sm font-bold text-gray-900">
                      #{entry.peakPosition}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {entry.weeksAtPeak}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <Link
                        href={href}
                        className="font-medium text-gray-900 hover:text-[var(--theme-primary-dark)] transition-colors"
                      >
                        {entry.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {entry.totalWeeksCharting}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

