'use client'

import { memo, useMemo } from 'react'
import { ChartHistoryEntry } from '@/lib/chart-deep-dive'
import PositionBubble from './PositionBubble'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import Tooltip from '@/components/Tooltip'

interface ChartHistoryTimelineProps {
  history: ChartHistoryEntry[]
  groupId: string
  chartType: 'artists' | 'tracks' | 'albums'
}

interface TimelineSegment {
  type: 'streak' | 'gap' | 'single-out'
  weeks?: ChartHistoryEntry[]
  gapWeeks?: number
  gapWeekStart?: Date // For single-out, the week that was missed
}

function ChartHistoryTimeline({
  history,
  groupId,
  chartType,
}: ChartHistoryTimelineProps) {
  // Memoize expensive timeline processing
  const { timelineItems, firstAppearanceDate } = useMemo(() => {
    if (history.length === 0) {
      return { timelineItems: [], firstAppearanceDate: null }
    }

    // Get first appearance date
    const firstAppearanceDate = history[0]?.weekStart

    // Group history into consecutive streaks and gaps
    const segments: TimelineSegment[] = []
    let currentStreak: ChartHistoryEntry[] = [history[0]]

    for (let i = 1; i < history.length; i++) {
      const prevWeek = history[i - 1].weekStart
      const currentWeek = history[i].weekStart
      const daysDiff = (currentWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24)

      if (daysDiff <= 7) {
        // Consecutive week (within 7 days)
        currentStreak.push(history[i])
      } else {
        // Gap detected
        // Save current streak
        if (currentStreak.length > 0) {
          segments.push({ type: 'streak', weeks: [...currentStreak] })
        }

        // Calculate gap weeks
        const gapWeeks = Math.round(daysDiff / 7) - 1

        if (gapWeeks === 1) {
          // Single week gap - show OUT bubble
          // Calculate the week that was missed (7 days after previous week)
          const gapWeekStart = new Date(prevWeek)
          gapWeekStart.setUTCDate(gapWeekStart.getUTCDate() + 7)
          segments.push({ type: 'single-out', gapWeekStart })
        } else {
          // Multiple weeks gap - show text
          segments.push({ type: 'gap', gapWeeks })
        }

        // Start new streak
        currentStreak = [history[i]]
      }
    }

    // Add final streak
    if (currentStreak.length > 0) {
      segments.push({ type: 'streak', weeks: currentStreak })
    }

    // Flatten all timeline items for rendering
    interface TimelineItem {
      type: 'bubble' | 'gap-text'
      entry?: ChartHistoryEntry
      gapWeekStart?: Date
      gapWeeks?: number
      isOut?: boolean
      isFirst?: boolean
    }

    const timelineItems: TimelineItem[] = []
    let isFirstItem = true

    segments.forEach((segment) => {
      if (segment.type === 'streak' && segment.weeks) {
        segment.weeks.forEach((entry) => {
          timelineItems.push({
            type: 'bubble',
            entry,
            isFirst: isFirstItem,
          })
          isFirstItem = false
        })
      } else if (segment.type === 'single-out' && segment.gapWeekStart) {
        timelineItems.push({
          type: 'bubble',
          gapWeekStart: segment.gapWeekStart,
          isOut: true,
          isFirst: isFirstItem,
        })
        isFirstItem = false
      } else if (segment.type === 'gap' && segment.gapWeeks) {
        timelineItems.push({
          type: 'gap-text',
          gapWeeks: segment.gapWeeks,
        })
      }
    })

    return { timelineItems, firstAppearanceDate }
  }, [history])

  if (history.length === 0) {
    return (
      <div className="bg-white/40 backdrop-blur-xl rounded-xl p-8 text-center border border-white/30">
        <p className="text-gray-600">No chart history available</p>
      </div>
    )
  }

  return (
    <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/30" style={{ overflow: 'visible', contain: 'layout style paint' }}>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Chart History</h2>
      <div className="relative" style={{ overflow: 'visible' }}>
        {/* Timeline items container with repeating lines on all rows */}
        <div 
          className="relative flex flex-wrap items-center gap-4 pb-12 pl-8"
          style={{ 
            zIndex: 1, 
            overflow: 'visible',
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(209, 213, 219, 0.4) 31px, rgba(209, 213, 219, 0.4) 33px, transparent 33px, transparent 80px)',
            backgroundSize: '100% 80px',
            backgroundPosition: '0 0',
            backgroundRepeat: 'repeat-y'
          }}
        >
          {timelineItems.map((item, index) => {
            if (item.type === 'bubble') {
              return (
                <div 
                  key={`${item.entry?.weekStart?.getTime() || item.gapWeekStart?.getTime()}-${index}`} 
                  className="relative flex flex-col items-center" 
                  style={{ overflow: 'visible', contain: 'layout style' }}
                >
                  <PositionBubble
                    position={item.entry?.position || 0}
                    weekStart={item.entry?.weekStart || item.gapWeekStart!}
                    groupId={groupId}
                    chartType={chartType}
                    isOut={item.isOut}
                  />
                  {item.isFirst && firstAppearanceDate && (
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 text-xs text-gray-600 font-medium whitespace-nowrap">
                      {formatWeekLabel(firstAppearanceDate)}
                    </span>
                  )}
                </div>
              )
            } else if (item.type === 'gap-text') {
              return (
                <Tooltip 
                  key={`gap-${index}`}
                  content={`Out for ${item.gapWeeks} ${item.gapWeeks === 1 ? 'week' : 'weeks'}`}
                  position="top"
                >
                  <div 
                    className="px-2 text-xs text-gray-500 cursor-help"
                    style={{ contain: 'layout style' }}
                  >
                    ⏸ {item.gapWeeks}
                  </div>
                </Tooltip>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(ChartHistoryTimeline)

