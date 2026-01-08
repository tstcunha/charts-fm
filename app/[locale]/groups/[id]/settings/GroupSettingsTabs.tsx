'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

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
  const [isExpanded, setIsExpanded] = useState(false)

  // Update active tab when URL changes
  useEffect(() => {
    const validTabs: TabId[] = ['regenerate', 'chart-creation', 'group-details', 'styling', 'shoutbox', 'delete']
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
      // Auto-expand if active tab is in collapsed section
      const collapsedTabIds: TabId[] = ['shoutbox', 'regenerate', 'delete']
      if (collapsedTabIds.includes(tabFromUrl)) {
        setIsExpanded(true)
      }
    }
  }, [tabFromUrl])

  // Auto-expand when active tab changes to a collapsed tab
  useEffect(() => {
    const collapsedTabIds: TabId[] = ['shoutbox', 'regenerate', 'delete']
    if (collapsedTabIds.includes(activeTab)) {
      setIsExpanded(true)
    }
  }, [activeTab])

  const tabs = [
    { id: 'group-details' as TabId, label: t('groupDetails') },
    { id: 'chart-creation' as TabId, label: t('charts') },
    { id: 'styling' as TabId, label: t('styling') },
    { id: 'shoutbox' as TabId, label: t('shoutbox') },
    { id: 'regenerate' as TabId, label: t('regenerateCharts') },
    { id: 'delete' as TabId, label: t('deleteGroup') },
  ]

  // Split tabs into visible (first 3) and collapsed (rest)
  const visibleTabs = tabs.slice(0, 3)
  const collapsedTabs = tabs.slice(3)

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

  const renderTabButton = (tab: { id: TabId; label: string }) => {
    const isSelected = activeTab === tab.id
    const isDelete = tab.id === 'delete'
    
    return (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all duration-200 text-sm md:text-base
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
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      {/* Left sidebar with tabs */}
      <div className="w-full md:w-64 flex-shrink-0">
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
          {/* Always visible tabs (first 3) */}
          {visibleTabs.map(renderTabButton)}
          
          {/* Collapsed tabs on mobile, always visible on desktop */}
          <div 
            className={`
              overflow-hidden transition-all duration-150 ease-in-out
              md:max-h-screen md:opacity-100 md:block
              ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
            `}
            style={{
              transition: 'max-height 0.15s ease-in-out, opacity 0.15s ease-in-out',
            }}
          >
            <div className="space-y-2">
              {collapsedTabs.map(renderTabButton)}
            </div>
          </div>
          
          {/* Toggle caret for mobile only */}
          {collapsedTabs.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="
                w-full flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 text-sm
                md:hidden
                hover:shadow-md
              "
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                color: 'var(--theme-text)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px) saturate(180%)',
                WebkitBackdropFilter: 'blur(8px) saturate(180%)',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.05)',
              }}
              aria-label={isExpanded ? t('showLess') : t('showMore', { count: collapsedTabs.length })}
            >
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className="transition-transform duration-150 ease-in-out"
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
          )}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {getTabContent()}
      </div>
    </div>
  )
}

