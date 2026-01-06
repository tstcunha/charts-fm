'use client'

import { useState } from 'react'
import WeekSelector from './WeekSelector'
import ChartDisplay from './ChartDisplay'
import { EnrichedChartItem } from '@/lib/group-chart-metrics'

type ChartType = 'artists' | 'tracks' | 'albums'

interface ChartsClientProps {
  weeks: { weekStart: Date }[]
  currentWeek: Date
  trackingDayOfWeek: number
  initialType: ChartType
  artists: EnrichedChartItem[]
  tracks: EnrichedChartItem[]
  albums: EnrichedChartItem[]
  groupId: string
}

export default function ChartsClient({
  weeks,
  currentWeek,
  trackingDayOfWeek,
  initialType,
  artists,
  tracks,
  albums,
  groupId,
}: ChartsClientProps) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 md:col-span-3">
        <WeekSelector 
          weeks={weeks} 
          currentWeek={currentWeek}
          trackingDayOfWeek={trackingDayOfWeek}
          onWeekChange={() => setIsLoading(true)}
        />
      </div>
      <div className="col-span-12 md:col-span-9">
        <ChartDisplay
          initialType={initialType}
          artists={artists}
          tracks={tracks}
          albums={albums}
          isLoading={isLoading}
          onLoadingChange={setIsLoading}
          groupId={groupId}
        />
      </div>
    </div>
  )
}

