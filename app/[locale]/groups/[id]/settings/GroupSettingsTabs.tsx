'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

type TabId = 'regenerate' | 'chart-creation' | 'group-details' | 'styling' | 'shoutbox' | 'delete'

interface GroupSettingsTabsProps {
  regenerateChartsContent: React.ReactNode
  chartCreationContent: React.ReactNode
  groupDetailsContent: React.ReactNode
  stylingContent: React.ReactNode
  shoutboxContent: React.ReactNode
  deleteGroupContent: React.ReactNode
}

export default function GroupSettingsTabs({
  regenerateChartsContent,
  chartCreationContent,
  groupDetailsContent,
  stylingContent,
  shoutboxContent,
  deleteGroupContent,
}: GroupSettingsTabsProps) {
  const t = useSafeTranslations('groups.settings.tabs')
  const searchParams = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as TabId | null
  
  // Validate tab from URL, default to 'group-details' if invalid
  const validTabs: TabId[] = ['regenerate', 'chart-creation', 'group-details', 'styling', 'shoutbox', 'delete']
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'group-details'
  
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Update active tab when URL changes
  useEffect(() => {
    const validTabs: TabId[] = ['regenerate', 'chart-creation', 'group-details', 'styling', 'shoutbox', 'delete']
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const tabs = [
    { id: 'group-details' as TabId, label: t('groupDetails') },
    { id: 'chart-creation' as TabId, label: t('charts') },
    { id: 'styling' as TabId, label: t('styling') },
    { id: 'shoutbox' as TabId, label: t('shoutbox') },
    { id: 'regenerate' as TabId, label: t('regenerateCharts') },
    { id: 'delete' as TabId, label: t('deleteGroup') },
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case 'regenerate':
        return regenerateChartsContent
      case 'chart-creation':
        return chartCreationContent
      case 'group-details':
        return groupDetailsContent
      case 'styling':
        return stylingContent
      case 'shoutbox':
        return shoutboxContent
      case 'delete':
        return deleteGroupContent
      default:
        return null
    }
  }

  return (
    <div className="flex gap-8">
      {/* Left sidebar with tabs */}
      <div className="w-64 flex-shrink-0">
        <nav 
          className="space-y-2 p-2 rounded-lg"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id
            const isDelete = tab.id === 'delete'
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-lg transition-all duration-200
                  ${isSelected ? 'font-semibold shadow-lg' : 'hover:shadow-md'}
                `}
                style={{
                  background: isSelected
                    ? isDelete
                      ? 'rgba(239, 68, 68, 0.8)'
                      : 'var(--theme-primary)'
                    : 'rgba(255, 255, 255, 0.4)',
                  color: isSelected
                    ? isDelete
                      ? 'white'
                      : 'var(--theme-button-text)'
                    : isDelete
                    ? 'rgb(220 38 38)'
                    : 'var(--theme-text)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  backdropFilter: 'blur(8px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                  boxShadow: isSelected
                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    : '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.filter = 'brightness(1.1)'
                    e.currentTarget.style.transform = 'scale(1.02)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.filter = ''
                    e.currentTarget.style.transform = ''
                  }
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {getTabContent()}
      </div>
    </div>
  )
}

