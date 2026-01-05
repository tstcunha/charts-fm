'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartBar, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons'

type Tab = 'charts' | 'members' | 'alltime'

interface GroupTabsProps {
  defaultTab?: Tab
  membersContent: React.ReactNode
  chartsContent: React.ReactNode
  allTimeContent: React.ReactNode
  pendingRequestsCount?: number
}

export default function GroupTabs({ 
  defaultTab = 'charts', 
  membersContent, 
  chartsContent,
  allTimeContent,
  pendingRequestsCount = 0
}: GroupTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab)

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b-2 mb-6" style={{ borderBottomColor: 'var(--theme-primary-dark)' }}>
        <nav className="flex space-x-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('charts')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'charts'
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary-dark)] bg-[var(--theme-primary-lighter)]/30 shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-[var(--theme-text)] hover:bg-[var(--theme-primary-lighter)]/50'
              }
            `}
          >
            <FontAwesomeIcon icon={faChartBar} className="text-lg" />
            Weekly Charts
          </button>
          <button
            onClick={() => setActiveTab('alltime')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'alltime'
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary-dark)] bg-[var(--theme-primary-lighter)]/30 shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-[var(--theme-text)] hover:bg-[var(--theme-primary-lighter)]/50'
              }
            `}
          >
            <FontAwesomeIcon icon={faTrophy} className="text-lg" />
            All-Time Stats
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`
              py-4 px-6 border-b-2 font-semibold text-sm transition-all rounded-t-lg
              flex items-center gap-2
              ${
                activeTab === 'members'
                  ? 'border-[var(--theme-primary)] text-[var(--theme-primary-dark)] bg-[var(--theme-primary-lighter)]/30 shadow-sm'
                  : 'border-transparent text-gray-600 hover:text-[var(--theme-text)] hover:bg-[var(--theme-primary-lighter)]/50'
              }
            `}
          >
            <FontAwesomeIcon icon={faUsers} className="text-lg" />
            Members
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        <div style={{ display: activeTab === 'charts' ? 'block' : 'none' }}>
          {chartsContent}
        </div>
        <div style={{ display: activeTab === 'alltime' ? 'block' : 'none' }}>
          {allTimeContent}
        </div>
        <div style={{ display: activeTab === 'members' ? 'block' : 'none' }}>
          {membersContent}
        </div>
      </div>
    </div>
  )
}

