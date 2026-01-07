'use client'

import { useState } from 'react'

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
  const [activeTab, setActiveTab] = useState<TabId>('regenerate')

  const tabs = [
    { id: 'regenerate' as TabId, label: 'Regenerate Charts' },
    { id: 'chart-creation' as TabId, label: 'Chart Creation' },
    { id: 'group-details' as TabId, label: 'Group Details' },
    { id: 'styling' as TabId, label: 'Styling' },
    { id: 'shoutbox' as TabId, label: 'Shoutbox' },
    { id: 'delete' as TabId, label: 'Delete Group' },
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
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? tab.id === 'delete'
                    ? 'bg-red-500 text-white font-semibold'
                    : 'bg-yellow-500 text-black font-semibold'
                  : tab.id === 'delete'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {getTabContent()}
      </div>
    </div>
  )
}

