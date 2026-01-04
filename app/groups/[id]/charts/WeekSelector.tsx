'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { formatWeekDate } from '@/lib/weekly-utils'
import { useNavigation } from '@/contexts/NavigationContext'

interface WeekSelectorProps {
  weeks: { weekStart: Date }[]
  currentWeek: Date
}

export default function WeekSelector({ weeks, currentWeek }: WeekSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse } = useNavigation()

  const handleWeekChange = (weekStart: Date) => {
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', formatWeekDate(weekStart))
    router.push(`?${params.toString()}`)
  }

  const formatWeekLabel = (weekStart: Date): string => {
    const date = new Date(weekStart)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Select Week</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {weeks.map((week) => {
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
    </div>
  )
}

