'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from '@/i18n/routing'
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
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import LiquidGlassTabs, { TabItem } from '@/components/LiquidGlassTabs'
import { generateSlug, ChartType } from '@/lib/chart-slugs'
import { useSafeTranslations } from '@/hooks/useSafeTranslations'

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

// Helper function to translate fun facts
function translateFunFact(fact: string, t: (key: string, values?: Record<string, any>) => string): string {
  const tf = (key: string, values?: Record<string, any>) => t(`funFacts.${key}`, values)
  
  // Comeback: "Artist "name" by artist made a comeback! Returned to the top 10 after X weeks away!"
  const comebackMatch = fact.match(/^(Artist|Track|Album) "([^"]+)"(?: by ([^!]+))? made a comeback! Returned to the top 10 after (\d+) weeks away!$/)
  if (comebackMatch) {
    const [, type, name, artist, weeks] = comebackMatch
    const typeKey = type.toLowerCase() as 'artist' | 'track' | 'album'
    return tf('comeback', {
      type: tf(typeKey),
      name,
      byArtist: artist ? ` ${t('by', { artist: artist.trim() })}` : '',
      weeks
    })
  }

  // On fire: "Artist "name" by artist is on fire! X weeks in a row in the top 10!"
  const onFireMatch = fact.match(/^(Artist|Track|Album) "([^"]+)"(?: by ([^!]+))? is on fire! (\d+) weeks in a row in the top 10!$/)
  if (onFireMatch) {
    const [, type, name, artist, weeks] = onFireMatch
    const typeKey = type.toLowerCase() as 'artist' | 'track' | 'album'
    return tf('onFire', {
      type: tf(typeKey),
      name,
      byArtist: artist ? ` ${t('by', { artist: artist.trim() })}` : '',
      weeks
    })
  }

  // Unstoppable: "Unstoppable! "name" by artist has been charting for X consecutive weeks"
  const unstoppableMatch = fact.match(/^Unstoppable! "([^"]+)"(?: by ([^!]+))? has been charting for (\d+) consecutive weeks$/)
  if (unstoppableMatch) {
    const [, name, artist, weeks] = unstoppableMatch
    return tf('unstoppable', {
      name,
      byArtist: artist ? ` ${t('by', { artist: artist.trim() })}` : '',
      weeks
    })
  }

  // New peak: "New peak! "name" by artist reached #X, their highest ever!"
  const newPeakMatch = fact.match(/^New peak! "([^"]+)"(?: by ([^!]+))? reached #(\d+), their highest ever!$/)
  if (newPeakMatch) {
    const [, name, artist, position] = newPeakMatch
    return tf('newPeak', {
      name,
      byArtist: artist ? ` ${t('by', { artist: artist.trim() })}` : '',
      position
    })
  }

  // First timer: "First timer! "name" by artist entered the charts for the very first time!"
  const firstTimerMatch = fact.match(/^First timer! "([^"]+)"(?: by ([^!]+))? entered the charts for the very first time!$/)
  if (firstTimerMatch) {
    const [, name, artist] = firstTimerMatch
    return tf('firstTimer', {
      name,
      byArtist: artist ? ` ${t('by', { artist: artist.trim() })}` : ''
    })
  }

  // Welcome to the club: "Welcome to the club! X entries are charting for the first time ever"
  const welcomeMatch = fact.match(/^Welcome to the club! (\d+) entries are charting for the first time ever$/)
  if (welcomeMatch) {
    const [, count] = welcomeMatch
    return tf('welcomeToClub', { count })
  }

  // Dominating: "Artist is dominating with X entries in the charts!"
  const dominatingMatch = fact.match(/^(.+) is dominating with (\d+) entries in the charts!$/)
  if (dominatingMatch) {
    const [, artist, count] = dominatingMatch
    return tf('dominating', { artist, count })
  }

  // Steady as a rock: "Steady as a rock! X entries held their position this week"
  const steadyMatch = fact.match(/^Steady as a rock! (\d+) entries held their position this week$/)
  if (steadyMatch) {
    const [, count] = steadyMatch
    return tf('steadyAsRock', { count })
  }

  // Top 3 stable: "The top 3 stayed strong - no changes at the top!"
  if (fact === "The top 3 stayed strong - no changes at the top!") {
    return tf('top3Stable')
  }

  // Wild week: "This week was wild! X more plays than last week - that's a Y% increase!"
  const wildWeekMatch = fact.match(/^This week was wild! (.+) more plays than last week - that's a (\d+)% increase!$/)
  if (wildWeekMatch) {
    const [, plays, percent] = wildWeekMatch
    return tf('wildWeek', { plays, percent })
  }

  // Close race: "Close race! Top contributor only X plays ahead of second place"
  const closeRaceMatch = fact.match(/^Close race! Top contributor only (\d+) plays ahead of second place$/)
  if (closeRaceMatch) {
    const [, difference] = closeRaceMatch
    return tf('closeRace', { difference })
  }

  // MVP: "This week's MVP: Name with X plays - absolute legend!"
  const mvpMatch = fact.match(/^This week's MVP: (.+) with (.+) plays - absolute legend!$/)
  if (mvpMatch) {
    const [, name, plays] = mvpMatch
    return tf('mvp', { name, plays })
  }

  // Total plays: "The group listened to X songs this week - that's dedication!"
  const totalPlaysMatch = fact.match(/^The group listened to (.+) songs this week - that's dedication!$/)
  if (totalPlaysMatch) {
    const [, plays] = totalPlaysMatch
    return tf('totalPlays', { plays })
  }

  // If no match, return original
  return fact
}

export default function TrendsClient({ trends, groupId, userId }: TrendsClientProps) {
  const t = useSafeTranslations('groups.trends')
  const [personalizedStats, setPersonalizedStats] = useState<any>(null)
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(true)
  
  // Get tab from hash fragment (e.g., #artists)
  const getTabFromHash = (): CategoryTab | null => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1) // Remove the #
    const validTabs: CategoryTab[] = ['members', 'artists', 'tracks', 'albums']
    return validTabs.includes(hash as CategoryTab) ? (hash as CategoryTab) : null
  }
  
  const defaultTab: CategoryTab = 'members'
  // Initialize with defaultTab, then check hash on mount
  const [activeTab, setActiveTab] = useState<CategoryTab>(defaultTab)
  const [longestStreaks, setLongestStreaks] = useState<any[]>([])
  const [comebacks, setComebacks] = useState<any[]>([])
  const [mostDiverseSpotlight, setMostDiverseSpotlight] = useState<any>(null)
  
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
    const tab = tabId as CategoryTab
    setActiveTab(tab)
    // Update hash without causing page refresh or scroll
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
  }

  useEffect(() => {
    // Fetch personalized stats, longest streaks, comebacks, and most diverse spotlight asynchronously
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
        if (data.mostDiverseSpotlight) {
          setMostDiverseSpotlight(data.mostDiverseSpotlight)
        }
        setIsLoadingPersonal(false)
      })
      .catch((err) => {
        console.error('Error fetching personalized stats:', err)
        setIsLoadingPersonal(false)
      })
  }, [groupId])

  // Organize data by category - memoized to prevent recalculation
  const organizeByCategory = useCallback((): Record<string, CategoryData> => {
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
  }, [trends.newEntries, trends.biggestClimbers, trends.biggestFallers, trends.exits])

  const categoryData = useMemo(() => organizeByCategory(), [organizeByCategory])
  const funFacts = (trends.funFacts as string[]) || []
  const topContributors = (trends.topContributors as any[]) || []
  const memberSpotlight = trends.memberSpotlight as any

  const getChartTypeIcon = useCallback((chartType: string) => {
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
  }, [])

  const getChartTypePath = useCallback((chartType: string): string => {
    switch (chartType) {
      case 'artists':
        return 'artist'
      case 'tracks':
        return 'track'
      case 'albums':
        return 'album'
      default:
        return 'artist'
    }
  }, [])

  const renderCategoryContent = useCallback((category: 'artists' | 'tracks' | 'albums') => {
    const data = categoryData[category]
    
    // Filter longest streaks and comebacks by category
    const categoryLongestStreaks = longestStreaks.filter((entry: any) => entry.chartType === category)
    const categoryComebacks = comebacks.filter((entry: any) => entry.chartType === category)

    // Build array of trend blocks to display - always show all cards
    const trendBlocks = []
    
    // Add Longest Streaks first (always show)
    trendBlocks.push({
      title: t('longestStreaks'),
      icon: faChartLine,
      iconColor: 'text-[var(--theme-primary)]',
      entries: categoryLongestStreaks,
      isLoading: isLoadingPersonal,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
              className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
            >
              {entry.name}
              {entry.artist && (
                <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: entry.artist })}</span>
              )}
            </Link>
            <div className="text-xs md:text-sm text-gray-500">
              #{entry.position} • {entry.currentStreak} {entry.currentStreak === 1 ? t('week') : t('weeks')} {t('streak')}
            </div>
          </div>
        </div>
      ),
    })
    
    // Add Comebacks second (always show)
    trendBlocks.push({
      title: t('comebacks'),
      icon: faTrophy,
      iconColor: 'text-[var(--theme-primary)]',
      entries: categoryComebacks,
      isLoading: isLoadingPersonal,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
              className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
            >
              {entry.name}
              {entry.artist && (
                <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: entry.artist })}</span>
              )}
            </Link>
            <div className="text-xs md:text-sm text-gray-500">
              #{entry.position} • {t('returnedAfter', { count: entry.weeksAway, unit: entry.weeksAway === 1 ? t('week') : t('weeks') })}
            </div>
          </div>
        </div>
      ),
    })

    // Add New Entries (always show)
    trendBlocks.push({
      title: t('newEntries'),
      icon: faFire,
      iconColor: '',
      entries: data.newEntries,
      renderEntry: (entry: any, idx: number) => {
        const isNumberOne = entry.position === 1
        return (
          <div
            key={idx}
            className={`relative flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg transition-all border overflow-hidden ${
              isNumberOne
                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 border-yellow-300'
                : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border-[var(--theme-border)]'
            }`}
          >
            {isNumberOne && (
              <div className="absolute top-2 right-0 bg-yellow-500 text-white text-xs font-bold px-4 md:px-8 py-1 md:py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap">
                {t('numberOneDebut')}
              </div>
            )}
            <FontAwesomeIcon 
              icon={getChartTypeIcon(entry.chartType)} 
              className={`text-base md:text-lg flex-shrink-0 ${isNumberOne ? 'text-yellow-600' : 'text-[var(--theme-primary)]'}`} 
            />
            <div className="flex-1 min-w-0">
              <Link
                href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
                className={`font-semibold truncate block text-sm md:text-base ${isNumberOne ? 'text-yellow-900 hover:text-yellow-700' : 'text-gray-900 hover:text-[var(--theme-primary)]'} transition-colors`}
              >
                {entry.name}
                {entry.artist && (
                  <span className={`text-xs md:text-sm font-normal ${isNumberOne ? 'text-yellow-700' : 'text-gray-600'}`}> {t('by', { artist: entry.artist })}</span>
                )}
              </Link>
              <div className={`text-xs md:text-sm ${isNumberOne ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>{t('debutedAt', { position: entry.position })}</div>
            </div>
          </div>
        )
      },
    })

    // Add Biggest Climbers (always show)
    trendBlocks.push({
      title: t('biggestClimbers'),
      icon: faArrowUp,
      iconColor: 'text-green-600',
      entries: data.biggestClimbers,
      renderEntry: (entry: any, idx: number) => {
        const isPeakPosition = entry.highestPosition !== undefined && entry.position === entry.highestPosition
        return (
          <div
            key={idx}
            className={`relative flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg transition-all border overflow-hidden ${
              isPeakPosition
                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border-blue-300'
                : 'bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 border-[var(--theme-border)]'
            }`}
          >
            {isPeakPosition && (
              <div className="absolute top-2 right-0 bg-blue-500 text-white text-xs font-bold px-4 md:px-8 py-1 md:py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap">
                {t('newPeak')}
              </div>
            )}
            <FontAwesomeIcon 
              icon={getChartTypeIcon(entry.chartType)} 
              className={`text-base md:text-lg flex-shrink-0 ${isPeakPosition ? 'text-blue-600' : 'text-[var(--theme-primary)]'}`} 
            />
            <div className="flex-1 min-w-0">
              <Link
                href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
                className={`font-semibold truncate block text-sm md:text-base ${isPeakPosition ? 'text-blue-900 hover:text-blue-700' : 'text-gray-900 hover:text-[var(--theme-primary)]'} transition-colors`}
              >
                {entry.name}
                {entry.artist && (
                  <span className={`text-xs md:text-sm font-normal ${isPeakPosition ? 'text-blue-700' : 'text-gray-600'}`}> {t('by', { artist: entry.artist })}</span>
                )}
              </Link>
              <div className={`text-xs md:text-sm font-semibold ${isPeakPosition ? 'text-blue-700' : 'text-green-600'}`}>
                ↑ {Math.abs(entry.positionChange || 0)} {t('positions')}
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
      title: t('biggestFallers'),
      icon: faArrowDown,
      iconColor: 'text-red-600',
      entries: data.biggestFallers,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
              className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
            >
              {entry.name}
              {entry.artist && (
                <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: entry.artist })}</span>
              )}
            </Link>
            <div className="text-xs md:text-sm text-red-600 font-semibold">
              ↓ {Math.abs(entry.positionChange || 0)} {t('positions')}
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
      title: t('exits'),
      icon: faSkull,
      iconColor: 'text-gray-600',
      entries: data.exits,
      renderEntry: (entry: any, idx: number) => (
        <div
          key={idx}
          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
        >
          <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Link
              href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
              className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
            >
              {entry.name}
              {entry.artist && (
                <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: entry.artist })}</span>
              )}
            </Link>
            <div className="text-xs md:text-sm text-gray-500">{t('lastPosition')}: #{entry.lastPosition}</div>
          </div>
        </div>
      ),
    })

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {trendBlocks.map((block, blockIdx) => {
          const limitedEntries = block.entries.slice(0, 10)
          const firstThree = limitedEntries.slice(0, 3)
          const rest = limitedEntries.slice(3)
          const totalCount = block.entries.length
          const showTotal = (block.title === t('newEntries') || block.title === t('exits')) && totalCount > 0
          const isEmpty = totalCount === 0
          
          return (
            <div key={blockIdx} className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 md:p-6 border border-theme">
              <h3 className={`text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-3 md:mb-4 flex items-center gap-2 ${block.iconColor}`}>
                <FontAwesomeIcon icon={block.icon} className={`text-base md:text-lg flex-shrink-0 ${block.iconColor || ''}`} />
                {block.title}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {(block as any).isLoading ? (
                  <div className="flex items-center justify-center py-6 md:py-8">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl md:text-2xl text-[var(--theme-primary)]" />
                  </div>
                ) : isEmpty ? (
                  <div className="text-gray-500 text-center py-4 md:py-6 text-xs md:text-sm italic">
                    {t('noEntriesToShow')}
                  </div>
                ) : (
                  <>
                    {/* First 3 entries - normal size */}
                    {firstThree.map((entry: any, idx: number) => block.renderEntry(entry, idx))}
                    
                    {/* Remaining entries - smaller size */}
                    {rest.length > 0 && (
                      <div className="space-y-1 md:space-y-1.5 pt-2 border-t border-[var(--theme-border)]/50">
                        {rest.map((entry: any, idx: number) => (
                          <div
                            key={idx + 3}
                            className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/60 hover:bg-[var(--theme-primary-lighter)]/30 transition-all border border-[var(--theme-border)]/50"
                          >
                            <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-xs text-[var(--theme-primary)] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
                                className="text-xs font-medium text-gray-800 truncate hover:text-[var(--theme-primary)] transition-colors block"
                              >
                                {entry.name}
                                {entry.artist && (
                                  <span className="text-xs font-normal text-gray-500"> {t('by', { artist: entry.artist })}</span>
                                )}
                              </Link>
                              {entry.position && (
                                <div className="text-xs text-gray-500">
                                  {block.title === t('newEntries') ? t('debutedAt', { position: entry.position }) : `#${entry.position}`}
                                  {entry.weeksAway !== undefined && entry.weeksAway !== null && (
                                    <span className="ml-1">• {t('returnedAfter', { count: entry.weeksAway, unit: entry.weeksAway === 1 ? t('week') : t('weeks') })}</span>
                                  )}
                                  {entry.currentStreak !== undefined && entry.currentStreak !== null && (
                                    <span className="ml-1">• {entry.currentStreak} {entry.currentStreak === 1 ? t('week') : t('weeks')} {t('streak')}</span>
                                  )}
                                </div>
                              )}
                              {entry.positionChange !== undefined && entry.positionChange !== null && (
                                <div className={`text-xs font-medium ${entry.positionChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {entry.positionChange < 0 ? '↑' : '↓'} {Math.abs(entry.positionChange)} {t('positions')}
                                  {entry.oldPosition && entry.newPosition && (
                                    <span className="text-gray-400 ml-1">({entry.oldPosition} → {entry.newPosition})</span>
                                  )}
                                </div>
                              )}
                              {entry.lastPosition && (
                                <div className="text-xs text-gray-500">{t('lastPosition')}: #{entry.lastPosition}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Total count footer for New Entries and Exits */}
                    {showTotal && (
                      <div className="pt-2 md:pt-3 mt-2 md:mt-3 border-t border-[var(--theme-border)]/50">
                        <div className="text-xs md:text-sm text-gray-600 text-center">
                          {block.title === t('newEntries') ? t('totalNewEntries', { count: totalCount }) : t('totalExits', { count: totalCount })}
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
  }, [categoryData, longestStreaks, comebacks, groupId, getChartTypeIcon, getChartTypePath, isLoadingPersonal])

  const renderMembersContent = () => {
    return (
      <div className="space-y-4 md:space-y-6">
        {/* Top Grid: Your Impact, Top Contributors, MVP */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Your Impact - First */}
          <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 md:p-6 border border-[var(--theme-border)] shadow-sm">
            <h3 className="text-lg md:text-xl font-bold text-[var(--theme-text)] mb-3 md:mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-base md:text-lg flex-shrink-0" />
              {t('yourImpact')}
            </h3>
            {isLoadingPersonal ? (
              <div className="flex items-center justify-center py-6 md:py-8">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl md:text-2xl text-[var(--theme-primary)]" />
              </div>
            ) : personalizedStats ? (
              <div className="space-y-3 md:space-y-4">
                {/* Total Contribution */}
                <div className="bg-white/80 rounded-lg p-3 md:p-4 border border-theme">
                  <div className="text-xs md:text-sm text-gray-600 mb-1">{t('yourTotalContribution')}</div>
                  <div className="text-xl md:text-2xl font-bold text-[var(--theme-text)]">
                    {personalizedStats.totalContribution?.plays?.toLocaleString() || 0} {t('plays')}
                  </div>
                  <div className="text-sm md:text-base text-[var(--theme-text)] mt-1">
                    {personalizedStats.totalContribution?.vs?.toFixed(2) || 0} {t('vs')}
                    {personalizedStats.totalContribution?.percentageOfGroup && (
                      <span className="text-xs text-gray-600 ml-2">
                        ({personalizedStats.totalContribution.percentageOfGroup.toFixed(1)}% {t('ofGroup')})
                      </span>
                    )}
                  </div>
                </div>

                {/* Taste Match */}
                {personalizedStats.tasteMatch && (
                  <div className="bg-white/80 rounded-lg p-2 md:p-3 border border-theme">
                    <h4 className="text-xs md:text-sm font-bold text-[var(--theme-primary-dark)] mb-1">{t('yourTasteMatch')}</h4>
                    <div className="text-xl md:text-2xl font-bold text-[var(--theme-text)]">
                      {personalizedStats.tasteMatch.overlapPercentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {personalizedStats.tasteMatch.sharedEntries} {t('sharedEntries')}
                    </div>
                  </div>
                )}

                {/* You vs MVP */}
                {personalizedStats.vsMVP && (
                  <div className="bg-white/80 rounded-lg p-2 md:p-3 border border-theme">
                    <h4 className="text-xs md:text-sm font-bold text-[var(--theme-primary-dark)] mb-1">{t('youVsMVP')}</h4>
                    <div className="text-sm md:text-base font-bold text-gray-900 mb-1">{personalizedStats.vsMVP.mvpName}</div>
                    <div className="text-xs md:text-sm text-[var(--theme-text)]">
                      {t('you')}: {personalizedStats.vsMVP.userTotal.toFixed(2)} {t('vs')}
                    </div>
                    <div className="text-xs md:text-sm text-[var(--theme-text)]">
                      {t('mvp')}: {personalizedStats.vsMVP.mvpTotal.toFixed(2)} {t('vs')}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {personalizedStats.vsMVP.percentage.toFixed(1)}% {t('ofMVP')}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-3 md:py-4 text-xs md:text-sm">
                {t('noPersonalizedStats')}
              </div>
            )}
          </div>

          {/* Top Contributors */}
          {topContributors.length > 0 && (
            <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl shadow-sm p-4 md:p-6 border border-[var(--theme-border)]">
              <h3 className="text-lg md:text-xl font-bold text-[var(--theme-text)] mb-3 md:mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faTrophy} className="text-base md:text-lg flex-shrink-0" />
                {t('topContributors')}
              </h3>
              <div className="space-y-2 md:space-y-3">
                {topContributors.map((contributor: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 hover:bg-[var(--theme-primary-lighter)]/50 transition-all border border-[var(--theme-border)]"
                  >
                    <div className="flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-xs md:text-sm truncate">{contributor.name}</div>
                      <div className="text-xs text-[var(--theme-text)]">
                        {contributor.totalPlays?.toLocaleString() || 0} {t('plays')}
                        {contributor.totalVS && (
                          <span className="ml-1">• {contributor.totalVS.toFixed(2)} {t('vs')}</span>
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
            <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 md:p-6 border border-[var(--theme-border)] shadow-sm">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <FontAwesomeIcon icon={faTrophy} className="text-lg md:text-xl text-[var(--theme-primary)] flex-shrink-0" />
                <h3 className="text-lg md:text-xl font-bold text-[var(--theme-text)]">{t('thisWeeksMVP')}</h3>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{memberSpotlight.name}</div>
              <div className="text-sm md:text-base text-gray-700 mb-2 md:mb-3">
                {memberSpotlight.highlight === 'Most Active Listener' 
                  ? t('highlightMostActiveListener')
                  : memberSpotlight.highlight === 'MVP & Most Diverse Listener'
                  ? t('highlightMVPAndMostDiverse')
                  : memberSpotlight.highlight}
              </div>
              {memberSpotlight.topContributions && memberSpotlight.topContributions.length > 0 && (
                <div className="text-xs text-gray-600">
                  {t('topContributions', { contributions: memberSpotlight.topContributions.map((c: any) => c.name).join(', ') })}
                </div>
              )}
            </div>
          )}

          {/* Most Diverse Listener Spotlight */}
          {mostDiverseSpotlight && (
            <div className="bg-gradient-to-br from-[var(--theme-background-from)] to-[var(--theme-background-to)] rounded-xl p-4 md:p-6 border border-[var(--theme-border)] shadow-sm">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <FontAwesomeIcon icon={faUsers} className="text-lg md:text-xl text-[var(--theme-primary)] flex-shrink-0" />
                <h3 className="text-lg md:text-xl font-bold text-[var(--theme-text)]">{t('highlightMostDiverseListener')}</h3>
              </div>
              <div className="text-lg md:text-xl font-bold text-gray-900 mb-1 md:mb-2">{mostDiverseSpotlight.name}</div>
              <div className="text-sm md:text-base text-gray-700 mb-2 md:mb-3">
                {mostDiverseSpotlight.highlight === 'Most Diverse Listener' 
                  ? t('highlightMostDiverseListener')
                  : mostDiverseSpotlight.highlight}
              </div>
              {mostDiverseSpotlight.topContributions && mostDiverseSpotlight.topContributions.length > 0 && (
                <div className="text-xs text-gray-600">
                  {t('topContributions', { contributions: mostDiverseSpotlight.topContributions.map((c: any) => c.name).join(', ') })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detailed Personalized Stats Below */}
        {personalizedStats && (() => {
          const hasTopContributions = personalizedStats.topContributions && personalizedStats.topContributions.length > 0
          const hasEntriesDriven = personalizedStats.entriesDriven && personalizedStats.entriesDriven.length > 0
          const hasBiggestMovers = personalizedStats.biggestMovers && personalizedStats.biggestMovers.length > 0
          const hasDataToShow = hasTopContributions || hasEntriesDriven || hasBiggestMovers

          return (
            <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-4 md:p-6 border border-theme">
              <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-3 md:mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-base md:text-lg flex-shrink-0" />
                {t('yourDetailedStats')}
              </h3>
              {hasDataToShow ? (
                <div className="space-y-3 md:space-y-4">
                  {/* Top Contributions */}
                  {hasTopContributions && (
                <div>
                  <h4 className="text-base md:text-lg font-bold text-[var(--theme-primary-dark)] mb-2 md:mb-3 flex items-center gap-2">
                    {t('yourTopContributions')}
                    <Tooltip content={t('topContributionsTooltip')} position="right">
                      <button
                        type="button"
                        className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 focus:ring-offset-1"
                        aria-label={t('topContributionsTooltip')}
                      >
                        <FontAwesomeIcon icon={faQuestionCircle} className="text-xs md:text-sm flex-shrink-0" />
                      </button>
                    </Tooltip>
                  </h4>
                  <div className="space-y-2">
                    {personalizedStats.topContributions.slice(0, 5).map((contribution: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                      >
                        <FontAwesomeIcon icon={getChartTypeIcon(contribution.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/groups/${groupId}/charts/${getChartTypePath(contribution.chartType)}/${generateSlug(contribution.entryKey, contribution.chartType as ChartType)}`}
                            className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
                          >
                            {contribution.name}
                            {contribution.artist && (
                              <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: contribution.artist })}</span>
                            )}
                          </Link>
                          <div className="text-xs md:text-sm text-[var(--theme-text)]">
                            #{contribution.position} • {contribution.percentage.toFixed(1)}% {t('ofGroupTotal')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* Entries You Drove */}
                  {hasEntriesDriven && (
                <div>
                  <h4 className="text-base md:text-lg font-bold text-[var(--theme-primary-dark)] mb-2 md:mb-3 flex items-center gap-2">
                    {t('entriesYouDrove')}
                    <Tooltip content={t('entriesYouDroveTooltip')} position="right">
                      <button
                        type="button"
                        className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 focus:ring-offset-1"
                        aria-label={t('entriesYouDroveTooltip')}
                      >
                        <FontAwesomeIcon icon={faQuestionCircle} className="text-xs md:text-sm flex-shrink-0" />
                      </button>
                    </Tooltip>
                  </h4>
                  <div className="space-y-2">
                    {personalizedStats.entriesDriven.slice(0, 5).map((entry: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                      >
                        <FontAwesomeIcon icon={getChartTypeIcon(entry.chartType)} className="text-base md:text-lg text-[var(--theme-primary)] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/groups/${groupId}/charts/${getChartTypePath(entry.chartType)}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
                            className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
                          >
                            {entry.name}
                            {entry.artist && (
                              <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: entry.artist })}</span>
                            )}
                          </Link>
                          <div className="text-xs md:text-sm text-[var(--theme-text)]">
                            #{entry.position} • {t('youContributed', { percentage: entry.percentage.toFixed(1) })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* Biggest Movers You Contributed To */}
                  {hasBiggestMovers && (
                    <div>
                      <h4 className="text-base md:text-lg font-bold text-[var(--theme-primary-dark)] mb-2 md:mb-3 flex items-center gap-2">
                        {t('yourBiggestMovers')}
                        <Tooltip content={t('yourBiggestMoversTooltip')} position="right">
                          <button
                            type="button"
                            className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-opacity-50 focus:ring-offset-1"
                            aria-label={t('yourBiggestMoversTooltip')}
                          >
                            <FontAwesomeIcon icon={faQuestionCircle} className="text-xs md:text-sm flex-shrink-0" />
                          </button>
                        </Tooltip>
                      </h4>
                      <div className="space-y-2">
                        {personalizedStats.biggestMovers.map((mover: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]"
                          >
                            <FontAwesomeIcon icon={faArrowUp} className="text-base md:text-lg text-green-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <Link
                                href={`/groups/${groupId}/charts/${getChartTypePath(mover.chartType)}/${generateSlug(mover.entryKey, mover.chartType as ChartType)}`}
                                className="font-semibold text-sm md:text-base text-gray-900 truncate hover:text-[var(--theme-primary)] transition-colors block"
                              >
                                {mover.name}
                                {mover.artist && (
                                  <span className="text-xs md:text-sm font-normal text-gray-600"> {t('by', { artist: mover.artist })}</span>
                                )}
                              </Link>
                              <div className="text-xs md:text-sm text-green-600 font-semibold">
                                ↑ {Math.abs(mover.positionChange)} {t('positions')} ({mover.oldPosition} → {mover.newPosition})
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-center py-4 md:py-6 text-xs md:text-sm italic">
                  {t('noEntriesToShow')}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  const tabs: TabItem[] = [
    { id: 'members', label: t('memberTrends'), icon: faUsers },
    { id: 'artists', label: t('artists'), icon: faMicrophone },
    { id: 'tracks', label: t('tracks'), icon: faMusic },
    { id: 'albums', label: t('albums'), icon: faCompactDisc },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{t('totalPlays')}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
            {trends.totalPlays?.toLocaleString() || 0} <span className="text-base md:text-lg font-normal">{t('plays')}</span>
          </div>
          {trends.totalPlaysChange !== null && trends.totalPlaysChange !== undefined && (
            <div className={`text-xs md:text-sm mt-1 ${trends.totalPlaysChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trends.totalPlaysChange >= 0 ? '+' : ''}{trends.totalPlaysChange.toLocaleString()} {t('fromLastWeek')}
            </div>
          )}
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{t('newEntries')}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
            {trends.chartTurnover || 0} <span className="text-base md:text-lg font-normal">{t('newEntriesLowercase')}</span>
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">{t('thisWeek')}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 md:p-5 border border-theme shadow-sm">
          <div className="text-xs md:text-sm text-gray-600 mb-1">{t('exits')}</div>
          <div className="text-2xl md:text-3xl font-bold text-[var(--theme-text)]">
            {(trends.exits as any[])?.length || 0} <span className="text-base md:text-lg font-normal">{t('entries')}</span>
          </div>
          <div className="text-xs md:text-sm text-gray-500 mt-1">{t('droppedOut')}</div>
        </div>
      </div>

      {/* Call to Action - View Detailed Charts */}
      {trends.weekStart && (
        <div className="bg-gradient-to-r from-[var(--theme-primary-light)] to-[var(--theme-primary-lighter)] rounded-xl shadow-sm p-4 md:p-6 border border-theme">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-1 md:mb-2">
                {t('seeHowWeekPlayedOut')}
              </h3>
              <p className="text-gray-600 text-xs md:text-sm">
                {t('exploreCompleteCharts')}
              </p>
            </div>
            <LiquidGlassLink
              href={`/groups/${groupId}/charts?week=${formatWeekDate(new Date(trends.weekStart))}`}
              variant="primary"
              useTheme
              size="md"
              icon={<FontAwesomeIcon icon={faArrowRight} className="text-sm" />}
              className="whitespace-nowrap flex-shrink-0"
            >
              {t('viewCharts')}
            </LiquidGlassLink>
          </div>
        </div>
      )}

      {/* Fun Facts */}
      {funFacts.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-sm p-4 md:p-6 border border-theme">
          <h3 className="text-lg md:text-xl font-bold text-[var(--theme-primary-dark)] mb-3 md:mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faLaughBeam} className="text-base md:text-lg text-[var(--theme-primary-dark)] flex-shrink-0" />
            {t('funFactsTitle')}
          </h3>
          <div className="space-y-2 md:space-y-3">
            {funFacts.slice(0, 3).map((fact: string, idx: number) => (
              <div key={idx} className="text-base md:text-lg text-gray-700 p-2 md:p-3 rounded-lg bg-white/80 border border-[var(--theme-border)]">
                {translateFunFact(fact, t)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabbed Interface */}
      <div className="space-y-4 md:space-y-6">
        {/* Tab Navigation */}
        <div className="flex justify-center">
          <LiquidGlassTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Tab Content */}
        <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 md:p-6 border border-theme shadow-sm overflow-visible">
          {activeTab === 'members' && renderMembersContent()}
          {activeTab === 'artists' && renderCategoryContent('artists')}
          {activeTab === 'tracks' && renderCategoryContent('tracks')}
          {activeTab === 'albums' && renderCategoryContent('albums')}
        </div>
      </div>
    </div>
  )
}

