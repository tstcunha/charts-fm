'use client'

import { useState, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { getWeekStart, getWeekStartForDay, formatWeekDate, utcToLocalDate } from '@/lib/weekly-utils'
import { useRouter } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

interface WeekCalendarProps {
  availableWeeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
  onWeekChange?: () => void
}

export default function WeekCalendar({ availableWeeks, currentWeek, trackingDayOfWeek, onWeekChange }: WeekCalendarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse, stopPulse } = useNavigation()

  useEffect(() => {
    const timer = setTimeout(() => stopPulse(), 500)
    return () => clearTimeout(timer)
  }, [searchParams, stopPulse])

  const availableWeekStarts = new Set(
    availableWeeks.map(week => formatWeekDate(week.weekStart))
  )

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

    const weekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const weekStartStr = formatWeekDate(weekStart)

    if (!availableWeekStarts.has(weekStartStr)) {
      return
    }

    onWeekChange?.()
    triggerPulse()
    const params = new URLSearchParams(searchParams.toString())
    params.set('week', weekStartStr)
    router.push(`?${params.toString()}`)
    setIsOpen(false)
  }

  const isDateAvailable = (date: Date): boolean => {
    return availableDates.has(formatWeekDate(date))
  }

  const isDateInCurrentWeek = (date: Date): boolean => {
    const dateWeekStart = getWeekStartForDay(date, trackingDayOfWeek)
    const currentWeekStart = getWeekStartForDay(currentWeek, trackingDayOfWeek)
    return formatWeekDate(dateWeekStart) === formatWeekDate(currentWeekStart)
  }

  const disabled = (date: Date) => !isDateAvailable(date)

  return (
    <>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 text-[var(--theme-primary-dark)]">Other dates</h3>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 rounded-lg transition-all duration-200 text-left hover:shadow-sm"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            color: 'var(--theme-text)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
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
            className="rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 border border-theme"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[var(--theme-primary-dark)]">Select Date</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[var(--theme-text)] hover:text-[var(--theme-primary-dark)] text-2xl leading-none w-8 h-8 flex items-center justify-center transition-colors"
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

