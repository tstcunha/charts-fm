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
}

export default function ChartDisplay({ initialType, artists, tracks, albums }: ChartDisplayProps) {
  const [currentType, setCurrentType] = useState<ChartType>(initialType)
  const searchParams = useSearchParams()
  const isInternalChange = useRef(false)

  // Sync state with URL if it changes externally (e.g., back button)
  useEffect(() => {
    // Skip if this was an internal change
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
    // Update state immediately for instant UI update
    setCurrentType(type)
    
    // Update URL asynchronously using native history API to avoid Next.js router side effects
    isInternalChange.current = true
    requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search)
      params.set('type', type)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, '', newUrl)
    })
  }

  // Memoize current items to avoid unnecessary re-renders
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

  return (
    <>
      <div className="mb-4">
        <ChartTypeSelector currentType={currentType} onTypeChange={handleTypeChange} />
      </div>
      <ChartTable items={currentItems} chartType={currentType} />
    </>
  )
}

