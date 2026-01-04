'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import { useNavigation } from '@/contexts/NavigationContext'
import WeekCalendar from './WeekCalendar'

interface WeekSelectorProps {
  weeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
}

export default function WeekSelector({ weeks, currentWeek, trackingDayOfWeek }: WeekSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse } = useNavigation()

  const handleWeekChange = (weekStart: Date) => {
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', formatWeekDate(weekStart))
    router.push(`?${params.toString()}`)
  }


  // Limit to first 5 weeks (most recent)
  const displayedWeeks = weeks.slice(0, 5)

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 overflow-hidden">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Week</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedWeeks.map((week) => {
          const isSelected = week.weekStart.getTime() === currentWeek.getTime()
          return (
            <button
              key={week.weekStart.toISOString()}
              onClick={() => handleWeekChange(week.weekStart)}
              className={`
                w-full text-left px-4 py-3 rounded-lg transition-colors
                ${
                  isSelected
                    ? 'bg-yellow-500 text-black font-semibold'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {formatWeekLabel(week.weekStart)}
            </button>
          )
        })}
      </div>
      <WeekCalendar 
        availableWeeks={weeks} 
        currentWeek={currentWeek}
        trackingDayOfWeek={trackingDayOfWeek}
      />
    </div>
  )
}

