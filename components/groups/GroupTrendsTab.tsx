'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFire, faSpinner, faArrowUp, faArrowDown, faMusic, faMicrophone, faCompactDisc, faTrophy } from '@fortawesome/free-solid-svg-icons'
import { LiquidGlassLink } from '@/components/LiquidGlassButton'
import { generateSlug, ChartType } from '@/lib/chart-slugs'

interface GroupTrendsTabProps {
  groupId: string
}

export default function GroupTrendsTab({ groupId }: GroupTrendsTabProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/groups/${groupId}/trends`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setData(data)
        }
        setIsLoading(false)
      })
      .catch((err) => {
        setError('Failed to load trends')
        setIsLoading(false)
        console.error('Error fetching trends:', err)
      })
  }, [groupId])

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Trends</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--theme-primary)]" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.trends) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Trends</h2>
        </div>
        <div className="bg-[var(--theme-background-from)] rounded-xl shadow-sm p-12 text-center border border-theme">
          <div className="mb-4 text-[var(--theme-primary)]">
            <FontAwesomeIcon icon={faFire} size="3x" />
          </div>
          <p className="text-gray-700 text-lg mb-2 font-medium">No trends available yet.</p>
          <p className="text-gray-500 text-sm mb-6">Generate charts to see weekly trends and insights!</p>
        </div>
      </div>
    )
  }

  const trends = data.trends
  const newEntries = (trends.newEntries as any[]) || []
  const biggestClimbers = (trends.biggestClimbers as any[]) || []
  const funFacts = (trends.funFacts as string[]) || []
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-[var(--theme-primary-dark)]">Trends</h2>
        <LiquidGlassLink
          href={`/groups/${groupId}/trends`}
          variant="primary"
          useTheme
        >
          Explore Full Trends
        </LiquidGlassLink>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <div className="text-sm text-gray-600 mb-1">Biggest Climber</div>
          {biggestClimbers.length > 0 ? (
            <div className="text-lg font-bold text-[var(--theme-text)] truncate">
              {biggestClimbers[0].name}
              {biggestClimbers[0].artist && ` by ${biggestClimbers[0].artist}`}
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-400">None</div>
          )}
        </div>
      </div>

      {/* Biggest Climber Highlight */}
      {biggestClimbers.length > 0 && (() => {
        const isPeakPosition = biggestClimbers[0].highestPosition !== undefined && biggestClimbers[0].position === biggestClimbers[0].highestPosition
        return (
          <div className={`relative bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 border shadow-sm overflow-hidden ${
            isPeakPosition ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50' : 'border-theme'
          }`}>
            {isPeakPosition && (
              <div className="absolute top-2 right-0 bg-blue-500 text-white text-xs font-bold px-8 py-1.5 transform rotate-12 translate-x-1 shadow-md z-10 whitespace-nowrap">
                NEW PEAK
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <FontAwesomeIcon icon={faArrowUp} className={`text-2xl ${isPeakPosition ? 'text-blue-600' : 'text-green-600'}`} />
              <h3 className={`text-xl font-bold ${isPeakPosition ? 'text-blue-900' : 'text-[var(--theme-primary-dark)]'}`}>Biggest Climber</h3>
            </div>
            <div className="flex items-center gap-4">
              <FontAwesomeIcon icon={getChartTypeIcon(biggestClimbers[0].chartType)} className={`text-3xl ${isPeakPosition ? 'text-blue-600' : 'text-[var(--theme-primary)]'}`} />
              <div className="flex-1">
                <Link
                  href={`/groups/${groupId}/charts/${biggestClimbers[0].chartType === 'artists' ? 'artist' : biggestClimbers[0].chartType === 'tracks' ? 'track' : 'album'}/${generateSlug(biggestClimbers[0].entryKey, biggestClimbers[0].chartType as ChartType)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-2xl font-bold mb-1 ${isPeakPosition ? 'text-blue-900 hover:text-blue-700' : 'text-gray-900 hover:text-[var(--theme-primary)]'} transition-colors`}
                >
                  {biggestClimbers[0].name}
                  {biggestClimbers[0].artist && (
                    <span className={`text-lg font-normal ${isPeakPosition ? 'text-blue-700' : 'text-gray-600'}`}> by {biggestClimbers[0].artist}</span>
                  )}
                </Link>
                <div className={`text-lg font-semibold ${isPeakPosition ? 'text-blue-700' : 'text-[var(--theme-text)]'}`}>
                  Jumped {Math.abs(biggestClimbers[0].positionChange || 0)} position{Math.abs(biggestClimbers[0].positionChange || 0) !== 1 ? 's' : ''}!
                  {biggestClimbers[0].oldPosition && biggestClimbers[0].newPosition && (
                    <span className={`text-sm ml-2 ${isPeakPosition ? 'text-blue-600' : 'text-gray-600'}`}>
                      ({biggestClimbers[0].oldPosition} → {biggestClimbers[0].newPosition})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* New Entries Preview */}
      {newEntries.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 mb-6 border border-theme">
          <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4">New Entries This Week</h3>
          <div className="space-y-3">
            {newEntries.slice(0, 3).map((entry: any, idx: number) => {
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
                    <Link
                      href={`/groups/${groupId}/charts/${entry.chartType === 'artists' ? 'artist' : entry.chartType === 'tracks' ? 'track' : 'album'}/${generateSlug(entry.entryKey, entry.chartType as ChartType)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`font-semibold truncate ${isNumberOne ? 'text-yellow-900 hover:text-yellow-700' : 'text-gray-900 hover:text-[var(--theme-primary)]'} transition-colors`}
                    >
                      {entry.name}
                      {entry.artist && (
                        <span className={`text-sm font-normal ${isNumberOne ? 'text-yellow-700' : 'text-gray-600'}`}> by {entry.artist}</span>
                      )}
                    </Link>
                    <div className={`text-sm ${isNumberOne ? 'text-yellow-700 font-semibold' : 'text-gray-500'}`}>#{entry.position}</div>
                  </div>
                </div>
              )
            })}
            {newEntries.length > 3 && (
              <div className="text-sm text-gray-500 text-center pt-2">
                ...and {newEntries.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member MVP */}
      {memberSpotlight && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-6 border border-theme shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <FontAwesomeIcon icon={faTrophy} className="text-2xl text-[var(--theme-primary)]" />
            <h3 className="text-xl font-bold text-[var(--theme-primary-dark)]">This Week's MVP</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900 mb-2">{memberSpotlight.name}</div>
          <div className="text-lg text-gray-700 mb-4">{memberSpotlight.highlight}</div>
          {memberSpotlight.topContributions && memberSpotlight.topContributions.length > 0 && (
            <div className="text-sm text-gray-600">
              Top contributions: {memberSpotlight.topContributions.map((c: any) => c.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Fun Facts */}
      {funFacts.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-6 border border-theme">
          <h3 className="text-xl font-bold text-[var(--theme-primary-dark)] mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faFire} className="text-lg text-[var(--theme-primary-dark)]" />
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
    </div>
  )
}

