'use client'

import { useState } from 'react'

type TabId = 'regenerate' | 'chart-creation' | 'group-details'

interface GroupSettingsTabsProps {
  regenerateChartsContent: React.ReactNode
  chartCreationContent: React.ReactNode
  groupDetailsContent: React.ReactNode
}

export default function GroupSettingsTabs({
  regenerateChartsContent,
  chartCreationContent,
  groupDetailsContent,
}: GroupSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('regenerate')

  const tabs = [
    { id: 'regenerate' as TabId, label: 'Regenerate Charts' },
    { id: 'chart-creation' as TabId, label: 'Chart Creation' },
    { id: 'group-details' as TabId, label: 'Group Details' },
  ]

  const getTabContent = () => {
    switch (activeTab) {
      case 'regenerate':
        return regenerateChartsContent
      case 'chart-creation':
        return chartCreationContent
      case 'group-details':
        return groupDetailsContent
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
                  ? 'bg-yellow-500 text-black font-semibold'
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

