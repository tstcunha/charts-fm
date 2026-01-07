'use client'

import { useState, useMemo } from 'react'
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
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)

  const tabs: TabItem[] = useMemo(() => [
    { id: 'trends', label: t('trends'), icon: faFire },
    { id: 'charts', label: t('weeklyCharts'), icon: faChartBar },
    { id: 'alltime', label: t('allTimeStats'), icon: faTrophy },
    { id: 'members', label: t('members'), icon: faUsers, badge: pendingRequestsCount },
    { id: 'search', label: t('search'), icon: faSearch },
  ], [t, pendingRequestsCount])

  return (
    <div className="mt-10">
      {/* Tab Navigation */}
      <div className="mb-6 flex justify-center">
        <LiquidGlassTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as Tab)}
        />
      </div>

      {/* Tab Content - All tabs load asynchronously on page load, hidden until active */}
      <div className="bg-white/60 backdrop-blur-md rounded-xl p-6 border border-theme shadow-sm">
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

