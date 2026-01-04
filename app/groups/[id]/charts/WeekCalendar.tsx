'use client'

import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { getWeekStart, getWeekStartForDay, formatWeekDate, utcToLocalDate } from '@/lib/weekly-utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

interface WeekCalendarProps {
  availableWeeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
}

export default function WeekCalendar({ availableWeeks, currentWeek, trackingDayOfWeek }: WeekCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse, stopPulse } = useNavigation()

  // Stop pulse after searchParams change (navigation complete)
  useEffect(() => {
    const timer = setTimeout(() => {
      stopPulse()
    }, 500)
    return () => clearTimeout(timer)
  }, [searchParams, stopPulse])

  // Create a Set of week start dates for quick lookup
  const availableWeekStarts = new Set(
    availableWeeks.map(week => formatWeekDate(week.weekStart))
  )

  // Create a Set of all dates that belong to available weeks
  // Each week spans 7 days based on the group's tracking day
  const availableDates = new Set<string>()
  availableWeeks.forEach(week => {
    const weekStart = new Date(week.weekStart)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setUTCDate(date.getUTCDate() + i)
      availableDates.add(formatWeekDate(date))
    }
  })

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return

    // Calculate the week start for the selected date using the group's tracking day
    const weekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const weekStartStr = formatWeekDate(weekStart)

    // Check if this week has chart data
    if (!availableWeekStarts.has(weekStartStr)) {
      return
    }

    // Update the URL params
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', weekStartStr)
    router.push(`?${params.toString()}`)
    
    // Close the modal after selection
    setIsOpen(false)
  }

  // Check if a date is available (belongs to a week with charts)
  const isDateAvailable = (date: Date): boolean => {
    return availableDates.has(formatWeekDate(date))
  }

  // Check if a date is in the current selected week
  const isDateInCurrentWeek = (date: Date): boolean => {
    const dateWeekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const currentWeekStart = getWeekStartForDay(currentWeek, trackingDayOfWeek)
    return formatWeekDate(dateWeekStart) === formatWeekDate(currentWeekStart)
  }

  // Disable dates that don't have charts
  const disabled = (date: Date) => !isDateAvailable(date)

  return (
    <>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Other dates</h3>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-left"
        >
          Open calendar
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Select Date</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <DayPicker
              mode="single"
              selected={utcToLocalDate(currentWeek)}
              onSelect={handleDateSelect}
              disabled={disabled}
              modifiers={{
                available: (date) => isDateAvailable(date),
                currentWeek: (date) => isDateInCurrentWeek(date),
              }}
              modifiersClassNames={{
                available: 'rdp-day_available',
                currentWeek: 'rdp-day_current-week',
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}

