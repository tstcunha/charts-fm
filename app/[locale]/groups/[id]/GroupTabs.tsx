'use client'

import { useState, useMemo, useEffect } from 'react'
import { faChartBar, faTrophy, faUsers, faFire, faSearch } from '@fortawesome/free-solid-svg-icons'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

type Tab = 'charts' | 'members' | 'alltime' | 'trends' | 'search'

interface GroupTabsProps {
  defaultTab?: Tab
  membersContent: React.ReactNode
  chartsContent: React.ReactNode
  allTimeContent: React.ReactNode
  trendsContent?: React.ReactNode
  searchContent?: React.ReactNode
  pendingRequestsCount?: number
}

export default function GroupTabs({ 
  defaultTab = 'trends', 
  membersContent, 
  chartsContent,
  allTimeContent,
  trendsContent,
  searchContent,
  pendingRequestsCount = 0
}: GroupTabsProps) {
  const t = useSafeTranslations('groups.tabs')
  
  // Get tab from hash fragment (e.g., #charts)
  const getTabFromHash = (): Tab | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: Tab[] = ['charts', 'members', 'alltime', 'trends', 'search']
    return validTabs.includes(hash as Tab) ? (hash as Tab) : null
  }
  
  // Initialize with defaultTab, then check hash on mount
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)
  
  // Check hash fragment on mount and when hash changes
  useEffect(() => {
    const tabFromHash = getTabFromHash()
    if (tabFromHash) {
      setActiveTab(tabFromHash)
    }
    
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
  }, [activeTab, defaultTab])
  
  // Update hash when tab changes (no page refresh, preserves scroll position)
  const handleTabChange = (tabId: string) => {
    const tab = tabId as Tab
    setActiveTab(tab)
    // Update hash without causing page refresh or scroll
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
  }

  const tabs: TabItem[] = useMemo(() => [
    { id: 'trends', label: t('trends'), icon: faFire },
    { id: 'charts', label: t('weeklyCharts'), icon: faChartBar },
    { id: 'alltime', label: t('allTimeStats'), icon: faTrophy },
    { id: 'members', label: t('members'), icon: faUsers, badge: pendingRequestsCount },
    { id: 'search', label: t('search'), icon: faSearch },
  ], [t, pendingRequestsCount])

  return (
    <div className="mt-6 md:mt-10">
      {/* Tab Navigation */}
      <div className="mb-4 md:mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Tab Content - All tabs load asynchronously on page load, hidden until active */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 md:p-6 border border-theme shadow-sm">
        <div style={{ display: activeTab === 'charts' ? 'block' : 'none' }}>
          {chartsContent}
        </div>
        <div style={{ display: activeTab === 'alltime' ? 'block' : 'none' }}>
          {allTimeContent}
        </div>
        <div style={{ display: activeTab === 'trends' ? 'block' : 'none' }}>
          {trendsContent}
        </div>
        <div style={{ display: activeTab === 'members' ? 'block' : 'none' }}>
          {membersContent}
        </div>
        <div style={{ display: activeTab === 'search' ? 'block' : 'none' }}>
          {searchContent}
        </div>
      </div>
    </div>
  )
}

