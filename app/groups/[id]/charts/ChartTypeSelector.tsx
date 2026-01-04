'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartTypeSelectorProps {
  currentType: ChartType
  onTypeChange?: (type: ChartType) => void
}

export default function ChartTypeSelector({ currentType, onTypeChange }: ChartTypeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { triggerPulse } = useNavigation()

  const handleTypeChange = (type: ChartType) => {
    if (onTypeChange) {
      // Use local state change for instant switching
      onTypeChange(type)
    } else {
      // Fallback to URL navigation for backwards compatibility
      triggerPulse()
      const params = new URLSearchParams(searchParams.toString())
      params.set('type', type)
      router.push(`?${params.toString()}`)
    }
  }

  const types: { value: ChartType; label: string }[] = [
    { value: 'artists', label: 'Artists' },
    { value: 'tracks', label: 'Tracks' },
    { value: 'albums', label: 'Albums' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex gap-2">
        {types.map((type) => {
          const isSelected = currentType === type.value
          return (
            <button
              key={type.value}
              onClick={() => handleTypeChange(type.value)}
              className={`
                flex-1 px-6 py-3 rounded-lg transition-colors font-medium
                ${
                  isSelected
                    ? 'bg-yellow-500 text-black font-semibold'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {type.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

