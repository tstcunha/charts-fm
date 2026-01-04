'use client'

import { useState } from 'react'

type Tab = 'charts' | 'members'

interface GroupTabsProps {
  defaultTab?: Tab
  membersContent: React.ReactNode
  chartsContent: React.ReactNode
}

export default function GroupTabs({ 
  defaultTab = 'charts', 
  membersContent, 
  chartsContent 
}: GroupTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('charts')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'charts'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Weekly Charts
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${
                activeTab === 'members'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Members
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'charts' && chartsContent}
        {activeTab === 'members' && membersContent}
      </div>
    </div>
  )
}

