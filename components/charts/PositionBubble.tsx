'use client'

import Link from 'next/link'
import { formatWeekDate, formatWeekLabel } from '@/lib/weekly-utils'
import Tooltip from '@/components/Tooltip'

interface PositionBubbleProps {
  position: number
  weekStart: Date
  groupId: string
  chartType: 'artists' | 'tracks' | 'albums'
  isOut?: boolean
}

export default function PositionBubble({
  position,
  weekStart,
  groupId,
  chartType,
  isOut = false,
}: PositionBubbleProps) {
  const weekDateStr = formatWeekDate(weekStart)
  const href = `/groups/${groupId}/charts?week=${weekDateStr}&type=${chartType}`

  // Size based on position (higher position = smaller, but we want top positions to be larger)
  // Position 1-3 get larger sizes, 4-10 get progressively smaller
  const getSize = () => {
    if (isOut) return 'w-12 h-12 text-sm'
    if (position <= 3) return 'w-16 h-16 text-lg'
    if (position <= 6) return 'w-14 h-14 text-base'
    return 'w-12 h-12 text-sm'
  }

  // Color based on position
  const getColor = () => {
    if (isOut) return 'text-gray-600'
    if (position === 1) return 'text-yellow-600'
    if (position === 2) return 'text-gray-500'
    if (position === 3) return 'text-amber-600'
    return 'text-gray-700'
  }

  const baseStyles = {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(12px) saturate(180%)',
    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }

  const formattedDate = formatWeekLabel(weekStart)

  return (
    <Tooltip content={formattedDate} position="top">
      <Link
        href={href}
        className={`
          ${getSize()}
          ${getColor()}
          rounded-full font-bold
          flex items-center justify-center
          transition-all duration-200
          hover:shadow-lg hover:scale-110
          active:scale-95
          relative z-10
          inline-block
        `}
        style={baseStyles}
      >
        {isOut ? 'OUT' : `#${position}`}
      </Link>
    </Tooltip>
  )
}

