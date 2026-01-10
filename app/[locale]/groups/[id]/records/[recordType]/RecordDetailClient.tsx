'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMicrophone, faMusic, faCompactDisc, faSpinner } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { Link } from '@/i18n/routing'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { ChartType } from '@/lib/chart-slugs'
import { getRecordTypeDisplayName, isArtistSpecificRecordType } from '@/lib/group-records'

interface RankedEntry {
  rank: number
  entryKey: string
  name: string
  artist: string | null
  slug: string
  value: number
}

interface RecordDetailClientProps {
  groupId: string
  recordType: string
}

export default function RecordDetailClient({ groupId, recordType }: RecordDetailClientProps) {
  const t = useSafeTranslations('records.detail')
  const tTabs = useSafeTranslations('records.tabs')
  
  const isArtistSpecific = isArtistSpecificRecordType(recordType)
  
  // Get tab from hash fragment (e.g., #artists) - only for non-artist-specific records
  const getTabFromHash = (): ChartType | null => {
    if (typeof window === 'undefined' || isArtistSpecific) return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: ChartType[] = ['artists', 'tracks', 'albums']
    return validTabs.includes(hash as ChartType) ? (hash as ChartType) : null
  }
  
  const defaultTab: ChartType = 'artists'
  const [activeTab, setActiveTab] = useState<ChartType>(defaultTab)
  const [entries, setEntries] = useState<RankedEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tabs: TabItem[] = isArtistSpecific ? [] : [
    { id: 'artists', label: tTabs('artists'), icon: faMicrophone },
    { id: 'tracks', label: tTabs('tracks'), icon: faMusic },
    { id: 'albums', label: tTabs('albums'), icon: faCompactDisc },
  ]

  // Initialize tab from hash on mount - only for non-artist-specific records
  useEffect(() => {
    if (isArtistSpecific) return
    const tabFromHash = getTabFromHash()
    if (tabFromHash) {
      setActiveTab(tabFromHash)
    }
  }, [isArtistSpecific]) // Only run on mount or when isArtistSpecific changes

  // Handle hash changes from external sources (browser back/forward, direct links) - only for non-artist-specific records
  useEffect(() => {
    if (isArtistSpecific) return
    
    const handleHashChange = () => {
      const tabFromHash = getTabFromHash()
      if (tabFromHash && tabFromHash !== activeTab) {
        setActiveTab(tabFromHash)
      } else if (!tabFromHash && activeTab !== defaultTab) {
        // If hash is cleared, restore default tab
        setActiveTab(defaultTab)
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [activeTab, isArtistSpecific])

  // Update hash when tab changes (but only if hash doesn't already match) - only for non-artist-specific records
  const handleTabChange = (tabId: string) => {
    if (isArtistSpecific) return
    
    const newTab = tabId as ChartType
    setActiveTab(newTab)
    
    // Update hash without triggering hashchange event
    if (typeof window !== 'undefined') {
      const newHash = `#${newTab}`
      if (window.location.hash !== newHash) {
        // Use replaceState to avoid adding to history
        window.history.replaceState(null, '', `${window.location.pathname}${newHash}`)
      }
    }
  }

  useEffect(() => {
    const fetchEntries = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        // For artist-specific records, don't include type parameter (API always returns artists)
        const url = isArtistSpecific
          ? `/api/groups/${groupId}/records/${recordType}`
          : `/api/groups/${groupId}/records/${recordType}?type=${activeTab}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Failed to fetch entries')
        }
        
        const data = await response.json()
        // Filter out entries with value 0
        const filteredEntries = (data.entries || []).filter((entry: RankedEntry) => entry.value > 0)
        setEntries(filteredEntries)
      } catch (err) {
        console.error('Error fetching entries:', err)
        setError(t('error'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntries()
  }, [groupId, recordType, activeTab, t, isArtistSpecific])

  const getEntryLink = (entry: RankedEntry) => {
    // Artist-specific records always link to artist pages
    const chartTypePath = isArtistSpecific ? 'artist' : (activeTab === 'artists' ? 'artist' : activeTab === 'tracks' ? 'track' : 'album')
    return `/groups/${groupId}/charts/${chartTypePath}/${entry.slug}`
  }

  const formatValue = (value: number) => {
    // For numeric values, add commas
    if (typeof value === 'number') {
      return value.toLocaleString()
    }
    return value
  }

  const displayName = getRecordTypeDisplayName(recordType)

  return (
    <div className="mt-6 md:mt-8">
      {/* Big colorful title */}
      <div className="mb-6 md:mb-8 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--theme-primary)] mb-2 md:mb-3">
          {displayName}
        </h1>
      </div>

      {/* Centered tabs - only show for non-artist-specific records */}
      {!isArtistSpecific && tabs.length > 0 && (
        <div className="flex justify-center mb-6 md:mb-8">
          <LiquidGlassTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl md:text-4xl text-[var(--theme-primary)]" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 text-center">
          <p className="text-red-700 text-sm md:text-base">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 md:p-12 text-center border border-theme">
          <p className="text-gray-600 text-sm md:text-base">{t('noEntries')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <table className="w-full bg-white">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-32 bg-gray-50">
                      {t('rank')}
                    </th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50">
                      {t('entry')}
                    </th>
                    <th className="px-2 md:px-6 py-3 md:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-32 bg-gray-50">
                      {t('value')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {entries.map((entry) => (
                    <tr key={entry.entryKey} className="hover:bg-gray-50 transition-colors bg-white">
                      <td className="px-2 md:px-6 py-3 md:py-5 text-sm bg-white">
                        <span className="font-bold text-gray-900">#{entry.rank}</span>
                      </td>
                      <td className="px-2 md:px-6 py-3 md:py-5 text-sm bg-white">
                        <div>
                          <Link
                            href={getEntryLink(entry)}
                            className="font-medium text-gray-900 hover:text-[var(--theme-primary-dark)] transition-colors"
                          >
                            {entry.name}
                          </Link>
                          {entry.artist && (
                            <div className="text-gray-500 text-xs mt-1">by {entry.artist}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-3 md:py-5 text-sm text-right bg-white">
                        <span className="text-gray-900 font-medium">{formatValue(entry.value)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

