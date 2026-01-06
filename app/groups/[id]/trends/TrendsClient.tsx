'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faFire, 
  faSpinner, 
  faArrowUp, 
  faArrowDown, 
  faMusic, 
  faMicrophone, 
  faCompactDisc, 
  faTrophy,
  faUser,
  faChartLine,
  faUsers,
  faSkull,
  faLaughBeam,
  faQuestionCircle,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons'
import Tooltip from '@/components/Tooltip'
import { formatWeekDate } from '@/lib/weekly-utils'

type CategoryTab = 'members' | 'artists' | 'tracks' | 'albums'

interface TrendsClientProps {
  trends: any
  groupId: string
  userId: string
}

interface CategoryData {
  newEntries: any[]
  biggestClimbers: any[]
  biggestFallers: any[]
  exits: any[]
}

export default function TrendsClient({ trends, groupId, userId }: TrendsClientProps) {
  const [personalizedStats, setPersonalizedStats] = useState<any>(null)
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(true)
  const [activeTab, setActiveTab] = useState<CategoryTab>('members')
  const [longestStreaks, setLongestStreaks] = useState<any[]>([])
  const [comebacks, setComebacks] = useState<any[]>([])

  useEffect(() => {
    // Fetch personalized stats, longest streaks, and comebacks asynchronously
    fetch(`/api/groups/${groupId}/trends?includePersonal=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.personalizedStats) {
          setPersonalizedStats(data.personalizedStats)
        }
        if (data.longestStreaks) {
          setLongestStreaks(data.longestStreaks)
        }
        if (data.comebacks) {
          setComebacks(data.comebacks)
        }
        setIsLoadingPersonal(false)
      })
      .catch((err) => {
        console.error('Error fetching personalized stats:', err)
        setIsLoadingPersonal(false)
      })
  }, [groupId])

  // Organize data by category
  const organizeByCategory = (): Record<string, CategoryData> => {
    const allNewEntries = (trends.newEntries as any[]) || []
    const allBiggestClimbers = (trends.biggestClimbers as any[]) || []
    const allBiggestFallers = (trends.biggestFallers as any[]) || []
    const allExits = (trends.exits as any[]) || []

    const categories: Record<string, CategoryData> = {
      artists: {
        newEntries: allNewEntries.filter((e: any) => e.chartType === 'artists'),
        biggestClimbers: allBiggestClimbers.filter((e: any) => e.chartType === 'artists'),
        biggestFallers: allBiggestFallers.filter((e: any) => e.chartType === 'artists'),
        exits: allExits.filter((e: any) => e.chartType === 'artists'),
      },
      tracks: {
        newEntries: allNewEntries.filter((e: any) => e.chartType === 'tracks'),
        biggestClimbers: allBiggestClimbers.filter((e: any) => e.chartType === 'tracks'),
        biggestFallers: allBiggestFallers.filter((e: any) => e.chartType === 'tracks'),
        exits: allExits.filter((e: any) => e.chartType === 'tracks'),
      },
      albums: {
        newEntries: allNewEntries.filter((e: any) => e.chartType === 'albums'),
        biggestClimbers: allBiggestClimbers.filter((e: any) => e.chartType === 'albums'),
        biggestFallers: allBiggestFallers.filter((e: any) => e.chartType === 'albums'),
        exits: allExits.filter((e: any) => e.chartType === 'albums'),
      },
    }

    return categories
  }

  const categoryData = organizeByCategory()
  const funFacts = (trends.funFacts as string[]) || []
  const topContributors = (trends.topContributors as any[]) || []
  const memberSpotlight = trends.memberSpotlight as any

  const getChartTypeIcon = (chartType: string) => {
    switch (chartType) {
      case 'artists':
        return faMicrophone
      case 'tracks':
        return faMusic
      case 'albums':
        return faCompactDisc
      default:
        return faMusic
    }
  }

  const renderCategoryContent = (category: 'artists' | 'tracks' | 'albums') => {
    const data = categoryData[category]
    
    // Filter longest streaks and comebacks by category
    const categoryLongestStreaks = longestStreaks.filter((entry: any) => entry.chartType === category)
    const categoryComebacks = comebacks.filter((entry: any) => entry.chartType === category)

    // Build array of trend blocks to display - always show all cards
    const trendBlocks = []
    
    // Add Longest Streaks first (always show)
    trendBlocks.push({
      title: 'Longest Streaks',
      icon: faChartLine,
      iconColor: 'text-[var(--theme-primary)]',
      entries: categoryLongestStreaks,
      isLoading: isLoadingPersonal,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-lg text-[var(--theme-primary)]" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {entry.name}
              {entry.artist && (
                <span className="text-sm font-normal text-gray-600"> by {entry.artist}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              #{entry.position} • {entry.currentStreak} {entry.currentStreak === 1 ? 'week' : 'weeks'} streak
            </div>
          </div>
        </div>
      ),
    })
    
    // Add Comebacks second (always show)
    trendBlocks.push({
      title: 'Comebacks',
      icon: faTrophy,
      iconColor: 'text-[var(--theme-primary)]',
      entries: categoryComebacks,
      isLoading: isLoadingPersonal,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-lg text-[var(--theme-primary)]" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {entry.name}
              {entry.artist && (
                <span className="text-sm font-normal text-gray-600"> by {entry.artist}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              #{entry.position} • Returned after {entry.weeksAway} {entry.weeksAway === 1 ? 'week' : 'weeks'} away
            </div>
          </div>
        </div>
      ),
    })

    // Add New Entries (always show)
    trendBlocks.push({
      title: 'New Entries',
      icon: faFire,
      iconColor: '',
      entries: data.newEntries,
      renderEntry: (entry: any, idx: number) => {
        const isNumberOne = entry.position === 1
        return (
          <div
            key={idx}
            className={`relative flex items-center gap-3 p-3 rounded-lg transition-all border overflow-hidden ${
              isNumberOne
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 border-yellow-300'
                : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border-[var(--theme-border)]'
            }`}
          >
            {isNumberOne && (
              <div className="absolute top-2 right-0 bg-yellow-500 text-white text-xs font-bold px-8 py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap">
                #1 DEBUT
              </div>
            )}
            <FontAwesomeIcon 
              icon={getChartTypeIcon(entry.chartType)} 
              className={`text-lg ${isNumberOne ? 'text-yellow-600' : 'text-[var(--theme-primary)]'}`} 
            />
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${isNumberOne ? 'text-yellow-900' : 'text-gray-900'}`}>
                {entry.name}
                {entry.artist && (
                  <span className={`text-sm font-normal ${isNumberOne ? 'text-yellow-700' : 'text-gray-600'}`}> by {entry.artist}</span>
                )}
              </div>
              <div className={`text-sm ${isNumberOne ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>#{entry.position}</div>
            </div>
          </div>
        )
      },
    })

    // Add Biggest Climbers (always show)
    trendBlocks.push({
      title: 'Biggest Climbers',
      icon: faArrowUp,
      iconColor: 'text-green-600',
      entries: data.biggestClimbers,
      renderEntry: (entry: any, idx: number) => {
        const isPeakPosition = entry.highestPosition !== undefined && entry.position === entry.highestPosition
        return (
          <div
            key={idx}
            className={`relative flex items-center gap-3 p-3 rounded-lg transition-all border overflow-hidden ${
              isPeakPosition
                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-300'
                : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border-[var(--theme-border)]'
            }`}
          >
            {isPeakPosition && (
              <div className="absolute top-2 right-0 bg-blue-500 text-white text-xs font-bold px-8 py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap">
                PEAK POSITION
              </div>
            )}
            <FontAwesomeIcon 
              icon={getChartTypeIcon(entry.chartType)} 
              className={`text-lg ${isPeakPosition ? 'text-blue-600' : 'text-[var(--theme-primary)]'}`} 
            />
            <div className="flex-1 min-w-0">
              <div className={`font-semibold truncate ${isPeakPosition ? 'text-blue-900' : 'text-gray-900'}`}>
                {entry.name}
                {entry.artist && (
                  <span className={`text-sm font-normal ${isPeakPosition ? 'text-blue-700' : 'text-gray-600'}`}> by {entry.artist}</span>
                )}
              </div>
              <div className={`text-sm font-semibold ${isPeakPosition ? 'text-blue-700' : 'text-green-600'}`}>
                ↑ {Math.abs(entry.positionChange || 0)} positions
                {entry.oldPosition && entry.newPosition && (
                  <span className={`ml-1 ${isPeakPosition ? 'text-blue-600' : 'text-gray-500'}`}>({entry.oldPosition} → {entry.newPosition})</span>
                )}
              </div>
            </div>
          </div>
        )
      },
    })

    // Add Biggest Fallers (always show)
    trendBlocks.push({
      title: 'Biggest Fallers',
      icon: faArrowDown,
      iconColor: 'text-red-600',
      entries: data.biggestFallers,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-lg text-[var(--theme-primary)]" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {entry.name}
              {entry.artist && (
                <span className="text-sm font-normal text-gray-600"> by {entry.artist}</span>
              )}
            </div>
            <div className="text-sm text-red-600 font-semibold">
              ↓ {Math.abs(entry.positionChange || 0)} positions
              {entry.oldPosition && entry.newPosition && (
                <span className="text-gray-500 ml-1">({entry.oldPosition} → {entry.newPosition})</span>
              )}
            </div>
          </div>
        </div>
      ),
    })

    // Add Exits (always show)
    trendBlocks.push({
      title: 'Exits',
      icon: faSkull,
      iconColor: 'text-gray-600',
      entries: data.exits,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-lg text-[var(--theme-primary)]" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {entry.name}
              {entry.artist && (
                <span className="text-sm font-normal text-gray-600"> by {entry.artist}</span>
              )}
            </div>
            <div className="text-sm text-gray-500">Last position: #{entry.lastPosition}</div>
          </div>
        </div>
      ),
    })

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trendBlocks.map((block, blockIdx) => {
          const limitedEntries = block.entries.slice(0, 10)
          const firstThree = limitedEntries.slice(0, 3)
          const rest = limitedEntries.slice(3)
          const totalCount = block.entries.length
          const showTotal = (block.title === 'New Entries' || block.title === 'Exits') && totalCount > 0
          const isEmpty = totalCount === 0
          
          return (
            <div key={blockIdx} className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
              <h3 className={`text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2 ${block.iconColor}`}>
                <FontAwesomeIcon icon={block.icon} className={`text-lg ${block.iconColor || ''}`} />
                {block.title}
              </h3>
              <div className="space-y-3">
                {(block as any).isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
                  </div>
                ) : isEmpty ? (
                  <div className="text-gray-500 text-center py-6 text-sm italic">
                    There are no entries to show. 🍂
                  </div>
                ) : (
                  <>
                    {/* First 3 entries - normal size */}
                    {firstThree.map((entry: any, idx: number) => block.renderEntry(entry, idx))}
                    
                    {/* Remaining entries - smaller size */}
                    {rest.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-[var(--theme-border)]/50">
                        {rest.map((entry: any, idx: number) => (
                          <div
                            key={idx + 3}
                            className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/60 hover:bg-[var(--theme-primary-lighter)]/30 transition-all border border-[var(--theme-border)]/50"
                          >
                            <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-xs text-[var(--theme-primary)]" />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-800 truncate">
                                {entry.name}
                                {entry.artist && (
                                  <span className="text-xs font-normal text-gray-500"> by {entry.artist}</span>
                                )}
                              </div>
                              {entry.position && (
                                <div className="text-xs text-gray-500">
                                  #{entry.position}
                                  {entry.weeksAway !== undefined && entry.weeksAway !== null && (
                                    <span className="ml-1">• Returned after {entry.weeksAway} {entry.weeksAway === 1 ? 'week' : 'weeks'} away</span>
                                  )}
                                  {entry.currentStreak !== undefined && entry.currentStreak !== null && (
                                    <span className="ml-1">• {entry.currentStreak} {entry.currentStreak === 1 ? 'week' : 'weeks'} streak</span>
                                  )}
                                </div>
                              )}
                              {entry.positionChange !== undefined && entry.positionChange !== null && (
                                <div className={`text-xs font-medium ${entry.positionChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {entry.positionChange < 0 ? '↑' : '↓'} {Math.abs(entry.positionChange)} positions
                                  {entry.oldPosition && entry.newPosition && (
                                    <span className="text-gray-400 ml-1">({entry.oldPosition} → {entry.newPosition})</span>
                                  )}
                                </div>
                              )}
                              {entry.lastPosition && (
                                <div className="text-xs text-gray-500">Last: #{entry.lastPosition}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Total count footer for New Entries and Exits */}
                    {showTotal && (
                      <div className="pt-3 mt-3 border-t border-[var(--theme-border)]/50">
                        <div className="text-sm text-gray-600 text-center">
                          Total: <span className="font-semibold text-gray-800">{totalCount}</span> {block.title === 'New Entries' ? 'new entries' : 'exits'}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderMembersContent = () => {
    return (
      <div className="space-y-6">
        {/* Top Grid: Your Impact, Top Contributors, MVP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Your Impact - First */}
          <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-6 border border-[var(--theme-border)] shadow-sm">
            <h3 className="text-xl font-bold text-[var(--theme-text)] mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-lg" />
              Your Impact
            </h3>
            {isLoadingPersonal ? (
              <div className="flex items-center justify-center py-8">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--theme-primary)]" />
              </div>
            ) : personalizedStats ? (
              <div className="space-y-4">
                {/* Total Contribution */}
                <div className="bg-white/80 rounded-lg p-4 border border-theme">
                  <div className="text-sm text-gray-600 mb-1">Your Total Contribution</div>
                  <div className="text-2xl font-bold text-[var(--theme-text)]">
                    {personalizedStats.totalContribution?.plays?.toLocaleString() || 0} plays
                  </div>
                  <div className="text-base text-[var(--theme-text)] mt-1">
                    {personalizedStats.totalContribution?.vs?.toFixed(2) || 0} VS
                    {personalizedStats.totalContribution?.percentageOfGroup && (
                      <span className="text-xs text-gray-600 ml-2">
                        ({personalizedStats.totalContribution.percentageOfGroup.toFixed(1)}% of group)
                      </span>
                    )}
                  </div>
                </div>

                {/* Taste Match */}
                {personalizedStats.tasteMatch && (
                  <div className="bg-white/80 rounded-lg p-3 border border-theme">
                    <h4 className="text-sm font-bold text-[var(--theme-primary-dark)] mb-1">Your Taste Match</h4>
                    <div className="text-2xl font-bold text-[var(--theme-text)]">
                      {personalizedStats.tasteMatch.overlapPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {personalizedStats.tasteMatch.sharedEntries} shared entries
                    </div>
                  </div>
                )}

                {/* You vs MVP */}
                {personalizedStats.vsMVP && (
                  <div className="bg-white/80 rounded-lg p-3 border border-theme">
                    <h4 className="text-sm font-bold text-[var(--theme-primary-dark)] mb-1">You vs MVP</h4>
                    <div className="text-base font-bold text-gray-900 mb-1">{personalizedStats.vsMVP.mvpName}</div>
                    <div className="text-sm text-[var(--theme-text)]">
                      You: {personalizedStats.vsMVP.userTotal.toFixed(2)} VS
                    </div>
                    <div className="text-sm text-[var(--theme-text)]">
                      MVP: {personalizedStats.vsMVP.mvpTotal.toFixed(2)} VS
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {personalizedStats.vsMVP.percentage.toFixed(1)}% of MVP
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4 text-sm">
                No personalized stats available
              </div>
            )}
          </div>

          {/* Top Contributors */}
          {topContributors.length > 0 && (
            <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl shadow-sm p-6 border border-[var(--theme-border)]">
              <h3 className="text-xl font-bold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-lg" />
                Top Contributors
              </h3>
              <div className="space-y-3">
                {topContributors.map((contributor: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm">{contributor.name}</div>
                      <div className="text-xs text-[var(--theme-text)]">
                        {contributor.totalPlays?.toLocaleString() || 0} plays
                        {contributor.totalVS && (
                          <span className="ml-1">• {contributor.totalVS.toFixed(2)} VS</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Member Spotlight / MVP */}
          {memberSpotlight && (
            <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-6 border border-[var(--theme-border)] shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FontAwesomeIcon icon={faTrophy} className="text-xl text-[var(--theme-primary)]" />
                <h3 className="text-xl font-bold text-[var(--theme-text)]">This Week's MVP</h3>
              </div>
              <div className="text-xl font-bold text-gray-900 mb-2">{memberSpotlight.name}</div>
              <div className="text-base text-gray-700 mb-3">{memberSpotlight.highlight}</div>
              {memberSpotlight.topContributions && memberSpotlight.topContributions.length > 0 && (
                <div className="text-xs text-gray-600">
                  Top contributions: {memberSpotlight.topContributions.map((c: any) => c.name).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Personalized Stats Below */}
        {personalizedStats && (
          <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-6 border border-theme">
            <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-lg" />
              Your Detailed Stats
            </h3>
            <div className="space-y-4">
              {/* Top Contributions */}
              {personalizedStats.topContributions && personalizedStats.topContributions.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-[var(--theme-primary-dark)] mb-3 flex items-center gap-2">
                    Your Top Contributions
                    <Tooltip content="Chart entries where you contributed the most. Shows how much of the group's total you made up for each one." position="right">
                      <FontAwesomeIcon icon={faQuestionCircle} className="text-sm text-[var(--theme-primary-dark)] cursor-help" />
                    </Tooltip>
                  </h4>
                  <div className="space-y-2">
                    {personalizedStats.topContributions.slice(0, 5).map((contribution: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                      >
                        <FontAwesomeIcon icon={getChartTypeIcon(contribution.chartType)} className="text-lg text-[var(--theme-primary)]" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {contribution.name}
                            {contribution.artist && (
                              <span className="text-sm font-normal text-gray-600"> by {contribution.artist}</span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--theme-text)]">
                            #{contribution.position} • {contribution.percentage.toFixed(1)}% of group total
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entries You Drove */}
              {personalizedStats.entriesDriven && personalizedStats.entriesDriven.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-[var(--theme-primary-dark)] mb-3 flex items-center gap-2">
                    Entries You Drove
                    <Tooltip content="Chart entries where you contributed at least half of the group's total. You were the main reason these made it into the charts." position="right">
                      <FontAwesomeIcon icon={faQuestionCircle} className="text-sm text-[var(--theme-primary-dark)] cursor-help" />
                    </Tooltip>
                  </h4>
                  <div className="space-y-2">
                    {personalizedStats.entriesDriven.slice(0, 5).map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                      >
                        <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-lg text-[var(--theme-primary)]" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {entry.name}
                            {entry.artist && (
                              <span className="text-sm font-normal text-gray-600"> by {entry.artist}</span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--theme-text)]">
                            #{entry.position} • You contributed {entry.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Biggest Movers You Contributed To */}
              {personalizedStats.biggestMovers && personalizedStats.biggestMovers.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-[var(--theme-primary-dark)] mb-3 flex items-center gap-2">
                    Your Biggest Movers
                    <Tooltip content="Chart entries that moved up the most this week and that you helped with. Shows how many spots each one climbed." position="right">
                      <FontAwesomeIcon icon={faQuestionCircle} className="text-sm text-[var(--theme-primary-dark)] cursor-help" />
                    </Tooltip>
                  </h4>
                  <div className="space-y-2">
                    {personalizedStats.biggestMovers.map((mover: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                      >
                        <FontAwesomeIcon icon={faArrowUp} className="text-lg text-green-600" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {mover.name}
                            {mover.artist && (
                              <span className="text-sm font-normal text-gray-600"> by {mover.artist}</span>
                            )}
                          </div>
                          <div className="text-sm text-green-600 font-semibold">
                            ↑ {Math.abs(mover.positionChange)} positions ({mover.oldPosition} → {mover.newPosition})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const tabs: Array<{ id: CategoryTab; label: string; icon: any }> = [
    { id: 'members', label: 'Member Trends', icon: faUsers },
    { id: 'artists', label: 'Artists', icon: faMicrophone },
    { id: 'tracks', label: 'Tracks', icon: faMusic },
    { id: 'albums', label: 'Albums', icon: faCompactDisc },
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Total Plays</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">
            {trends.totalPlays?.toLocaleString() || 0}
          </div>
          {trends.totalPlaysChange !== null && trends.totalPlaysChange !== undefined && (
            <div className={`text-sm mt-1 ${trends.totalPlaysChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trends.totalPlaysChange >= 0 ? '+' : ''}{trends.totalPlaysChange.toLocaleString()} from last week
            </div>
          )}
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">New Entries</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">
            {trends.chartTurnover || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">This week</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-theme shadow-sm">
          <div className="text-sm text-gray-600 mb-1">Exits</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">
            {(trends.exits as any[])?.length || 0}
          </div>
          <div className="text-sm text-gray-500 mt-1">Dropped out</div>
        </div>
      </div>

      {/* Call to Action - View Detailed Charts */}
      {trends.weekStart && (
        <div className="bg-gradient-to-r from-[var(--theme-primary-light)] to-[var(--theme-primary-lighter)] rounded-xl shadow-sm p-6 border border-theme">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-2">
                See how the entire week played out
              </h3>
              <p className="text-gray-600 text-sm">
                Explore the complete charts with all artists, tracks, and albums ranked for this week.
              </p>
            </div>
            <Link
              href={`/groups/${groupId}/charts?week=${formatWeekDate(new Date(trends.weekStart))}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[var(--theme-primary)] text-white rounded-lg font-semibold hover:bg-[var(--theme-primary-dark)] transition-colors shadow-sm whitespace-nowrap"
            >
              View Charts
              <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
            </Link>
          </div>
        </div>
      )}

      {/* Fun Facts */}
      {funFacts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-theme">
          <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faLaughBeam} className="text-lg text-[var(--theme-primary-dark)]" />
            Fun Facts
          </h3>
          <div className="space-y-3">
            {funFacts.slice(0, 3).map((fact: string, idx: number) => (
              <div key={idx} className="text-lg text-gray-700 p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]">
                {fact}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Folder-style Tabbed Interface */}
      <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg border border-theme">
        {/* Tab Headers - Folder Style */}
        <div className="flex border-b border-[var(--theme-border)] bg-white/50 overflow-hidden rounded-t-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative
                  ${isActive 
                    ? 'text-[var(--theme-primary-dark)] bg-[var(--theme-background-from)] border-b-2 border-[var(--theme-primary)]' 
                    : 'text-gray-600 hover:text-[var(--theme-primary-dark)] hover:bg-white/30'
                  }
                `}
              >
                <FontAwesomeIcon icon={tab.icon} className={isActive ? 'text-[var(--theme-primary)]' : ''} />
                <span>{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--theme-primary)]"></div>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-visible">
          {activeTab === 'members' && renderMembersContent()}
          {activeTab === 'artists' && renderCategoryContent('artists')}
          {activeTab === 'tracks' && renderCategoryContent('tracks')}
          {activeTab === 'albums' && renderCategoryContent('albums')}
        </div>
      </div>
    </div>
  )
}

