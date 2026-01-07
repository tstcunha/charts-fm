'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'
import ChartTypeSelector from './ChartTypeSelector'
import ChartTable from './ChartTable'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartDisplayProps {
  initialType: ChartType
  artists: EnrichedChartItem[]
  tracks: EnrichedChartItem[]
  albums: EnrichedChartItem[]
  isLoading?: boolean
  onLoadingChange?: (loading: boolean) => void
  groupId: string
}

export default function ChartDisplay({ initialType, artists, tracks, albums, isLoading = false, onLoadingChange, groupId }: ChartDisplayProps) {
  const [currentType, setCurrentType] = useState<ChartType>(initialType)
  const searchParams = useSearchParams()
  const isInternalChange = useRef(false)
  const previousItemsRef = useRef<EnrichedChartItem[] | null>(null)

  const currentItems = useMemo(() => {
    switch (currentType) {
      case 'artists':
        return artists
      case 'tracks':
        return tracks
      case 'albums':
        return albums
    }
  }, [currentType, artists, tracks, albums])

  // Clear loading when table items change (new data rendered)
  useEffect(() => {
    if (isLoading && previousItemsRef.current && currentItems !== previousItemsRef.current) {
      previousItemsRef.current = currentItems
      const timer = setTimeout(() => onLoadingChange?.(false), 150)
      return () => clearTimeout(timer)
    } else if (!previousItemsRef.current && currentItems.length > 0) {
      previousItemsRef.current = currentItems
    }
  }, [currentItems, isLoading, onLoadingChange])

  // Sync chart type with URL (e.g., back button navigation)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false
      return
    }

    const urlType = searchParams.get('type') as ChartType | null
    if (urlType && ['artists', 'tracks', 'albums'].includes(urlType) && urlType !== currentType) {
      setCurrentType(urlType)
    }
  }, [searchParams, currentType])

  const handleTypeChange = (type: ChartType) => {
    setCurrentType(type)
    isInternalChange.current = true
    requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      params.set('type', type)
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <div className="mb-4">
        <ChartTypeSelector currentType={currentType} onTypeChange={handleTypeChange} />
      </div>
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-30' : 'opacity-100'}`}>
        <ChartTable items={currentItems} chartType={currentType} groupId={groupId} />
      </div>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-[var(--theme-primary-lighter)] border-t-[var(--theme-primary)] rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600 font-medium">Loading chart data...</p>
          </div>
        </div>
      )}
    </div>
  )
}

