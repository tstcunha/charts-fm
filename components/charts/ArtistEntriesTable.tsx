'use client'

import { useState, memo } from 'react'
import { ArtistChartEntry } from '@/lib/chart-deep-dive'
import LiquidGlassTabs from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

interface ArtistEntriesTableProps {
  tracks: ArtistChartEntry[]
  albums: ArtistChartEntry[]
  groupId: string
}

const ArtistEntriesTable = memo(function ArtistEntriesTable({ tracks, albums, groupId }: ArtistEntriesTableProps) {
  const t = useSafeTranslations('deepDive.artistEntries')
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks')

  const tabs = [
    { id: 'tracks', label: t('tracks'), count: tracks.length },
    { id: 'albums', label: t('albums'), count: albums.length },
  ]

  const currentEntries = activeTab === 'tracks' ? tracks : albums

  // Calculate total #1 weeks for the current tab only (tracks or albums)
  // This prevents double-counting when tracks and albums share the same entryKey
  const totalNumberOneWeeks = currentEntries
    .filter((entry) => entry.peakPosition === 1)
    .reduce((sum, entry) => sum + entry.weeksAtPeak, 0)

  // Get row styling classes based on peak position
  const getRowStyles = (peakPosition: number) => {
    if (peakPosition === 1) {
      return 'bg-gradient-to-r from-yellow-50 to-yellow-100/50'
    }
    return ''
  }

  // Render peak position with ribbon for top 3, blue text for top 10
  const renderPeakPosition = (peakPosition: number) => {
    if (peakPosition === 1) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-yellow-500 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition === 2) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-gray-400 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition === 3) {
      return (
        <span className="relative inline-block" style={{ transform: 'rotate(-12deg)' }}>
          <span className="bg-amber-600 text-white px-2 py-1 rounded font-bold text-xs shadow-md">
            #{peakPosition}
          </span>
        </span>
      )
    } else if (peakPosition <= 10) {
      return <span className="text-blue-600 font-bold">#{peakPosition}</span>
    }
    return <span className="text-gray-900 font-bold">#{peakPosition}</span>
  }

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ contain: 'layout style paint' }}>
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t('title')}</h2>
      
      <div className="mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as 'tracks' | 'albums')}
        />
      </div>

      {currentEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          {activeTab === 'tracks' ? t('noTracks') : t('noAlbums')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="text-sm text-gray-600 mb-3 text-center">
            {t('total')} {currentEntries.length} {currentEntries.length === 1 ? t('entry') : t('entries')}
            <span className="mx-2">•</span>
            {t('numberOneWeeks')} {totalNumberOneWeeks}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('peak')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('weeksAtPeak')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('name')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {t('weeksOnChart')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {currentEntries.map((entry) => {
                const href = `/groups/${groupId}/charts/${entry.chartType.slice(0, -1)}/${entry.slug}`
                const rowStyles = getRowStyles(entry.peakPosition)
                return (
                  <tr 
                    key={entry.entryKey} 
                    className={`${rowStyles} hover:bg-white/20 transition-colors`}
                  >
                    <td className="py-3 px-4 text-sm">
                      {renderPeakPosition(entry.peakPosition)}
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
})

export default ArtistEntriesTable

